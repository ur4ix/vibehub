'use client'

// Exports owed payouts as a NOWPayments mass-payout CSV. Because the Payout API
// requires IP whitelisting (and Vercel's IPs are dynamic), the safe path is:
// download this CSV → upload it in the NOWPayments dashboard from your
// whitelisted IP → come back and mark the rows paid.
//
// Template columns (NOWPayments): Ticker, Wallet Address, ExtraID,
// Amount in Crypto, Fiat Amount, Fiat Currency. We leave "Amount in Crypto"
// blank and set Fiat Amount = USD so NOWPayments computes the crypto amount.
export function PayoutCsvButton({
  rows,
}: {
  rows: { ticker: string; address: string; amount: number }[]
}) {
  function download() {
    const header = ['Ticker', 'Wallet Address', 'ExtraID', 'Amount in Crypto', 'Fiat Amount', 'Fiat Currency']
    const lines = [header.join(',')]
    for (const r of rows) {
      lines.push([r.ticker, r.address, '', '', r.amount.toFixed(2), 'USD'].join(','))
    }
    const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vydex-payouts-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (rows.length === 0) return null

  return (
    <button
      onClick={download}
      className="font-pixel border-2 border-primary bg-primary px-3 py-2 text-[9px] uppercase tracking-wider text-primary-foreground transition-all hover:brightness-110"
    >
      Export CSV ({rows.length})
    </button>
  )
}
