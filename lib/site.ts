// Canonical site origin, used for metadataBase, sitemap, OG images and absolute
// links. Override with NEXT_PUBLIC_SITE_URL in preview/staging if needed.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://vydex.dev').replace(/\/$/, '')
export const SITE_NAME = 'Vydex'
export const SITE_TAGLINE = 'marketplace for vibe coders'
export const SITE_DESCRIPTION =
  'Buy and sell apps, components, prompts and templates. Everything you built on vibes — now earns money.'
export const TWITTER_HANDLE = '@VydeXdev'
