// Banned-word filter for user-visible content (titles, usernames, links,
// descriptions, tags…). Goals:
//   • catch normal usage and common evasion (separators, leetspeak, repeats),
//   • avoid false positives on innocent words (the "Scunthorpe problem"),
//   • stay easy to extend — just add to WORDS or STEMS below.
//
// WORDS are matched on word boundaries (after normalising separators to
// spaces), so "class"/"assistant"/"grape" are safe. STEMS are matched as
// substrings on a separator-stripped string — use these only for sequences
// that essentially never appear inside clean words (mostly Cyrillic stems and
// the harshest slurs), so they're caught even when run together inside a URL
// or handle.

// LOOSE: matched as a prefix (any trailing letters/digits), so "shit" also
// catches "shitty", "fucked", "bitches". Only put words here that aren't a
// prefix of common innocent words.
const WORDS_LOOSE: string[] = [
  'fuck', 'shit', 'bullshit', 'bitch', 'cunt', 'motherfuck', 'asshole',
  'arsehole', 'wanker', 'whore', 'slut', 'faggot', 'nigger', 'nigga',
  'tranny', 'dickhead', 'bastard', 'phishing', 'scammer', 'drainer',
]

// EXACT: matched on both boundaries, so FP-prone short words don't flag
// innocent ones ("cocktail", "rapeseed", "retardant", "raccoon"…).
const WORDS_EXACT: string[] = [
  'fuk', 'cock', 'dick', 'fag', 'coon', 'spic', 'chink', 'kike', 'nazi',
  'pussy', 'retard', 'retarded', 'rape', 'rapist', 'porn', 'pedo',
  'pedophile', 'paedophile', 'cp', 'jerkoff', 'ratware',
]

const STEMS: string[] = [
  // harshest slurs — match even when run together (urls, handles)
  'nigger', 'nigga', 'faggot',
  // RU мат (stems cover declensions; Cyrillic rarely collides)
  'хуй', 'хуя', 'хуе', 'хуё', 'хуи', 'пизд', 'бляд', 'блят', 'еба', 'ёба',
  'ебл', 'ебан', 'ебуч', 'сука', 'суки', 'залуп', 'мудак', 'мудач', 'пидор',
  'пидар', 'пидр', 'гандон', 'гондон', 'долбоеб', 'долбоёб', 'выеб', 'наеб',
  'уеба', 'манда', 'шлюх', 'хуйн', 'ублюд',
]

function normalize(input: string): string {
  return input
    .toLowerCase()
    // leetspeak → letters
    .replace(/[4@]/g, 'a')
    .replace(/3/g, 'e')
    .replace(/[1!|]/g, 'i')
    .replace(/0/g, 'o')
    .replace(/[5$]/g, 's')
    .replace(/7/g, 't')
    .replace(/8/g, 'b')
    // separators (incl. URL delimiters) → space, so "fuck_you" / "x.com/fuck"
    // split into words for boundary matching
    .replace(/[\s._\-/\\:;?&=+,#~]+/g, ' ')
    // collapse 3+ repeats: "fuuuuck" → "fuck"
    .replace(/(.)\1{2,}/g, '$1')
    .trim()
}

/** Returns the first matched banned term, or null. For internal/logging use. */
export function findBannedWord(text: string | null | undefined): string | null {
  if (!text) return null
  const norm = normalize(text)
  for (const w of WORDS_LOOSE) {
    if (new RegExp(`(^|\\s)${w}\\w*`).test(norm)) return w
  }
  for (const w of WORDS_EXACT) {
    if (new RegExp(`(^|\\s)${w}(\\s|$)`).test(norm)) return w
  }
  const stripped = norm.replace(/[^a-z0-9а-яё]/g, '')
  for (const s of STEMS) {
    if (stripped.includes(s)) return s
  }
  return null
}

/**
 * True if any provided value contains a banned word. Accepts strings and
 * string arrays (e.g. tags); nullish values are ignored.
 */
export function containsBanned(
  ...values: Array<string | null | undefined | readonly string[]>
): boolean {
  for (const v of values) {
    if (!v) continue
    const list = Array.isArray(v) ? v : [v as string]
    for (const s of list) {
      if (findBannedWord(s)) return true
    }
  }
  return false
}

/** Standard user-facing message — deliberately does not echo the term back. */
export const BANNED_MESSAGE =
  'This contains language that isn’t allowed. Please revise and try again.'
