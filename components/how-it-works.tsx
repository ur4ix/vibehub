const STEPS = [
  {
    n: '01',
    title: 'Upload your project',
    desc: 'Add code, preview and description. We build a demo and verify everything works.',
  },
  {
    n: '02',
    title: 'Pass the review',
    desc: 'Community and automated tests check quality. Trust is our currency.',
  },
  {
    n: '03',
    title: 'Get paid',
    desc: 'Buyers pay, you receive money to a card or crypto. No delays.',
  },
]

export function HowItWorks() {
  return (
    <section id="how" className="relative border-b-2 border-border">
      <div className="pixel-grid absolute inset-0 opacity-30" aria-hidden="true" />
      <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="max-w-2xl">
          <span className="font-pixel text-[8px] uppercase tracking-wider text-primary">
            // how it works
          </span>
          <h2 className="mt-5 text-balance font-pixel text-xl leading-[1.5] sm:text-2xl sm:leading-[1.5]">
            Three steps to your first sale
          </h2>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="border-2 border-border bg-card p-6">
              <span className="font-pixel text-2xl text-primary">{s.n}</span>
              <h3 className="mt-5 font-pixel text-xs leading-relaxed">{s.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
