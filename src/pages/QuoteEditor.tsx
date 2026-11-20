import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowDown, ArrowLeft, ArrowUp, Building2, CheckCircle2, ChevronDown, Droplets, Eye, EyeOff, FileText, History, Mail, MapPin, Phone, Plus, RotateCcw, Rocket, Trash2, UserRound, X } from 'lucide-react'
import { useApp } from '../store'
import { Badge, Button, Card, CardTitle, Field, Modal, PageHeader } from '../components/ui'
import { PrintModal, DocHeader, SignBlock } from '../components/PrintModal'
import { DocUploader } from '../components/Media'
import { addDays, cx, fmtDate, fmtDateTime, inr, numberToWords, today, uid } from '../lib/utils'
import { quoteTone } from '../lib/tones'
import { defaultSpecs, quoteTotals } from '../lib/calc'
import type { Quotation, Section } from '../types'

const move = <T,>(arr: T[], i: number, d: number) => { const j = i + d; if (j < 0 || j >= arr.length) return arr; const a = [...arr];[a[i], a[j]] = [a[j], a[i]]; return a }

export default function QuoteEditor() {
  const { id } = useParams()
  const { db, user, saveQuote, toast, convertToProject, log, saveInquiry } = useApp()
  const nav = useNavigate()
  const orig = db.quotations.find(q => q.id === id)
  const [q, setQ] = useState<Quotation | null>(orig || null)
  const [preview, setPreview] = useState<Quotation | null>(null), [order, setOrder] = useState(false)
  const [po, setPo] = useState(''), [delv, setDelv] = useState(addDays(today(), 42)), [note, setNote] = useState('')
  const [closed, setClosed] = useState<Record<string, boolean>>({})
  useEffect(() => { setQ(orig || null) }, [id]) // eslint-disable-line
  if (!q || !orig) return <p className="p-8 text-slate-500">Quotation not found.</p>
  const product = db.products.find(p => p.id === q.productId)!
  const t = quoteTotals(q)
  const dirty = JSON.stringify({ ...q, versions: 0 }) !== JSON.stringify({ ...orig, versions: 0 })
  const up = (patch: Partial<Quotation>) => setQ({ ...q, ...patch })
  const upLine = (i: number, patch: object) => up({ lines: q.lines.map((l, k) => k === i ? { ...l, ...patch } : l) })
  const sections = q.sections || []
  const upSec = (id: string, patch: Partial<Section>) => up({ sections: sections.map(s => s.id === id ? { ...s, ...patch } : s) })
  const payTotal = q.payment.advance + q.payment.delivery + q.payment.commissioning
  const validate = () => {
    if (payTotal !== 100) { toast('Payment schedule must total 100%', 'err'); return false }
    if (!q.lines.length || q.lines.some(l => !l.desc.trim())) { toast('Every price line needs a description', 'err'); return false }
    if (q.lines.some(l => l.qty <= 0 || l.rate < 0)) { toast('Quantities must be above zero and rates cannot be negative', 'err'); return false }
    return true
  }
  const save = (status?: Quotation['status']) => {
    if (!validate()) return
    const nq = { ...q, status: status || q.status }; saveQuote(nq); setQ(nq); toast(status ? `Marked as ${status}` : 'Quotation saved')
    const i = db.inquiries.find(x => x.id === q.inquiryId)
    if (status === 'Sent') log(`Quotation ${q.no} (Rev ${q.rev}) sent to ${q.company}`, 'quote')
    if (status === 'Rejected' && i) saveInquiry({ ...i, stage: 'Lost' })
    if (status === 'Sent' && i && ['New', 'Contacted', 'Water Report Received'].includes(i.stage)) saveInquiry({ ...i, stage: 'Quoted', nextFollowUp: addDays(today(), 3) })
  }
  const newRevision = () => {
    if (!validate()) return
    const snap = { ...orig, versions: [] as Quotation['versions'] }
    const nq: Quotation = { ...q, rev: (orig.rev || 1) + 1, status: q.status === 'Accepted' ? 'Accepted' : 'Draft', versions: [...(orig.versions || []), { id: uid(), rev: orig.rev || 1, ts: new Date().toISOString(), by: user!.name, note: note.trim() || `Revision ${orig.rev || 1}`, snapshot: snap as Quotation }] }
    saveQuote(nq); setQ(nq); setNote(''); toast(`Saved as Revision ${nq.rev} — previous version kept in history`); log(`Quotation ${q.no} revised to Rev ${nq.rev}`, 'quote')
  }
  const restore = (v: NonNullable<Quotation['versions']>[0]) => { if (confirm(`Restore Revision ${v.rev}? Your current edits will be replaced (current version is kept in history when you save as a revision).`)) setQ({ ...v.snapshot, rev: q.rev, versions: q.versions, status: q.status }) }
  const loadTemplate = () => { if (confirm('Replace line items, specifications and terms with the standard template for this product?')) up({ lines: product.quoteLines.map(l => ({ ...l })), terms: [...product.terms], guarantee: { ...product.guarantee }, specs: defaultSpecs(product) }) }
  const confirmOrder = () => {
    if (!po.trim()) return toast('Enter the client purchase order number', 'err')
    saveQuote({ ...q, status: 'Accepted' })
    const p = convertToProject({ ...q, status: 'Accepted' }, po.trim(), delv); toast(`Project ${p.code} created`); nav(`/projects/${p.id}`)
  }
  const existing = db.projects.find(p => p.quotationId === q.id)
  const waterKeys = [['source', 'Source'], ['tds', 'TDS (ppm)'], ['ph', 'pH'], ['hardness', 'Hardness (ppm)'], ['chlorides', 'Chlorides (ppm)'], ['sulphates', 'Sulphates (ppm)'], ['iron', 'Iron (ppm)'], ['turbidity', 'Turbidity (NTU)'], ['silica', 'Silica (ppm)'], ['temperature', 'Temp (°C)']] as const
  const inq = db.inquiries.find(i => i.id === q.inquiryId)

  const ctx: Ctx = { sections, up, upSec, closed: id => !!closed[id], toggle: id => setClosed(c => ({ ...c, [id]: !c[id] })) }
  const renderSec = (s: Section, i: number) => {
    switch (s.type) {
      case 'water': return <SecShell key={s.id} s={s} i={i} ctx={ctx}>
        {inq && inq.water.tds && inq.water.tds !== q.water.tds && <button onClick={() => up({ water: { ...inq.water } })} className="mb-3 text-xs font-medium text-brand-600 underline">Inquiry has newer water data — sync from inquiry</button>}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-5">{waterKeys.map(([k, l]) => <Field key={k} label={l}><input className="inp" value={q.water[k]} onChange={e => up({ water: { ...q.water, [k]: e.target.value } })} /></Field>)}</div>
        <div className="mt-4"><div className="lbl flex items-center gap-1"><Droplets size={12} /> Attached water analysis reports</div><DocUploader docs={q.water.reports || []} onChange={r => up({ water: { ...q.water, reports: r } })} /></div></SecShell>
      case 'guarantee': return <SecShell key={s.id} s={s} i={i} ctx={ctx}><div className="grid gap-3 sm:grid-cols-3">
        <Field label="Guaranteed output flow"><input className="inp" value={q.guarantee.flow} onChange={e => up({ guarantee: { ...q.guarantee, flow: e.target.value } })} /></Field>
        <Field label="Output TDS ≤ (ppm)"><input type="number" className="inp" value={q.guarantee.outTds} onChange={e => up({ guarantee: { ...q.guarantee, outTds: +e.target.value } })} /></Field>
        <Field label="Recovery ≥ (%)"><input type="number" className="inp" value={q.guarantee.recovery} onChange={e => up({ guarantee: { ...q.guarantee, recovery: +e.target.value } })} /></Field></div></SecShell>
      case 'specs': return <SecShell key={s.id} s={s} i={i} ctx={ctx} extra={<Button size="sm" variant="secondary" onClick={() => up({ specs: [...(q.specs || []), { k: '', v: '' }] })}><Plus size={13} /> Add specification</Button>}>
        <div className="overflow-hidden rounded-xl ring-1 ring-inset ring-slate-200">
          <div className="grid grid-cols-[minmax(150px,32%)_1fr_92px] gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2"><span className="th !p-0">Parameter</span><span className="th !p-0">Specification</span><span /></div>
          <div className="divide-y divide-slate-200">
            {(q.specs || []).map((sp, k) => (
              <div key={k} className="group grid grid-cols-[minmax(150px,32%)_1fr_92px] items-center gap-3 px-3 py-2 transition-colors hover:bg-brand-50/40">
                <input className="inp !font-semibold" placeholder="Parameter" value={sp.k} onChange={e => up({ specs: q.specs!.map((x, n) => n === k ? { ...x, k: e.target.value } : x) })} />
                <input className="inp" placeholder="Specification" value={sp.v} onChange={e => up({ specs: q.specs!.map((x, n) => n === k ? { ...x, v: e.target.value } : x) })} />
                <RowTools onUp={() => up({ specs: move(q.specs!, k, -1) })} onDown={() => up({ specs: move(q.specs!, k, 1) })} onDelete={() => up({ specs: q.specs!.filter((_, n) => n !== k) })} />
              </div>))}
            {!(q.specs || []).length && <p className="px-4 py-8 text-center text-sm text-slate-400">No specifications yet. Add technical details for this customer.</p>}
          </div>
        </div></SecShell>
      case 'scope': return <SecShell key={s.id} s={s} i={i} ctx={ctx} extra={<><Button variant="ghost" size="sm" onClick={loadTemplate}>Load {product.code} template</Button><Button variant="secondary" size="sm" onClick={() => up({ lines: [...q.lines, { desc: '', qty: 1, unit: 'Nos', rate: 0 }] })}><Plus size={13} /> Add line</Button></>}>
        <div className="overflow-x-auto rounded-xl ring-1 ring-inset ring-slate-200">
          <div className="min-w-[620px]">
            <div className={cx(LINE_GRID, 'border-b border-slate-200 bg-slate-50 px-3 py-2')}><span className="th !p-0">#</span><span className="th !p-0">Description</span><span className="th !p-0">Qty</span><span className="th !p-0">Unit</span><span className="th !p-0">Rate (₹)</span><span className="th !p-0 text-right">Amount</span></div>
            <div className="divide-y divide-slate-200">
              {q.lines.map((l, k) => (
                <div key={k} className={cx(LINE_GRID, 'group relative items-start px-3 py-2.5 transition-colors hover:bg-brand-50/40')}>
                  <span className="mt-1.5 grid h-6 w-6 place-items-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-500">{k + 1}</span>
                  <Auto value={l.desc} placeholder="Item description" onChange={e => upLine(k, { desc: e.target.value })} />
                  <input type="number" className="inp" value={l.qty} onChange={e => upLine(k, { qty: +e.target.value })} />
                  <input className="inp" value={l.unit} onChange={e => upLine(k, { unit: e.target.value })} />
                  <input type="number" className="inp" value={l.rate} onChange={e => upLine(k, { rate: +e.target.value })} />
                  <span className="tnum pt-2 text-right text-[13.5px] font-bold text-ink">{inr(l.qty * l.rate)}</span>
                  <RowTools floating onUp={() => up({ lines: move(q.lines, k, -1) })} onDown={() => up({ lines: move(q.lines, k, 1) })} onDelete={() => up({ lines: q.lines.filter((_, n) => n !== k) })} />
                </div>))}
              {!q.lines.length && <p className="px-4 py-8 text-center text-sm text-slate-400">No price lines. Add a line or load the product template.</p>}
            </div>
            <div className="tnum ml-auto w-full max-w-xs space-y-1.5 border-t border-slate-200 bg-slate-50/60 px-4 py-3 text-sm">
              <div className="flex justify-between text-slate-600"><span>Sub-total</span><span>{inr(t.sub)}</span></div>
              {t.disc > 0 && <div className="flex justify-between text-slate-600"><span>Discount ({q.discount}%)</span><span>− {inr(t.disc)}</span></div>}
              <div className="flex justify-between text-slate-600"><span>GST ({q.gst}%)</span><span>{inr(t.gst)}</span></div>
              <div className="flex justify-between border-t border-slate-200 pt-1.5 text-base font-extrabold text-ink"><span>Grand total</span><span>{inr(t.total)}</span></div>
            </div>
          </div>
        </div></SecShell>
      case 'payment': return <SecShell key={s.id} s={s} i={i} ctx={ctx}>
        <div className="mb-4 flex h-2.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">{[['advance', 'bg-brand-500'], ['delivery', 'bg-amber-400'], ['commissioning', 'bg-emerald-500']].map(([k, c]) => <span key={k} className={cx('h-full transition-[width] duration-500', c)} style={{ width: `${Math.min(q.payment[k as 'advance'] || 0, 100)}%` }} />)}</div>
        <div className="grid gap-4 sm:grid-cols-3">{([['advance', 'Advance with PO', 'bg-brand-500'], ['delivery', 'Against delivery', 'bg-amber-400'], ['commissioning', 'After commissioning', 'bg-emerald-500']] as const).map(([k, l, c]) => (
          <div key={k} className="rounded-xl bg-slate-50 p-3.5 ring-1 ring-inset ring-slate-200">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-600"><span className={cx('h-2 w-2 rounded-full', c)} />{l}</div>
            <div className="relative"><input type="number" className="inp !bg-white !pr-8" value={q.payment[k]} onChange={e => up({ payment: { ...q.payment, [k]: +e.target.value } })} /><span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm font-semibold text-slate-400">%</span></div>
            <div className="tnum mt-2 text-[15px] font-extrabold text-ink">{inr(t.total * q.payment[k] / 100)}</div>
          </div>))}</div>
        <div className={cx('mt-3 flex items-center gap-1.5 text-xs font-bold', payTotal === 100 ? 'text-emerald-600' : 'text-rose-600')}>{payTotal === 100 ? <CheckCircle2 size={13} /> : <X size={13} />}Total {payTotal}%{payTotal !== 100 && ' — must equal 100%'}</div></SecShell>
      case 'terms': return <SecShell key={s.id} s={s} i={i} ctx={ctx} extra={<Button variant="secondary" size="sm" onClick={() => up({ terms: [...q.terms, ''] })}><Plus size={13} /> Add term</Button>}>
        <ol className="space-y-2.5">{q.terms.map((tm, k) => (
          <li key={k} className="group flex items-start gap-3">
            <span className="mt-1.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-500">{k + 1}</span>
            <Auto value={tm} onChange={e => up({ terms: q.terms.map((x, n) => n === k ? e.target.value : x) })} />
            <button title="Remove term" onClick={() => up({ terms: q.terms.filter((_, n) => n !== k) })} className="mt-1 rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-500"><X size={16} /></button>
          </li>))}
          {!q.terms.length && <p className="py-6 text-center text-sm text-slate-400">No terms added.</p>}</ol></SecShell>
      default: return <SecShell key={s.id} s={s} i={i} ctx={ctx}><textarea rows={4} className="inp" placeholder="Write any custom paragraph — e.g. special site conditions, optional extras, scope exclusions…" value={s.text || ''} onChange={e => upSec(s.id, { text: e.target.value })} /></SecShell>
    }
  }

  return (
    <>
      <button onClick={() => nav('/quotations')} className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-brand-600"><ArrowLeft size={15} /> All quotations</button>
      <PageHeader eyebrow={`Revision ${q.rev}`} icon={<FileText size={20} />} title={q.no} subtitle={`${q.company} · ${product.name} ${q.capacity}`}
        actions={<>
          <Badge tone={quoteTone[q.status]} className="!px-3 !py-1.5 !text-xs">{q.status}</Badge>
          {dirty && <span className="flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 ring-1 ring-inset ring-amber-200"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />Unsaved changes</span>}
          <Button variant="secondary" onClick={() => setPreview(q)}><Eye size={16} /> Preview / PDF</Button>
          <Button variant="secondary" onClick={() => save()} disabled={!dirty}>Save changes</Button>
          {q.status === 'Draft' && <Button onClick={() => save('Sent')}>Mark as sent</Button>}
          {existing ? <Button variant="accent" onClick={() => nav(`/projects/${existing.id}`)}>Open {existing.code}</Button> : <Button variant="accent" onClick={() => setOrder(true)}><Rocket size={16} /> Confirm order</Button>}</>} />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <Card pad={false}>
            <div className="flex items-center gap-3.5 border-b border-slate-200 px-5 py-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-100/70 text-brand-700 ring-1 ring-inset ring-brand-200"><Building2 size={17} /></span>
              <div><h3 className="text-[15.5px] font-extrabold tracking-[-0.02em] text-ink">Customer & offer</h3><p className="text-xs text-slate-500">Who the quotation is addressed to, and its validity.</p></div>
            </div>
            <div className="grid gap-x-5 gap-y-4 px-5 py-5 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Company" className="lg:col-span-2"><div className="relative"><Building2 size={16} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400" /><input className="inp !pl-10" value={q.company} onChange={e => up({ company: e.target.value })} /></div></Field>
              <Field label="City"><div className="relative"><MapPin size={16} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400" /><input className="inp !pl-10" value={q.city} onChange={e => up({ city: e.target.value })} /></div></Field>
              <Field label="Contact person"><div className="relative"><UserRound size={16} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400" /><input className="inp !pl-10" value={q.contact} onChange={e => up({ contact: e.target.value })} /></div></Field>
              <Field label="Phone"><div className="relative"><Phone size={16} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400" /><input className="inp !pl-10" value={q.phone} onChange={e => up({ phone: e.target.value })} /></div></Field>
              <Field label="Email"><div className="relative"><Mail size={16} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400" /><input className="inp !pl-10" value={q.email} onChange={e => up({ email: e.target.value })} /></div></Field>
            </div>
            <div className="grid gap-x-5 gap-y-4 border-t border-slate-200 bg-slate-50/60 px-5 py-5 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Product"><select className="inp" value={q.productId} onChange={e => up({ productId: e.target.value })}>{db.products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
              <Field label="Capacity"><input className="inp" value={q.capacity} onChange={e => up({ capacity: e.target.value })} /></Field>
              <Field label="Quotation date"><input type="date" className="inp" value={q.date} onChange={e => up({ date: e.target.value })} /></Field>
              <Field label="Valid till"><input type="date" className="inp" value={q.validTill} onChange={e => up({ validTill: e.target.value })} /></Field>
            </div>
          </Card>

          <div className="flex flex-wrap items-end justify-between gap-3 pt-1">
            <div><h3 className="text-[17px] font-extrabold tracking-[-0.02em] text-ink">Document sections</h3><p className="text-sm text-slate-500">These appear in the PDF in this order. Reorder, collapse, hide or rename any section.</p></div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setClosed(Object.fromEntries(sections.map(x => [x.id, !sections.every(y => closed[y.id])])))}>{sections.every(x => closed[x.id]) ? 'Expand all' : 'Collapse all'}</Button>
              <Button variant="secondary" size="sm" onClick={() => up({ sections: [...sections, { id: uid(), type: 'text', title: 'Additional notes', visible: true, text: '' }] })}><Plus size={14} /> Add custom section</Button>
            </div>
          </div>
          {sections.map(renderSec)}
        </div>

        <aside className="space-y-5 xl:sticky xl:top-24">
          <div className="relative overflow-hidden rounded-2xl bg-[#ed7333] bg-linear-to-br from-[#f58a4e] via-[#ed7333] to-[#c24a16] p-5 text-white shadow-[0_24px_48px_-20px_rgba(237,115,51,0.6)]">
            <div className="pointer-events-none absolute -top-16 -right-10 h-48 w-48 rounded-full bg-white/30 blur-3xl" aria-hidden="true" />
            <span className="hero-sweep pointer-events-none absolute inset-y-0 -left-1/3 w-1/4 -skew-x-12 bg-linear-to-r from-transparent via-white/25 to-transparent blur-md" aria-hidden="true" />
            <div className="relative text-[11px] font-bold tracking-[0.14em] text-white/80 uppercase">Grand total · incl. GST</div>
            <div className="tnum relative text-[34px] leading-tight font-extrabold tracking-[-0.03em]">{inr(t.total)}</div>
            <div className="relative mt-1 text-xs text-white/80">Valid till {fmtDate(q.validTill)}</div>
          </div>
          <Card>
            <CardTitle accent="gold">Price summary</CardTitle>
            <dl className="tnum mt-4 space-y-3 text-sm">
              <Row k="Sub-total" v={inr(t.sub)} />
              <div className="flex items-center justify-between gap-3"><dt className="text-slate-500">Discount</dt><dd className="relative w-24"><input type="number" className="inp !pr-7 text-right" value={q.discount} onChange={e => up({ discount: +e.target.value })} /><span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-xs font-semibold text-slate-400">%</span></dd></div>
              {t.disc > 0 && <Row k="Discount amount" v={`− ${inr(t.disc)}`} />}
              <Row k="Taxable value" v={inr(t.taxable)} />
              <div className="flex items-center justify-between gap-3"><dt className="text-slate-500">GST</dt><dd className="relative w-24"><input type="number" className="inp !pr-7 text-right" value={q.gst} onChange={e => up({ gst: +e.target.value })} /><span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-xs font-semibold text-slate-400">%</span></dd></div>
              <Row k="GST amount" v={inr(t.gst)} />
              <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-extrabold text-ink"><dt>Grand total</dt><dd>{inr(t.total)}</dd></div>
            </dl>
            <div className="mt-5 grid grid-cols-2 gap-2"><Button variant="danger" onClick={() => save('Rejected')}>Mark lost</Button><Button variant="secondary" onClick={() => save('Sent')}>Mark sent</Button></div>
          </Card>
          <Card>
            <div className="flex items-center justify-between"><CardTitle accent="blue" icon={<History size={16} className="text-brand-500" />}>Versions</CardTitle><Badge tone="blue">Rev {q.rev}</Badge></div>
            <p className="mb-3 mt-2 text-xs text-slate-500">After sending to a client, save changes as a new revision to keep the earlier offer on record.</p>
            <input className="inp mb-2" placeholder="What changed? (e.g. Discount revised to 5%)" value={note} onChange={e => setNote(e.target.value)} />
            <Button variant="secondary" className="w-full" onClick={newRevision}><Plus size={15} /> Save as Rev {(q.rev || 1) + 1}</Button>
            <ul className="mt-4 space-y-2">{[...(q.versions || [])].reverse().map(v => (
              <li key={v.id} className="rounded-xl bg-slate-50 p-3 text-sm ring-1 ring-inset ring-slate-200"><div className="flex items-center justify-between"><b>Rev {v.rev}</b><span className="text-xs text-slate-400">{fmtDateTime(v.ts)}</span></div><div className="text-slate-600">{v.note}</div><div className="text-xs text-slate-400">{inr(quoteTotals(v.snapshot).total)} · by {v.by}</div>
                <div className="mt-2 flex gap-2"><Button size="sm" variant="secondary" onClick={() => setPreview(v.snapshot)}><Eye size={13} /> View</Button><Button size="sm" variant="ghost" onClick={() => restore(v)}><RotateCcw size={13} /> Restore</Button></div></li>))}
              {!(q.versions || []).length && <li className="py-2 text-center text-xs text-slate-400">No earlier revisions.</li>}</ul>
          </Card>
        </aside>
      </div>

      {preview && <PrintModal title={`Quotation ${preview.no} Rev ${preview.rev || 1}`} subtitle="Ready to share with the client" onClose={() => setPreview(null)}
        share={{ phone: preview.phone, email: preview.email, subject: `Quotation ${preview.no} – ${product.name} – AquaFlow Engineering`, text: `Dear ${preview.contact},\n\nPlease find our quotation ${preview.no} (Rev ${preview.rev || 1}) for ${product.name} (${preview.capacity}) – ${inr(quoteTotals(preview).total)} incl. GST.\n\nRegards,\n${preview.preparedBy}\nAquaFlow Engineering Pvt. Ltd.` }}
        onShared={() => { if (q.status === 'Draft' && preview === q) save('Sent') }}><QuoteDoc q={preview} /></PrintModal>}
      {order && <Modal title="Confirm order & create project" subtitle={`${q.company} · ${inr(t.total)}`} onClose={() => setOrder(false)} width="max-w-lg" footer={<><Button variant="secondary" onClick={() => setOrder(false)}>Cancel</Button><Button variant="accent" onClick={confirmOrder}><CheckCircle2 size={16} /> Create project</Button></>}>
        <p className="mb-4 text-sm text-slate-600">A unique project code and sales order number are generated. The payment schedule, BOQ and production plan all link to this project.</p>
        <div className="grid gap-4"><Field label="Client PO / Work order number *"><input className="inp" value={po} onChange={e => setPo(e.target.value)} autoFocus /></Field><Field label="Committed delivery date"><input type="date" className="inp" value={delv} onChange={e => setDelv(e.target.value)} /></Field></div>
      </Modal>}
    </>
  )
}
type Ctx = { sections: Section[]; up: (p: Partial<Quotation>) => void; upSec: (id: string, p: Partial<Section>) => void; closed: (id: string) => boolean; toggle: (id: string) => void }
const LINE_GRID = 'grid grid-cols-[28px_minmax(170px,1fr)_62px_70px_100px_108px] gap-2.5'

/* Textarea that grows with its content, so long descriptions are never cut off. */
function Auto({ className, value, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { value: string }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => { const el = ref.current; if (!el) return; el.style.height = 'auto'; el.style.height = `${el.scrollHeight + 2}px` }, [value])
  return <textarea ref={ref} rows={1} value={value} className={cx('inp block resize-none overflow-hidden leading-snug', className)} {...rest} />
}

/* Row actions stay quiet until the row is hovered or focused. */
function RowTools({ onUp, onDown, onDelete, floating }: { onUp: () => void; onDown: () => void; onDelete: () => void; floating?: boolean }) {
  const b = 'rounded-lg p-1.5 text-slate-400 transition-colors'
  return (
    <div className={cx('flex items-center justify-end gap-0.5 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100', floating ? 'absolute top-1.5 right-2 z-10 rounded-lg bg-white/95 p-0.5 opacity-0 shadow-card' : 'opacity-40')}>
      <button title="Move up" onClick={onUp} className={cx(b, 'hover:bg-slate-100 hover:text-ink')}><ArrowUp size={14} /></button>
      <button title="Move down" onClick={onDown} className={cx(b, 'hover:bg-slate-100 hover:text-ink')}><ArrowDown size={14} /></button>
      <button title="Remove" onClick={onDelete} className={cx(b, 'hover:bg-rose-50 hover:text-rose-500')}><Trash2 size={14} /></button>
    </div>
  )
}

function SecShell({ s, i, ctx, children, extra }: { s: Section; i: number; ctx: Ctx; children: ReactNode; extra?: ReactNode }) {
  const { sections, up, upSec } = ctx
  const shut = ctx.closed(s.id)
  const tool = 'rounded-md p-1.5 text-slate-500 transition-colors hover:bg-white hover:text-ink hover:shadow-flat'
  return (
    <Card pad={false} className={cx(!s.visible && 'opacity-70')}>
      <div className={cx('flex flex-wrap items-center gap-3 px-5 py-3.5', !shut && 'border-b border-slate-200')}>
        <button title={shut ? 'Expand' : 'Collapse'} aria-expanded={!shut} onClick={() => ctx.toggle(s.id)} className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-ink"><ChevronDown size={18} className={cx('transition-transform duration-200', shut && '-rotate-90')} /></button>
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-linear-to-br from-[#f58a4e] to-[#d9622a] text-[12px] font-extrabold text-white shadow-[0_6px_14px_-6px_rgba(237,115,51,0.7)]">{i + 1}</span>
        <input aria-label="Section title" className="min-w-[140px] flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-[15.5px] font-extrabold tracking-[-0.02em] text-ink transition-colors hover:border-slate-200 focus:border-brand-500 focus:bg-white focus:outline-none" value={s.title} onChange={e => upSec(s.id, { title: e.target.value })} />
        {!s.visible && <Badge tone="slate">Hidden in PDF</Badge>}
        {extra}
        <div className="flex items-center gap-0.5 rounded-lg bg-slate-100 p-0.5">
          <button title="Move up" onClick={() => up({ sections: move(sections, i, -1) })} className={tool}><ArrowUp size={15} /></button>
          <button title="Move down" onClick={() => up({ sections: move(sections, i, 1) })} className={tool}><ArrowDown size={15} /></button>
          <button title={s.visible ? 'Hide from document' : 'Show in document'} onClick={() => upSec(s.id, { visible: !s.visible })} className={tool}>{s.visible ? <Eye size={15} /> : <EyeOff size={15} />}</button>
          {s.type === 'text' && <button title="Remove section" onClick={() => up({ sections: sections.filter(x => x.id !== s.id) })} className={cx(tool, 'hover:!text-rose-500')}><Trash2 size={15} /></button>}
        </div>
      </div>
      {!shut && <div className="animate-fade-in px-5 py-5">{children}</div>}
    </Card>
  )
}
const Row = ({ k, v }: { k: string; v: string }) => <div className="flex justify-between"><dt className="text-slate-500">{k}</dt><dd className="font-semibold text-ink">{v}</dd></div>

export function QuoteDoc({ q }: { q: Quotation }) {
  const { db } = useApp()
  const p = db.products.find(x => x.id === q.productId)!
  const t = quoteTotals(q), w = q.water
  const secs = (q.sections || []).filter(s => s.visible)
  const R = { textAlign: 'right' as const }
  const body = (s: Section) => {
    switch (s.type) {
      case 'water': return <><table><thead><tr>{['Source', 'TDS', 'pH', 'Hardness', 'Chlorides', 'Sulphates', 'Iron', 'Turbidity', 'Silica', 'Temp'].map(h => <th key={h}>{h}</th>)}</tr></thead><tbody><tr><td>{w.source || '—'}</td><td>{w.tds || '—'} ppm</td><td>{w.ph || '—'}</td><td>{w.hardness || '—'}</td><td>{w.chlorides || '—'}</td><td>{w.sulphates || '—'}</td><td>{w.iron || '—'}</td><td>{w.turbidity || '—'}</td><td>{w.silica || '—'}</td><td>{w.temperature || '—'} °C</td></tr></tbody></table>{(w.reports || []).length > 0 && <p style={{ fontSize: 10.5, color: '#64748b' }}>Based on client report: {(w.reports || []).map(r => r.name).join(', ')}</p>}</>
      case 'guarantee': return <table><tbody><tr><td>Treated water output</td><td><b>{q.guarantee.flow}</b></td><td>Output TDS</td><td><b>{q.guarantee.outTds > 0 ? `≤ ${q.guarantee.outTds} ppm` : 'As per design'}</b></td><td>Recovery</td><td><b>≥ {q.guarantee.recovery}%</b></td></tr></tbody></table>
      case 'specs': return <table><tbody>{(q.specs || []).filter(x => x.k || x.v).map((x, i) => <tr key={i}><th style={{ width: '32%' }}>{x.k}</th><td>{x.v}</td></tr>)}</tbody></table>
      case 'scope': return <><table><thead><tr><th style={{ width: 28 }}>#</th><th>Description</th><th>Qty</th><th>Unit</th><th style={R}>Rate (₹)</th><th style={R}>Amount (₹)</th></tr></thead>
        <tbody>{q.lines.map((l, i) => <tr key={i}><td>{i + 1}</td><td>{l.desc}</td><td>{l.qty}</td><td>{l.unit}</td><td style={R}>{l.rate.toLocaleString('en-IN')}</td><td style={R}>{(l.qty * l.rate).toLocaleString('en-IN')}</td></tr>)}
          <tr><td colSpan={5} style={R}>Sub-total</td><td style={R}>{t.sub.toLocaleString('en-IN')}</td></tr>
          {t.disc > 0 && <tr><td colSpan={5} style={R}>Discount ({q.discount}%)</td><td style={R}>− {Math.round(t.disc).toLocaleString('en-IN')}</td></tr>}
          <tr><td colSpan={5} style={R}>GST @ {q.gst}%</td><td style={R}>{Math.round(t.gst).toLocaleString('en-IN')}</td></tr>
          <tr><td colSpan={5} style={R}><b>Grand total</b></td><td style={R}><b>{inr(t.total)}</b></td></tr></tbody></table><p style={{ marginTop: 4, fontStyle: 'italic' }}>Amount in words: {numberToWords(t.total)}</p></>
      case 'payment': return <table><tbody><tr><td><b>{q.payment.advance}%</b> advance with purchase order</td><td><b>{q.payment.delivery}%</b> against delivery / dispatch</td><td><b>{q.payment.commissioning}%</b> after installation & commissioning</td></tr></tbody></table>
      case 'terms': return <ol style={{ paddingLeft: 18, margin: 0 }}>{q.terms.map((x, i) => <li key={i}>{x}</li>)}</ol>
      default: return <p style={{ whiteSpace: 'pre-wrap' }}>{s.text}</p>
    }
  }
  return (
    <div>
      <DocHeader title="Quotation" no={`${q.no} / Rev ${q.rev || 1}`} date={fmtDate(q.date)} extra={<div><b>Valid till:</b> {fmtDate(q.validTill)}</div>} />
      <table style={{ marginBottom: 6 }}><tbody><tr><td style={{ width: '55%' }}><b>To,</b><br /><b style={{ fontSize: 13 }}>{q.company}</b><br />Kind attn: {q.contact}<br />{q.city}<br />{q.phone} · {q.email}</td><td><b>Subject:</b> Offer for supply, installation & commissioning of <b>{p.name}</b> – capacity <b>{q.capacity}</b>.<br /><br />Prepared by: {q.preparedBy}</td></tr></tbody></table>
      {secs.map((s, i) => <div key={s.id}><h3>{i + 1}. {s.title}</h3>{body(s)}</div>)}
      <SignBlock left="Customer acceptance" right={`For ${db.company.name}`} />
    </div>
  )
}
