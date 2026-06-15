'use client'

import {
  createContext, useCallback, useContext, useEffect, useRef, useState,
} from 'react'
import { X } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  type: ToastType
  title: string
  body?: string
}

interface ToastContextValue {
  toast: (opts: Omit<Toast, 'id'>) => void
  success: (title: string, body?: string) => void
  error: (title: string, body?: string) => void
  info: (title: string, body?: string) => void
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}

// ─── Provider ─────────────────────────────────────────────────────────────────

const ICONS: Record<ToastType, string> = {
  success: '✦',
  error:   '✕',
  info:    '◈',
}

const BORDER_COLORS: Record<ToastType, string> = {
  success: 'border-primary',
  error:   'border-destructive',
  info:    'border-border',
}

const ICON_COLORS: Record<ToastType, string> = {
  success: 'text-primary',
  error:   'text-destructive',
  info:    'text-muted-foreground',
}

const DURATION = 4000

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [leaving, setLeaving] = useState(false)

  const dismiss = useCallback(() => {
    setLeaving(true)
    setTimeout(() => onDismiss(toast.id), 250)
  }, [toast.id, onDismiss])

  useEffect(() => {
    timerRef.current = setTimeout(dismiss, DURATION)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [dismiss])

  return (
    <div
      className={
        'flex w-80 items-start gap-3 border-2 bg-card px-4 py-3.5 pixel-shadow-border transition-all duration-200 ' +
        BORDER_COLORS[toast.type] +
        (leaving ? ' translate-x-2 opacity-0' : ' translate-x-0 opacity-100')
      }
      role="alert"
    >
      <span className={`mt-0.5 shrink-0 font-pixel text-[11px] leading-none ${ICON_COLORS[toast.type]}`}>
        {ICONS[toast.type]}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-pixel text-[9px] uppercase leading-relaxed tracking-wider text-foreground">
          {toast.title}
        </p>
        {toast.body && (
          <p className="mt-1 font-mono text-[10px] leading-relaxed text-muted-foreground">
            {toast.body}
          </p>
        )}
      </div>
      <button
        onClick={dismiss}
        className="mt-0.5 shrink-0 text-muted-foreground transition-colors hover:text-foreground"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback((opts: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev.slice(-4), { ...opts, id }])
  }, [])

  const ctx: ToastContextValue = {
    toast: addToast,
    success: (title, body) => addToast({ type: 'success', title, body }),
    error: (title, body) => addToast({ type: 'error', title, body }),
    info: (title, body) => addToast({ type: 'info', title, body }),
  }

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      {/* Portal — fixed bottom-right */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed bottom-5 right-5 z-[200] flex flex-col items-end gap-2.5"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}
