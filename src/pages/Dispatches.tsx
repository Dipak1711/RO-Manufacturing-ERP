import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarClock, Truck } from 'lucide-react'
import { useApp } from '../store'
import { Badge, Card, Empty, PageHeader, Progress, Tabs } from '../components/ui'
import { daysBetween, fmtDate, inr, today } from '../lib/utils'
import { projTone } from '../lib/tones'

export default function Dispatches() {
  const { db } = useApp()
  const nav = useNavigate()
  const [tab, setTab] = useState<'up' | 'hist'>('up')
  const up = db.projects.filter(p => !p.dispatch).sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate))
  const hist = db.projects.filter(p => p.dispatch).sort((a, b) => b.dispatch!.date.localeCompare(a.dispatch!.date))
  return (
    <>
      <PageHeader title="Dispatches" subtitle="Upcoming deliveries and the full dispatch history with invoice and e-way bill references." />
      <Tabs tabs={[{ id: 'up', label: 'Upcoming dispatches', badge: <Badge tone="amber">{up.length}</Badge> }, { id: 'hist', label: 'Dispatch history', badge: <Badge>{hist.length}</Badge> }]} value={tab} onChange={setTab} />
      <div className="pt-5">
        {tab === 'up' ? (up.length === 0 ? <Card><Empty icon={<CalendarClock size={40} />} title="Nothing pending dispatch" /></Card> :
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{up.map(p => { const prog = p.updates.length ? p.updates[p.updates.length - 1].progress : 0, d = daysBetween(today(), p.deliveryDate); return (
            <Card key={p.id} className="cursor-pointer transition hover:shadow-md"><div onClick={() => nav(`/projects/${p.id}`)}>
              <div className="flex items-center justify-between"><b className="text-brand-700">{p.code}</b><Badge tone={projTone[p.status]}>{p.status}</Badge></div>
              <div className="mt-1 font-semibold text-slate-800">{p.company}</div><div className="text-xs text-slate-500">{db.products.find(x => x.id === p.productId)?.name} · {p.capacity}</div>
              <div className="mt-3 flex items-center gap-2"><Progress value={prog} className="flex-1" /><span className="text-xs font-semibold">{prog}%</span></div>
              <div className={`mt-3 text-sm font-medium ${d < 0 ? 'text-red-600' : d <= 7 ? 'text-amber-600' : 'text-slate-600'}`}>Delivery {fmtDate(p.deliveryDate)} · {d < 0 ? `${-d} days late` : `in ${d} days`}</div></div></Card>) })}</div>) :
          <Card pad={false} className="overflow-x-auto">{hist.length === 0 ? <Empty icon={<Truck size={40} />} title="No dispatches yet" /> : <table className="w-full"><thead className="border-b border-slate-100 bg-slate-50"><tr><th className="th">Date</th><th className="th">Project</th><th className="th">Consignee</th><th className="th">Transport</th><th className="th">Invoice</th><th className="th">E-way bill</th><th className="th text-right">Value</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{hist.map(p => <tr key={p.id} onClick={() => nav(`/projects/${p.id}`)} className="cursor-pointer hover:bg-slate-50"><td className="td">{fmtDate(p.dispatch!.date)}</td><td className="td font-bold text-brand-700">{p.code}</td><td className="td"><div className="font-medium">{p.company}</div><div className="text-xs text-slate-500">{p.dispatch!.destination}</div></td><td className="td text-sm">{p.dispatch!.transporter}<div className="text-xs text-slate-500">{p.dispatch!.vehicle}</div></td><td className="td">{p.dispatch!.invoiceNo}</td><td className="td">{p.dispatch!.ewayNo}</td><td className="td text-right font-semibold">{inr(p.value)}</td></tr>)}</tbody></table>}</Card>}
      </div>
    </>
  )
}
