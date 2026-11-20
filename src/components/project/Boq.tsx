import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, ListChecks, PackageCheck, Printer, ShoppingCart, Sparkles } from 'lucide-react'
import type { Project, PO } from '../../types'
import { useApp } from '../../store'
import { Badge, Button, Card, Modal } from '../ui'
import { PrintModal, DocHeader } from '../PrintModal'
import { fmtDate, inr, today, uid } from '../../lib/utils'

export default function Boq({ p }: { p: Project }) {
  const { db, saveProject, setDB, toast, log, next, applyStock } = useApp()
  const nav = useNavigate()
  const [doc, setDoc] = useState(false), [confirm, setConfirm] = useState(false), [adding, setAdding] = useState('')
  const editable = !['Dispatched', 'Commissioned'].includes(p.status)
  const prod = db.products.find(x => x.id === p.productId)!

  const rows = useMemo(() => p.boq.map(b => {
    const item = db.stock.find(s => s.id === b.itemId)!
    const onOrder = db.pos.filter(o => o.projectId === p.id && o.status !== 'Received').flatMap(o => o.lines).filter(l => l.itemId === b.itemId).reduce((s, l) => s + l.qty, 0)
    const short = b.issued ? 0 : Math.max(0, b.qty - item.stock)
    return { b, item, short, onOrder, toBuy: Math.max(0, short - onOrder) }
  }), [p.boq, db.stock, db.pos, p.id])

  const shortRows = rows.filter(r => r.short > 0)
  const toBuy = rows.filter(r => r.toBuy > 0)
  const issuable = rows.filter(r => !r.b.issued && r.short === 0)
  const pending = rows.filter(r => !r.b.issued)

  const generate = () => {
    saveProject(p.id, x => ({ ...x, boqGenerated: true, status: x.status === 'Order Confirmed' ? 'Procurement' : x.status }))
    log(`BOQ generated for ${p.code} – ${p.boq.length} items`, 'boq', p.id); toast('BOQ generated and compared with live stock')
  }

  const createPOs = () => {
    const bySup: Record<string, PO> = {}
    toBuy.forEach(r => {
      const sid = r.item.supplierId
      bySup[sid] ??= { id: uid(), no: '', supplierId: sid, projectId: p.id, date: today(), status: 'Draft', lines: [], notes: `Material for ${p.code} – ${p.company}` }
      bySup[sid].lines.push({ itemId: r.item.id, name: r.item.name, unit: r.item.unit, qty: r.toBuy, rate: r.item.lastRate, lastRate: r.item.lastRate })
    })
    const pos = Object.values(bySup).map(o => ({ ...o, no: `PO/26-27/${String(next('po')).padStart(4, '0')}` }))
    setDB(d => ({ ...d, pos: [...pos, ...d.pos] }))
    log(`${pos.length} draft purchase order(s) created for ${p.code} shortages`, 'po', p.id); toast(`${pos.length} draft PO(s) created — review rates & send`)
    nav(`/purchase?open=${pos[0].id}`)
  }

  const issue = () => {
    applyStock(issuable.map(r => ({ itemId: r.item.id, delta: -r.b.qty, type: 'Issue' as const, ref: p.code })))
    saveProject(p.id, x => ({ ...x, boq: x.boq.map(b => issuable.some(r => r.b.itemId === b.itemId) ? { ...b, issued: true } : b) }))
    log(`${issuable.length} BOQ items issued from stores to ${p.code}`, 'stock', p.id); toast(`${issuable.length} items issued from stock`); setConfirm(false)
  }

  if (!p.boqGenerated) return (
    <Card className="py-14 text-center"><div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600"><ListChecks size={28} /></div>
      <h3 className="text-lg font-semibold text-ink">Generate Bill of Quantities</h3><p className="mx-auto mt-1 max-w-md text-sm text-slate-500">All {p.boq.length} components required for the {prod.name} ({p.capacity}) are listed and instantly compared with current stock to highlight shortages.</p>
      <Button className="mt-5" onClick={generate}><Sparkles size={16} /> Generate BOQ</Button></Card>)

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-4">
        <Mini label="Total items" v={rows.length} /><Mini label="Available in stock" v={rows.filter(r => r.short === 0 && !r.b.issued).length} tone="text-emerald-600" />
        <Mini label="Shortage items" v={shortRows.length} tone={shortRows.length ? 'text-red-600' : ''} /><Mini label="Issued to factory" v={rows.filter(r => r.b.issued).length} tone="text-brand-600" />
      </div>
      <Card pad={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div><h3 className="font-semibold text-ink">Bill of Quantities</h3><p className="text-sm text-slate-500">Live comparison with stores. Shortage items are purchased at last rate by default.</p></div>
          <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => setDoc(true)}><Printer size={16} /> Print BOQ</Button>
            <Button variant="secondary" onClick={createPOs} disabled={!toBuy.length}><ShoppingCart size={16} /> Create POs for shortage ({toBuy.length})</Button>
            <Button variant="accent" onClick={() => setConfirm(true)} disabled={!issuable.length}><PackageCheck size={16} /> Issue available material</Button></div>
        </div>
        <div className="overflow-x-auto"><table className="w-full"><thead className="bg-slate-50"><tr><th className="th">#</th><th className="th">Item</th><th className="th text-right">Required</th><th className="th text-right">In stock</th><th className="th text-right">Shortage</th><th className="th text-right">On order</th><th className="th text-right">Last rate</th><th className="th">Status</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{rows.map((r, i) => (
            <tr key={r.b.itemId} className={r.short > 0 ? 'bg-red-50/40' : ''}>
              <td className="td text-slate-400">{i + 1}</td><td className="td"><div className="font-medium text-slate-800">{r.item.name}</div><div className="text-xs text-slate-400">{r.item.sku}</div></td>
              <td className="td text-right font-medium">{editable && !r.b.issued ? <input type="number" min={1} className="inp !w-20 text-right" value={r.b.qty} onChange={e => saveProject(p.id, x => ({ ...x, boq: x.boq.map(b => b.itemId === r.b.itemId ? { ...b, qty: Math.max(1, +e.target.value) } : b) }))} /> : r.b.qty} <span className="text-xs text-slate-400">{r.item.unit}</span></td><td className="td text-right">{r.item.stock}</td>
              <td className={`td text-right font-bold ${r.short ? 'text-red-600' : 'text-slate-300'}`}>{r.short ? `− ${r.short}` : '0'}</td><td className="td text-right">{r.onOrder || '—'}</td><td className="td text-right">{inr(r.item.lastRate)}</td>
              <td className="td">{r.b.issued ? <Badge tone="blue"><CheckCircle2 size={12} /> Issued</Badge> : r.short > 0 ? (r.toBuy === 0 ? <Badge tone="amber">On order</Badge> : <Badge tone="red"><AlertTriangle size={12} /> Short</Badge>) : <Badge tone="green">In stock</Badge>}</td></tr>))}</tbody></table></div>
        {editable && <div className="flex items-center gap-2 border-t border-slate-100 px-5 py-3"><select className="inp !w-80" value={adding} onChange={e => { const id = e.target.value; if (!id) return; saveProject(p.id, x => ({ ...x, boq: [...x.boq, { itemId: id, qty: 1, issued: false }] })); toast('Item added to BOQ'); setAdding('') }}><option value="">+ Add extra material to this BOQ…</option>{db.stock.filter(s => !p.boq.some(b => b.itemId === s.id)).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>}
        {pending.length === 0 && <p className="border-t border-slate-100 px-5 py-3 text-sm text-emerald-700">✓ All materials issued to production.</p>}
      </Card>

      {confirm && <Modal title="Issue material from stores" subtitle={`${issuable.length} items will be deducted from stock for ${p.code}`} onClose={() => setConfirm(false)} width="max-w-lg" footer={<><Button variant="secondary" onClick={() => setConfirm(false)}>Cancel</Button><Button variant="accent" onClick={issue}>Confirm issue</Button></>}>
        <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto text-sm">{issuable.map(r => <li key={r.b.itemId} className="flex justify-between py-2"><span>{r.item.name}</span><b>{r.b.qty} {r.item.unit}</b></li>)}</ul></Modal>}

      {doc && <PrintModal title={`BOQ ${p.code}`} onClose={() => setDoc(false)}>
        <DocHeader title="Bill of Quantities" no={p.code} date={fmtDate(today())} />
        <p style={{ marginBottom: 8 }}><b>{p.company}</b> · {prod.name} – {p.capacity} · PO {p.poNo}</p>
        <table><thead><tr><th>#</th><th>SKU</th><th>Description</th><th>Qty</th><th>Unit</th><th>In stock</th><th>Short</th></tr></thead>
          <tbody>{rows.map((r, i) => <tr key={r.b.itemId}><td>{i + 1}</td><td>{r.item.sku}</td><td>{r.item.name}</td><td>{r.b.qty}</td><td>{r.item.unit}</td><td>{r.item.stock}</td><td>{r.short || '—'}</td></tr>)}</tbody></table>
      </PrintModal>}
    </div>
  )
}
const Mini = ({ label, v, tone = '' }: { label: string; v: number; tone?: string }) => <Card className="!p-4"><div className="text-xs uppercase tracking-wide text-slate-400">{label}</div><div className={`text-2xl font-bold text-ink ${tone}`}>{v}</div></Card>
