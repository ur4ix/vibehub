// Renders an OSV finding string, turning advisory IDs (GHSA/CVE/GO/PYSEC/RUSTSEC)
// into links to osv.dev so people can read the details.
const SPLIT = /(GHSA-\w{4}-\w{4}-\w{4}|CVE-\d{4}-\d{4,}|GO-\d{4}-\d+|PYSEC-\d{4}-\d+|RUSTSEC-\d{4}-\d+|GMS-\d+)/gi
const IS_ID = /^(GHSA-\w{4}-\w{4}-\w{4}|CVE-\d{4}-\d{4,}|GO-\d{4}-\d+|PYSEC-\d{4}-\d+|RUSTSEC-\d{4}-\d+|GMS-\d+)$/i

export function VulnFinding({ text }: { text: string }) {
  return (
    <>
      {text.split(SPLIT).map((part, i) =>
        IS_ID.test(part) ? (
          <a
            key={i}
            href={`https://osv.dev/vulnerability/${part}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-dotted underline-offset-2 hover:no-underline"
          >
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  )
}
