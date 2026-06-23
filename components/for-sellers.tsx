import Link from 'next/link'

const PERKS = [
  {
    icon: '◈',
    title: 'Flat 10% fee',
    body: (
      <>
        Keep <span className="text-green-400">~90%</span> of every sale. No listing
        fees, no monthly cost, no surprises.
      </>
    ),
  },
  {
    icon: '◇',
    title: 'Crypto payouts',
    body: (
      <>
        Paid in <span className="text-green-400">USDT / USDC</span> straight to your
        wallet — global, fast, no cards or chargebacks.
      </>
    ),
  },
  {
    icon: '▣',
    title: 'Escrow-protected',
    body: 'Buyers pay into escrow; funds release to you once they confirm. Disputes go to moderators.',
  },
  {
    icon: '◎',
    title: 'Found by buyers',
    body: 'Every listing gets its own page, search visibility and a social card. Share a link, pull traffic.',
  },
  {
    icon: '▦',
    title: 'Scanned for trust',
    body: 'Each upload runs a code + dependency-vulnerability scan, so buyers trust what they download.',
  },
  {
    icon: '☰',
    title: 'Minutes to publish',
    body: 'ZIP, preview, price — done. No gatekeeping, no review queue before you go live.',
  },
]

export function ForSellers() {
  return (
    <section id="sellers" className="border-b-2 border-border">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="max-w-2xl">
          <span className="font-pixel text-[8px] uppercase tracking-wider text-primary">
            {'// for sellers'}
          </span>
          <h2 className="mt-5 text-balance font-pixel text-xl leading-[1.5] sm:text-2xl sm:leading-[1.5]">
            Your code, your price, your payout
          </h2>
          <p className="mt-5 text-pretty leading-relaxed text-muted-foreground">
            Ship what you built on vibes and actually get paid for it — without
            gatekeepers, card processors, or a cut that eats your margin.
          </p>
        </div>

        <div className="mt-8 inline-flex flex-wrap items-center gap-x-3 gap-y-1 border-2 border-amber-400/50 bg-amber-400/5 px-4 py-3">
          <span className="font-pixel text-[9px] uppercase tracking-wider text-amber-400">Early Adopter</span>
          <span className="font-mono text-xs text-foreground">
            First 100 sellers get the badge + <span className="text-amber-400">0% platform fee for life</span>.
          </span>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PERKS.map((p) => (
            <div
              key={p.title}
              className="border-2 border-border bg-card p-6 transition-all duration-100 hover:-translate-x-1 hover:-translate-y-1 hover:border-primary pixel-shadow-border"
            >
              <span
                className="grid h-12 w-12 place-items-center border-2 border-border bg-secondary font-pixel text-lg text-primary"
                aria-hidden="true"
              >
                {p.icon}
              </span>
              <h3 className="mt-5 font-pixel text-xs leading-relaxed">{p.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <Link
            href="/upload"
            className="font-pixel inline-flex items-center justify-center gap-2 border-2 px-6 py-4 text-[10px] uppercase leading-none tracking-wider border-primary bg-primary text-primary-foreground pixel-shadow-border transition-all duration-100 hover:brightness-110 active:translate-x-1 active:translate-y-1 active:shadow-none"
          >
            Publish a project →
          </Link>
          <p className="font-mono text-xs text-muted-foreground">
            Free to start. You set the price — free or paid.
          </p>
        </div>
      </div>
    </section>
  )
}
