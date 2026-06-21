// A pixel divider between landing blocks: a hairline broken by a small square
// triad, with the centre square in the brand accent.
export function SectionDivider() {
  return (
    <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 sm:px-6" aria-hidden="true">
      <span className="h-px flex-1 bg-border" />
      <span className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 bg-border" />
        <span className="h-2 w-2 bg-primary" />
        <span className="h-1.5 w-1.5 bg-border" />
      </span>
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}
