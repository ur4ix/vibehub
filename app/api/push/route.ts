import { NextRequest, NextResponse } from 'next/server'
import { createHash, randomUUID } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { hashToken } from '@/lib/api-token'

// `vydex push` receiver. Token-authenticated (Bearer). Accepts a ZIP of the repo
// (git archive HEAD) and either creates a DRAFT repository or adds a new version
// to an existing one. Writes go through the service role.
//
// multipart/form-data fields:
//   file       — the .zip archive (required)
//   title      — title for a new draft (optional; defaults from slug)
//   repoId     — add a new version to this repo instead of creating one (optional)
//   changelog  — version note (optional)

const MAX = 25 * 1024 * 1024 // keep in sync with the web upload form

function slugify(s: string): string {
  return s.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')
    .replace(/^-|-$/g, '').slice(0, 70)
}

export async function POST(req: NextRequest) {
  // ── auth ──────────────────────────────────────────────────────────────────
  const authz = req.headers.get('authorization') ?? ''
  const token = authz.startsWith('Bearer ') ? authz.slice(7).trim() : ''
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 401 })

  const admin = createAdminClient()
  const { data: tokRaw } = await admin
    .from('api_tokens')
    .select('id, user_id')
    .eq('token_hash', hashToken(token))
    .maybeSingle()
  const tok = tokRaw as { id: string; user_id: string } | null
  if (!tok) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  admin.from('api_tokens').update({ last_used_at: new Date().toISOString() }).eq('id', tok.id).then(() => {})
  const userId = tok.user_id

  // ── parse upload ──────────────────────────────────────────────────────────
  let form: FormData
  try { form = await req.formData() } catch { return NextResponse.json({ error: 'Bad form data' }, { status: 400 }) }
  const file = form.get('file')
  if (!(file instanceof Blob)) return NextResponse.json({ error: 'Missing file' }, { status: 400 })
  if (file.size > MAX) return NextResponse.json({ error: 'Archive too large (max 25 MB)' }, { status: 413 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const sha256 = createHash('sha256').update(buffer).digest('hex')

  // File list for the listing's tree (best-effort).
  let manifest: string[] = []
  try {
    const JSZip = (await import('jszip')).default
    const zip = await JSZip.loadAsync(buffer)
    zip.forEach((p, entry) => { if (!entry.dir) manifest.push(p) })
    manifest = manifest.sort().slice(0, 2000)
  } catch { /* not a readable zip — still allow, just no tree */ }

  const repoId = String(form.get('repoId') ?? '').trim()
  const changelog = String(form.get('changelog') ?? '').trim() || null
  const origin = req.nextUrl.origin

  // ── add a version to an existing repo ───────────────────────────────────────
  if (repoId) {
    const { data: rRaw } = await admin.from('repositories').select('id, owner_id').eq('id', repoId).maybeSingle()
    const r = rRaw as { id: string; owner_id: string } | null
    if (!r) return NextResponse.json({ error: 'Repository not found' }, { status: 404 })
    if (r.owner_id !== userId) return NextResponse.json({ error: 'Not your repository' }, { status: 403 })

    const versionId = randomUUID()
    const path = `${userId}/${repoId}/${versionId}.zip`
    const up = await admin.storage.from('repositories').upload(path, buffer, { contentType: 'application/zip', upsert: false })
    if (up.error) return NextResponse.json({ error: up.error.message }, { status: 500 })

    const { count } = await admin.from('repository_versions').select('id', { count: 'exact', head: true }).eq('repository_id', repoId)
    await admin.from('repository_versions').insert({
      repository_id: repoId, version: `v${(count ?? 0) + 1}`, changelog: changelog ?? 'Pushed from CLI', storage_path: path,
    })
    await admin.from('repositories').update({ storage_path: path, file_manifest: manifest, source_sha256: sha256 }).eq('id', repoId)

    return NextResponse.json({ id: repoId, version: (count ?? 0) + 1, url: `${origin}/listing/${repoId}` })
  }

  // ── create a new draft ──────────────────────────────────────────────────────
  const title = String(form.get('title') ?? '').trim().slice(0, 120)
  const paid = String(form.get('paid') ?? '') === 'true'
  const priceUsd = Number(form.get('price') ?? 0)
  if (paid && (!Number.isFinite(priceUsd) || priceUsd <= 0 || priceUsd > 9999)) {
    return NextResponse.json({ error: 'Price must be between $0.01 and $9,999' }, { status: 400 })
  }
  const newId = randomUUID()
  const baseSlug = slugify(title) || 'project'
  const slug = `${baseSlug}-${newId.slice(0, 6)}`.slice(0, 80)
  const path = `${userId}/${newId}/${randomUUID()}.zip`

  const up = await admin.storage.from('repositories').upload(path, buffer, { contentType: 'application/zip', upsert: false })
  if (up.error) return NextResponse.json({ error: up.error.message }, { status: 500 })

  const { error: insErr } = await admin.from('repositories').insert({
    id: newId,
    owner_id: userId,
    title: title || baseSlug,
    slug,
    type: paid ? 'paid' : 'free',
    price_cents: paid ? Math.round(priceUsd * 100) : null,
    storage_path: path,
    file_manifest: manifest,
    source_sha256: sha256,
    is_published: false,
  })
  if (insErr) {
    await admin.storage.from('repositories').remove([path])
    return NextResponse.json({ error: insErr.message }, { status: 500 })
  }
  await admin.from('repository_versions').insert({
    repository_id: newId, version: 'v1', changelog: changelog ?? 'Pushed from CLI', storage_path: path,
  })

  return NextResponse.json({ id: newId, slug, draft: true, url: `${origin}/listing/${newId}` })
}
