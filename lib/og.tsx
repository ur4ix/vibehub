import { ImageResponse } from 'next/og'

// Shared 1200×630 social card renderer, matching the dark pixel brand.
export const OG_SIZE = { width: 1200, height: 630 }
export const OG_CONTENT_TYPE = 'image/png'

export function renderOg(opts: { eyebrow?: string; title: string; subtitle?: string; badge?: string }) {
  const { eyebrow, title, subtitle, badge } = opts
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
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 34 }}>
          <div
            style={{
              width: 52,
              height: 52,
              background: '#e5e5e5',
              color: '#0a0a0a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: 30,
            }}
          >
            V
          </div>
          <div style={{ fontWeight: 800, letterSpacing: 4 }}>VYDEX</div>
          {eyebrow ? <div style={{ marginLeft: 'auto', fontSize: 26, color: '#8a8a8a' }}>{eyebrow}</div> : null}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05, display: 'flex' }}>{title}</div>
          {subtitle ? <div style={{ fontSize: 34, color: '#a3a3a3', display: 'flex' }}>{subtitle}</div> : null}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 28, color: '#8a8a8a' }}>
          <div style={{ display: 'flex' }}>vydex.dev</div>
          {badge ? (
            <div style={{ display: 'flex', background: '#15321e', color: '#4ade80', padding: '12px 24px', fontWeight: 700 }}>
              {badge}
            </div>
          ) : null}
        </div>
      </div>
    ),
    { ...OG_SIZE },
  )
}

// Trim long titles so they fit the card.
export function ogTrim(s: string, max = 80): string {
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s
}
