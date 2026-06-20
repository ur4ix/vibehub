import { NextRequest, NextResponse } from 'next/server'

// Query OSV.dev (free, no key) for known vulnerabilities in the given
// dependencies. Server-side to avoid CORS and keep it cheap. Returns short
// human-readable finding strings.
interface Dep { name: string; version: string; ecosystem?: string }

export async function POST(req: NextRequest) {
  let deps: Dep[] = []
  try {
    const body = await req.json()
    deps = Array.isArray(body?.deps) ? body.deps : []
  } catch {
    return NextResponse.json({ findings: [] })
  }
  if (deps.length === 0) return NextResponse.json({ findings: [] })

  const slice = deps.slice(0, 400)
  const queries = slice.map((d) => ({
    package: { name: d.name, ecosystem: d.ecosystem || 'npm' },
    version: d.version,
  }))

  try {
    const res = await fetch('https://api.osv.dev/v1/querybatch', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ queries }),
    })
    if (!res.ok) return NextResponse.json({ findings: [] })
    const json = (await res.json()) as { results?: { vulns?: { id: string }[] }[] }

    const findings: string[] = []
    json.results?.forEach((r, i) => {
      const vulns = r.vulns
      if (vulns && vulns.length > 0) {
        const ids = vulns.map((v) => v.id).slice(0, 4).join(', ')
        const more = vulns.length > 4 ? ` +${vulns.length - 4}` : ''
        findings.push(`${slice[i].name}@${slice[i].version} — ${ids}${more}`)
      }
    })
    return NextResponse.json({ findings: findings.slice(0, 50) })
  } catch {
    return NextResponse.json({ findings: [] })
  }
}
