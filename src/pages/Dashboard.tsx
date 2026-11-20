import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Boxes, ChevronRight, ClipboardList, Factory, FileText, Gauge, Inbox, IndianRupee, Package, Plus, Repeat, Rocket, ShoppingCart, Truck, Wallet, Wrench } from 'lucide-react'
import { useApp, userName } from '../store'
import { addDays, cx, daysBetween, fmtDate, inrShort, today } from '../lib/utils'
import { Avatar, Card, CardTitle, PageHeader } from '../components/ui'
import { paidOf, quoteTotals } from '../lib/calc'
import { REMIND_BEFORE } from '../lib/alerts'
import { roleLabel } from '../lib/roles'
import { STAGES, type EventLog, type PStatus, type Stage } from '../types'

const ranges = [['all', 'All time'], ['30', '30 days'], ['90', '90 days'], ['180', '6 months']] as const
const STAGE_HEX: Record<Stage, string> = { New: '#0ea5e9', Contacted: '#6366f1', 'Water Report Received': '#8b5cf6', Quoted: '#f59e0b', Negotiation: '#f97316', Won: '#10b981', Lost: '#ef4444' }
const BUILD: { key: PStatus; label: string; color: string }[] = [
  { key: 'Order Confirmed', label: 'New order', color: '#38bdf8' }, { key: 'Procurement', label: 'Buying material', color: '#fbbf24' },
  { key: 'In Production', label: 'Being built', color: '#a78bfa' }, { key: 'Ready for Dispatch', label: 'Ready to ship', color: '#34d399' },
]
const EVENT_ICON: Record<EventLog['kind'], { icon: typeof Inbox; tone: string }> = {
  inquiry: { icon: Inbox, tone: 'bg-sky-100 text-sky-600' }, quote: { icon: FileText, tone: 'bg-violet-100 text-violet-600' }, order: { icon: Rocket, tone: 'bg-brand-100 text-brand-700' },
  payment: { icon: Wallet, tone: 'bg-emerald-100 text-emerald-600' }, boq: { icon: ClipboardList, tone: 'bg-amber-100 text-amber-600' }, po: { icon: ShoppingCart, tone: 'bg-sky-100 text-sky-600' },
  production: { icon: Factory, tone: 'bg-rose-100 text-rose-600' }, dispatch: { icon: Truck, tone: 'bg-cyan-100 text-cyan-600' }, install: { icon: Wrench, tone: 'bg-emerald-100 text-emerald-600' },
  consumable: { icon: Repeat, tone: 'bg-violet-100 text-violet-600' }, stock: { icon: Boxes, tone: 'bg-amber-100 text-amber-600' },
}
const timeAgo = (ts: string) => { const m = (Date.now() - new Date(ts).getTime()) / 60000; return m < 60 ? `${Math.max(1, Math.round(m))}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : m < 43200 ? `${Math.round(m / 1440)}d ago` : fmtDate(ts) }

/* ---------- small building blocks (no chart library needed) ---------- */

/** Counts up from 0 on load; shows the final value at once if the user prefers reduced motion. */
function useCountUp(target: number, ms = 800) {
  const [v, setV] = useState(0)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setV(target); return }
    let raf = 0; const t0 = performance.now()
    const tick = (t: number) => { const k = Math.min(1, (t - t0) / ms); setV(Math.round(target * (1 - Math.pow(1 - k, 3)))); if (k < 1) raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return v
}
const Num = ({ value, fmt = (n: number) => n.toLocaleString('en-IN') }: { value: number; fmt?: (n: number) => string }) => <>{fmt(useCountUp(value))}</>

/** A bar that grows to its value after mount. */
function GrowBar({ pct, from, to, h = 8 }: { pct: number; from: string; to: string; h?: number }) {
  const [on, setOn] = useState(false)
  useEffect(() => { const id = requestAnimationFrame(() => setOn(true)); return () => cancelAnimationFrame(id) }, [])
  return <div className="overflow-hidden rounded-full bg-white/10" style={{ height: h }}><div className="h-full rounded-full" style={{ width: on ? `${Math.max(0, Math.min(100, pct))}%` : '0%', background: `linear-gradient(90deg, ${from}, ${to})`, boxShadow: `0 0 14px ${to}88`, transition: 'width 1.1s cubic-bezier(0.16,1,0.3,1)' }} /></div>
}

/** Tiny white trend line for coloured tiles. */
function Spark({ values, h = 'h-12' }: { values: number[]; h?: string }) {
  const W = 220, H = 48, max = Math.max(...values, 1)
  const xs = values.map((_, i) => (i * W) / Math.max(values.length - 1, 1)), ys = values.map(v => H - 5 - (v / max) * (H - 12))
  let line = `M ${xs[0]} ${ys[0]}`
  for (let i = 1; i < xs.length; i++) { const m = (xs[i - 1] + xs[i]) / 2; line += ` C ${m} ${ys[i - 1]}, ${m} ${ys[i]}, ${xs[i]} ${ys[i]}` }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={cx(h, 'w-full')} preserveAspectRatio="none" aria-hidden="true">
      <defs><linearGradient id="sparkFill2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity="0.4" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient></defs>
      <path d={`${line} L ${W} ${H} L 0 ${H} Z`} fill="url(#sparkFill2)" />
      <path d={line} fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" pathLength={1} strokeDasharray="1" className="dash-draw" />
    </svg>
  )
}

/** Full-bleed coloured KPI tile with glass icon, count-up number and decorative shapes. */
function Tile({ gradient, glow, icon, label, children, foot, onClick }: { gradient: string; glow: string; icon: ReactNode; label: string; children: ReactNode; foot?: ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="lift group relative flex min-h-[92px] flex-col overflow-hidden rounded-2xl p-3 text-left text-white" style={{ background: gradient, boxShadow: `0 18px 36px -18px ${glow}` }}>
      <span className="pointer-events-none absolute -top-10 -right-10 h-36 w-36 rounded-full bg-white/15 transition-transform duration-500 group-hover:scale-125" aria-hidden="true" />
      <span className="pointer-events-none absolute -right-2 -bottom-12 h-28 w-28 rounded-full bg-white/10" aria-hidden="true" />
      <div className="relative flex items-center justify-between"><span className="text-[12px] font-bold tracking-[0.08em] text-white/85 uppercase">{label}</span><span className="grid h-9 w-9 place-items-center rounded-xl bg-white/20 ring-1 ring-white/30">{icon}</span></div>
      <div className="tnum relative mt-0.5 text-[24px] leading-none font-extrabold tracking-[-0.03em]">{children}</div>
      <div className="relative mt-auto pt-2 text-xs font-semibold text-white/85">{foot}</div>
    </button>
  )
}

export default function Dashboard() {
  const { db, user } = useApp()
  const [range, setRange] = useState('all'), [sp, setSp] = useState('all'), [pr, setPr] = useState('all')
  const showSales = user!.role !== 'Stores'
  const from = range === 'all' ? '0000' : addDays(today(), -Number(range))
  const d = useMemo(() => {
    const t = today()
    const inqBase = db.inquiries.filter(i => (sp === 'all' || i.assignedTo === sp) && (pr === 'all' || i.productId === pr))
    const inq = inqBase.filter(i => i.date >= from)
    const open = inq.filter(i => i.stage !== 'Won' && i.stage !== 'Lost')
    const followUps = inqBase.filter(i => i.nextFollowUp && i.nextFollowUp <= t && i.stage !== 'Won' && i.stage !== 'Lost')
    const quotes = db.quotations.filter(q => q.date >= from && (pr === 'all' || q.productId === pr) && (sp === 'all' || db.inquiries.find(i => i.id === q.inquiryId)?.assignedTo === sp))
    const projs = db.projects.filter(p => (pr === 'all' || p.productId === pr) && (sp === 'all' || p.owner === sp))
    const active = projs.filter(p => p.status !== 'Commissioned')
    const prod = projs.filter(p => ['In Production', 'Ready for Dispatch'].includes(p.status))
    const upcoming = projs.filter(p => !p.dispatch).sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate))
    const pay = projs.flatMap(p => p.payments.filter(m => m.status !== 'Received').map(m => ({ p, m, due: m.amount - paidOf(m) })))
    // aggregated shortage across active BOQs
    const req: Record<string, number> = {}
    projs.filter(p => p.boqGenerated && !['Dispatched', 'Commissioned'].includes(p.status)).forEach(p => p.boq.filter(b => !b.issued).forEach(b => { req[b.itemId] = (req[b.itemId] || 0) + b.qty }))
    const shortages = Object.entries(req).map(([id, q]) => { const it = db.stock.find(s => s.id === id)!; return { it, q, short: Math.max(0, q - it.stock) } }).filter(x => x.short > 0).sort((a, b) => b.short * b.it.lastRate - a.short * a.it.lastRate)
    const cons = projs.flatMap(p => p.consumables.map(c => ({ p, c, left: daysBetween(t, addDays(c.lastSupplied, c.intervalDays)), it: db.stock.find(s => s.id === c.itemId)! }))).filter(x => x.left <= REMIND_BEFORE + 5).sort((a, b) => a.left - b.left)
    const months = Array.from({ length: 6 }, (_, k) => { const dt = new Date(); dt.setDate(1); dt.setMonth(dt.getMonth() - (5 - k)); const key = dt.toISOString().slice(0, 7); return { key, label: dt.toLocaleString('en-IN', { month: 'short' }), n: inqBase.filter(i => i.date.startsWith(key)).length } })
    return { inq, open, followUps, quotes, projs, active, prod, upcoming, pay, shortages, cons, months }
  }, [db, sp, pr, from])

  const sales = db.users.filter(u => u.role === 'Sales').map(u => { const a = d.inq.filter(i => i.assignedTo === u.id); const won = a.filter(i => i.stage === 'Won').length; return { u, total: a.length, open: a.filter(i => i.stage !== 'Won' && i.stage !== 'Lost').length, won, conv: a.length ? Math.round(won / a.length * 100) : 0 } })
  const receivable = d.pay.reduce((s, x) => s + x.due, 0)
  const pendingQuotes = d.quotes.filter(q => q.status === 'Draft' || q.status === 'Sent')
  const hr = new Date().getHours()

  const nav = useNavigate()
  const greet = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening'
  const [day, setDay] = useState(0)
  const [tab, setTab] = useState<'deliveries' | 'stock' | 'payments' | 'renewals'>('deliveries')

  // ---- numbers ----
  const factory = d.projs.filter(p => BUILD.some(b => b.key === p.status)).sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate))
  const progOf = (p: (typeof factory)[number]) => (p.updates.length ? p.updates[p.updates.length - 1].progress : 0)
  const avgProg = factory.length ? Math.round(factory.reduce((a, p) => a + progOf(p), 0) / factory.length) : 0
  const allMilestones = d.projs.flatMap(p => p.payments)
  const billed = allMilestones.reduce((a, m) => a + m.amount, 0), collected = allMilestones.reduce((a, m) => a + paidOf(m), 0)
  const collectPct = billed ? Math.round((collected / billed) * 100) : 0
  const wonRev = d.projs.reduce((a, p) => a + p.value, 0)
  const pipelineValue = pendingQuotes.reduce((s, x) => s + quoteTotals(x).total, 0)
  const soon = d.upcoming.filter(p => daysBetween(today(), p.deliveryDate) <= 14).length
  const monthVals = d.months.map(m => m.n)
  const stageRows = STAGES.map(s => { const items = d.inq.filter(i => i.stage === s); return { s, n: items.length, v: items.reduce((a, i) => a + i.value, 0) } })
  const flow = stageRows.filter(r => r.s !== 'Lost'), flowTotal = Math.max(flow.reduce((a, r) => a + r.n, 0), 1)
  const won = stageRows.find(r => r.s === 'Won')!.n, lost = stageRows.find(r => r.s === 'Lost')!.n
  const convPct = d.inq.length ? Math.round((won / d.inq.length) * 100) : 0
  const feed = [...db.events].sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, 7)

  // ---- the week strip ----
  const openInq = db.inquiries.filter(i => i.stage !== 'Won' && i.stage !== 'Lost' && (sp === 'all' || i.assignedTo === sp) && (pr === 'all' || i.productId === pr))
  const week = useMemo(() => Array.from({ length: 7 }, (_, k) => {
    const date = addDays(today(), k), dt = new Date(date + 'T00:00:00')
    const fu = openInq.filter(i => i.nextFollowUp && (k === 0 ? i.nextFollowUp <= date : i.nextFollowUp === date))
    const dl = d.upcoming.filter(p => (k === 0 ? p.deliveryDate <= date : p.deliveryDate === date))
    return { k, date, wd: dt.toLocaleDateString('en-IN', { weekday: 'short' }), dn: dt.getDate(), fu, dl }
  }), [openInq, d.upcoming]) // eslint-disable-line react-hooks/exhaustive-deps
  const sel = week[day]
  const dayItems: { key: string; title: string; sub: string; to: string; tone: string; label: string }[] = [
    ...sel.fu.map(i => ({ key: 'f' + i.id, title: i.company, sub: `${i.no} · ${userName(db, i.assignedTo).split(' ')[0]}`, to: `/inquiries/${i.id}`, tone: 'bg-amber-100 text-amber-800', label: i.nextFollowUp! < today() ? 'Late follow-up' : 'Follow-up' })),
    ...sel.dl.map(p => ({ key: 'd' + p.id, title: p.company, sub: `${p.code} · ${p.capacity}`, to: `/projects/${p.id}`, tone: 'bg-emerald-100 text-emerald-800', label: 'Delivery' })),
  ]

  const actions = [
    { label: 'New inquiry', icon: <Inbox size={18} />, to: '/inquiries/new', grad: 'from-sky-400 to-sky-600', show: showSales },
    { label: 'New quotation', icon: <FileText size={18} />, to: '/quotations/new', grad: 'from-violet-400 to-violet-600', show: showSales },
    { label: 'Production', icon: <Factory size={18} />, to: '/production', grad: 'from-[#f58a4e] to-[#d9622a]', show: true },
    { label: 'Stock', icon: <Package size={18} />, to: '/stock', grad: 'from-emerald-400 to-emerald-600', show: true },
  ].filter(a => a.show)

  const attention = {
    deliveries: { n: d.upcoming.length, label: 'Deliveries' }, stock: { n: d.shortages.length, label: 'Low stock' },
    payments: { n: d.pay.length, label: 'Payments' }, renewals: { n: d.cons.filter(c => c.left <= REMIND_BEFORE).length, label: 'Renewals' },
  }

  return (
    <>
      {/* The first screen: header, shortcuts and the live board fill exactly one viewport; everything else is below the fold. */}
      <div className="flex flex-col xl:min-h-[calc(100vh-102px)]">
      <div className="-mb-2"><PageHeader eyebrow={`${roleLabel[user!.role]} · ${fmtDate(today())}`} icon={<Gauge size={20} />} title={`${greet}, ${user!.name.split(' ')[0]}`}
        actions={<>
          <div className="flex rounded-xl bg-white p-0.5 shadow-flat">{ranges.map(([k, l]) => <button key={k} onClick={() => setRange(k)} className={cx('rounded-[10px] px-3 py-1.5 text-sm font-semibold transition-colors', range === k ? 'bg-linear-to-b from-[#f1823f] to-[#e0662a] text-white shadow-[0_6px_14px_-6px_rgba(237,115,51,0.7)]' : 'text-slate-500 hover:bg-slate-100 hover:text-ink')}>{l}</button>)}</div>
          {showSales && <select aria-label="Salesperson" className="inp !w-auto" value={sp} onChange={e => setSp(e.target.value)}><option value="all">All salespeople</option>{db.users.filter(u => u.role === 'Sales').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select>}
          <select aria-label="Product" className="inp !w-auto" value={pr} onChange={e => setPr(e.target.value)}><option value="all">All products</option>{db.products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        </>} /></div>

      {/* Quick actions */}
      <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {actions.map(a => (
          <button key={a.label} onClick={() => nav(a.to)} className="lift group flex items-center gap-3 rounded-2xl bg-white/90 p-1.5 text-left shadow-card ring-1 ring-white/70">
            <span className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-linear-to-br text-white shadow-[0_8px_16px_-8px_rgba(15,23,42,0.5)] transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6', a.grad)}>{a.icon}</span>
            <span className="min-w-0 flex-1 text-sm font-extrabold tracking-[-0.01em] text-ink">{a.label}</span><Plus size={16} className="text-slate-300 transition-colors group-hover:text-brand-500" />
          </button>))}
      </div>

      {/* Bento */}
      <div className="grid gap-4 xl:flex-1 xl:grid-cols-12">
        {/* Factory live — the one dark panel */}
        <section className="relative flex flex-col overflow-hidden rounded-3xl p-4 text-white shadow-[0_28px_56px_-24px_rgba(15,22,38,0.8)] xl:col-span-5 xl:row-span-2" style={{ background: 'radial-gradient(520px 260px at 100% 0%, rgba(237,115,51,0.35), transparent 65%), radial-gradient(420px 260px at 0% 100%, rgba(99,102,241,0.25), transparent 65%), linear-gradient(160deg, #111a2e, #0b1220)' }}>
          <div className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '28px 28px' }} aria-hidden="true" />
          <div className="relative flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[17px] font-extrabold tracking-[-0.02em]"><Factory size={19} className="text-[#f58a4e]" /> Factory live</h2>
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-2.5 py-1 text-[11px] font-bold tracking-wider text-emerald-300 ring-1 ring-emerald-400/30"><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" /></span>LIVE</span>
          </div>
          <div className="relative mt-3 grid grid-cols-3 gap-2.5">
            {[{ v: factory.length, l: factory.length === 1 ? 'Plant in work' : 'Plants in work', f: undefined }, { v: avgProg, l: 'Average done', f: (n: number) => `${n}%` }, { v: soon, l: 'Ship in 14 days', f: undefined }].map(x => (
              <div key={x.l} className="rounded-2xl bg-white/[0.07] p-3 ring-1 ring-white/10"><div className="tnum text-[28px] leading-none font-extrabold tracking-[-0.03em]"><Num value={x.v} fmt={x.f} /></div><div className="mt-1 text-[11px] font-semibold text-white/60">{x.l}</div></div>))}
          </div>
          <ul className="relative mt-3 space-y-1.5">
            {factory.map(p => { const st = BUILD.find(b => b.key === p.status)!, pg = progOf(p), left = daysBetween(today(), p.deliveryDate); return (
              <li key={p.id}><Link to={`/projects/${p.id}`} className="group block rounded-xl px-2.5 py-2 transition-colors hover:bg-white/[0.06]">
                <div className="flex items-center justify-between gap-3"><div className="min-w-0"><div className="truncate font-bold">{p.company}</div><div className="mt-0.5 flex items-center gap-2 text-[11px] text-white/60"><span className="h-2 w-2 rounded-full" style={{ background: st.color }} />{st.label} · {p.code}</div></div>
                  <div className="shrink-0 text-right"><div className="tnum text-[20px] leading-none font-extrabold" style={{ color: st.color }}>{pg}%</div><div className={cx('mt-0.5 text-[11px] font-semibold', left < 0 ? 'text-rose-300' : 'text-white/55')}>{left < 0 ? `${-left}d late` : left === 0 ? 'Due today' : `${left}d left`}</div></div></div>
                <div className="mt-2"><GrowBar pct={pg} from={st.color + 'aa'} to={st.color} h={6} /></div>
              </Link></li>) })}
            {!factory.length && <li className="rounded-2xl border border-dashed border-white/20 py-10 text-center text-sm text-white/50">No plants being built right now.</li>}
          </ul>
          {/* Where every order sits, pinned to the bottom of the panel */}
          <div className="relative mt-auto pt-3">
            <div className="mb-1.5 text-[11px] font-bold tracking-[0.14em] text-white/50 uppercase">Orders by stage</div>
            <div className="flex h-2 overflow-hidden rounded-full bg-white/10">{BUILD.map(b => { const n = factory.filter(p => p.status === b.key).length; return n > 0 && <span key={b.key} className="h-full" style={{ flexGrow: n, flexBasis: 0, background: b.color }} /> })}</div>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">{BUILD.map(b => <div key={b.key} className="flex items-center justify-between text-[12px]"><span className="flex items-center gap-2 text-white/70"><span className="h-2 w-2 rounded-full" style={{ background: b.color }} />{b.label}</span><span className="tnum font-extrabold">{factory.filter(p => p.status === b.key).length}</span></div>)}</div>
          </div>
        </section>

        {/* Coloured KPI tiles */}
        <div className="grid grid-cols-2 gap-4 xl:col-span-7">
          <Tile gradient="linear-gradient(135deg,#f58a4e,#e0602a 60%,#b9431a)" glow="rgba(237,115,51,0.7)" icon={<IndianRupee size={18} />} label="Order value" onClick={() => nav('/projects')}
            foot={<div className="flex items-end justify-between gap-3"><span>from {d.projs.length} {d.projs.length === 1 ? 'project' : 'projects'}</span><div className="w-24"><Spark values={monthVals} h="h-7" /></div></div>}><Num value={wonRev} fmt={inrShort} /></Tile>
          {showSales
            ? <Tile gradient="linear-gradient(135deg,#6366f1,#7c3aed 60%,#5b21b6)" glow="rgba(99,102,241,0.7)" icon={<Inbox size={18} />} label="Inquiries" onClick={() => nav('/inquiries')}
                foot={<span>{d.open.length} open · {won} won · {convPct}% win rate</span>}><Num value={d.inq.length} /></Tile>
            : <Tile gradient="linear-gradient(135deg,#6366f1,#7c3aed 60%,#5b21b6)" glow="rgba(99,102,241,0.7)" icon={<Factory size={18} />} label="Active projects" onClick={() => nav('/projects')}
                foot={<span>{d.projs.length} in total</span>}><Num value={d.active.length} /></Tile>}
          <Tile gradient="linear-gradient(135deg,#10b981,#0d9488 60%,#0f766e)" glow="rgba(16,185,129,0.7)" icon={<Wallet size={18} />} label="Cash collected" onClick={() => nav('/projects')}
            foot={<div><div className="mb-1 flex justify-between"><span>{collectPct}% of {inrShort(billed)}</span><span>{inrShort(receivable)} due</span></div><div className="h-1.5 overflow-hidden rounded-full bg-white/25"><div className="h-full rounded-full bg-white transition-[width] duration-1000" style={{ width: `${collectPct}%` }} /></div></div>}><Num value={collected} fmt={inrShort} /></Tile>
          <Tile gradient="linear-gradient(135deg,#f43f5e,#e11d48 60%,#be123c)" glow="rgba(244,63,94,0.7)" icon={<ShoppingCart size={18} />} label="Items to buy" onClick={() => nav('/stock')}
            foot={<span>{d.shortages.length ? 'Short in stock for open orders' : 'Everything is in stock'}</span>}><Num value={d.shortages.length} /></Tile>
        </div>

        {/* Week strip */}
        <Card pad={false} className="xl:col-span-7">
          <div className="flex items-center justify-between px-4 pt-3.5"><CardTitle accent="gold">This week</CardTitle><div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500"><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" />Follow-ups</span><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />Deliveries</span></div></div>
          <div className="mt-2 grid grid-cols-7 gap-1.5 px-3">
            {week.map(w => { const n = w.fu.length + w.dl.length; return (
              <button key={w.k} onClick={() => setDay(w.k)} className={cx('pressable flex flex-col items-center gap-0.5 rounded-xl py-1 transition-colors', day === w.k ? 'bg-linear-to-b from-[#f1823f] to-[#e0662a] text-white shadow-[0_10px_20px_-10px_rgba(237,115,51,0.8)]' : 'bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-brand-50')}>
                <span className={cx('text-[11px] font-bold uppercase', day === w.k ? 'text-white/80' : 'text-slate-400')}>{w.k === 0 ? 'Today' : w.wd}</span>
                <span className="tnum text-[17px] leading-none font-extrabold">{w.dn}</span>
                <span className="flex h-2 items-center gap-1">{w.fu.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />}{w.dl.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}{n === 0 && <span className={cx('h-1 w-3 rounded-full', day === w.k ? 'bg-white/40' : 'bg-slate-200')} />}</span>
              </button>) })}
          </div>
          <ul className="space-y-0.5 px-3 pt-2.5 pb-3">
            {dayItems.slice(0, 2).map(x => (
              <li key={x.key}><Link to={x.to} className="group flex items-center gap-3 rounded-xl px-3 py-1 transition-colors hover:bg-brand-50/60"><span className={cx('shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold', x.tone)}>{x.label}</span><span className="min-w-0 flex-1"><span className="block truncate font-bold text-ink">{x.title}</span><span className="block truncate text-xs text-slate-500">{x.sub}</span></span><ChevronRight size={16} className="text-slate-300 transition-transform group-hover:translate-x-1" /></Link></li>))}
            {dayItems.length > 2 && <li className="px-3 text-xs font-semibold text-slate-400">+{dayItems.length - 2} more</li>}
            {!dayItems.length && <li className="py-4 text-center text-sm text-slate-400">Nothing planned for this day.</li>}
          </ul>
        </Card>
      </div>

      </div>

      {/* Pipeline + live activity */}
      <div className="mt-5 grid gap-5 xl:grid-cols-12">
        {showSales && (
          <Card className="xl:col-span-7">
            <div className="flex items-center justify-between"><CardTitle>Sales pipeline</CardTitle><Link to="/inquiries" className="text-sm font-semibold text-brand-600 transition-colors hover:text-brand-800">Open board <ArrowRight size={14} className="inline" /></Link></div>
            <div className="mt-5 flex h-11 overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200">
              {flow.map(r => r.n > 0 && <div key={r.s} title={`${r.s}: ${r.n}`} className="grid place-items-center text-[13px] font-extrabold text-white transition-[flex-grow] duration-700" style={{ flexGrow: r.n, flexBasis: 0, background: `linear-gradient(180deg, ${STAGE_HEX[r.s]}, ${STAGE_HEX[r.s]}cc)` }}>{r.n}</div>)}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {flow.map(r => (
                <div key={r.s} className="lift rounded-2xl p-3 ring-1 ring-inset" style={{ background: `${STAGE_HEX[r.s]}12`, boxShadow: `inset 0 0 0 1px ${STAGE_HEX[r.s]}33` }}>
                  <div className="flex items-center gap-1.5 text-[12px] font-bold" style={{ color: STAGE_HEX[r.s] }}><span className="h-2 w-2 rounded-full" style={{ background: STAGE_HEX[r.s] }} />{r.s}</div>
                  <div className="mt-1 flex items-baseline justify-between"><span className="tnum text-[24px] leading-none font-extrabold text-ink">{r.n}</span><span className="tnum text-xs font-semibold text-slate-500">{inrShort(r.v)}</span></div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/70"><div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${(r.n / flowTotal) * 100}%`, background: STAGE_HEX[r.s] }} /></div>
                </div>))}
            </div>
            <p className="mt-4 border-t border-slate-200 pt-3 text-sm text-slate-500"><b className="text-emerald-600">{won} won</b> · <b className="text-rose-500">{lost} lost</b> · {convPct}% of inquiries become orders · {inrShort(pipelineValue)} in open quotations</p>
          </Card>
        )}

        <Card pad={false} className={showSales ? 'xl:col-span-5' : 'xl:col-span-12'}>
          <div className="flex items-center justify-between px-5 pt-5"><CardTitle accent="blue">What just happened</CardTitle><span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />Live</span></div>
          <ol className="relative px-5 py-4 before:absolute before:top-6 before:bottom-6 before:left-[37px] before:w-px before:bg-slate-200">
            {feed.map(e => { const ev = EVENT_ICON[e.kind]; const Ic = ev.icon; return (
              <li key={e.id} className="relative flex gap-3 pb-4 last:pb-0"><span className={cx('relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full ring-4 ring-white', ev.tone)}><Ic size={15} /></span>
                <div className="min-w-0 pt-0.5"><p className="text-[13px] leading-snug font-semibold text-ink">{e.text}</p><p className="mt-0.5 text-[11px] text-slate-400">{timeAgo(e.ts)}</p></div></li>) })}
            {!feed.length && <p className="py-6 text-center text-sm text-slate-400">No activity yet.</p>}
          </ol>
        </Card>
      </div>

      {/* Needs attention (tabs) + team */}
      <div className="mt-5 grid gap-5 xl:grid-cols-12">
        <Card pad={false} className={showSales ? 'xl:col-span-8' : 'xl:col-span-12'}>
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5"><CardTitle accent="red">Needs attention</CardTitle>
            <div className="flex rounded-xl bg-slate-100 p-0.5">{(Object.keys(attention) as (keyof typeof attention)[]).map(k => <button key={k} onClick={() => setTab(k)} className={cx('flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-[13px] font-semibold transition-colors', tab === k ? 'bg-white text-ink shadow-flat' : 'text-slate-500 hover:text-ink')}>{attention[k].label}<span className={cx('tnum rounded-full px-1.5 text-[11px] font-bold', tab === k ? 'bg-brand-100 text-brand-700' : 'bg-slate-200 text-slate-500')}>{attention[k].n}</span></button>)}</div>
          </div>
          <div className="px-5 py-4">
            {tab === 'deliveries' && <ul className="divide-y divide-slate-200">{d.upcoming.slice(0, 5).map(p => { const n = daysBetween(today(), p.deliveryDate); return (
              <li key={p.id}><Link to={`/projects/${p.id}`} className="flex items-center justify-between gap-3 py-2.5"><span className="min-w-0"><span className="block truncate font-bold text-ink">{p.company}</span><span className="block text-xs text-slate-500">{p.code} · {fmtDate(p.deliveryDate)}</span></span><span className={cx('shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ring-inset', n < 0 ? 'bg-rose-50 text-rose-700 ring-rose-200' : n <= 7 ? 'bg-amber-50 text-amber-800 ring-amber-200' : 'bg-slate-50 text-slate-600 ring-slate-200')}>{n < 0 ? `${-n}d late` : n === 0 ? 'Today' : `in ${n}d`}</span></Link></li>) })}{!d.upcoming.length && <p className="py-8 text-center text-sm text-slate-400">No deliveries scheduled.</p>}</ul>}
            {tab === 'stock' && <ul className="grid gap-x-8 gap-y-4 sm:grid-cols-2">{d.shortages.slice(0, 6).map(s => (
              <li key={s.it.id}><div className="mb-1 flex justify-between gap-2 text-sm"><span className="truncate font-semibold text-ink">{s.it.name}</span><span className="shrink-0 text-xs font-bold text-rose-600">need {s.short} more</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-linear-to-r from-rose-400 to-rose-600" style={{ width: `${Math.min(100, (s.it.stock / Math.max(s.q, 1)) * 100)}%` }} /></div><div className="mt-0.5 text-[11px] text-slate-500">{s.it.stock} in stock of {s.q} {s.it.unit} needed</div></li>))}{!d.shortages.length && <p className="py-8 text-center text-sm text-slate-400 sm:col-span-2">Everything needed is in stock.</p>}</ul>}
            {tab === 'payments' && <ul className="divide-y divide-slate-200">{d.pay.slice(0, 5).map((x, i) => (
              <li key={i}><Link to={`/projects/${x.p.id}`} className="flex items-center justify-between gap-3 py-2.5"><span className="min-w-0"><span className="block truncate font-bold text-ink">{x.p.company}</span><span className="block truncate text-xs text-slate-500">{x.p.code} · {x.m.label}</span></span><span className="tnum shrink-0 text-[16px] font-extrabold text-ink">{inrShort(x.due)}</span></Link></li>))}{!d.pay.length && <p className="py-8 text-center text-sm text-slate-400">No payments waiting.</p>}</ul>}
            {tab === 'renewals' && <ul className="divide-y divide-slate-200">{d.cons.slice(0, 5).map((c, i) => (
              <li key={i}><Link to="/consumables" className="flex items-center justify-between gap-3 py-2.5"><span className="min-w-0"><span className="block truncate font-bold text-ink">{c.p.company}</span><span className="block truncate text-xs text-slate-500">{c.c.qty} × {c.it.name}</span></span><span className={cx('shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ring-inset', c.left < 0 ? 'bg-rose-50 text-rose-700 ring-rose-200' : c.left <= REMIND_BEFORE ? 'bg-amber-50 text-amber-800 ring-amber-200' : 'bg-slate-50 text-slate-600 ring-slate-200')}>{c.left < 0 ? `${-c.left}d late` : `${c.left}d left`}</span></Link></li>))}{!d.cons.length && <p className="py-8 text-center text-sm text-slate-400">No renewals due soon.</p>}</ul>}
          </div>
        </Card>

        {showSales && (
          <Card className="xl:col-span-4">
            <CardTitle accent="green">Sales team</CardTitle>
            <ul className="mt-4 space-y-4">
              {sales.sort((a, b) => b.won - a.won).map((s, k) => (
                <li key={s.u.id} className="flex items-center gap-3">
                  <span className="relative"><Avatar name={s.u.name} size={10} />{k === 0 && s.won > 0 && <span className="absolute -top-1.5 -right-1.5 grid h-5 w-5 place-items-center rounded-full bg-amber-400 text-[10px] font-extrabold text-white ring-2 ring-white">1</span>}</span>
                  <div className="min-w-0 flex-1"><div className="flex items-baseline justify-between"><span className="truncate font-bold text-ink">{s.u.name}</span><span className="text-xs font-bold text-emerald-600">{s.conv}% won</span></div>
                    <div className="mt-1.5 flex h-2 overflow-hidden rounded-full bg-slate-100"><span className="h-full bg-emerald-500 transition-[width] duration-700" style={{ width: `${s.total ? (s.won / s.total) * 100 : 0}%` }} /><span className="h-full bg-amber-400 transition-[width] duration-700" style={{ width: `${s.total ? (s.open / s.total) * 100 : 0}%` }} /></div>
                    <div className="mt-1 text-[11px] text-slate-500">{s.won} won · {s.open} open · {s.total} total</div></div>
                </li>))}
              {!sales.length && <p className="py-6 text-center text-sm text-slate-400">No salespeople yet.</p>}
            </ul>
          </Card>
        )}
      </div>
    </>
  )
}
