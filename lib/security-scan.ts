// Heuristic static security scan for uploaded code.
//
// IMPORTANT: this is NOT antivirus and NOT proof of safety. It flags *patterns*
// commonly seen in malware / stealers / drainers / leaked secrets so buyers and
// moderators can take a closer look. It can miss things and can false-positive
// (e.g. a legit CLI tool that shells out). Real AV (VirusTotal/ClamAV) would be
// a server-side addition.

export type Severity = 'high' | 'medium' | 'low'

export interface SecurityRule {
  id: string
  label: string
  severity: Severity
  description: string
  test: RegExp
}

export const SECURITY_RULES: SecurityRule[] = [
  // ── high ──────────────────────────────────────────────────────────────────
  { id: 'dynamic-eval', severity: 'high', label: 'Obfuscated code execution',
    description: 'Runs code decoded at runtime (eval(atob/Buffer.from/…)) — a classic payload loader.',
    test: /\b(eval\s*\(\s*(atob|Buffer\.from|unescape|decodeURIComponent|String\.fromCharCode)|new\s+Function\s*\(\s*(atob|Buffer\.from))/i },
  { id: 'obfuscated-ids', severity: 'high', label: 'Obfuscated identifiers',
    description: 'Uses _0x…-style names typical of obfuscated/minified malware.',
    test: /_0x[0-9a-f]{4,}/i },
  { id: 'telegram-exfil', severity: 'high', label: 'Telegram exfiltration',
    description: 'Calls api.telegram.org/bot… — a common data-exfiltration channel.',
    test: /api\.telegram\.org\/bot[0-9]/i },
  { id: 'discord-webhook', severity: 'high', label: 'Discord webhook',
    description: 'Posts to a Discord webhook — common for stealers exfiltrating data.',
    test: /discord(app)?\.com\/api\/webhooks\//i },
  { id: 'reverse-shell', severity: 'high', label: 'Reverse shell',
    description: 'Reverse-shell pattern (/dev/tcp, nc -e, bash -i >&).',
    test: /\/dev\/tcp\/\d|nc\s+-e\s|bash\s+-i\s+>&/ },
  { id: 'curl-pipe-sh', severity: 'high', label: 'Remote script to shell',
    description: 'Pipes a downloaded script straight into a shell (curl … | sh).',
    test: /(curl|wget)\s+[^\n|]*\|\s*(sudo\s+)?(sh|bash)\b/i },
  { id: 'env-exfil', severity: 'high', label: 'Dumps environment',
    description: 'Serializes all environment variables (JSON.stringify(process.env)).',
    test: /JSON\.stringify\(\s*process\.env\b/ },
  { id: 'private-key', severity: 'high', label: 'Private key committed',
    description: 'A private key is embedded in the source.',
    test: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |)PRIVATE KEY-----/ },
  { id: 'powershell-enc', severity: 'high', label: 'Encoded PowerShell',
    description: 'Runs a base64-encoded PowerShell command (-enc).',
    test: /powershell(\.exe)?\b[^\n]*-e(nc|ncodedcommand)?\s+[A-Za-z0-9+/=]{24,}/i },

  // ── medium ────────────────────────────────────────────────────────────────
  { id: 'shell-exec', severity: 'medium', label: 'Runs shell commands',
    description: 'Executes OS commands (child_process / exec / spawn / subprocess).',
    test: /\b(child_process|exec(Sync)?\s*\(|spawn(Sync)?\s*\(|execFile\s*\(|os\.system\s*\(|subprocess\.(Popen|call|run)|Runtime\.getRuntime\(\)\.exec)/ },
  { id: 'plain-eval', severity: 'medium', label: 'Uses eval()',
    description: 'Executes dynamic code via eval()/new Function().',
    test: /\beval\s*\(|new\s+Function\s*\(/ },
  { id: 'base64-blob', severity: 'medium', label: 'Large base64 blob',
    description: 'Contains a long base64 string — could be a packed payload.',
    test: /(['"`])[A-Za-z0-9+/]{500,}={0,2}\1/ },
  { id: 'aws-key', severity: 'medium', label: 'AWS key committed',
    description: 'Looks like an AWS access key in the source.',
    test: /\bAKIA[0-9A-Z]{16}\b/ },
  { id: 'anon-host', severity: 'medium', label: 'Anonymous file host',
    description: 'References an anonymous paste/file host (pastebin raw, anonfiles, transfer.sh).',
    test: /(pastebin\.com\/raw|anonfiles\.com|transfer\.sh|paste\.ee)/i },

  // ── low ───────────────────────────────────────────────────────────────────
  { id: 'clipboard', severity: 'low', label: 'Clipboard access',
    description: 'Reads/writes the clipboard (watch for address-swapping drainers).',
    test: /navigator\.clipboard\.(readText|writeText)/ },
]

export const SECURITY_CATALOG: Record<string, SecurityRule> =
  Object.fromEntries(SECURITY_RULES.map((r) => [r.id, r]))

export interface SecurityFlag {
  id: string
  label: string
  severity: Severity
  description: string
  file: string
}

// Files worth scanning (text/code; skip binaries + dependency/build dirs).
export const SCAN_EXT = /\.(js|jsx|ts|tsx|mjs|cjs|py|rb|go|rs|php|sh|bash|ps1|bat|cmd|java|kt|c|h|cpp|cs|html|htm|vue|svelte|sql|env|sol|lua)$/i
const SKIP_PATH = /(^|\/)(node_modules|\.git|dist|build|\.next|vendor|out)(\/|$)/i

export function shouldScan(path: string): boolean {
  return SCAN_EXT.test(path) && !SKIP_PATH.test(path)
}

const SEV_RANK: Record<Severity, number> = { high: 0, medium: 1, low: 2 }

/** Run every rule over each file; return one flag per rule (first hit), sorted by severity. */
export function scanCode(files: { path: string; content: string }[]): SecurityFlag[] {
  const found = new Map<string, SecurityFlag>()
  for (const f of files) {
    for (const r of SECURITY_RULES) {
      if (found.has(r.id)) continue
      if (r.test.test(f.content)) {
        found.set(r.id, { id: r.id, label: r.label, severity: r.severity, description: r.description, file: f.path })
      }
    }
  }
  return [...found.values()].sort((a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity])
}

export const SEVERITY_STYLE: Record<Severity, string> = {
  high:   'border-destructive/60 bg-destructive/10 text-destructive',
  medium: 'border-amber-400/50 bg-amber-400/10 text-amber-400',
  low:    'border-blue-400/50 bg-blue-400/10 text-blue-400',
}
