// Heuristic "AI signals" — tell-tale config files left by AI coding tools.
// These are clues, not proof: detecting AI-authored code reliably isn't
// possible, so we only surface which tools' footprints we found.

const RULES: { test: RegExp; label: string }[] = [
  { test: /(^|\/)\.cursor(\/|$)|(^|\/)\.cursor(rules|ignore)$/i, label: 'Cursor' },
  { test: /(^|\/)claude\.md$|(^|\/)\.claude(\/|$)/i,             label: 'Claude' },
  { test: /(^|\/)\.windsurf(rules)?(\/|$)/i,                     label: 'Windsurf' },
  { test: /(^|\/)\.aider/i,                                      label: 'Aider' },
  { test: /copilot-instructions/i,                              label: 'Copilot' },
  { test: /(^|\/)\.bolt(\/|$)/i,                                 label: 'Bolt' },
  { test: /(^|\/)\.replit$|(^|\/)replit\.nix$/i,                 label: 'Replit' },
  { test: /(^|\/)\.continue(rc)?(\/|$)/i,                        label: 'Continue' },
  { test: /(^|\/)agents\.md$/i,                                  label: 'AI agents' },
  { test: /(^|\/)\.v0(\/|$)|(^|\/)v0\.config\./i,                label: 'v0' },
]

/** Returns the sorted, de-duplicated list of AI tools whose footprints appear in the file paths. */
export function scanAiSignals(paths: string[]): string[] {
  const found = new Set<string>()
  for (const p of paths) {
    for (const r of RULES) {
      if (r.test.test(p)) found.add(r.label)
    }
  }
  return [...found].sort()
}
