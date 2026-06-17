import { ShieldCheck } from 'lucide-react'

export default function AdminApprovalsPage() {
  return (
    <div className="flex flex-col items-center justify-center border-2 border-dashed border-border bg-card/40 px-6 py-20 text-center">
      <ShieldCheck className="mb-4 h-10 w-10 text-muted-foreground/30" />
      <h2 className="font-pixel text-xs uppercase tracking-wider">Approvals</h2>
      <p className="mt-3 max-w-md font-mono text-xs leading-relaxed text-muted-foreground">
        Review queue for things that need a human before going live — flagged
        listings, payout requests, seller verification and code-scan results.
        Coming soon, alongside the escrow and scanning pipeline.
      </p>
    </div>
  )
}
