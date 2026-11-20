import { Boxes, ClipboardCheck, CreditCard, Factory, FileText, Repeat, ShoppingCart, Truck, Wrench } from 'lucide-react'
import type { Project } from '../../types'
import { useApp } from '../../store'
import { Card } from '../ui'
import { fmtDate, inr } from '../../lib/utils'

export default function Timeline({ p }: { p: Project }) {
  const { db } = useApp()
  const ev: { date: string; icon: typeof Factory; title: string; text?: string; color: string }[] = []
  const nm = (id: string) => db.stock.find(s => s.id === id)?.name || ''
  const q = db.quotations.find(x => x.id === p.quotationId)
  if (q) ev.push({ date: q.date, icon: FileText, title: `Quotation ${q.no} issued`, color: 'bg-violet-100 text-violet-600' })
  ev.push({ date: p.orderDate, icon: ClipboardCheck, title: `Order confirmed – PO ${p.poNo}`, text: `Project ${p.code} created for ${inr(p.value)}`, color: 'bg-sky-100 text-sky-600' })
  p.payments.forEach(m => (m.receipts?.length ? m.receipts : m.receivedOn ? [{ date: m.receivedOn, amount: m.amount, id: m.id }] : []).forEach(r => ev.push({ date: r.date, icon: CreditCard, title: `Payment received – ${m.label}`, text: inr(r.amount), color: 'bg-emerald-100 text-emerald-600' })))
  db.pos.filter(o => o.projectId === p.id).forEach(o => ev.push({ date: o.date, icon: ShoppingCart, title: `${o.no} – ${db.suppliers.find(s => s.id === o.supplierId)?.name}`, text: `${o.lines.length} items · ${o.status}`, color: 'bg-amber-100 text-amber-600' }))
  p.updates.forEach(u => ev.push({ date: u.date, icon: Factory, title: `Production ${u.progress}% complete`, text: u.note, color: 'bg-indigo-100 text-indigo-600' }))
  p.voiceNotes.forEach(v => ev.push({ date: v.date, icon: Boxes, title: `Voice instruction from ${v.by}`, text: v.note, color: 'bg-rose-100 text-rose-600' }))
  if (p.dispatch) ev.push({ date: p.dispatch.date, icon: Truck, title: `Dispatched – ${p.dispatch.vehicle}`, text: `Invoice ${p.dispatch.invoiceNo} · E-way ${p.dispatch.ewayNo}`, color: 'bg-teal-100 text-teal-600' })
  if (p.commissioning) ev.push({ date: p.commissioning.date, icon: Wrench, title: 'Installation & commissioning completed', text: `Output TDS ${p.commissioning.params.outTds} ppm · Engineer ${p.commissioning.engineer}`, color: 'bg-green-100 text-green-600' })
  ;(p.supplyOrders || []).forEach(o => ev.push({ date: o.date, icon: Repeat, title: `Supply order ${o.no} – ${o.status}`, text: `${o.lines.length} items`, color: 'bg-orange-100 text-orange-600' }))
  p.orderFollowUps?.forEach(f => ev.push({ date: f.date, icon: ClipboardCheck, title: `PO/SO follow-up (${f.type})`, text: f.note, color: 'bg-sky-100 text-sky-600' }))
  p.consumables.forEach(c => c.history.forEach(h => ev.push({ date: h.date, icon: Repeat, title: `Consumable supplied – ${h.qty} × ${nm(c.itemId)}`, text: h.note, color: 'bg-orange-100 text-orange-600' })))
  ev.sort((a, b) => b.date.localeCompare(a.date))
  return (
    <Card>
      <h3 className="font-semibold text-ink">Complete project history</h3><p className="mb-5 text-sm text-slate-500">Everything that happened on {p.code} since the order — available for years to come.</p>
      <div className="relative space-y-5 before:absolute before:bottom-2 before:left-[17px] before:top-2 before:w-px before:bg-slate-200">
        {ev.map((e, i) => <div key={i} className="relative flex gap-4"><div className={`relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full ${e.color}`}><e.icon size={16} /></div><div className="pt-0.5"><div className="text-sm font-semibold text-slate-800">{e.title}</div>{e.text && <div className="text-sm text-slate-500">{e.text}</div>}<div className="text-xs text-slate-400">{fmtDate(e.date)}</div></div></div>)}
      </div>
    </Card>
  )
}
