import { renderOg, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og'
import { SITE_TAGLINE } from '@/lib/site'

export const alt = 'Vydex — marketplace for vibe coders'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default function Image() {
  return renderOg({
    title: 'Marketplace for vibe coders',
    subtitle: 'Buy and sell what you built on vibes',
    eyebrow: SITE_TAGLINE,
  })
}
