import { useEffect, type ButtonHTMLAttributes, type MouseEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cx, initials } from '../lib/utils'

/* One confident solid fill per intent, each with its own soft glow so it
   reads as a physical control. Only `primary` is allowed to be loud. */
type BV = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent'
export function Button({ variant = 'primary', size = 'md', className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BV; size?: 'sm' | 'md' }) {
  const v: Record<BV, string> = {
    primary: 'btn-sheen bg-linear-to-b from-[#f1823f] to-[#e0662a] text-white shadow-[0_10px_24px_-8px_rgba(237,115,51,0.6),inset_0_1px_0_0_rgba(255,255,255,0.25)] hover:from-[#f58a4e] hover:to-[#ed7333] hover:shadow-[0_14px_28px_-8px_rgba(237,115,51,0.7),inset_0_1px_0_0_rgba(255,255,255,0.3)]',
    accent: 'btn-sheen bg-linear-to-b from-accent-400 to-accent-600 text-white shadow-[0_10px_24px_-8px_rgba(245,158,11,0.6),inset_0_1px_0_0_rgba(255,255,255,0.3)] hover:from-amber-300 hover:to-accent-500',
    secondary: 'bg-white text-slate-700 shadow-flat hover:bg-slate-50 hover:text-ink hover:shadow-card',
    ghost: 'text-slate-600 hover:bg-slate-100 hover:text-ink',
    danger: 'bg-linear-to-b from-red-50 to-red-100/70 text-red-700 ring-1 ring-inset ring-red-200 hover:from-red-100 hover:to-red-200/70',
  }
  return <button {...p} className={cx('pressable relative inline-flex select-none items-center justify-center gap-1.5 rounded-lg font-semibold tracking-[-0.01em] whitespace-nowrap disabled:pointer-events-none disabled:opacity-55 disabled:shadow-none disabled:saturate-50', size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-[13.5px]', v[variant], className)} />
}

/* Glass panel: translucent white, hairline ring, soft shadow. */
export function Card({ children, className, pad = true, onClick }: { children: ReactNode; className?: string; pad?: boolean; onClick?: () => void }) {
  return <div onClick={onClick} className={cx('relative rounded-2xl bg-white/90 shadow-card ring-1 ring-white/60', pad && 'p-5', className)}>{children}</div>
}

/* Section title with a coloured accent rule, as in the reference. */
const accents = { brand: 'from-[#f28c4c] to-[#c4531c]', gold: 'from-amber-400 to-amber-600', green: 'from-emerald-500 to-emerald-700', red: 'from-rose-500 to-rose-700', blue: 'from-sky-400 to-sky-600' }
export function CardTitle({ children, accent = 'brand', icon }: { children: ReactNode; accent?: keyof typeof accents; icon?: ReactNode }) {
  return <h3 className="flex items-center gap-2 text-[15px] font-bold tracking-[-0.015em] text-ink"><span className={cx('h-4 w-1 rounded-full bg-linear-to-b', accents[accent])} aria-hidden="true" />{icon}{children}</h3>
}

/* Soft two-stop tint plus matching ring: a table of badges reads as a
   coloured legend rather than grey pills. */
const tones = {
  slate: 'bg-linear-to-b from-slate-50 to-slate-200/70 text-slate-700 ring-slate-300',
  blue: 'bg-linear-to-b from-sky-100 to-sky-200/80 text-sky-900 ring-sky-300',
  green: 'bg-linear-to-b from-emerald-100 to-emerald-200/80 text-emerald-900 ring-emerald-300',
  amber: 'bg-linear-to-b from-amber-100 to-amber-200/80 text-amber-900 ring-amber-300',
  red: 'bg-linear-to-b from-rose-100 to-rose-200/80 text-rose-900 ring-rose-300',
  purple: 'bg-linear-to-b from-violet-100 to-violet-200/80 text-violet-900 ring-violet-300',
  teal: 'bg-linear-to-b from-[#d3f2ee] to-[#a9e3dc]/80 text-[#0b4f49] ring-[#7fd0c6]',
  indigo: 'bg-linear-to-b from-brand-100 to-brand-200/80 text-brand-800 ring-brand-300',
}
export type Tone = keyof typeof tones
export const Badge = ({ children, tone = 'slate', className }: { children: ReactNode; tone?: Tone; className?: string }) =>
  <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-[3px] text-[11px] font-bold whitespace-nowrap ring-1 ring-inset', tones[tone], className)}>{children}</span>

export function Modal({ title, subtitle, onClose, children, width = 'max-w-2xl', footer }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode; width?: string; footer?: ReactNode }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [onClose])
  // Portalled to <body> so no animated or blurred ancestor can clip the overlay to the page area.
  return createPortal(
    <div className="animate-fade-in fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/55 p-4 sm:p-8" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className={cx('animate-slide-up w-full rounded-3xl bg-white shadow-modal', width)}>
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
          <div><h2 className="text-lg font-extrabold tracking-[-0.02em] text-ink">{title}</h2>{subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}</div>
          <button onClick={onClose} className="pressable rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-ink"><X size={18} /></button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-2 rounded-b-3xl border-t border-slate-200 bg-slate-50 px-6 py-3">{footer}</div>}
      </div>
    </div>
  , document.body)
}

export const Field = ({ label, children, className, hint }: { label: string; children: ReactNode; className?: string; hint?: string }) =>
  <div className={className}><label className="lbl">{label}</label>{children}{hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}</div>

export function PageHeader({ title, subtitle, actions, eyebrow, icon }: { title: string; subtitle?: string; actions?: ReactNode; eyebrow?: string; icon?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="flex items-center gap-3.5">
        {icon && <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-linear-to-br from-[#f58a4e] via-[#ed7333] to-[#d9622a] text-white shadow-[0_10px_24px_-8px_rgba(237,115,51,0.65)] ring-1 ring-inset ring-white/40">{icon}</span>}
        <div>
          {eyebrow && <p className="mb-0.5 text-[10.5px] font-bold uppercase tracking-[0.2em] text-accent-600">{eyebrow}</p>}
          <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-ink">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">{actions}</div>
    </div>
  )
}

/* KPI tile: a tone-coloured wash fading down from the top edge, a drifting
   orb behind the glass, and a spotlight that follows the pointer. */
const statTones = {
  brand: { tile: 'bg-brand-100/70 text-brand-700 ring-brand-200', glow: '#ed7333' },
  amber: { tile: 'bg-amber-100/70 text-amber-700 ring-amber-200', glow: '#f59e0b' },
  green: { tile: 'bg-emerald-100/70 text-emerald-700 ring-emerald-200', glow: '#10b981' },
  red: { tile: 'bg-rose-100/70 text-rose-700 ring-rose-200', glow: '#ef4444' },
  violet: { tile: 'bg-violet-100/70 text-violet-700 ring-violet-200', glow: '#8b5cf6' },
  blue: { tile: 'bg-sky-100/70 text-sky-700 ring-sky-200', glow: '#0ea5e9' },
}
export function Stat({ label, value, sub, icon, tone = 'brand' }: { label: string; value: ReactNode; sub?: ReactNode; icon: ReactNode; tone?: keyof typeof statTones }) {
  const t = statTones[tone]
  const track = (e: MouseEvent<HTMLElement>) => {
    const b = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--mx', `${e.clientX - b.left}px`)
    e.currentTarget.style.setProperty('--my', `${e.clientY - b.top}px`)
  }
  return (
    <div onMouseMove={track} className="group lift relative flex h-full items-start gap-3.5 overflow-hidden rounded-2xl bg-white/85 p-4 shadow-card ring-1 ring-white/70">
      <span className="pointer-events-none absolute -top-10 -right-8 h-28 w-28 rounded-full opacity-25 blur-2xl" style={{ background: t.glow }} aria-hidden="true" />
      <span className="pointer-events-none absolute inset-0" style={{ backgroundImage: `linear-gradient(160deg, ${t.glow}1f 0%, ${t.glow}0a 55%, transparent 100%)` }} aria-hidden="true" />
      <span className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ backgroundImage: `radial-gradient(180px circle at var(--mx, 50%) var(--my, 50%), ${t.glow}30, transparent 70%)` }} aria-hidden="true" />
      <span className="pointer-events-none absolute inset-x-4 top-0 h-px bg-linear-to-r from-transparent via-white/90 to-transparent" aria-hidden="true" />
      <div className={cx('relative grid h-10 w-10 shrink-0 place-items-center rounded-xl ring-1 ring-inset', t.tile)}>{icon}</div>
      <div className="relative min-w-0">
        <div className="text-[24px] leading-none font-extrabold tracking-[-0.03em] text-ink">{value}</div>
        <div className="mt-1 truncate text-[13px] leading-tight font-semibold text-slate-600">{label}</div>
        {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
      </div>
    </div>
  )
}

export const Empty = ({ icon, title, text, action }: { icon?: ReactNode; title: string; text?: string; action?: ReactNode }) =>
  <div className="flex flex-col items-center justify-center py-12 text-center"><div className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-400 ring-1 ring-inset ring-slate-200">{icon}</div><div className="font-bold text-slate-800">{title}</div>{text && <p className="mt-1 max-w-sm text-sm text-slate-500">{text}</p>}{action && <div className="mt-4">{action}</div>}</div>

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string; badge?: ReactNode }[]; value: T; onChange: (t: T) => void }) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} className={cx('relative flex items-center gap-2 whitespace-nowrap px-4 py-2.5 text-sm font-semibold transition-colors duration-150', value === t.id ? 'text-brand-700' : 'text-slate-500 hover:text-ink')}>
          {t.label}{t.badge}
          {value === t.id && <span className="animate-fade-in absolute inset-x-2 -bottom-px h-0.5 rounded bg-linear-to-r from-[#f58a4e] to-[#d9622a]" />}
        </button>
      ))}
    </div>
  )
}

const avColors = ['from-[#f58a4e] to-[#d9622a]', 'from-sky-400 to-sky-600', 'from-violet-400 to-violet-600', 'from-amber-400 to-amber-600', 'from-rose-400 to-rose-600', 'from-teal-400 to-teal-600', 'from-emerald-400 to-emerald-600']
export const Avatar = ({ name, size = 8 }: { name: string; size?: number }) => {
  const c = avColors[(name.charCodeAt(0) + name.length) % avColors.length]
  return <span className={cx('grid shrink-0 place-items-center rounded-full bg-linear-to-br text-[11px] font-bold text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25)] ring-2 ring-amber-300/60', c)} style={{ width: size * 4, height: size * 4 }}>{initials(name)}</span>
}

export const Progress = ({ value, className }: { value: number; className?: string }) =>
  <div className={cx('h-2 overflow-hidden rounded-full bg-slate-100', className)}><div className="h-full rounded-full bg-linear-to-r from-brand-400 to-brand-600 transition-[width] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]" style={{ width: `${Math.min(100, value)}%` }} /></div>

export const SearchBox = ({ value, onChange, placeholder = 'Search…' }: { value: string; onChange: (v: string) => void; placeholder?: string }) =>
  <input className="inp !w-64 !bg-slate-50 focus:!bg-white" placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} />
