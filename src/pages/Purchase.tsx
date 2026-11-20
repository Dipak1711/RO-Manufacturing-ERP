import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowDown, ArrowUp, CheckCircle2, Plus, ShoppingCart, Trash2 } from 'lucide-react'
import { useApp } from '../store'
import { Badge, Button, Card, Empty, Field, Modal, PageHeader, Tabs } from '../components/ui'
import { can } from '../lib/roles'
import type { Supplier } from '../types'
import { PrintModal, DocHeader, SignBlock } from '../components/PrintModal'
import { fmtDate, inr, today, uid } from '../lib/utils'
import type { PO } from '../types'

const tone = { Draft: 'slate', Sent: 'blue', Received: 'green' } as const
export default function Purchase() {
  const { db, savePO, next, toast, setDB } = useApp()
  const [sp, setSp] = useSearchParams()
  const [tab, setTab] = useState<'po' | 'sup'>('po'), [supEdit, setSupEdit] = useState<Supplier | null>(null), [supView, setSupView] = useState<Supplier | null>(null)
  const open = sp.get('open')
  const total = (o: PO) => o.lines.reduce((s, l) => s + l.qty * l.rate, 0)
  const create = () => { const o: PO = { id: uid(), no: `PO/26-27/${String(next('po')).padStart(4, '0')}`, supplierId: db.suppliers[0].id, date: today(), status: 'Draft', lines: [], notes: '' }; savePO(o); setSp({ open: o.id }) }
  return (
    <>
      <PageHeader title="Purchase Orders" subtitle="Raise POs at last purchase rate, adjust in one click and send straight to the supplier." actions={<Button onClick={create}><Plus size={16} /> New PO</Button>} />
      <div className="mb-4"><Tabs tabs={[{ id: 'po', label: 'Purchase orders' }, { id: 'sup', label: 'Suppliers & history' }]} value={tab} onChange={setTab} /></div>
      {tab === 'sup' ? <>
        <div className="mb-3 flex justify-end"><Button variant="secondary" onClick={() => setSupEdit({ id: uid(), name: '', phone: '', email: '', city: '' })}><Plus size={15} /> Add supplier</Button></div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{db.suppliers.map(s => { const pos = db.pos.filter(o => o.supplierId === s.id); const val = pos.reduce((a, o) => a + o.lines.reduce((b, l) => b + l.qty * l.rate, 0), 0); return (
          <Card key={s.id}><div className="font-semibold text-ink">{s.name}</div><div className="text-sm text-slate-500">{s.city} · {s.phone}</div><div className="text-sm text-slate-500">{s.email}</div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm"><div className="rounded-lg bg-slate-50 p-2"><b>{pos.length}</b><div className="text-[11px] text-slate-400">POs</div></div><div className="rounded-lg bg-slate-50 p-2"><b>{db.stock.filter(i => i.supplierId === s.id).length}</b><div className="text-[11px] text-slate-400">Items</div></div><div className="rounded-lg bg-slate-50 p-2"><b>{inr(val)}</b><div className="text-[11px] text-slate-400">Value</div></div></div>
            <div className="mt-3 flex gap-2"><Button size="sm" variant="secondary" onClick={() => setSupView(s)}>Purchase history</Button><Button size="sm" variant="ghost" onClick={() => setSupEdit(s)}>Edit</Button></div></Card>) })}</div>
        {supEdit && <SupModal s={supEdit} onClose={() => setSupEdit(null)} onSave={x => { setDB(d => ({ ...d, suppliers: d.suppliers.some(y => y.id === x.id) ? d.suppliers.map(y => y.id === x.id ? x : y) : [...d.suppliers, x] })); toast('Supplier saved'); setSupEdit(null) }} />}
        {supView && <Modal title={supView.name} subtitle="Supplier-wise purchase history" width="max-w-3xl" onClose={() => setSupView(null)}>
          <table className="w-full"><thead className="bg-slate-50"><tr><th className="th">PO</th><th className="th">Date</th><th className="th">Item</th><th className="th text-right">Qty</th><th className="th text-right">Rate</th><th className="th">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{db.pos.filter(o => o.supplierId === supView.id).flatMap(o => o.lines.map(l => ({ o, l }))).map(({ o, l }, i) => <tr key={i}><td className="td font-medium text-brand-700">{o.no}</td><td className="td">{fmtDate(o.date)}</td><td className="td">{l.name}</td><td className="td text-right">{l.qty} {l.unit}</td><td className="td text-right">{inr(l.rate)}</td><td className="td"><Badge tone={tone[o.status]}>{o.status}</Badge></td></tr>)}</tbody></table>
          {!db.pos.some(o => o.supplierId === supView.id) && <p className="py-6 text-center text-sm text-slate-400">No purchases from this supplier yet.</p>}</Modal>}
      </> : <>
      <Card pad={false} className="overflow-x-auto">{db.pos.length === 0 ? <Empty icon={<ShoppingCart size={40} />} title="No purchase orders" /> : (
        <table className="w-full"><thead className="border-b border-slate-100 bg-slate-50"><tr><th className="th">PO no.</th><th className="th">Supplier</th><th className="th">Project</th><th className="th">Date</th><th className="th">Items</th><th className="th">Status</th><th className="th text-right">Value</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{db.pos.map(o => <tr key={o.id} onClick={() => setSp({ open: o.id })} className="cursor-pointer hover:bg-slate-50"><td className="td font-semibold text-brand-700">{o.no}</td><td className="td">{db.suppliers.find(s => s.id === o.supplierId)?.name}</td><td className="td">{db.projects.find(p => p.id === o.projectId)?.code || '—'}</td><td className="td">{fmtDate(o.date)}</td><td className="td">{o.lines.length}</td><td className="td"><Badge tone={tone[o.status]}>{o.status}</Badge></td><td className="td text-right font-semibold">{inr(total(o))}</td></tr>)}</tbody></table>)}</Card>
      </>}
      {open && db.pos.find(o => o.id === open) && <PODetail id={open} onClose={() => setSp({})} />}
    </>
  )
}

function PODetail({ id, onClose }: { id: string; onClose: () => void }) {
  const { db, savePO, setDB, toast, log, applyStock, user } = useApp()
  const rateOk = can.editRates(user!.role)
  const o = db.pos.find(x => x.id === id)!
  const [doc, setDoc] = useState(false)
  const sup = db.suppliers.find(s => s.id === o.supplierId)!
  const upLine = (i: number, patch: object) => (('rate' in patch) && !rateOk ? toast('You are not authorised to change purchase rates', 'err') : savePO({ ...o, lines: o.lines.map((l, k) => k === i ? { ...l, ...patch } : l) }))
  const total = o.lines.reduce((s, l) => s + l.qty * l.rate, 0)
  const locked = o.status === 'Received'
  const receive = () => {
    setDB(d => ({ ...d, pos: d.pos.map(x => x.id === o.id ? { ...x, status: 'Received' } : x) }))
    applyStock(o.lines.map(l => ({ itemId: l.itemId, delta: l.qty, type: 'Receipt' as const, ref: o.no, rate: l.rate })))
    log(`${o.no} received – stock updated`, 'stock', o.projectId); toast('Goods received · stock & last rates updated')
  }
  const addable = db.stock.filter(s => !o.lines.some(l => l.itemId === s.id))
  return (
    <>
      <Modal title={o.no} subtitle={`${sup.name} · ${fmtDate(o.date)}`} onClose={onClose} width="max-w-4xl"
        footer={<><Badge tone={tone[o.status]} className="mr-auto">{o.status}</Badge>{!locked && <Button variant="secondary" onClick={() => setDoc(true)}>Preview & send</Button>}{o.status === 'Draft' && <Button variant="secondary" onClick={() => { savePO({ ...o, status: 'Sent' }); toast('Marked as sent') }}>Mark sent</Button>}{!locked && <Button variant="accent" onClick={receive} disabled={!o.lines.length}><CheckCircle2 size={15} /> Receive goods</Button>}{locked && <Button variant="secondary" onClick={() => setDoc(true)}>View PO</Button>}</>}>
        <div className="mb-4 grid gap-4 sm:grid-cols-3"><Field label="Supplier"><select className="inp" disabled={locked} value={o.supplierId} onChange={e => savePO({ ...o, supplierId: e.target.value })}>{db.suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
          <Field label="Project (optional)"><select className="inp" disabled={locked} value={o.projectId || ''} onChange={e => savePO({ ...o, projectId: e.target.value || undefined })}><option value="">— Stock replenishment —</option>{db.projects.map(p => <option key={p.id} value={p.id}>{p.code} · {p.company}</option>)}</select></Field>
          <Field label="Notes to supplier"><input className="inp" disabled={locked} value={o.notes} onChange={e => savePO({ ...o, notes: e.target.value })} /></Field></div>
        <table className="w-full"><thead className="bg-slate-50"><tr><th className="th">Item</th><th className="th w-24">Qty</th><th className="th w-32">Rate (₹)</th><th className="th w-28">vs last rate</th><th className="th w-28 text-right">Amount</th><th className="w-8" /></tr></thead>
          <tbody className="divide-y divide-slate-100">{o.lines.map((l, i) => { const diff = l.rate - l.lastRate; return (
            <tr key={l.itemId}><td className="td"><div className="font-medium">{l.name}</div><div className="text-xs text-slate-400">last ₹{l.lastRate.toLocaleString('en-IN')} / {l.unit}</div></td>
              <td className="px-2"><input type="number" className="inp" disabled={locked} value={l.qty} onChange={e => upLine(i, { qty: +e.target.value })} /></td><td className="px-2"><input type="number" className="inp" disabled={locked || !rateOk} title={rateOk ? '' : 'Only Admin / Purchase can change rates'} value={l.rate} onChange={e => upLine(i, { rate: +e.target.value })} /></td>
              <td className="td">{diff === 0 ? <span className="text-slate-400">Same</span> : <span className={`flex items-center gap-1 font-medium ${diff > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{diff > 0 ? <ArrowUp size={13} /> : <ArrowDown size={13} />}{Math.abs(Math.round(diff / l.lastRate * 100))}%</span>}</td><td className="td text-right font-medium">{inr(l.qty * l.rate)}</td>
              <td>{!locked && <button onClick={() => savePO({ ...o, lines: o.lines.filter((_, k) => k !== i) })} className="text-slate-300 hover:text-red-500"><Trash2 size={15} /></button>}</td></tr>) })}</tbody></table>
        {!o.lines.length && <p className="py-6 text-center text-sm text-slate-400">No items yet — add below.</p>}
        <div className="mt-3 flex items-center justify-between">{!locked && <select className="inp !w-72" value="" onChange={e => { const s = db.stock.find(x => x.id === e.target.value)!; savePO({ ...o, supplierId: o.lines.length ? o.supplierId : s.supplierId, lines: [...o.lines, { itemId: s.id, name: s.name, unit: s.unit, qty: 1, rate: s.lastRate, lastRate: s.lastRate }] }) }}><option value="">+ Add item…</option>{addable.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>}<div className="ml-auto text-lg font-bold">Total {inr(total)} <span className="text-xs font-normal text-slate-400">+ GST</span></div></div>
      </Modal>
      {doc && <PrintModal title={`Purchase order ${o.no}`} onClose={() => setDoc(false)} share={{ phone: sup.phone, email: sup.email, subject: `Purchase Order ${o.no} – AquaFlow Engineering`, text: `Dear Sir/Madam,\n\nPlease find our purchase order ${o.no} (${inr(total)} + GST). Kindly confirm delivery schedule.\n\nRegards,\nAquaFlow Engineering – Purchase Dept.` }} onShared={() => o.status === 'Draft' && savePO({ ...o, status: 'Sent' })}>
        <DocHeader title="Purchase Order" no={o.no} date={fmtDate(o.date)} />
        <table style={{ marginBottom: 8 }}><tbody><tr><td><b>To</b><br /><b>{sup.name}</b><br />{sup.city}<br />{sup.phone} · {sup.email}</td><td><b>Deliver to</b><br />{db.company.name}<br />{db.company.address}{o.projectId && <><br />Ref project: {db.projects.find(p => p.id === o.projectId)?.code}</>}</td></tr></tbody></table>
        <table><thead><tr><th>#</th><th>Description</th><th>Qty</th><th>Unit</th><th style={{ textAlign: 'right' }}>Rate (₹)</th><th style={{ textAlign: 'right' }}>Amount (₹)</th></tr></thead><tbody>{o.lines.map((l, i) => <tr key={i}><td>{i + 1}</td><td>{l.name}</td><td>{l.qty}</td><td>{l.unit}</td><td style={{ textAlign: 'right' }}>{l.rate.toLocaleString('en-IN')}</td><td style={{ textAlign: 'right' }}>{(l.qty * l.rate).toLocaleString('en-IN')}</td></tr>)}<tr><td colSpan={5} style={{ textAlign: 'right' }}><b>Total (excl. GST)</b></td><td style={{ textAlign: 'right' }}><b>{total.toLocaleString('en-IN')}</b></td></tr></tbody></table>
        {o.notes && <p style={{ marginTop: 8 }}><b>Notes:</b> {o.notes}</p>}<p style={{ marginTop: 8 }}>Payment: 30 days from receipt of material. GST extra as applicable. Test certificates to accompany material.</p>
        <SignBlock left="Supplier acceptance" right="Authorised signatory" />
      </PrintModal>}
    </>
  )
}

function SupModal({ s, onClose, onSave }: { s: Supplier; onClose: () => void; onSave: (s: Supplier) => void }) {
  const { toast } = useApp(); const [f, setF] = useState(s)
  const save = () => { if (!f.name.trim()) return toast('Supplier name is required', 'err'); if (!/^[6-9]\d{9}$/.test(f.phone.replace(/\D/g, '').slice(-10))) return toast('Enter a valid 10-digit mobile number', 'err'); onSave(f) }
  return <Modal title={s.name ? 'Edit supplier' : 'New supplier'} width="max-w-md" onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save}>Save</Button></>}><div className="grid gap-4">{(['name', 'city', 'phone', 'email'] as const).map(k => <Field key={k} label={k}><input className="inp" value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })} /></Field>)}</div></Modal>
}
