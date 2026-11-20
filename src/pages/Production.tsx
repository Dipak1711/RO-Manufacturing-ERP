import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarClock, Camera, Factory, Mic, Palette } from 'lucide-react'
import { useApp } from '../store'
import { Badge, Card, Empty, PageHeader, Progress } from '../components/ui'
import { cx, daysBetween, fmtDate, today } from '../lib/utils'
import { projTone } from '../lib/tones'
import type { PStatus } from '../types'

/* Plain-English names for the production stages (the stored values do not change). */
const STAGES: { key: PStatus; label: string; tint: string }[] = [
  { key: 'Order Confirmed', label: 'New order', tint: 'from-sky-100 to-sky-200 text-sky-500' },
  { key: 'Procurement', label: 'Buying material', tint: 'from-amber-100 to-amber-200 text-amber-500' },
  { key: 'In Production', label: 'Being built', tint: 'from-violet-100 to-violet-200 text-violet-500' },
  { key: 'Ready for Dispatch', label: 'Ready to ship', tint: 'from-emerald-100 to-emerald-200 text-emerald-500' },
]

export default function Production() {
  const { db } = useApp()
  const nav = useNavigate()
  const [stage, setStage] = useState<'all' | PStatus>('all')
  const active = db.projects.filter(p => STAGES.some(s => s.key === p.status)).sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate))
  const list = active.filter(p => stage === 'all' || p.status === stage)

  return (
    <>
      <PageHeader eyebrow="Factory" icon={<Factory size={20} />} title="Production" />

      <div className="mb-5 flex flex-wrap gap-2">
        {[{ key: 'all' as const, label: 'All orders' }, ...STAGES].map(s => {
          const n = s.key === 'all' ? active.length : active.filter(p => p.status === s.key).length
          return <button key={s.key} onClick={() => setStage(s.key)} className={cx('pressable flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold', stage === s.key ? 'bg-linear-to-b from-[#f1823f] to-[#e0662a] text-white shadow-[0_8px_18px_-8px_rgba(237,115,51,0.7)]' : 'bg-white text-slate-600 shadow-flat hover:text-ink')}>{s.label}<span className={cx('tnum rounded-full px-1.5 text-[11px] font-bold', stage === s.key ? 'bg-white/25' : 'bg-slate-100 text-slate-500')}>{n}</span></button>
        })}
      </div>

      {list.length === 0 ? <Card><Empty icon={<Factory size={30} />} title="Nothing here" text="No orders in this stage right now." /></Card> : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{list.map(p => {
          const prod = db.products.find(x => x.id === p.productId)!
          const st = STAGES.find(s => s.key === p.status)!
          const last = p.updates[p.updates.length - 1], prog = last?.progress || 0
          const design = prod.designs.find(d => d.id === p.designId)
          const left = daysBetween(today(), p.deliveryDate)
          const late = left < 0
          return (
            <Card key={p.id} pad={false} className="lift cursor-pointer overflow-hidden" onClick={() => nav(`/projects/${p.id}`)}>
              <div className="relative aspect-[16/8] bg-slate-100">
                {last?.photos[0] ? <img src={last.photos[0].src} alt="" className="h-full w-full object-cover" /> : (
                  <div className={cx('grid h-full place-items-center bg-linear-to-br', st.tint)}><div className="flex flex-col items-center gap-1.5"><Camera size={30} /><span className="text-xs font-semibold">No photo yet</span></div></div>)}
                <div className="absolute top-3 left-3"><Badge tone={projTone[p.status]}>{st.label}</Badge></div>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><div className="truncate text-[15px] font-extrabold tracking-[-0.01em] text-ink">{p.company}</div><div className="truncate text-xs text-slate-500">{p.code} · {prod.name} · {p.capacity}</div></div>
                  <span className={cx('flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ring-inset', late ? 'bg-rose-50 text-rose-700 ring-rose-200' : left <= 7 ? 'bg-amber-50 text-amber-800 ring-amber-200' : 'bg-slate-50 text-slate-600 ring-slate-200')}><CalendarClock size={11} />{late ? `${-left}d late` : left === 0 ? 'Due today' : `${left}d left`}</span>
                </div>
                <div className="mt-4"><div className="mb-1 flex justify-between text-xs"><span className="font-semibold text-slate-500">Work done</span><span className="tnum font-extrabold text-ink">{prog}%</span></div><Progress value={prog} /></div>
                <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-200 pt-3 text-xs">
                  {design ? <span className="flex min-w-0 items-center gap-1.5 text-slate-600"><Palette size={13} className="shrink-0 text-slate-400" /><span className="truncate">{design.name}</span></span> : <span className="flex items-center gap-1.5 font-semibold text-amber-700"><Palette size={13} />Choose a design</span>}
                  {p.voiceNotes.length > 0 && <span className="flex shrink-0 items-center gap-1 text-slate-500"><Mic size={12} />{p.voiceNotes.length} voice {p.voiceNotes.length === 1 ? 'note' : 'notes'}</span>}
                </div>
                <div className="mt-1 text-[11px] text-slate-400">{last ? `Last update ${fmtDate(last.date)}` : 'No updates yet'} · Delivery {fmtDate(p.deliveryDate)}</div>
              </div>
            </Card>)
        })}</div>)}
    </>
  )
}
