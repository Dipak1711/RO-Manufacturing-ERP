import { useState } from 'react'
import { FileDown, IndianRupee, Pencil, Plus, Trash2 } from 'lucide-react'
import type { Milestone, Project } from '../../types'
import { useApp } from '../../store'
import { Badge, Button, Card, Field, Modal } from '../ui'
import { PrintModal, DocHeader, SignBlock } from '../PrintModal'
import { fmtDate, inr, numberToWords, today, uid } from '../../lib/utils'
import { paidOf } from '../../lib/calc'
import { can } from '../../lib/roles'

export default function Payments({ p }: { p: Project }) {
  const { db, user } = useApp()
  const [doc, setDoc] = useState(false), [rec, setRec] = useState<Milestone | null>(null), [edit, setEdit] = useState(false)
  const paid = p.payments.reduce((s, m) => s + paidOf(m), 0)
  const canEdit = can.payments(user!.role)
  const tone = { Received: 'green', Partial: 'amber', Pending: 'slate' } as const
  const history = p.payments.flatMap(m => (m.receipts?.length ? m.receipts : m.status === 'Received' ? [{ id: m.id, date: m.receivedOn || p.orderDate, amount: m.amount, mode: '—', ref: '—' }] : []).map(r => ({ ...r, label: m.label }))).sort((a, b) => b.date.localeCompare(a.date))
  return (
    <div className="space-y-5">
      <Card>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold text-ink">Payment schedule</h3><p className="text-sm text-slate-500">Received {inr(paid)} of {inr(p.value)} · balance {inr(p.value - paid)}</p></div>
          <div className="flex gap-2">{canEdit && <Button variant="secondary" onClick={() => setEdit(true)}><Pencil size={15} /> Edit schedule</Button>}<Button onClick={() => setDoc(true)}><FileDown size={16} /> Payment schedule PDF</Button></div></div>
        <div className="grid gap-4 md:grid-cols-3">{p.payments.map((m, i) => { const pd = paidOf(m); return (
          <div key={m.id} className={`rounded-xl border p-4 ${m.status === 'Received' ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200'}`}>
            <div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase text-slate-400">Milestone {i + 1}</span><Badge tone={tone[m.status]}>{m.status}</Badge></div>
            <div className="mt-2 text-sm font-medium text-slate-700">{m.label}</div><div className="mt-1 text-2xl font-bold text-ink">{inr(m.amount)}</div><div className="text-sm text-slate-500">{m.percent}% of order value{m.dueDate && ` · due ${fmtDate(m.dueDate)}`}</div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-accent-500" style={{ width: `${Math.min(100, pd / m.amount * 100)}%` }} /></div><div className="mt-1 text-xs text-slate-500">Paid {inr(pd)} · Pending {inr(m.amount - pd)}</div>
            {canEdit && m.status !== 'Received' && <Button size="sm" variant="secondary" className="mt-3" onClick={() => setRec(m)}><IndianRupee size={14} /> Record payment</Button>}
          </div>) })}</div>
      </Card>
      <Card pad={false}><div className="border-b border-slate-100 px-5 py-4"><h3 className="font-semibold text-ink">Payment history</h3></div>
        {history.length === 0 ? <p className="p-6 text-center text-sm text-slate-400">No payments received yet.</p> : <div className="overflow-x-auto"><table className="w-full"><thead className="bg-slate-50"><tr><th className="th">Date</th><th className="th">Milestone</th><th className="th">Mode</th><th className="th">Reference</th><th className="th text-right">Amount</th></tr></thead><tbody className="divide-y divide-slate-100">{history.map(h => <tr key={h.id}><td className="td">{fmtDate(h.date)}</td><td className="td">{h.label}</td><td className="td">{h.mode}</td><td className="td">{h.ref}</td><td className="td text-right font-semibold text-emerald-700">{inr(h.amount)}</td></tr>)}</tbody></table></div>}</Card>

      {rec && <ReceiptModal p={p} m={rec} onClose={() => setRec(null)} />}
      {edit && <ScheduleModal p={p} onClose={() => setEdit(false)} />}
      {doc && <PrintModal title={`Payment schedule ${p.code}`} onClose={() => setDoc(false)} share={{ phone: p.phone, email: p.email, subject: `Payment schedule – ${p.code}`, text: `Dear ${p.contact},\n\nPlease find the payment schedule for your order ${p.code} (PO ${p.poNo}).\n\nRegards,\nAquaFlow Engineering` }}>
        <DocHeader title="Payment Schedule" no={p.code} date={fmtDate(today())} />
        <table style={{ marginBottom: 10 }}><tbody><tr><td><b>Client</b><br />{p.company}<br />{p.city}</td><td><b>Order</b><br />{db.products.find(x => x.id === p.productId)?.name} – {p.capacity}<br />Client PO: {p.poNo} · SO: {p.soNo}</td></tr></tbody></table>
        <table><thead><tr><th>#</th><th>Milestone</th><th>Share</th><th>Due</th><th style={{ textAlign: 'right' }}>Amount (₹)</th><th style={{ textAlign: 'right' }}>Received (₹)</th><th>Status</th></tr></thead>
          <tbody>{p.payments.map((m, i) => <tr key={m.id}><td>{i + 1}</td><td>{m.label}</td><td>{m.percent}%</td><td>{fmtDate(m.dueDate)}</td><td style={{ textAlign: 'right' }}>{m.amount.toLocaleString('en-IN')}</td><td style={{ textAlign: 'right' }}>{paidOf(m).toLocaleString('en-IN')}</td><td>{m.status}</td></tr>)}
            <tr><td colSpan={4} style={{ textAlign: 'right' }}><b>Total order value (incl. GST)</b></td><td style={{ textAlign: 'right' }}><b>{p.value.toLocaleString('en-IN')}</b></td><td style={{ textAlign: 'right' }}><b>{paid.toLocaleString('en-IN')}</b></td><td /></tr></tbody></table>
        <p style={{ marginTop: 6, fontStyle: 'italic' }}>{numberToWords(p.value)}</p>
        <h3>Bank details for remittance</h3><p>{db.company.bank}</p><p style={{ fontSize: 10.5, color: '#64748b' }}>Received to date: {inr(paid)} · Balance: {inr(p.value - paid)}</p>
        <SignBlock left="Client acknowledgement" right={`For ${db.company.name}`} />
      </PrintModal>}
    </div>
  )

}

function ReceiptModal({ p, m, onClose }: { p: Project; m: Milestone; onClose: () => void }) {
  const { saveProject, toast, log } = useApp()
  const bal = m.amount - paidOf(m)
  const [f, setF] = useState({ amount: String(bal), date: today(), mode: 'NEFT / RTGS', ref: '' })
  const save = () => {
    const a = Math.round(+f.amount)
    if (!a || a <= 0) return toast('Enter a valid amount', 'err')
    if (a > bal) return toast(`Amount exceeds the pending balance of ${inr(bal)}`, 'err')
    saveProject(p.id, x => ({ ...x, payments: x.payments.map(y => { if (y.id !== m.id) return y; const base = y.receipts?.length ? y.receipts : y.status === 'Received' ? [] : []; const receipts = [...base, { id: uid(), date: f.date, amount: a, mode: f.mode, ref: f.ref }]; const tot = receipts.reduce((s, r) => s + r.amount, 0); return { ...y, receipts, status: tot >= y.amount ? 'Received' : 'Partial', receivedOn: tot >= y.amount ? f.date : y.receivedOn } }) }))
    log(`Payment received: ${m.label} – ${inr(a)}`, 'payment', p.id); toast('Payment recorded'); onClose()
  }
  return (
    <Modal title="Record payment" subtitle={`${m.label} · pending ${inr(bal)}`} onClose={onClose} width="max-w-md" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="accent" onClick={save}>Save payment</Button></>}>
      <div className="grid gap-4"><Field label="Amount received (₹)"><input type="number" className="inp" value={f.amount} onChange={e => setF({ ...f, amount: e.target.value })} /></Field>
        <Field label="Date"><input type="date" className="inp" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /></Field>
        <Field label="Mode"><select className="inp" value={f.mode} onChange={e => setF({ ...f, mode: e.target.value })}>{['NEFT / RTGS', 'UPI', 'Cheque', 'Cash', 'DD'].map(x => <option key={x}>{x}</option>)}</select></Field>
        <Field label="Reference / UTR / cheque no."><input className="inp" value={f.ref} onChange={e => setF({ ...f, ref: e.target.value })} /></Field></div></Modal>
  )
}

function ScheduleModal({ p, onClose }: { p: Project; onClose: () => void }) {
  const { saveProject, toast } = useApp()
  const [rows, setRows] = useState(p.payments.map(m => ({ ...m })))
  const total = rows.reduce((s, r) => s + r.percent, 0)
  const set = (i: number, patch: Partial<Milestone>) => setRows(rows.map((r, k) => k === i ? { ...r, ...patch, ...(patch.percent !== undefined ? { amount: Math.round(p.value * patch.percent / 100) } : {}) } : r))
  const save = () => {
    if (total !== 100) return toast('Milestones must total 100%', 'err')
    if (rows.some(r => !r.label.trim())) return toast('Every milestone needs a name', 'err')
    const bad = rows.find(r => paidOf(r) > r.amount); if (bad) return toast(`"${bad.label}" is already paid more than its new amount`, 'err')
    saveProject(p.id, x => ({ ...x, payments: rows.map(r => ({ ...r, status: paidOf(r) >= r.amount ? 'Received' : paidOf(r) > 0 ? 'Partial' : 'Pending' })) })); toast('Payment schedule updated'); onClose()
  }
  return (
    <Modal title="Edit payment schedule" subtitle={`Order value ${inr(p.value)}`} onClose={onClose} width="max-w-2xl" footer={<><span className={`mr-auto text-sm font-semibold ${total === 100 ? 'text-emerald-600' : 'text-red-600'}`}>Total {total}%</span><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save}>Save schedule</Button></>}>
      <div className="space-y-3">{rows.map((r, i) => <div key={r.id} className="grid grid-cols-12 items-end gap-2"><div className="col-span-5"><Field label="Milestone"><input className="inp" value={r.label} onChange={e => set(i, { label: e.target.value })} /></Field></div><div className="col-span-2"><Field label="%"><input type="number" className="inp" value={r.percent} onChange={e => set(i, { percent: +e.target.value })} /></Field></div><div className="col-span-3"><Field label="Due date"><input type="date" className="inp" value={r.dueDate || ''} onChange={e => set(i, { dueDate: e.target.value })} /></Field></div><div className="col-span-1 pb-2 text-xs text-slate-500">{inr(r.amount)}</div><button className="col-span-1 pb-2 text-slate-300 hover:text-red-500" onClick={() => setRows(rows.filter((_, k) => k !== i))}><Trash2 size={15} /></button></div>)}
        <Button variant="secondary" size="sm" onClick={() => setRows([...rows, { id: uid(), label: 'New milestone', percent: 0, amount: 0, status: 'Pending' }])}><Plus size={14} /> Add milestone</Button></div></Modal>
  )
}
