'use client'

import * as ToastPrimitive from '@radix-ui/react-toast'
import { createContext, useCallback, useContext, useState } from 'react'

type Variant = 'default' | 'success' | 'error'

type ToastItem = {
  id: number
  title: string
  description?: string
  variant: Variant
}

type ToastInput = { title: string; description?: string; variant?: Variant }
type ToastFn = (t: ToastInput) => void

const ToastContext = createContext<ToastFn | null>(null)

export function useToast(): ToastFn {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>')
  return ctx
}

const ACCENT: Record<Variant, string> = {
  default: 'var(--blue)',
  success: 'var(--green)',
  error: 'var(--red)',
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const toast = useCallback<ToastFn>(({ title, description, variant = 'default' }) => {
    setToasts(prev => [...prev, { id: Date.now() + Math.random(), title, description, variant }])
  }, [])

  return (
    <ToastContext.Provider value={toast}>
      <ToastPrimitive.Provider swipeDirection="right" duration={4000}>
        {children}

        {toasts.map(t => (
          <ToastPrimitive.Root
            key={t.id}
            onOpenChange={open => {
              if (!open) setToasts(prev => prev.filter(x => x.id !== t.id))
            }}
            className="bg-white border border-[var(--border)] rounded-[10px] shadow-[0_4px_16px_rgba(0,0,0,0.12)] px-4 py-3 flex items-start gap-3 data-[state=open]:animate-in data-[state=closed]:animate-out"
            style={{ borderLeft: `3px solid ${ACCENT[t.variant]}` }}
          >
            <div className="flex-1 min-w-0">
              <ToastPrimitive.Title className="text-[13px] font-semibold text-[var(--t900)]">
                {t.title}
              </ToastPrimitive.Title>
              {t.description && (
                <ToastPrimitive.Description className="text-[12px] text-[var(--t500)] mt-0.5">
                  {t.description}
                </ToastPrimitive.Description>
              )}
            </div>
            <ToastPrimitive.Close
              aria-label="Dismiss"
              className="flex-shrink-0 text-[var(--t300)] hover:text-[var(--t700)] leading-none text-[16px]"
            >
              ×
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}

        <ToastPrimitive.Viewport className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 w-[340px] max-w-[calc(100vw-2rem)] outline-none" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  )
}
