#!/usr/bin/env node
// vydex — push a repo (or a new version) straight into your Vydex drafts.
//
//   vydex login [token]     save a personal API token (from Settings → Security)
//   vydex push [options]    git archive HEAD → upload as a draft / new version
//
// push options:
//   --title "My project"    title for a new draft (default: folder name)
//   --repo <id>             add a new version to an existing repo instead
//   --message "notes"       changelog for this version
//   --url <https://...>     override the base URL (default: https://vydex.dev)
//
// Requires Node 18+ (global fetch/FormData/Blob) and git on PATH.

import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, unlinkSync, existsSync, mkdtempSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join, basename } from 'node:path'
import { createInterface } from 'node:readline'

const CONFIG = join(homedir(), '.vydex.json')
const DEFAULT_URL = process.env.VYDEX_URL || 'https://vydex.dev'

function readConfig() {
  try { return JSON.parse(readFileSync(CONFIG, 'utf8')) } catch { return {} }
}
function writeConfig(cfg) {
  writeFileSync(CONFIG, JSON.stringify(cfg, null, 2), { mode: 0o600 })
}
function die(msg) { console.error('✖ ' + msg); process.exit(1) }

function parseFlags(args) {
  const out = { _: [] }
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a.startsWith('--')) out[a.slice(2)] = args[++i] ?? true
    else out._.push(a)
  }
  return out
}

async function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((res) => rl.question(question, (a) => { rl.close(); res(a.trim()) }))
}

async function login(args) {
  const flags = parseFlags(args)
  let token = flags._[0]
  if (!token) token = await ask('Paste your Vydex API token (Settings → Security): ')
  if (!token || !token.startsWith('vdx_')) die('That does not look like a Vydex token (vdx_…).')
  const cfg = readConfig()
  cfg.token = token
  cfg.url = flags.url || cfg.url || DEFAULT_URL
  writeConfig(cfg)
  console.log('✓ Saved. You can now run `vydex push` from any repo.')
}

async function push(args) {
  const flags = parseFlags(args)
  const cfg = readConfig()
  const token = process.env.VYDEX_TOKEN || cfg.token
  if (!token) die('Not logged in. Run `vydex login` first.')
  const base = flags.url || cfg.url || DEFAULT_URL

  // Must be inside a git repo with at least one commit.
  try { execFileSync('git', ['rev-parse', 'HEAD'], { stdio: 'ignore' }) }
  catch { die('No git commit found here. Run this inside a git repo with a commit.') }

  const tmp = join(mkdtempSync(join(tmpdir(), 'vydex-')), 'archive.zip')
  console.log('• Packing HEAD…')
  execFileSync('git', ['archive', '--format=zip', '-o', tmp, 'HEAD'])
  const buf = readFileSync(tmp)
  try { unlinkSync(tmp) } catch { /* ignore */ }

  const title = flags.title || basename(process.cwd())
  const form = new FormData()
  form.append('file', new Blob([buf], { type: 'application/zip' }), 'archive.zip')
  if (flags.repo) {
    form.append('repoId', String(flags.repo))
  } else {
    form.append('title', String(title))
    if (flags.paid) {
      form.append('paid', 'true')
      if (flags.price) form.append('price', String(flags.price))
    }
  }
  if (flags.message) form.append('changelog', String(flags.message))

  console.log(`• Uploading ${(buf.length / 1024 / 1024).toFixed(2)} MB to ${base}…`)
  const res = await fetch(`${base}/api/push`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
    body: form,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) die(json.error || `Push failed (${res.status})`)

  console.log(json.draft ? '✓ Draft created.' : `✓ New version v${json.version} pushed.`)
  console.log('  ' + json.url)
  if (json.draft) console.log('  Open it to set a price and publish.')
}

const [cmd, ...rest] = process.argv.slice(2)
if (cmd === 'login') await login(rest)
else if (cmd === 'push') await push(rest)
else {
  console.log(`vydex — push code into your Vydex drafts

  vydex login [token]     save your API token (Settings → Security)
  vydex push [--title ..] [--repo <id>] [--message ..] [--paid --price 19]

Examples:
  vydex login
  vydex push --title "Analytics dashboard"
  vydex push --title "Pro UI kit" --paid --price 29
  vydex push --repo 1234-… --message "fix auth"`)
  if (existsSync(CONFIG)) console.log('\n(logged in)')
}
