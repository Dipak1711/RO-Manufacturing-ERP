import { MessageCircle, Repeat, Truck } from 'lucide-react'
import { useState } from 'react'
import { SupplyOrderModal } from '../components/project/ConsumablesTab'
import type { Project } from '../types'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../store'
import { Badge, Button, Card, Empty, PageHeader } from '../components/ui'
import { addDays, daysBetween, fmtDate, today, waLink } from '../lib/utils'
import { REMIND_BEFORE } from '../lib/alerts'

export default function Consumables() {
  const { db, user } = useApp()
  const [ord, setOrd] = useState<{ p: Project; ids: string[] } | null>(null)
  const nav = useNavigate()
  const rows = db.projects.flatMap(p => p.consumables.map(c => { const due = addDays(c.lastSupplied, c.intervalDays); return { p, c, due, left: daysBetween(today(), due), item: db.stock.find(s => s.id === c.itemId)! } })).sort((a, b) => a.left - b.left)
  const due = rows.filter(r => r.left <= REMIND_BEFORE)
  return (
    <>
      <PageHeader title="Consumables & Renewals" subtitle="Recurring revenue from every plant you have installed — never miss a renewal." />
      {due.length > 0 && <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900"><b>{due.length} renewal{due.length > 1 ? 's' : ''} need attention.</b> These clients will run out of consumables within {REMIND_BEFORE} days. Contact them and dispatch fresh material.</div>}
      <Card pad={false} className="overflow-x-auto">{rows.length === 0 ? <Empty icon={<Repeat size={40} />} title="No consumable plans" text="Plans are created at the time of dispatch." /> : (
        <table className="w-full"><thead className="border-b border-slate-100 bg-slate-50"><tr><th className="th">Client / Project</th><th className="th">Consumable</th><th className="th">Size</th><th className="th">Qty</th><th className="th">Every</th><th className="th">Last supplied</th><th className="th">Next due</th><th className="th">Status</th><th className="th" /></tr></thead>
          <tbody className="divide-y divide-slate-100">{rows.map(r => (
            <tr key={r.c.id} className="hover:bg-slate-50"><td className="td cursor-pointer" onClick={() => nav(`/projects/${r.p.id}`)}><div className="font-medium text-slate-800">{r.p.company}</div><div className="text-xs font-semibold text-brand-600">{r.p.code}</div></td><td className="td">{r.item.name}</td><td className="td text-slate-500">{r.item.size || '—'}</td><td className="td">{r.c.qty} {r.item.unit}</td><td className="td">{r.c.intervalDays}d</td><td className="td">{fmtDate(r.c.lastSupplied)}</td><td className="td">{fmtDate(r.due)}</td>
              <td className="td"><Badge tone={r.left < 0 ? 'red' : r.left <= REMIND_BEFORE ? 'amber' : 'green'}>{r.left < 0 ? `${-r.left}d overdue` : r.left <= REMIND_BEFORE ? `Due in ${r.left}d` : `${r.left}d left`}</Badge></td>
              <td className="td text-right whitespace-nowrap"><Button size="sm" variant="ghost" onClick={() => window.open(waLink(r.p.phone, `Dear ${r.p.contact}, as per your plant schedule, your ${r.item.name} (${r.c.qty} ${r.item.unit}) is due for renewal around ${fmtDate(r.due)}. Shall we arrange dispatch? – ${user!.name}, AquaFlow`), '_blank')}><MessageCircle size={14} className="text-emerald-600" /> Remind client</Button><Button size="sm" variant="secondary" onClick={() => setOrd({ p: r.p, ids: [r.c.id] })}><Truck size={14} /> Repeat order</Button></td></tr>))}</tbody></table>)}</Card>
      {ord && <SupplyOrderModal p={db.projects.find(x => x.id === ord.p.id)!} preselect={ord.ids} onClose={() => setOrd(null)} />}
    </>
  )
}
