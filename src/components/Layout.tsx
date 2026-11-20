import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Bell, Boxes, ChevronDown, ClipboardList, Command, Factory, FileText, Gauge, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Repeat, Search, Settings, ShoppingCart, Inbox, Palette, Truck, Wrench, Users, X, Briefcase, Warehouse, type LucideIcon } from 'lucide-react'
import { useApp } from '../store'
import { useAlerts } from '../lib/alerts'
import { Avatar } from './ui'
import { cx, fmtDate } from '../lib/utils'
import { navAccess, roleLabel } from '../lib/roles'

type NavItem = { to: string; label: string; icon: LucideIcon; end?: boolean; tone: string }
type NavGroup = { id: string; title: string; icon: LucideIcon; items: NavItem[] }

/* Each module keeps its own icon colour so the menu scans by colour as
   well as by label. The active item always turns white-on-orange. */
const T = {
  blue: 'bg-[#dbeafe] text-[#1d4ed8]',
  cyan: 'bg-cyan-100 text-cyan-700',
  violet: 'bg-violet-100 text-violet-700',
  emerald: 'bg-emerald-100 text-emerald-700',
  amber: 'bg-amber-100 text-amber-700',
  orange: 'bg-[#fde3d3] text-[#b4501d]',
  rose: 'bg-rose-100 text-rose-700',
}

const groups: NavGroup[] = [
  { id: 'overview', title: 'Overview', icon: Gauge, items: [{ to: '/', label: 'Dashboard', icon: Gauge, end: true, tone: T.blue }] },
  { id: 'sales', title: 'Sales & CRM', icon: Briefcase, items: [
    { to: '/inquiries', label: 'Inquiries', icon: Inbox, tone: T.cyan },
    { to: '/quotations', label: 'Quotations', icon: FileText, tone: T.violet },
  ] },
  { id: 'ops', title: 'Projects & Production', icon: Factory, items: [
    { to: '/projects', label: 'Projects & Orders', icon: ClipboardList, tone: T.orange },
    { to: '/production', label: 'Production', icon: Factory, tone: T.rose },
    { to: '/designs', label: 'Designs', icon: Palette, tone: T.violet },
    { to: '/dispatches', label: 'Dispatches', icon: Truck, tone: T.cyan },
    { to: '/installations', label: 'Installations', icon: Wrench, tone: T.emerald },
  ] },
  { id: 'stores', title: 'Stores & Purchase', icon: Warehouse, items: [
    { to: '/stock', label: 'Stock & Materials', icon: Boxes, tone: T.amber },
    { to: '/purchase', label: 'Purchase Orders', icon: ShoppingCart, tone: T.blue },
    { to: '/consumables', label: 'Consumables', icon: Repeat, tone: T.emerald },
  ] },
  { id: 'admin', title: 'Administration', icon: Settings, items: [{ to: '/settings', label: 'Masters & Settings', icon: Settings, tone: T.violet }] },
]

const kbd = 'pointer-events-none absolute top-1/2 right-2.5 hidden -translate-y-1/2 items-center gap-0.5 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 sm:flex'
const circleBtn = 'pressable grid h-10 w-10 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-flat transition-colors hover:bg-slate-50'

export default function Layout() {
  const { db, user, logout, switchUser } = useApp()
  const [sw, setSw] = useState(false)
  const [open, setOpen] = useState(false)
  const [bell, setBell] = useState(false)
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  // Desktop icon-rail preference, remembered across visits.
  const [mini, setMini] = useState(() => { try { return localStorage.getItem('aquaflow.sidebar') === 'mini' } catch { return false } })
  const searchRef = useRef<HTMLInputElement>(null)
  const alerts = useAlerts()
  const nav2 = useNavigate()
  const loc = useLocation()

  useEffect(() => { setOpen(false); window.scrollTo(0, 0) }, [loc.pathname])
  // ⌘K / Ctrl+K focuses search from anywhere.
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); searchRef.current?.focus() } }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [])
  const toggleMini = () => setMini(m => { const n = !m; try { localStorage.setItem('aquaflow.sidebar', n ? 'mini' : 'full') } catch { /* not remembered */ } return n })

  const term = q.toLowerCase()
  const results = useMemo(() => q.length > 1 ? [
    ...db.projects.filter(p => (p.code + p.company + p.poNo).toLowerCase().includes(term)).slice(0, 4).map(p => ({ g: 'Project', t: `${p.code} · ${p.company}`, to: `/projects/${p.id}` })),
    ...db.inquiries.filter(i => (i.no + i.company + i.contact).toLowerCase().includes(term)).slice(0, 4).map(i => ({ g: 'Inquiry', t: `${i.no} · ${i.company}`, to: `/inquiries/${i.id}` })),
    ...db.quotations.filter(x => (x.no + x.company).toLowerCase().includes(term)).slice(0, 3).map(x => ({ g: 'Quote', t: `${x.no} · ${x.company}`, to: `/quotations/${x.id}` })),
  ] : [], [db, q, term])
  useEffect(() => setActive(0), [q])
  const go = (to: string) => { nav2(to); setQ(''); searchRef.current?.blur() }
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter' && results[active]) { e.preventDefault(); go(results[active].to) }
    else if (e.key === 'Escape') { setQ(''); (e.currentTarget as HTMLElement).blur() }
  }

  const badge = (to: string) => to === '/inquiries' ? [alerts.followUps.length, 'amber'] as const : to === '/consumables' ? [alerts.consumables.length, 'amber'] as const : to === '/stock' ? [alerts.lowStock.length, 'red'] as const : [0, 'amber'] as const

  return (
    <div className="app-canvas relative flex min-h-full">
      {open && <div className="animate-fade-in fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />}

      <aside aria-label="Main navigation" className={cx(
        'sidebar-chrome fixed inset-y-0 left-0 z-40 flex w-[284px] flex-col border-r border-slate-200 shadow-[0_8px_32px_-18px_rgba(223,101,39,0.35)]',
        'transition-[transform,width] duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)] lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:translate-x-0 lg:self-start lg:shadow-none',
        open ? 'translate-x-0' : '-translate-x-full', mini && 'lg:w-[84px]')}>
        <div className={cx('flex items-center gap-3.5 px-5 py-5', mini && 'lg:justify-center lg:px-0')}>
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-linear-to-br from-[#f58a4e] via-[#ed7333] to-[#d9622a] text-[14px] font-black text-white shadow-[0_10px_24px_-8px_rgba(237,115,51,0.65)] ring-1 ring-inset ring-white/40">AF</span>
          <div className={cx('min-w-0 flex-1', mini && 'lg:hidden')}>
            <p className="truncate text-[17px] leading-tight font-extrabold tracking-[-0.02em] text-ink">AquaFlow</p>
            <p className="mt-0.5 truncate text-[10.5px] font-semibold tracking-[0.2em] text-accent-600 uppercase">Enterprise ERP</p>
          </div>
          <button onClick={() => setOpen(false)} className="pressable rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-ink lg:hidden" aria-label="Close navigation"><X size={20} /></button>
        </div>

        <nav className={cx('flex-1 overflow-y-auto px-3 pb-4', mini && 'lg:px-2.5')}>
          {groups.map(g => {
            const items = g.items.filter(n => navAccess[user!.role].includes(n.to))
            if (!items.length) return null
            const closed = collapsed[g.id]
            const single = g.id === 'overview'
            return (
              <div key={g.id} className="mb-1.5">
                {!single && (
                  <button type="button" onClick={() => setCollapsed(c => ({ ...c, [g.id]: !c[g.id] }))} aria-expanded={!closed}
                    className={cx('pressable flex w-full items-center gap-3 rounded-xl p-1.5 text-left transition-colors hover:bg-slate-100', mini && 'lg:hidden')}>
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200"><g.icon size={18} /></span>
                    <span className="flex-1 truncate text-[14.5px] font-semibold text-ink">{g.title}</span>
                    <ChevronDown size={16} className={cx('shrink-0 text-slate-400 transition-transform duration-200', closed && '-rotate-90')} />
                  </button>
                )}
                <div className={cx('grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]', !closed || mini || single ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}>
                  <div className="min-h-0 overflow-hidden">
                    <ul className={cx('flex flex-col gap-0.5', !single && 'mt-1 mb-2.5 ml-[19px] border-l border-brand-100 pl-2.5', mini && 'lg:ml-0 lg:items-center lg:gap-1 lg:border-l-0 lg:pl-0', single && !mini && 'mt-0.5')}>
                      {items.map(n => {
                        const [count, bt] = badge(n.to)
                        return (
                          <li key={n.to} className={cx(mini && 'lg:w-full')}>
                            <NavLink to={n.to} end={n.end} title={n.label} className={({ isActive }) => cx(
                              'group relative flex items-center gap-2.5 rounded-xl px-1.5 py-1.5 text-[13.5px] font-medium transition-[background-color,color,translate,box-shadow] duration-200 ease-out',
                              isActive ? 'bg-linear-to-r from-[#f58a4e] via-[#ed7333] to-[#d9622a] font-semibold text-white shadow-[0_10px_22px_-8px_rgba(237,115,51,0.7)]' : 'text-slate-600 hover:translate-x-0.5 hover:bg-slate-100 hover:text-ink',
                              mini && 'lg:h-11 lg:justify-center lg:px-0')}>
                              {({ isActive }) => <>
                                <span className={cx('grid h-8 w-8 shrink-0 place-items-center rounded-[10px] transition-[transform,background-color] duration-200 group-hover:scale-105', isActive ? 'bg-white/25 text-white' : n.tone)}><n.icon size={17} /></span>
                                <span className={cx('flex-1 truncate', mini && 'lg:hidden')}>{n.label}</span>
                                {count > 0 && <span className={cx('tnum rounded-full px-1.5 py-0.5 text-[10.5px] font-bold', isActive ? 'bg-white/30 text-white' : bt === 'red' ? 'bg-rose-100 text-rose-700 ring-1 ring-inset ring-rose-200' : 'bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-200', mini && 'lg:absolute lg:-top-1 lg:-right-1 lg:min-w-4 lg:px-1 lg:text-center')}>{count}</span>}
                              </>}
                            </NavLink>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                </div>
              </div>
            )
          })}
        </nav>

        <div className={cx('m-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-200', mini && 'lg:hidden')}>
          <div className="flex items-center gap-3"><Avatar name={user!.name} size={9} /><div className="min-w-0 flex-1"><div className="truncate text-sm font-bold text-ink">{user!.name}</div><div className="truncate text-xs text-slate-500">{roleLabel[user!.role]}</div></div>
            <button onClick={() => setSw(!sw)} title="Switch user / role" className="pressable rounded-lg p-2 text-slate-500 hover:bg-slate-200/60 hover:text-ink"><Users size={16} /></button>
            <button onClick={logout} title="Sign out" className="pressable rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600"><LogOut size={16} /></button></div>
          {sw && <div className="animate-pop-in mt-3 max-h-56 space-y-0.5 overflow-y-auto border-t border-slate-200 pt-2">{db.users.map(u => <button key={u.id} onClick={() => { switchUser(u.id); setSw(false); nav2(navAccess[u.role][0]) }} className={cx('flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs transition-colors hover:bg-slate-200/60', u.id === user!.id && 'bg-brand-100 font-semibold text-brand-800')}><span>{u.name}</span><span className="text-slate-500">{roleLabel[u.role].split(' ')[0]}</span></button>)}</div>}
        </div>
      </aside>

      <div className="relative flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-[68px] items-center gap-3 border-b border-slate-200 bg-white px-4 lg:px-9">
          <button className={cx(circleBtn, 'lg:hidden')} onClick={() => setOpen(true)} aria-label="Open navigation"><Menu size={20} /></button>
          <button className={cx(circleBtn, 'hidden lg:grid')} onClick={toggleMini} aria-label={mini ? 'Expand sidebar' : 'Collapse sidebar'} title={mini ? 'Expand sidebar' : 'Collapse sidebar'}>{mini ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}</button>

          <div className="relative w-full max-w-md">
            <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input ref={searchRef} value={q} onChange={e => setQ(e.target.value)} onKeyDown={onKey} onBlur={() => setTimeout(() => setQ(''), 150)} aria-label="Search projects, inquiries and quotations" placeholder="Search projects, inquiries, quotations…"
              className="h-11 w-full rounded-[14px] border border-slate-200 bg-slate-50 pr-16 pl-10 text-[16px] text-ink transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-slate-500 hover:border-slate-300 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100 focus:outline-none sm:text-sm" />
            <kbd className={kbd}><Command size={10} />K</kbd>
            {results.length > 0 && <ul className="animate-pop-in absolute inset-x-0 top-12 z-30 max-h-80 origin-top divide-y divide-slate-200 overflow-y-auto rounded-xl bg-white shadow-panel">{results.map((r, i) => <li key={i}><button onMouseEnter={() => setActive(i)} onMouseDown={() => go(r.to)} className={cx('flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors', i === active ? 'bg-brand-50' : 'hover:bg-slate-50')}><span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-slate-500 uppercase">{r.g}</span><span className="truncate text-[13px] font-medium text-ink">{r.t}</span></button></li>)}</ul>}
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <span className="hidden text-sm text-slate-500 md:block">{fmtDate(new Date().toISOString())}</span>
            <div className="relative">
              <button onClick={() => setBell(!bell)} aria-expanded={bell} aria-label={`Reminders: ${alerts.total}`} className={cx(circleBtn, 'relative', alerts.total > 0 && !bell && 'animate-pulse-ring')}><Bell size={19} />{alerts.total > 0 && <span className="tnum absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-linear-to-b from-rose-500 to-rose-600 px-1 text-[10px] font-bold text-white ring-2 ring-white">{alerts.total > 9 ? '9+' : alerts.total}</span>}</button>
              {bell && (
                <div className="animate-pop-in absolute top-12 right-0 z-50 w-[min(360px,calc(100vw-2rem))] origin-top-right overflow-hidden rounded-xl bg-white shadow-panel" onMouseLeave={() => setBell(false)}>
                  <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-4 py-3"><p className="text-[13px] font-bold text-ink">Reminders</p><span className="text-xs text-slate-500">{fmtDate(new Date().toISOString())}</span></div>
                  <div className="max-h-80 divide-y divide-slate-200 overflow-y-auto">
                    {alerts.followUps.slice(0, 4).map(i => <button key={i.id} onClick={() => { nav2(`/inquiries/${i.id}`); setBell(false) }} className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" /><span className="min-w-0"><span className="block truncate text-[13px] font-medium text-ink">Follow-up: {i.company}</span><span className="block text-xs text-slate-500">Due {fmtDate(i.nextFollowUp)}</span></span></button>)}
                    {alerts.consumables.slice(0, 4).map((c, i) => <button key={i} onClick={() => { nav2('/consumables'); setBell(false) }} className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-sky-500" /><span className="min-w-0"><span className="block truncate text-[13px] font-medium text-ink">Consumables: {c.project.company}</span><span className="block text-xs text-slate-500">{c.item?.name} · {c.left < 0 ? `${-c.left}d overdue` : `due in ${c.left}d`}</span></span></button>)}
                  </div>
                  {alerts.total === 0 && <div className="px-4 py-6 text-center text-sm text-slate-500">You're all caught up.</div>}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2.5 rounded-full border border-slate-200 bg-white py-1 pr-3.5 pl-1 shadow-flat">
              <Avatar name={user!.name} size={8} />
              <span className="hidden leading-tight sm:block"><span className="block text-[11.5px] font-bold text-ink">{user!.name}</span><span className="block text-[10px] text-slate-500">{roleLabel[user!.role]}</span></span>
            </div>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 lg:px-9 lg:py-8"><div key={loc.pathname} className="page-enter mx-auto w-full max-w-[1640px]"><Outlet /></div></main>
      </div>
    </div>
  )
}
