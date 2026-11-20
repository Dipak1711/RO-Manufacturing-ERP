import { useMemo, useRef, useState, type CSSProperties } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { CalendarClock, KanbanSquare, List, Plus, AlertTriangle } from 'lucide-react'
import { useApp, userName } from '../store'
import { Avatar, Badge, Button, Card, PageHeader, SearchBox } from '../components/ui'
import { cx, fmtDate, inrShort, today } from '../lib/utils'
import { SOURCES, STAGES, type Inquiry, type Stage } from '../types'
import { stageTone } from '../lib/tones'
import { useFlip } from '../lib/useFlip'

/* One colour per stage: lane header, drop glow, card edge and landing ring. */
const STAGE_HEX: Record<Stage, string> = { New: '#0ea5e9', Contacted: '#6366f1', 'Water Report Received': '#8b5cf6', Quoted: '#f59e0b', Negotiation: '#f97316', Won: '#10b981', Lost: '#ef4444' }
const STAGE_EDGE: Record<Stage, string> = { New: 'from-sky-400 to-sky-600', Contacted: 'from-indigo-400 to-indigo-600', 'Water Report Received': 'from-violet-400 to-violet-600', Quoted: 'from-amber-400 to-amber-600', Negotiation: 'from-orange-400 to-rose-500', Won: 'from-emerald-400 to-emerald-600', Lost: 'from-rose-400 to-rose-600' }

/** A short burst of confetti, shown when an inquiry lands in Won. */
function Confetti() {
  const colours = ['#10b981', '#f59e0b', '#ed7333', '#3b82f6', '#ec4899', '#8b5cf6']
  return (
    <span className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center" aria-hidden="true">
      {Array.from({ length: 18 }).map((_, n) => { const a = (n / 18) * Math.PI * 2, r = 70 + (n % 3) * 22; return <span key={n} className="confetti-bit absolute h-2 w-1.5 rounded-[2px]" style={{ background: colours[n % colours.length], '--dx': `${Math.cos(a) * r}px`, '--dy': `${Math.sin(a) * r - 30}px`, '--rot': `${(n % 2 ? 1 : -1) * (180 + n * 25)}deg` } as CSSProperties} /> })}
    </span>
  )
}


/* Old links like /inquiries?open=ID now go to the inquiry's own page. */
export default function Inquiries() {
  const [sp] = useSearchParams()
  const openId = sp.get('open')
  return openId ? <Navigate to={`/inquiries/${openId}`} replace /> : <InquiryBoard />
}

function InquiryBoard() {
  const { db, saveInquiry, toast } = useApp()
  const nav = useNavigate()
  const [view, setView] = useState<'board' | 'table'>('board')
  const [fSales, setFSales] = useState('all'), [fProd, setFProd] = useState('all'), [fSrc, setFSrc] = useState('all'), [q, setQ] = useState('')
    const [drag, setDrag] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<Stage | null>(null)
  const [justMoved, setJustMoved] = useState<string | null>(null)
  const scroller = useRef<HTMLDivElement | null>(null)
  const settle = useRef<number | undefined>(undefined)

  const list = useMemo(() => db.inquiries.filter(i =>
    (fSales === 'all' || i.assignedTo === fSales) && (fProd === 'all' || i.productId === fProd) && (fSrc === 'all' || i.source === fSrc) &&
    (!q || (i.company + i.contact + i.no + i.city).toLowerCase().includes(q.toLowerCase()))), [db.inquiries, fSales, fProd, fSrc, q])
  const sales = db.users.filter(u => u.role === 'Sales' || u.role === 'Admin')

  // Cards glide to their new slot whenever an inquiry changes lane or the filters change.
  const boardRef = useFlip<HTMLDivElement>(list.map(i => `${i.id}:${i.stage}`).join('|'))
  const dragged = drag ? db.inquiries.find(i => i.id === drag) : undefined
  const move = (id: string, stage: Stage) => {
    const i = db.inquiries.find(x => x.id === id)
    if (!i || i.stage === stage) return
    saveInquiry({ ...i, stage })
    setJustMoved(id); window.clearTimeout(settle.current); settle.current = window.setTimeout(() => setJustMoved(null), 1000)
    toast(stage === 'Won' ? `${i.company} won!` : stage === 'Lost' ? `${i.company} marked as Lost` : `${i.company} moved to ${stage}`, stage === 'Lost' ? 'err' : 'ok')
  }

  return (
    <>
      <PageHeader title="Inquiries"
        actions={<>
          <div className="flex rounded-xl bg-white p-0.5 shadow-flat">
            {([['board', 'Board', KanbanSquare], ['table', 'List', List]] as const).map(([v, label, Icon]) => <button key={v} onClick={() => setView(v)} className={cx('flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-sm font-semibold transition-colors', view === v ? 'bg-linear-to-b from-[#f1823f] to-[#e0662a] text-white shadow-[0_6px_14px_-6px_rgba(237,115,51,0.7)]' : 'text-slate-500 hover:bg-slate-100 hover:text-ink')}><Icon size={15} />{label}</button>)}
          </div>
          <Button onClick={() => nav('/inquiries/new')}><Plus size={16} /> New Inquiry</Button>
        </>} />

      {(() => { const od = db.inquiries.filter(i => i.nextFollowUp && i.nextFollowUp <= today() && i.stage !== 'Won' && i.stage !== 'Lost'); const late = od.filter(i => i.nextFollowUp! < today()).length; return od.length > 0 && <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900"><AlertTriangle size={16} className="shrink-0" /><span className="font-semibold">Follow-ups to do:</span><span>{late > 0 && <b className="text-rose-600">{late} late</b>}{late > 0 && od.length - late > 0 && ' · '}{od.length - late > 0 && <b>{od.length - late} today</b>}</span>{od.slice(0, 3).map(i => <button key={i.id} onClick={() => nav(`/inquiries/${i.id}`)} className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-amber-800 shadow-sm transition-colors hover:bg-amber-100">{i.company}</button>)}{od.length > 3 && <span className="text-xs text-amber-700">+{od.length - 3} more</span>}</div> })()}

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl bg-white/75 p-3 shadow-card ring-1 ring-white/60">
        <SearchBox value={q} onChange={setQ} placeholder="Search company, name or city" />
        <select aria-label="Salesperson" className="inp !w-auto" value={fSales} onChange={e => setFSales(e.target.value)}><option value="all">All salespeople</option>{sales.filter(u => u.role === 'Sales').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
        <select aria-label="Product" className="inp !w-auto" value={fProd} onChange={e => setFProd(e.target.value)}><option value="all">All products</option>{db.products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <select aria-label="Source" className="inp !w-auto" value={fSrc} onChange={e => setFSrc(e.target.value)}><option value="all">All sources</option>{SOURCES.map(s => <option key={s}>{s}</option>)}</select>
        {(fSales !== 'all' || fProd !== 'all' || fSrc !== 'all' || q) && <button onClick={() => { setFSales('all'); setFProd('all'); setFSrc('all'); setQ('') }} className="text-sm font-semibold text-brand-600 transition-colors hover:text-brand-800">Clear</button>}
        <span className="ml-auto text-sm font-semibold text-slate-500">{list.length} {list.length === 1 ? 'inquiry' : 'inquiries'}</span>
      </div>

      {view === 'board' ? (
        <div className="relative">
          {/* Seven lanes never fit one screen, so the right edge fades to make the scroll discoverable. */}
          <div ref={n => { scroller.current = n; boardRef.current = n }} className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-4"
            onDragOver={e => { const box = scroller.current?.getBoundingClientRect(); if (!box || !scroller.current) return; if (e.clientX < box.left + 90) scroller.current.scrollLeft -= 22; else if (e.clientX > box.right - 90) scroller.current.scrollLeft += 22 }}>
            {STAGES.map(st => {
              const items = list.filter(i => i.stage === st)
              const total = items.reduce((a, i) => a + i.value, 0)
              const hex = STAGE_HEX[st]
              const isTarget = dragOver === st && !!dragged && dragged.stage !== st
              return (
                <div key={st} data-flip-layer
                  onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (dragOver !== st) setDragOver(st) }}
                  onDragLeave={e => { if (e.currentTarget.contains(e.relatedTarget as Node | null)) return; setDragOver(c => c === st ? null : c) }}
                  onDrop={e => { e.preventDefault(); if (drag) move(drag, st); setDrag(null); setDragOver(null) }}
                  style={isTarget ? { backgroundColor: `${hex}14`, boxShadow: `inset 0 0 0 2px ${hex}99, 0 22px 44px -24px ${hex}` } : undefined}
                  className={cx('relative flex w-[290px] shrink-0 flex-col rounded-2xl bg-white/60 ring-1 ring-slate-200/80 ring-inset transition-[background-color,box-shadow,translate,opacity,filter] duration-300 ease-out', drag && !isTarget && dragOver !== st && 'opacity-75 saturate-[0.8]', isTarget && '-translate-y-1')}>
                  <div className="h-[3px] rounded-t-2xl" style={{ background: `linear-gradient(90deg, ${hex}, ${hex}55)` }} aria-hidden="true" />
                  <div className="flex items-center justify-between gap-2 px-3.5 pt-3 pb-2.5">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
                        {isTarget && <span className="absolute inset-0 animate-ping rounded-full" style={{ background: hex }} />}
                        <span className="relative h-2.5 w-2.5 rounded-full" style={{ background: hex, boxShadow: `0 0 0 3px ${hex}26` }} />
                      </span>
                      <div className="min-w-0"><p className="truncate text-[13.5px] font-bold tracking-[-0.01em] text-ink">{st}</p><p className="tnum text-[11px] font-medium text-slate-500">{inrShort(total)}</p></div>
                    </div>
                    <span key={items.length} className="count-bump tnum grid h-6 min-w-6 place-items-center rounded-full px-1.5 text-xs font-bold" style={{ background: `${hex}1f`, color: hex }}>{items.length}</span>
                  </div>
                  <div className="flex flex-1 flex-col gap-2.5 px-2.5 pb-3">
                    {/* Opens at the top of the lane, pushing the cards down to make room. */}
                    {isTarget && dragged && <div className="slot-open rounded-xl border-2 border-dashed px-3 py-3" style={{ borderColor: `${hex}aa`, background: `${hex}12` }}><p className="truncate text-[12.5px] font-bold" style={{ color: hex }}>{dragged.company}</p><p className="text-[11px] text-slate-500">Drop to move to {st}</p></div>}
                    {items.map(i => <InqCard key={i.id} i={i} dragging={drag === i.id} landed={justMoved === i.id} onOpen={() => nav(`/inquiries/${i.id}`)} onDragStart={() => setDrag(i.id)} onDragEnd={() => { setDrag(null); setDragOver(null) }} />)}
                    {!items.length && !isTarget && <div className="flex flex-col items-center gap-1 rounded-xl border border-dashed border-slate-300 px-3 py-7 text-center"><span className="h-2 w-2 rounded-full" style={{ background: hex }} aria-hidden="true" /><p className="text-[11.5px] font-medium text-slate-500">Empty</p><p className="text-[10.5px] text-slate-400">Drop a card here</p></div>}
                  </div>
                </div>)
            })}
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-linear-to-l from-slate-100 to-transparent" aria-hidden="true" />
        </div>
      ) : (
        <Card pad={false} className="overflow-x-auto">
          <table className="w-full"><thead className="border-b border-slate-100 bg-slate-50"><tr><th className="th">Inquiry</th><th className="th">Company</th><th className="th">Product</th><th className="th">Source</th><th className="th">Assigned</th><th className="th">Stage</th><th className="th">Next follow-up</th><th className="th text-right">Value</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{list.map(i => (
              <tr key={i.id} onClick={() => nav(`/inquiries/${i.id}`)} className="cursor-pointer hover:bg-slate-50">
                <td className="td font-medium text-brand-700">{i.no}</td><td className="td"><div className="font-medium text-slate-800">{i.company}</div><div className="text-xs text-slate-500">{i.contact} · {i.city}</div></td>
                <td className="td">{db.products.find(p => p.id === i.productId)?.name}<div className="text-xs text-slate-500">{i.capacity}</div></td><td className="td">{i.source}</td>
                <td className="td"><div className="flex items-center gap-2"><Avatar name={userName(db, i.assignedTo)} size={6} />{userName(db, i.assignedTo).split(' ')[0]}</div></td>
                <td className="td"><Badge tone={stageTone[i.stage]}>{i.stage}</Badge></td>
                <td className="td">{i.nextFollowUp ? <span className={i.nextFollowUp <= today() ? 'font-semibold text-red-600' : ''}>{fmtDate(i.nextFollowUp)}</span> : '—'}</td><td className="td text-right font-medium">{inrShort(i.value)}</td></tr>))}</tbody></table>
        </Card>
      )}

    </>
  )
}

function InqCard({ i, dragging, landed, onOpen, onDragStart, onDragEnd }: { i: Inquiry; dragging: boolean; landed: boolean; onOpen: () => void; onDragStart: () => void; onDragEnd: () => void }) {
  const { db } = useApp()
  const late = i.nextFollowUp && i.nextFollowUp <= today() && i.stage !== 'Won' && i.stage !== 'Lost'
  const overdue = !!i.nextFollowUp && i.nextFollowUp < today() && i.stage !== 'Won' && i.stage !== 'Lost'
  return (
    <article data-flip={i.id} draggable onClick={onOpen} onDragEnd={onDragEnd}
      onDragStart={e => {
        // Firefox only starts a drag when data is set.
        e.dataTransfer.setData('text/plain', i.id); e.dataTransfer.effectAllowed = 'move'
        // A tilted, lifted copy follows the pointer instead of the flat default snapshot.
        const card = e.currentTarget, ghost = card.cloneNode(true) as HTMLElement, holder = document.createElement('div')
        holder.style.cssText = 'position:fixed;top:-1000px;left:-1000px;padding:16px;pointer-events:none;'
        ghost.style.cssText = `width:${card.offsetWidth}px;transform:rotate(-3deg) scale(1.03);box-shadow:0 22px 40px -12px rgba(15,23,42,0.35);border-radius:14px;`
        holder.appendChild(ghost); document.body.appendChild(holder)
        const box = card.getBoundingClientRect()
        e.dataTransfer.setDragImage(holder, e.clientX - box.left + 16, e.clientY - box.top + 16)
        window.setTimeout(() => holder.remove(), 0)
        onDragStart()
      }}
      style={landed ? ({ '--settle': STAGE_HEX[i.stage] } as CSSProperties) : undefined}
      className={cx('group relative cursor-grab rounded-xl bg-white py-3 pr-3 pl-4 shadow-card ring-1 ring-slate-200/70 ring-inset transition-[translate,scale,box-shadow,opacity] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lift active:cursor-grabbing',
        dragging && 'scale-[0.97] opacity-35 outline-2 outline-offset-2 outline-slate-300 outline-dashed', landed && (i.stage === 'Lost' ? 'drop-shake' : 'drop-settle'))}>
      <span className={cx('absolute inset-y-0 left-0 w-1 rounded-l-xl bg-linear-to-b', STAGE_EDGE[i.stage])} aria-hidden="true" />
      {landed && i.stage === 'Won' && <Confetti />}
      <div className="flex items-start justify-between gap-2"><span className="text-[11px] font-bold text-brand-600">{i.no}</span><span className="text-[11px] text-slate-400">{i.source}</span></div>
      <div className="mt-1 flex items-start justify-between gap-2">
        <div className="min-w-0"><p className="truncate text-[13.5px] leading-snug font-bold text-ink">{i.company}</p><p className="mt-0.5 truncate text-xs text-slate-500">{db.products.find(p => p.id === i.productId)?.name} · {i.capacity}</p></div>
      </div>
      <div className="mt-2.5 flex items-end justify-between gap-2">
        <div className="flex items-center gap-1.5"><Avatar name={userName(db, i.assignedTo)} size={6} /><span className="text-xs text-slate-600">{userName(db, i.assignedTo).split(' ')[0]}</span></div>
        <p className="tnum text-[17px] leading-none font-extrabold tracking-[-0.02em] text-ink">{inrShort(i.value)}</p>
      </div>
      {late && <div className={cx('mt-2.5 flex items-center gap-1.5 border-t border-slate-200/70 pt-2 text-[11px]', overdue ? 'font-semibold text-rose-600' : 'font-semibold text-amber-700')}><CalendarClock size={12} className="shrink-0" /><span className="truncate">Follow-up {i.nextFollowUp === today() ? 'today' : fmtDate(i.nextFollowUp)}</span>{overdue && <span className="ml-auto rounded-full bg-rose-50 px-1.5 py-px text-[10px] ring-1 ring-rose-200 ring-inset">Overdue</span>}</div>}
    </article>
  )
}
