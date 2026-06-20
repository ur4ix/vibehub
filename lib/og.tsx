import { ImageResponse } from 'next/og'
import { readFileSync } from 'fs'
import { join } from 'path'

// Shared 1200×630 social card renderer, matching the dark pixel brand.
export const OG_SIZE = { width: 1200, height: 630 }
export const OG_CONTENT_TYPE = 'image/png'

// The real Vydex mark (same as /logo.svg), inlined so it renders without a
// filesystem/network lookup at image-generation time.
const LOGO_SVG = `<svg width="1000" height="1000" viewBox="0 0 1000 1000" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="1000" height="1000" fill="#E5E5E5"/>
<rect x="250" y="150" width="200" height="100" fill="#0A0A0A"/>
<rect x="350" y="250" width="200" height="100" fill="#0A0A0A"/>
<rect x="450" y="350" width="200" height="100" fill="#0A0A0A"/>
<rect width="200" height="100" transform="matrix(1 0 0 -1 250 850)" fill="#0A0A0A"/>
<rect width="200" height="100" transform="matrix(1 0 0 -1 350 750)" fill="#0A0A0A"/>
<rect width="200" height="100" transform="matrix(1 0 0 -1 450 650)" fill="#0A0A0A"/>
<rect x="550" y="450" width="200" height="100" fill="#0A0A0A"/>
</svg>`
const LOGO_DATA_URI = `data:image/svg+xml;base64,${Buffer.from(LOGO_SVG).toString('base64')}`

// The site fonts: Press Start 2P (pixel wordmark/labels) + Geist Mono (text).
// Read from disk once and cached; satori needs raw TTF (no woff2). The files are
// kept in the serverless bundle via outputFileTracingIncludes in next.config.
let fonts: { pixel: Buffer; mono: Buffer } | null = null
function loadFonts() {
  if (!fonts) {
    const dir = join(process.cwd(), 'lib', 'fonts')
    fonts = {
      pixel: readFileSync(join(dir, 'PressStart2P-Regular.ttf')),
      mono: readFileSync(join(dir, 'GeistMono-Regular.woff')),
    }
  }
  return fonts
}

export function renderOg(opts: { eyebrow?: string; title: string; subtitle?: string; badge?: string }) {
  const { eyebrow, title, subtitle, badge } = opts
  const { pixel, mono } = loadFonts()
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#0a0a0a',
          padding: 72,
          border: '14px solid #171717',
          color: '#e5e5e5',
          fontFamily: 'Mono',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 34 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_DATA_URI} width={56} height={56} alt="" />
          <div style={{ fontFamily: 'Pixel', fontSize: 26 }}>VYDEX</div>
          {eyebrow ? <div style={{ marginLeft: 'auto', fontSize: 24, color: '#8a8a8a' }}>{eyebrow}</div> : null}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.1, display: 'flex' }}>{title}</div>
          {subtitle ? <div style={{ fontSize: 32, color: '#a3a3a3', display: 'flex' }}>{subtitle}</div> : null}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 28, color: '#8a8a8a' }}>
          <div style={{ display: 'flex' }}>vydex.dev</div>
          {badge ? (
            <div style={{ display: 'flex', fontFamily: 'Pixel', fontSize: 20, background: '#15321e', color: '#4ade80', padding: '14px 22px' }}>
              {badge}
            </div>
          ) : null}
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: 'Pixel', data: pixel, weight: 400, style: 'normal' },
        { name: 'Mono', data: mono, weight: 400, style: 'normal' },
      ],
    },
  )
}

// Trim long titles so they fit the card.
export function ogTrim(s: string, max = 80): string {
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s
}
