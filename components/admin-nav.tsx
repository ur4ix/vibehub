'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, Activity, Award, ShieldCheck, Wallet } from 'lucide-react'

const ITEMS = [
  { label: 'Overview',  href: '/admin',           icon: LayoutDashboard, exact: true },
  { label: 'Users',     href: '/admin/users',     icon: Users },
  { label: 'Activity',  href: '/admin/activity',  icon: Activity },
  { label: 'Badges',    href: '/admin/badges',    icon: Award },
  { label: 'Approvals', href: '/admin/approvals', icon: ShieldCheck },
  { label: 'Payouts',   href: '/admin/payouts',   icon: Wallet },
]

export function AdminNav() {
  const pathname = usePathname()

  return (
    <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible" aria-label="Admin sections">
      {ITEMS.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              'flex shrink-0 items-center gap-2.5 border-2 px-3 py-2.5 font-mono text-xs transition-all duration-100 ' +
              (active
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-card text-muted-foreground hover:border-primary hover:text-primary')
            }
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
