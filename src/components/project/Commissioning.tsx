import { useState } from 'react'
import { CheckCircle2, Mail, Printer, Wrench, XCircle } from 'lucide-react'
import type { Commissioning as C, Photo, Project } from '../../types'
import { useApp } from '../../store'
import { Badge, Button, Card, Field } from '../ui'
import { PhotoStrip, PhotoUploader, SignaturePad } from '../Media'
import { DocHeader, PrintModal, SignBlock } from '../PrintModal'
import { fmtDate, mailLink, num, today } from '../../lib/utils'
import { InstallationEditor, InstBadge } from './InstallationPanel'
import { can } from '../../lib/roles'

const labels: [keyof C['params'], string, string][] = [['inTds', 'Feed water TDS', 'ppm'], ['outTds', 'Product water TDS', 'ppm'], ['inPressure', 'Feed pressure', 'bar'], ['outPressure', 'HP pump pressure', 'bar'], ['flow', 'Product flow rate', 'LPH'], ['recovery', 'Recovery', '%'], ['ph', 'Product pH', ''], ['power', 'Power consumption', 'kW']]

export default function Commissioning({ p }: { p: Project }) {
  const { db, user, saveProject, toast, log } = useApp()
  const q = db.quotations.find(x => x.id === p.quotationId)
  const prod = db.products.find(x => x.id === p.productId)!
  const [edit, setEdit] = useState(!p.commissioning)
  const [doc, setDoc] = useState(false)
  const [f, setF] = useState<C>(p.commissioning || { date: today(), engineer: db.users.find(u => u.role === 'Service')?.name || '', siteEngineer: p.contact, siteDesignation: '', params: { inTds: q?.water.tds || '', outTds: '', inPressure: '', outPressure: '', flow: '', recovery: '', ph: '', power: '' }, remarks: '', photos: [] })
  const g = q?.guarantee || prod.guarantee
  const flowNum = num(g.flow)
  const check = (k: keyof C['params'], v: string) => {
    const n = num(v); if (!v) return null
    if (k === 'outTds' && g.outTds > 0) return n <= g.outTds
    if (k === 'recovery') return n >= g.recovery
    if (k === 'flow' && flowNum) return n >= (g.flow.includes('m³') ? flowNum * 1000 : flowNum) * 0.97
    return null
  }
  const guarantee = (k: keyof C['params']) => k === 'outTds' && g.outTds > 0 ? `≤ ${g.outTds}` : k === 'recovery' ? `≥ ${g.recovery}` : k === 'flow' ? g.flow : '—'
  const dispatched = !!p.dispatch

  const save = () => {
    if (!f.params.outTds || !f.params.flow) return toast('Enter at least product TDS and flow rate', 'err')
    if (!f.siteEngineer) return toast('Site engineer name is required', 'err')
    saveProject(p.id, x => ({ ...x, commissioning: f, status: 'Commissioned', installation: { ...(x.installation || { team: [], scheduledDate: f.date, siteAddress: `${x.company}, ${x.city}`, siteContact: f.siteEngineer, sitePhone: x.phone, notes: '', photos: [] }), status: 'Completed' } }))
    log(`${p.code} installed & commissioned – product TDS ${f.params.outTds} ppm`, 'install', p.id); toast('Commissioning report saved'); setEdit(false)
  }
  const c = p.commissioning


  const [showInst, setShowInst] = useState(false)
  const inst = p.installation
  const instCard = (
    <Card className="mb-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold text-ink">Installation assignment & site</h3>{inst ? <p className="text-sm text-slate-500">{inst.team.map(id => db.users.find(u => u.id === id)?.name).join(', ')} · visit {fmtDate(inst.scheduledDate)} · {inst.siteAddress}</p> : <p className="text-sm text-slate-500">No installation team assigned yet.</p>}</div><div className="flex items-center gap-2">{inst && <InstBadge s={inst.status} />}{(can.install(user!.role) || user!.role === 'Sales') && <Button variant="secondary" size="sm" onClick={() => setShowInst(!showInst)}>{showInst ? 'Close' : inst ? 'Update' : 'Assign team'}</Button>}</div></div>
      {showInst && <div className="mt-5 border-t border-slate-100 pt-5"><InstallationEditor p={p} onDone={() => setShowInst(false)} /></div>}
    </Card>
  )
  const wrap = (n: React.ReactNode) => <>{instCard}{n}</>
  if (!dispatched && !c) return wrap(<Card className="py-12 text-center"><Wrench className="mx-auto mb-3 text-slate-300" size={40} /><p className="font-semibold text-slate-700">Plant not dispatched yet</p><p className="text-sm text-slate-500">Installation & commissioning opens after dispatch.</p></Card>)
  if (edit) return wrap(
    <Card>
      <h3 className="font-semibold text-ink">Installation & commissioning report</h3><p className="mb-5 text-sm text-slate-500">Record live parameters — compared automatically with the performance promised in the quotation.</p>
      <div className="grid gap-4 sm:grid-cols-3"><Field label="Date"><input type="date" className="inp" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /></Field><Field label="Our commissioning engineer"><input className="inp" value={f.engineer} onChange={e => setF({ ...f, engineer: e.target.value })} /></Field><span /></div>
      <div className="mt-5 grid gap-4 sm:grid-cols-4">{labels.map(([k, l, u]) => { const ok = check(k, f.params[k]); return (
        <Field key={k} label={`${l}${u ? ` (${u})` : ''}`} hint={guarantee(k) !== '—' ? `Quoted: ${guarantee(k)}` : undefined}><div className="relative"><input className={`inp ${ok === false ? '!border-red-400' : ok ? '!border-emerald-400' : ''}`} value={f.params[k]} onChange={e => setF({ ...f, params: { ...f.params, [k]: e.target.value } })} />{ok !== null && <span className="absolute right-2 top-2.5">{ok ? <CheckCircle2 size={16} className="text-emerald-500" /> : <XCircle size={16} className="text-red-500" />}</span>}</div></Field>) })}</div>
      <div className="mt-5"><div className="lbl">Site photos</div><PhotoUploader photos={f.photos} onChange={(photos: Photo[]) => setF({ ...f, photos })} max={6} /></div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="Customer / site engineer feedback"><textarea rows={2} className="inp" value={f.feedback || ''} onChange={e => setF({ ...f, feedback: e.target.value })} /></Field><Field label="Customer satisfaction"><div className="flex gap-1">{[1, 2, 3, 4, 5].map(n => <button type="button" key={n} onClick={() => setF({ ...f, rating: n })} className={`h-10 w-10 rounded-lg border text-lg ${(f.rating || 0) >= n ? 'border-amber-400 bg-amber-50 text-amber-500' : 'border-slate-200 text-slate-300'}`}>★</button>)}</div></Field></div>
      <Field label="Remarks" className="mt-5"><textarea rows={2} className="inp" value={f.remarks} onChange={e => setF({ ...f, remarks: e.target.value })} /></Field>
      <div className="mt-5 grid gap-4 sm:grid-cols-2"><div><div className="grid gap-3"><Field label="Client site engineer *"><input className="inp" value={f.siteEngineer} onChange={e => setF({ ...f, siteEngineer: e.target.value })} /></Field><Field label="Designation"><input className="inp" value={f.siteDesignation} onChange={e => setF({ ...f, siteDesignation: e.target.value })} /></Field></div></div>
        <div><div className="lbl">Client signature (sign on screen)</div><SignaturePad value={f.signature} onChange={s => setF({ ...f, signature: s })} /></div></div>
      <div className="mt-6 flex justify-end gap-2">{c && <Button variant="secondary" onClick={() => { setF(c); setEdit(false) }}>Cancel</Button>}<Button variant="accent" onClick={save}><CheckCircle2 size={16} /> Save & complete commissioning</Button></div>
    </Card>)

  const r = c!
  return wrap(
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><h3 className="font-semibold text-ink">Commissioned on {fmtDate(r.date)}</h3><Badge tone="green">Plant live</Badge>{r.emailed && <Badge tone="blue">Report emailed</Badge>}</div>
        <div className="flex gap-2"><Button variant="secondary" onClick={() => setEdit(true)}>Edit</Button><Button variant="secondary" onClick={() => { window.location.href = mailLink(p.email, `Installation & Commissioning Report – ${p.code}`, `Dear ${p.contact},\n\nPlease find the commissioning report for your ${prod.name}. Product TDS: ${r.params.outTds} ppm, flow ${r.params.flow} LPH.\n\nRegards,\nAquaFlow Engineering`); saveProject(p.id, x => ({ ...x, commissioning: { ...x.commissioning!, emailed: true } })) }}><Mail size={15} /> Email to client</Button><Button onClick={() => setDoc(true)}><Printer size={15} /> Report / PDF</Button></div></div>
      <div className="grid gap-3 sm:grid-cols-4">{labels.map(([k, l, u]) => { const ok = check(k, r.params[k]); return <div key={k} className="rounded-xl bg-slate-50 p-3"><div className="text-[11px] uppercase text-slate-400">{l}</div><div className="mt-0.5 flex items-center gap-1.5 text-lg font-bold text-ink">{r.params[k] || '—'} <span className="text-xs font-normal text-slate-400">{u}</span>{ok !== null && (ok ? <CheckCircle2 size={15} className="text-emerald-500" /> : <XCircle size={15} className="text-red-500" />)}</div>{guarantee(k) !== '—' && <div className="text-[11px] text-slate-400">Quoted {guarantee(k)}</div>}</div> })}</div>
      <div className="mt-5"><PhotoStrip photos={r.photos} /></div><p className="mt-4 text-sm text-slate-600">{r.remarks}</p>{(r.feedback || r.rating) && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900"><b>Customer feedback:</b> {r.feedback} <span className="text-amber-500">{'★'.repeat(r.rating || 0)}</span></p>}
      {doc && <PrintModal title={`Commissioning report ${p.code}`} onClose={() => setDoc(false)} share={{ phone: p.phone, email: p.email, subject: `Installation & Commissioning Report – ${p.code}`, text: `Dear ${p.contact},\n\nPlease find the installation & commissioning report for ${prod.name} (${p.code}).\n\nRegards,\nAquaFlow Engineering` }}>
        <DocHeader title="Installation & Commissioning Report" no={p.code} date={fmtDate(r.date)} />
        <table style={{ marginBottom: 8 }}><tbody><tr><td><b>Client / Site</b><br />{p.company}<br />{p.city}</td><td><b>Plant</b><br />{prod.name} – {p.capacity}<br />PO {p.poNo}</td><td><b>Commissioned by</b><br />{r.engineer}</td></tr></tbody></table>
        <h3>Performance parameters – guaranteed vs. observed</h3>
        <table><thead><tr><th>Parameter</th><th>Guaranteed</th><th>Observed at site</th><th>Result</th></tr></thead><tbody>{labels.map(([k, l, u]) => { const ok = check(k, r.params[k]); return <tr key={k}><td>{l}</td><td>{guarantee(k)} {guarantee(k) !== '—' ? u : ''}</td><td><b>{r.params[k] || '—'}</b> {u}</td><td>{ok === null ? '—' : ok ? '✔ Meets' : '✖ Below'}</td></tr> })}</tbody></table>
        {r.photos.length > 0 && <><h3>Site photographs</h3><div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{r.photos.map(ph => <img key={ph.id} src={ph.src} style={{ width: 170, height: 115, objectFit: 'cover', border: '1px solid #cbd5e1' }} />)}</div></>}
        <h3>Customer feedback</h3><p>{r.feedback || '—'} {r.rating ? '· Rating: ' + '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating) : ''}</p><h3>Remarks</h3><p>{r.remarks || 'Plant installed, commissioned and handed over in satisfactory working condition. Operator training completed.'}</p>
        <SignBlock left={`${r.engineer} – AquaFlow Engineering`} right={`${r.siteEngineer}${r.siteDesignation ? ', ' + r.siteDesignation : ''} – ${p.company}`} sig={r.signature} />
      </PrintModal>}
    </Card>
  )
}
