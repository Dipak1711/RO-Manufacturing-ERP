import type { ReactNode } from 'react'
import { TriangleAlert } from 'lucide-react'
import { Card } from './ui'

/* One labelled control with an inline error, so a mistake is explained where it happened. */
export function F({ label, required, error, hint, children, className }: { label: string; required?: boolean; error?: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="lbl">{label}{required && <span className="ml-0.5 text-rose-500">*</span>}</label>
      {children}
      {error ? <p className="field-error mt-1 flex items-center gap-1 text-xs font-medium text-rose-600"><TriangleAlert size={12} />{error}</p> : hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  )
}
export const bad = (e?: string) => (e ? 'border-rose-400 bg-rose-50/40 focus:border-rose-500 focus:ring-rose-500/20' : '')

/* Numbered section card: the number, icon and title make the form read top to bottom. */
export function Panel({ n, icon, title, subtitle, aside, children }: { n: number; icon: ReactNode; title: string; subtitle: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <Card pad={false}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
        <div className="flex items-center gap-3.5">
          <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-100/70 text-brand-700 ring-1 ring-inset ring-brand-200">{icon}<span className="absolute -top-1.5 -left-1.5 grid h-5 w-5 place-items-center rounded-full bg-linear-to-br from-[#f58a4e] to-[#d9622a] text-[10px] font-extrabold text-white ring-2 ring-white">{n}</span></span>
          <div><h3 className="text-[15.5px] font-extrabold tracking-[-0.02em] text-ink">{title}</h3><p className="text-xs text-slate-500">{subtitle}</p></div>
        </div>
        {aside}
      </div>
      <div className="px-6 py-5">{children}</div>
    </Card>
  )
}
export const Icon = ({ icon, children }: { icon: ReactNode; children: ReactNode }) => <div className="relative"><span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400">{icon}</span>{children}</div>
export const Unit = ({ unit, children }: { unit: string; children: ReactNode }) => <div className="relative">{children}<span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm font-semibold text-slate-400">{unit}</span></div>
