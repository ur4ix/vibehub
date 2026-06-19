// Badge system.
//
//   • EARNED badges are derived on the fly from public stats (no storage) —
//     always accurate, awarded automatically.
//   • MANUAL badges (partner brands, specials) are admin-assigned and stored
//     in public.account_badges.

export interface BadgeDef {
  key: string
  label: string
  description: string
  /** chip styling */
  className: string
}

export interface BadgeStats {
  createdAt: string
  reputation: number
  publishedRepos: number
  followers: number
  reviewsWritten: number
}

// Joined on/before this date → Early Adopter.
const EARLY_ADOPTER_CUTOFF = '2026-12-01'

const EARNED: (BadgeDef & { earned: (s: BadgeStats) => boolean })[] = [
  {
    key: 'early-adopter', label: 'Early Adopter',
    description: 'Joined Vydex in its first season.',
    className: 'border-amber-400/50 bg-amber-400/10 text-amber-400',
    earned: (s) => new Date(s.createdAt) <= new Date(EARLY_ADOPTER_CUTOFF),
  },
  {
    key: 'creator', label: 'Creator',
    description: 'Published their first project.',
    className: 'border-primary/50 bg-primary/10 text-primary',
    earned: (s) => s.publishedRepos >= 1,
  },
  {
    key: 'prolific', label: 'Prolific',
    description: 'Published 10+ projects.',
    className: 'border-primary/50 bg-primary/10 text-primary',
    earned: (s) => s.publishedRepos >= 10,
  },
  {
    key: 'reviewer', label: 'Reviewer',
    description: 'Left 5+ reviews for the community.',
    className: 'border-blue-400/50 bg-blue-400/10 text-blue-400',
    earned: (s) => s.reviewsWritten >= 5,
  },
  {
    key: 'popular', label: 'Popular',
    description: '25+ followers.',
    className: 'border-blue-400/50 bg-blue-400/10 text-blue-400',
    earned: (s) => s.followers >= 25,
  },
  {
    key: 'reputable', label: 'Reputable',
    description: 'Earned 50+ reputation from sales & reviews.',
    className: 'border-green-400/50 bg-green-400/10 text-green-400',
    earned: (s) => s.reputation >= 50,
  },
  {
    key: 'veteran', label: 'Veteran',
    description: 'Earned 200+ reputation.',
    className: 'border-green-400/50 bg-green-400/10 text-green-400',
    earned: (s) => s.reputation >= 200,
  },
]

export function earnedBadges(s: BadgeStats): BadgeDef[] {
  return EARNED
    .filter((b) => b.earned(s))
    .map((b) => ({ key: b.key, label: b.label, description: b.description, className: b.className }))
}

// Admin-assignable badges. Keys are stored in account_badges.badge.
const PARTNER = 'border-primary/60 bg-primary/10 text-primary'
const SPECIAL = 'border-amber-400/60 bg-amber-400/10 text-amber-400'

export const MANUAL_BADGES: Record<string, BadgeDef> = {
  claude:    { key: 'claude',    label: 'Claude',    description: 'Partner: Anthropic Claude', className: PARTNER },
  anthropic: { key: 'anthropic', label: 'Anthropic', description: 'Partner: Anthropic',       className: PARTNER },
  openai:    { key: 'openai',    label: 'OpenAI',    description: 'Partner: OpenAI',           className: PARTNER },
  gemini:    { key: 'gemini',    label: 'Gemini',    description: 'Partner: Google Gemini',    className: PARTNER },
  cursor:    { key: 'cursor',    label: 'Cursor',    description: 'Partner: Cursor',           className: PARTNER },
  v0:        { key: 'v0',        label: 'v0',        description: 'Partner: Vercel v0',        className: PARTNER },
  vercel:    { key: 'vercel',    label: 'Vercel',    description: 'Partner: Vercel',           className: PARTNER },
  copilot:   { key: 'copilot',   label: 'Copilot',   description: 'Partner: GitHub Copilot',   className: PARTNER },
  figma:     { key: 'figma',     label: 'Figma',     description: 'Partner: Figma',            className: PARTNER },
  founder:   { key: 'founder',   label: 'Founder',   description: 'Vydex founding team',       className: SPECIAL },
  verified:  { key: 'verified',  label: 'Verified',  description: 'Verified account',          className: SPECIAL },
}

export const MANUAL_BADGE_KEYS = Object.keys(MANUAL_BADGES)

/** Map stored badge keys to their definitions (unknown keys are ignored). */
export function manualBadges(keys: string[]): BadgeDef[] {
  return keys.map((k) => MANUAL_BADGES[k]).filter(Boolean)
}
