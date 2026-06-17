import { Award } from 'lucide-react'

export default function AdminBadgesPage() {
  return (
    <div className="flex flex-col items-center justify-center border-2 border-dashed border-border bg-card/40 px-6 py-20 text-center">
      <Award className="mb-4 h-10 w-10 text-muted-foreground/30" />
      <h2 className="font-pixel text-xs uppercase tracking-wider">Badges</h2>
      <p className="mt-3 max-w-md font-mono text-xs leading-relaxed text-muted-foreground">
        Define achievement and trust badges (verified seller, top author, early
        adopter…) and award them to users. Coming soon — the role system this
        builds on is already in place.
      </p>
    </div>
  )
}
