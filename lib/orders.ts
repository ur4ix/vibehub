// Shared option sets + helpers for the order board and the new-order form.

export const PROJECT_TYPES = [
  'Web app',
  'Landing',
  'Component / UI-kit',
  'Telegram bot',
  'API / backend',
  'Script / automation',
] as const
export type ProjectType = (typeof PROJECT_TYPES)[number]

// Budget buckets. `min` feeds the not-null numeric `budget` column (sorting /
// back-compat); `label` is the human range stored in `budget_range`.
export const BUDGET_RANGES = [
  { label: '$50–200', min: 50 },
  { label: '$200–500', min: 200 },
  { label: '$500–1k', min: 500 },
  { label: '$1k–3k', min: 1000 },
  { label: '$3k+', min: 3000 },
] as const

// Timelines map to `delivery_days` (null = flexible).
export const TIMELINES = [
  { label: '1–3 days', days: 3 },
  { label: 'Up to a week', days: 7 },
  { label: 'Up to a month', days: 30 },
  { label: 'Flexible', days: null },
] as const

export const SKILL_PRESETS = [
  'Next.js',
  'React',
  'Vue',
  'Node.js',
  'Python',
  'TypeScript',
  'Tailwind',
  'Supabase',
  'Postgres',
  'AI-SDK',
] as const

// Stable, cosmetic short code derived from the order id (e.g. ORD-2041).
export function orderCode(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return `ORD-${1000 + (h % 9000)}`
}

// Compact delivery label for the list rows / budget box.
export function deliveryLabel(days: number | null | undefined): string {
  if (days == null) return 'Flexible'
  if (days <= 3) return '1–3 days'
  if (days <= 7) return 'Up to a week'
  if (days <= 30) return 'Up to a month'
  return `${days} days`
}
