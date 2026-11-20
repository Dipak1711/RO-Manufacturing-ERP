import { useState } from 'react'
import { PackagePlus, Plus, Repeat, Truck } from 'lucide-react'
import type { ConsumablePlan, Project, SupplyOrder } from '../../types'
import { useApp } from '../../store'
import { Badge, Button, Card, Empty, Field, Modal } from '../ui'
import { addDays, daysBetween, fmtDate, today, uid } from '../../lib/utils'
import { REMIND_BEFORE } from '../../lib/alerts'

export function ConsumablePlanModal({ p, onClose, firstSupply }: { p: Project; onClose: () => void; firstSupply?: boolean }) {
  const { db, saveProject, toast, log } = useApp()
  const items = db.stock.filter(s => s.category === 'Consumable')
  const [sel, setSel] = useState<Record<string, { qty: number; days: number }>>(() => Object.fromEntries(p.consumables.map(c => [c.itemId, { qty: c.qty, days: c.intervalDays }])))
  const toggle = (id: string) => setSel(s => { const n = { ...s }; if (n[id]) delete n[id]; else n[id] = { qty: 1, days: 30 }; return n })
  const save = () => {
    const ids = Object.keys(sel); if (!ids.length) return toast('Select at least one consumable', 'err')
    saveProject(p.id, x => ({ ...x, consumables: ids.map(id => { const ex = x.consumables.find(c => c.itemId === id); return ex ? { ...ex, qty: sel[id].qty, intervalDays: sel[id].days } : { id: uid(), itemId: id, qty: sel[id].qty, intervalDays: sel[id].days, lastSupplied: firstSupply ? today() : today(), history: firstSupply ? [{ date: today(), qty: sel[id].qty, note: 'Initial supply with dispatch' }] : [] } as ConsumablePlan }) }))
    log(`Consumable plan set for ${p.code} – ${ids.length} items`, 'consumable', p.id); toast('Consumable plan saved – reminders will appear automatically'); onClose()
  }
  return (
    <Modal title="Consumable plan" subtitle={`${p.code} · ${p.company} — which consumables does this plant use, and how often?`} onClose={onClose} width="max-w-3xl" footer={<><Button variant="secondary" onClick={onClose}>{firstSupply ? 'Skip for now' : 'Cancel'}</Button><Button onClick={save}>Save plan</Button></>}>
      <p className="mb-3 text-sm text-slate-500">Select the items and set quantity per cycle and the replenishment interval. A reminder pops up {REMIND_BEFORE} days before each renewal is due.</p>
      <div className="max-h-[52vh] divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">{items.map(it => { const s = sel[it.id]; return (
        <div key={it.id} className={`flex flex-wrap items-center gap-3 px-4 py-2.5 ${s ? 'bg-brand-50/60' : ''}`}>
          <input type="checkbox" checked={!!s} onChange={() => toggle(it.id)} className="h-4 w-4 accent-brand-600" />
          <div className="min-w-0 flex-1"><div className="text-sm font-medium text-slate-800">{it.name}</div><div className="text-xs text-slate-400">{it.sku}{it.size ? ` · ${it.size}` : ''} · in stock {it.stock} {it.unit}</div></div>
          {s && <div className="flex items-center gap-2 text-sm"><input type="number" min={1} className="inp !w-16" value={s.qty} onChange={e => setSel({ ...sel, [it.id]: { ...s, qty: +e.target.value } })} /><span className="text-slate-500">{it.unit} every</span><input type="number" min={1} className="inp !w-16" value={s.days} onChange={e => setSel({ ...sel, [it.id]: { ...s, days: +e.target.value } })} /><span className="text-slate-500">days</span></div>}
        </div>) })}</div>
    </Modal>
  )
}

export function SupplyOrderModal({ p, preselect, onClose }: { p: Project; preselect?: string[]; onClose: () => void }) {
  const { db, saveProject, next, toast, log } = useApp()
  const [sel, setSel] = useState<Record<string, number>>(() => Object.fromEntries(p.consumables.filter(c => preselect ? preselect.includes(c.id) : daysBetween(today(), addDays(c.lastSupplied, c.intervalDays)) <= REMIND_BEFORE).map(c => [c.id, c.qty])))
  const [note, setNote] = useState('')
  const save = () => {
    const lines = p.consumables.filter(c => sel[c.id]).map(c => ({ planId: c.id, itemId: c.itemId, qty: sel[c.id] }))
    if (!lines.length) return toast('Select at least one consumable', 'err')
    const o: SupplyOrder = { id: uid(), no: `SUP/26-27/${String(next('supply')).padStart(4, '0')}`, date: today(), status: 'Pending', lines, note }
    saveProject(p.id, x => ({ ...x, supplyOrders: [o, ...(x.supplyOrders || [])] }))
    log(`Consumable supply order ${o.no} created for ${p.code}`, 'consumable', p.id); toast(`Supply order ${o.no} created`); onClose()
  }
  return (
    <Modal title="Create consumable supply order" subtitle={`${p.code} · ${p.company}`} onClose={onClose} width="max-w-2xl" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save}>Create order</Button></>}>
      <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">{p.consumables.map(c => { const it = db.stock.find(x => x.id === c.itemId)!; const left = daysBetween(today(), addDays(c.lastSupplied, c.intervalDays)); return (
        <label key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5"><input type="checkbox" className="h-4 w-4 accent-brand-600" checked={sel[c.id] !== undefined} onChange={e => { const n = { ...sel }; if (e.target.checked) n[c.id] = c.qty; else delete n[c.id]; setSel(n) }} />
          <div className="min-w-0 flex-1"><div className="text-sm font-medium">{it.name}{it.size && <span className="text-slate-400"> · {it.size}</span>}</div><div className="text-xs text-slate-400">{left < 0 ? `${-left} days overdue` : `due in ${left} days`} · stock {it.stock} {it.unit}</div></div>
          {sel[c.id] !== undefined && <input type="number" min={1} className="inp !w-20" value={sel[c.id]} onChange={e => setSel({ ...sel, [c.id]: +e.target.value })} />}</label>) })}</div>
      <Field label="Note (optional)" className="mt-4"><input className="inp" value={note} onChange={e => setNote(e.target.value)} /></Field>
    </Modal>
  )
}

export function fulfilSupply(p: Project, o: SupplyOrder, ctx: ReturnType<typeof useApp>) {
  const { db, saveProject, applyStock, toast, log } = ctx
  const short = o.lines.find(l => (db.stock.find(s => s.id === l.itemId)?.stock || 0) < l.qty)
  if (short && !confirm(`Stock of ${db.stock.find(s => s.id === short.itemId)?.name} is lower than the order quantity. Mark as supplied anyway?`)) return
  applyStock(o.lines.map(l => ({ itemId: l.itemId, delta: -l.qty, type: 'Consumable supply' as const, ref: `${o.no} · ${p.code}` })))
  saveProject(p.id, x => ({ ...x, supplyOrders: (x.supplyOrders || []).map(y => y.id === o.id ? { ...y, status: 'Supplied', suppliedOn: today() } : y), consumables: x.consumables.map(c => { const l = o.lines.find(z => z.planId === c.id); return l ? { ...c, lastSupplied: today(), history: [...c.history, { date: today(), qty: l.qty, note: o.no }] } : c }) }))
  log(`Consumables supplied to ${p.code} against ${o.no}`, 'consumable', p.id); toast('Supply recorded, stock updated and next reminder reset')
}

export default function ConsumablesTab({ p }: { p: Project }) {
  const ctx = useApp()
  const { db } = ctx
  const [plan, setPlan] = useState(false), [order, setOrder] = useState(false)
  return (
    <div className="space-y-5">
    <Card>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold text-ink">Consumables & replenishment</h3><p className="text-sm text-slate-500">Reminders trigger automatically before the client runs out.</p></div>
        <div className="flex gap-2"><Button variant="secondary" onClick={() => setPlan(true)}><Plus size={15} /> {p.consumables.length ? 'Edit plan' : 'Set consumable plan'}</Button>{p.consumables.length > 0 && <Button onClick={() => setOrder(true)}><Truck size={15} /> Create supply order</Button>}</div></div>
      {!p.consumables.length ? <Empty icon={<Repeat size={40} />} title="No consumable plan yet" text="Pick the filters, media and chemicals this plant uses from the consumable list, with how often they are replaced." /> : (
        <div className="overflow-x-auto"><table className="w-full"><thead className="bg-slate-50"><tr><th className="th">Item</th><th className="th">Size</th><th className="th">Qty / cycle</th><th className="th">Every</th><th className="th">Last supplied</th><th className="th">Next due</th><th className="th">Status</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{p.consumables.map(c => { const it = db.stock.find(s => s.id === c.itemId)!, due = addDays(c.lastSupplied, c.intervalDays), left = daysBetween(today(), due); return (
            <tr key={c.id}><td className="td font-medium text-slate-800">{it.name}</td><td className="td text-slate-500">{it.size || '—'}</td><td className="td">{c.qty} {it.unit}</td><td className="td">{c.intervalDays} days</td><td className="td">{fmtDate(c.lastSupplied)}</td><td className="td">{fmtDate(due)}</td>
              <td className="td"><Badge tone={left < 0 ? 'red' : left <= REMIND_BEFORE ? 'amber' : 'green'}>{left < 0 ? `${-left} days overdue` : left <= REMIND_BEFORE ? `Due in ${left} days` : `${left} days left`}</Badge></td></tr>) })}</tbody></table></div>)}
    </Card>
    <Card pad={false}><div className="border-b border-slate-100 px-5 py-4"><h3 className="font-semibold text-ink">Supply orders & history</h3></div>
      {!(p.supplyOrders || []).length && !p.consumables.some(c => c.history.length) ? <p className="p-6 text-center text-sm text-slate-400">No consumable supplies yet.</p> : <div className="divide-y divide-slate-100">
        {(p.supplyOrders || []).map(o => <div key={o.id} className="flex flex-wrap items-center gap-3 px-5 py-3"><div className="min-w-0 flex-1"><div className="font-semibold text-brand-700">{o.no} <Badge tone={o.status === 'Supplied' ? 'green' : 'amber'}>{o.status}</Badge></div><div className="text-sm text-slate-600">{o.lines.map(l => `${l.qty} × ${db.stock.find(s => s.id === l.itemId)?.name}`).join(', ')}</div><div className="text-xs text-slate-400">Created {fmtDate(o.date)}{o.suppliedOn && ` · supplied ${fmtDate(o.suppliedOn)}`}{o.note && ` · ${o.note}`}</div></div>{o.status === 'Pending' && <Button size="sm" variant="accent" onClick={() => fulfilSupply(p, o, ctx)}><PackagePlus size={14} /> Mark supplied</Button>}</div>)}
        {p.consumables.flatMap(c => c.history.filter(h => !h.note?.startsWith('SUP/')).map(h => ({ ...h, name: db.stock.find(s => s.id === c.itemId)?.name }))).sort((a, b) => b.date.localeCompare(a.date)).map((h, i) => <div key={i} className="px-5 py-2.5 text-sm text-slate-600">{fmtDate(h.date)} · {h.qty} × {h.name}{h.note && <span className="text-slate-400"> — {h.note}</span>}</div>)}</div>}</Card>
      {plan && <ConsumablePlanModal p={p} onClose={() => setPlan(false)} />}
      {order && <SupplyOrderModal p={p} onClose={() => setOrder(false)} />}
    </div>
  )
}
