// Extract dependencies (name + version + OSV ecosystem) from common manifests
// and lockfiles, so we can query OSV.dev for known vulnerabilities. Lockfiles
// are preferred (exact, transitive versions); manifests are a fallback.

export interface Dep { name: string; version: string; ecosystem: string }

// Basenames (lowercase) worth reading for dependency extraction.
export const MANIFEST_FILES = [
  'package-lock.json', 'package.json',                 // npm
  'requirements.txt', 'poetry.lock', 'pipfile.lock',   // PyPI
  'go.sum', 'go.mod',                                   // Go
  'cargo.lock',                                         // crates.io
  'gemfile.lock',                                       // RubyGems
  'composer.lock',                                      // Packagist
]

const cleanVersion = (v: string) => v.trim().replace(/^v/, '')

export function extractDeps(files: { name: string; content: string }[]): Dep[] {
  const seen = new Set<string>()
  const out: Dep[] = []
  const add = (name: string, version: string, ecosystem: string) => {
    const ver = cleanVersion(version)
    if (!name || !ver || !/^\d/.test(ver)) return
    const key = `${ecosystem}:${name}@${ver}`
    if (seen.has(key)) return
    seen.add(key)
    out.push({ name: name.trim(), version: ver, ecosystem })
  }

  for (const f of files) {
    const c = f.content
    try {
      switch (f.name) {
        case 'package-lock.json': {
          const j = JSON.parse(c)
          if (j.packages) {
            for (const [key, val] of Object.entries(j.packages as Record<string, { version?: string }>)) {
              if (!key) continue
              const name = key.split('node_modules/').pop()
              if (name && val?.version) add(name, val.version, 'npm')
            }
          } else if (j.dependencies) {
            const walk = (deps: Record<string, { version?: string; dependencies?: Record<string, unknown> }>) => {
              for (const [name, info] of Object.entries(deps)) {
                if (info?.version) add(name, info.version, 'npm')
                if (info?.dependencies) walk(info.dependencies as never)
              }
            }
            walk(j.dependencies)
          }
          break
        }
        case 'package.json': {
          const j = JSON.parse(c)
          for (const grp of [j.dependencies, j.devDependencies]) {
            if (!grp) continue
            for (const [name, range] of Object.entries(grp as Record<string, string>)) {
              add(name, String(range).replace(/[\^~>=<*\s|]/g, '').split(' ')[0], 'npm')
            }
          }
          break
        }
        case 'requirements.txt': {
          for (const line of c.split('\n')) {
            const m = line.match(/^\s*([A-Za-z0-9._-]+)\s*==\s*([0-9][^\s;#]*)/)
            if (m) add(m[1], m[2], 'PyPI')
          }
          break
        }
        case 'poetry.lock': {
          for (const m of c.matchAll(/\[\[package\]\][\s\S]*?name\s*=\s*"([^"]+)"[\s\S]*?version\s*=\s*"([^"]+)"/g)) {
            add(m[1], m[2], 'PyPI')
          }
          break
        }
        case 'pipfile.lock': {
          const j = JSON.parse(c)
          for (const grp of [j.default, j.develop]) {
            if (!grp) continue
            for (const [name, info] of Object.entries(grp as Record<string, { version?: string }>)) {
              if (info?.version) add(name, String(info.version).replace(/[=~><]/g, ''), 'PyPI')
            }
          }
          break
        }
        case 'go.sum': {
          for (const line of c.split('\n')) {
            const m = line.match(/^(\S+)\s+(v\S+?)(\/go\.mod)?\s+h1:/)
            if (m) add(m[1], m[2], 'Go')
          }
          break
        }
        case 'go.mod': {
          for (const m of c.matchAll(/^\s*([^\s]+)\s+(v[0-9][^\s/]*)/gm)) {
            if (m[1] !== 'module' && m[1] !== 'go' && m[1] !== 'require') add(m[1], m[2], 'Go')
          }
          break
        }
        case 'cargo.lock': {
          for (const m of c.matchAll(/\[\[package\]\][\s\S]*?name\s*=\s*"([^"]+)"[\s\S]*?version\s*=\s*"([^"]+)"/g)) {
            add(m[1], m[2], 'crates.io')
          }
          break
        }
        case 'gemfile.lock': {
          for (const line of c.split('\n')) {
            const m = line.match(/^ {4}([A-Za-z0-9._-]+) \(([0-9][^)]*)\)/)
            if (m) add(m[1], m[2], 'RubyGems')
          }
          break
        }
        case 'composer.lock': {
          const j = JSON.parse(c)
          for (const grp of [j.packages, j['packages-dev']]) {
            if (!Array.isArray(grp)) continue
            for (const p of grp as { name?: string; version?: string }[]) {
              if (p?.name && p?.version) add(p.name, p.version, 'Packagist')
            }
          }
          break
        }
      }
    } catch { /* ignore malformed manifest */ }
  }

  return out.slice(0, 500)
}
