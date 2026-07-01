'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// Live "N/100 spots taken" for the Early Adopter banner. Counts via the public
// profiles view (anon-readable); renders nothing until the count arrives so the
// banner never flashes a wrong number.
export function EarlyAdopterCount() {
  const [taken, setTaken] = useState<number | null>(null)

  useEffect(() => {
    let active = true
    createClient()
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('early_adopter', true)
      .then(({ count }) => { if (active && typeof count === 'number') setTaken(Math.min(count, 100)) })
    return () => { active = false }
  }, [])

  if (taken === null) return null
  return (
    <span className="font-mono text-[10px] uppercase tracking-wider text-amber-400/80">
      {taken}/100 spots taken
    </span>
  )
}
