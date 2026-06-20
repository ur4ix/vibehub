import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Branded download: clicked from vydex.dev/api/download/<id>, then transparently
// redirects to a short-lived signed Storage URL (access still enforced by RLS via
// the user's session). Optional ?v=<versionId> downloads a specific version.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const versionId = req.nextUrl.searchParams.get('v')
  const supabase = await createClient()

  let storagePath: string | null = null
  let filename = 'download.zip'

  if (versionId) {
    const { data } = await supabase
      .from('repository_versions')
      .select('storage_path, version')
      .eq('id', versionId)
      .eq('repository_id', id)
      .maybeSingle()
    const v = data as { storage_path: string; version: string } | null
    storagePath = v?.storage_path ?? null
    filename = v?.version ? `${v.version}.zip` : 'version.zip'
  } else {
    const { data } = await supabase
      .from('repositories')
      .select('storage_path, slug')
      .eq('id', id)
      .maybeSingle()
    const r = data as { storage_path: string | null; slug: string } | null
    storagePath = r?.storage_path ?? null
    filename = r?.slug ? `${r.slug}.zip` : 'repository.zip'
  }

  if (!storagePath) return new NextResponse('Not found', { status: 404 })

  // Signed URL respects Storage RLS through the caller's session.
  const { data: signed, error } = await supabase.storage
    .from('repositories')
    .createSignedUrl(storagePath, 60, { download: filename })

  if (error || !signed) return new NextResponse('Access denied', { status: 403 })
  return NextResponse.redirect(signed.signedUrl, 302)
}
