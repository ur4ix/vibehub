// Shown while a route segment's server work is in flight — no more blank screen.
export default function Loading() {
  return (
    <div className="grid min-h-screen place-items-center bg-background">
      <div className="flex flex-col items-center gap-5">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="h-3 w-3 animate-pulse bg-primary [animation-delay:0ms]" />
          <span className="h-3 w-3 animate-pulse bg-primary [animation-delay:150ms]" />
          <span className="h-3 w-3 animate-pulse bg-primary [animation-delay:300ms]" />
        </div>
        <p className="font-pixel text-[9px] uppercase tracking-wider text-muted-foreground">loading</p>
      </div>
    </div>
  )
}
