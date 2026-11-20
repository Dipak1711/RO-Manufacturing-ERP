import { useState } from 'react'
import { FileText, Plus, Receipt, ScrollText, Trash2, Truck } from 'lucide-react'
import type { Dispatch, Photo, Project } from '../../types'
import { useApp } from '../../store'
import { Button, Card, Field, Badge } from '../ui'
import { PhotoStrip, PhotoUploader } from '../Media'
import { DocHeader, PrintModal, SignBlock } from '../PrintModal'
import { addDays, fmtDate, inr, numberToWords, today } from '../../lib/utils'
import { quoteTotals } from '../../lib/calc'
import { ConsumablePlanModal } from './ConsumablesTab'

export default function DispatchTab({ p }: { p: Project }) {
  const { db, user, saveProject, next, toast, log } = useApp()
  const prod = db.products.find(x => x.id === p.productId)!
  const d = p.dispatch
  const [doc, setDoc] = useState<null | 'inv' | 'eway' | 'rep'>(null)
  const [cons, setCons] = useState(false)
  const initItems = () => [{ desc: `${prod.name} ${p.capacity} – complete skid assembly`, qty: 1, unit: 'Set' }, ...p.boq.slice(0, 5).map(b => { const s = db.stock.find(x => x.id === b.itemId)!; return { desc: s.name, qty: b.qty, unit: s.unit } }), { desc: 'Operation manual, test certificate & warranty card', qty: 1, unit: 'Set' }]
  const [f, setF] = useState({ vehicle: '', transporter: '', lrNo: '', driver: '', destination: `${p.city}, Gujarat`, remarks: '' })
  const [items, setItems] = useState(initItems), [photos, setPhotos] = useState<Photo[]>([])
  const ready = p.status === 'Ready for Dispatch' || p.status === 'In Production' || p.status === 'Procurement' || p.status === 'Order Confirmed'

  const create = () => {
    if (!f.vehicle || !f.transporter) return toast('Vehicle number and transporter are required', 'err')
    if (!photos.length && !confirm('No dispatch photos added. Continue anyway?')) return
    const n = next('invoice'), e = next('eway')
    const nd: Dispatch = { ...f, date: today(), items, photos, invoiceNo: `INV/26-27/${String(n).padStart(4, '0')}`, ewayNo: `2810${String(Math.floor(Math.random() * 1e7) + 1e7).slice(0, 7)}${String(e).padStart(1, '0')}`.slice(0, 12).padEnd(12, '0'), ewayValidTill: addDays(today(), 3) }
    saveProject(p.id, x => ({ ...x, dispatch: nd, status: 'Dispatched' }))
    log(`${p.code} dispatched – Invoice ${nd.invoiceNo}, E-way bill ${nd.ewayNo}`, 'dispatch', p.id); toast('Dispatch recorded · Invoice & e-way bill generated')
    if (!p.consumables.length) setCons(true)
  }

  if (!d) return (
    <Card>
      <div className="mb-5 flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-teal-50 text-teal-600"><Truck size={22} /></div><div><h3 className="font-semibold text-ink">Dispatch plant</h3><p className="text-sm text-slate-500">Photos and item list generate the dispatch report, tax invoice and e-way bill together.</p></div></div>
      {p.status !== 'Ready for Dispatch' && <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">Production is not yet marked 100% complete (current status: {p.status}). You can still dispatch if required.</p>}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Vehicle number *"><input className="inp" placeholder="GJ-01-AB-1234" value={f.vehicle} onChange={e => setF({ ...f, vehicle: e.target.value.toUpperCase() })} /></Field>
        <Field label="Transporter *"><input className="inp" value={f.transporter} onChange={e => setF({ ...f, transporter: e.target.value })} /></Field>
        <Field label="LR / Docket no."><input className="inp" value={f.lrNo} onChange={e => setF({ ...f, lrNo: e.target.value })} /></Field>
        <Field label="Driver name"><input className="inp" value={f.driver} onChange={e => setF({ ...f, driver: e.target.value })} /></Field>
        <Field label="Destination" className="sm:col-span-2"><input className="inp" value={f.destination} onChange={e => setF({ ...f, destination: e.target.value })} /></Field>
      </div>
      <div className="mt-5"><div className="mb-2 flex items-center justify-between"><div className="lbl !mb-0">Dispatch item list</div><Button size="sm" variant="secondary" onClick={() => setItems([...items, { desc: '', qty: 1, unit: 'Nos' }])}><Plus size={13} /> Add item</Button></div>
        <div className="space-y-2">{items.map((it, i) => <div key={i} className="flex gap-2"><input className="inp" value={it.desc} onChange={e => setItems(items.map((x, k) => k === i ? { ...x, desc: e.target.value } : x))} /><input type="number" className="inp !w-20" value={it.qty} onChange={e => setItems(items.map((x, k) => k === i ? { ...x, qty: +e.target.value } : x))} /><input className="inp !w-20" value={it.unit} onChange={e => setItems(items.map((x, k) => k === i ? { ...x, unit: e.target.value } : x))} /><button onClick={() => setItems(items.filter((_, k) => k !== i))} className="px-1 text-slate-300 hover:text-red-500"><Trash2 size={16} /></button></div>)}</div></div>
      <div className="mt-5"><div className="lbl">Dispatch photos (loading, nameplate, packing)</div><PhotoUploader photos={photos} onChange={setPhotos} max={6} /></div>
      <Field label="Remarks" className="mt-4"><input className="inp" value={f.remarks} onChange={e => setF({ ...f, remarks: e.target.value })} /></Field>
      <div className="mt-6 flex justify-end"><Button variant="accent" onClick={create} disabled={!ready && p.status !== 'Ready for Dispatch'}><Truck size={16} /> Dispatch & generate invoice + e-way bill</Button></div>
      {cons && <ConsumablePlanModal p={p} firstSupply onClose={() => setCons(false)} />}
    </Card>
  )

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2"><h3 className="font-semibold text-ink">Dispatched on {fmtDate(d.date)}</h3><Badge tone="green">Delivered to transporter</Badge></div><p className="mt-1 text-sm text-slate-500">{d.transporter} · {d.vehicle} · LR {d.lrNo || '—'} · {d.destination}</p></div>
          <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => setDoc('rep')}><ScrollText size={16} /> Dispatch report</Button><Button variant="secondary" onClick={() => setDoc('inv')}><Receipt size={16} /> Tax invoice</Button><Button variant="secondary" onClick={() => setDoc('eway')}><FileText size={16} /> E-way bill</Button></div></div>
        <div className="mt-5 grid gap-5 lg:grid-cols-2"><div><div className="lbl">Items dispatched</div><ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 text-sm">{d.items.map((it, i) => <li key={i} className="flex justify-between px-3 py-2"><span>{it.desc}</span><b>{it.qty} {it.unit}</b></li>)}</ul></div><div><div className="lbl">Photos</div><PhotoStrip photos={d.photos} />{!d.photos.length && <p className="text-sm text-slate-400">No photos</p>}</div></div>
        <div className="mt-4 flex gap-6 text-sm"><span><span className="text-slate-400">Invoice</span> <b>{d.invoiceNo}</b></span><span><span className="text-slate-400">E-way bill</span> <b>{d.ewayNo}</b></span><span><span className="text-slate-400">Valid till</span> <b>{fmtDate(d.ewayValidTill)}</b></span></div>
      </Card>

      {doc === 'rep' && <PrintModal title={`Dispatch report ${p.code}`} onClose={() => setDoc(null)} share={{ phone: p.phone, email: p.email, subject: `Dispatch details – ${p.code}`, text: `Dear ${p.contact},\n\nYour ${prod.name} has been dispatched on ${fmtDate(d.date)} via ${d.transporter}, vehicle ${d.vehicle}, LR ${d.lrNo}.\n\nRegards,\n${user!.name}` }}>
        <DocHeader title="Dispatch Report" no={p.code} date={fmtDate(d.date)} />
        <table style={{ marginBottom: 8 }}><tbody><tr><td><b>Consignee</b><br />{p.company}<br />{d.destination}</td><td><b>Transport</b><br />{d.transporter}<br />Vehicle {d.vehicle} · LR {d.lrNo || '—'}<br />Driver {d.driver || '—'}</td><td><b>References</b><br />PO {p.poNo}<br />Invoice {d.invoiceNo}<br />E-way {d.ewayNo}</td></tr></tbody></table>
        <h3>Items dispatched</h3><table><thead><tr><th>#</th><th>Description</th><th>Qty</th><th>Unit</th></tr></thead><tbody>{d.items.map((it, i) => <tr key={i}><td>{i + 1}</td><td>{it.desc}</td><td>{it.qty}</td><td>{it.unit}</td></tr>)}</tbody></table>
        {d.photos.length > 0 && <><h3>Dispatch photographs</h3><div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{d.photos.map(ph => <img key={ph.id} src={ph.src} style={{ width: 170, height: 115, objectFit: 'cover', border: '1px solid #cbd5e1' }} />)}</div></>}
        {d.remarks && <p style={{ marginTop: 8 }}><b>Remarks:</b> {d.remarks}</p>}
        <SignBlock left="Dispatch in-charge" right="Received by (Consignee)" />
      </PrintModal>}
      {doc === 'inv' && <PrintModal title={`Invoice ${d.invoiceNo}`} onClose={() => setDoc(null)} share={{ phone: p.phone, email: p.email, subject: `Tax Invoice ${d.invoiceNo} – ${p.code}`, text: `Dear ${p.contact},\n\nPlease find Tax Invoice ${d.invoiceNo} for ${inr(p.value)} against PO ${p.poNo}.\n\nRegards,\nAquaFlow Engineering` }}><InvoiceDoc p={p} /></PrintModal>}
      {doc === 'eway' && <PrintModal title={`E-way bill ${d.ewayNo}`} onClose={() => setDoc(null)}><EwayDoc p={p} /></PrintModal>}
      {cons && <ConsumablePlanModal p={p} firstSupply onClose={() => setCons(false)} />}
    </div>
  )
}

function InvoiceDoc({ p }: { p: Project }) {
  const { db } = useApp()
  const d = p.dispatch!, q = db.quotations.find(x => x.id === p.quotationId)
  const t = q ? quoteTotals(q) : { sub: p.value / 1.18, disc: 0, taxable: p.value / 1.18, gst: p.value - p.value / 1.18, total: p.value }
  const lines = q ? q.lines : [{ desc: db.products.find(x => x.id === p.productId)?.name || 'Plant', qty: 1, unit: 'Set', rate: t.sub }]
  const half = t.gst / 2
  return (
    <div>
      <DocHeader title="Tax Invoice" no={d.invoiceNo} date={fmtDate(d.date)} extra={<div><b>PO:</b> {p.poNo}</div>} />
      <table style={{ marginBottom: 8 }}><tbody><tr><td style={{ width: '50%' }}><b>Bill to / Ship to</b><br /><b>{p.company}</b><br />{p.city}, Gujarat<br />Attn: {p.contact} · {p.phone}</td><td><b>Dispatch details</b><br />Vehicle: {d.vehicle}<br />Transporter: {d.transporter} · LR {d.lrNo || '—'}<br />E-way bill: {d.ewayNo}<br />Project: {p.code}</td></tr></tbody></table>
      <table><thead><tr><th>#</th><th>Description of goods / services</th><th>HSN/SAC</th><th>Qty</th><th style={{ textAlign: 'right' }}>Rate</th><th style={{ textAlign: 'right' }}>Amount (₹)</th></tr></thead>
        <tbody>{lines.map((l, i) => <tr key={i}><td>{i + 1}</td><td>{l.desc}</td><td>8421</td><td>{l.qty} {l.unit}</td><td style={{ textAlign: 'right' }}>{l.rate.toLocaleString('en-IN')}</td><td style={{ textAlign: 'right' }}>{(l.qty * l.rate).toLocaleString('en-IN')}</td></tr>)}
          {t.disc > 0 && <tr><td colSpan={5} style={{ textAlign: 'right' }}>Discount</td><td style={{ textAlign: 'right' }}>− {Math.round(t.disc).toLocaleString('en-IN')}</td></tr>}
          <tr><td colSpan={5} style={{ textAlign: 'right' }}>Taxable value</td><td style={{ textAlign: 'right' }}>{Math.round(t.taxable).toLocaleString('en-IN')}</td></tr>
          <tr><td colSpan={5} style={{ textAlign: 'right' }}>CGST @ {(q?.gst || 18) / 2}%</td><td style={{ textAlign: 'right' }}>{Math.round(half).toLocaleString('en-IN')}</td></tr>
          <tr><td colSpan={5} style={{ textAlign: 'right' }}>SGST @ {(q?.gst || 18) / 2}%</td><td style={{ textAlign: 'right' }}>{Math.round(half).toLocaleString('en-IN')}</td></tr>
          <tr><td colSpan={5} style={{ textAlign: 'right' }}><b>Invoice total</b></td><td style={{ textAlign: 'right' }}><b>{inr(t.total)}</b></td></tr></tbody></table>
      <p style={{ marginTop: 6, fontStyle: 'italic' }}>{numberToWords(t.total)}</p>
      <h3>Bank details</h3><p>{db.company.bank}</p>
      <p style={{ fontSize: 10.5, color: '#64748b', marginTop: 6 }}>Goods once sold will not be taken back. Subject to Ahmedabad jurisdiction. This is a computer generated invoice.</p>
      <SignBlock left="Customer signature" right={`Authorised signatory – ${db.company.name}`} />
    </div>
  )
}

function EwayDoc({ p }: { p: Project }) {
  const { db } = useApp(); const d = p.dispatch!
  return (
    <div>
      <DocHeader title="E-Way Bill" no={d.ewayNo} date={fmtDate(d.date)} />
      <h3>Part A</h3>
      <table><tbody>
        <tr><th style={{ width: 170 }}>E-way bill no.</th><td><b>{d.ewayNo}</b></td><th style={{ width: 150 }}>Valid until</th><td>{fmtDate(d.ewayValidTill)}</td></tr>
        <tr><th>Supply type</th><td>Outward – Supply</td><th>Document</th><td>Tax Invoice {d.invoiceNo}</td></tr>
        <tr><th>From (consignor)</th><td>{db.company.name}<br />GSTIN {db.company.gstin}<br />{db.company.address}</td><th>To (consignee)</th><td>{p.company}<br />{d.destination}</td></tr>
        <tr><th>Goods value</th><td>{inr(p.value)}</td><th>HSN code</th><td>8421</td></tr></tbody></table>
      <h3>Part B – Transport details</h3>
      <table><tbody><tr><th style={{ width: 170 }}>Transporter</th><td>{d.transporter}</td><th style={{ width: 150 }}>Vehicle no.</th><td>{d.vehicle}</td></tr><tr><th>Mode</th><td>Road</td><th>LR / Docket</th><td>{d.lrNo || '—'}</td></tr></tbody></table>
      <p style={{ marginTop: 12, textAlign: 'center', fontFamily: 'monospace', letterSpacing: 4, fontSize: 18 }}>▌▌▎▌▎▎▌▌▎▌▌▎▎▌▎▌▌▎▎▌▌▎▌</p><p style={{ textAlign: 'center', fontSize: 10.5 }}>{d.ewayNo}</p>
    </div>
  )
}
