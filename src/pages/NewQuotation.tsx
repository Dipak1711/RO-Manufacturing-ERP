import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Building2, CalendarDays, CheckCircle2, Droplets, FileText, IndianRupee, Mail, MapPin, Phone, Plus, TriangleAlert, UserRound } from 'lucide-react'
import { useApp } from '../store'
import { Button, Card, PageHeader } from '../components/ui'
import { F, Icon, Panel, Unit, bad } from '../components/form'
import { addDays, cx, fmtDate, inr, today, uid } from '../lib/utils'
import { quoteTotals } from '../lib/calc'
import { buildQuote } from '../lib/quote'
import type { Inquiry } from '../types'

type Form = {
  inquiryId: string; company: string; contact: string; phone: string; email: string; city: string
  productId: string; capacity: string; source: string; assignedTo: string
  validTill: string; gst: string; discount: string; advance: string; delivery: string; commissioning: string
}
type Errors = Partial<Record<keyof Form, string>>


export default function NewQuotation() {
  const { db, user, saveQuote, saveInquiry, next, log, toast } = useApp()
  const nav = useNavigate()
  const [sp] = useSearchParams()
  const eligible = db.inquiries.filter(i => i.stage !== 'Won' && i.stage !== 'Lost')
  const sales = db.users.filter(u => u.role === 'Sales' || u.role === 'Admin')
  const first = db.products[0]

  const fromInquiry = (i: Inquiry | undefined, prev?: Form): Form => {
    const p = db.products.find(x => x.id === (i?.productId ?? prev?.productId)) || first
    return {
      inquiryId: i?.id || '', company: i?.company ?? '', contact: i?.contact ?? '', phone: i?.phone ?? '', email: i?.email ?? '', city: i?.city ?? '',
      productId: p.id, capacity: i?.capacity || p.capacity, source: i?.source || prev?.source || 'Reference', assignedTo: i?.assignedTo || prev?.assignedTo || (sales.find(u => u.id === user!.id) || sales[0] || db.users[0]).id,
      validTill: prev?.validTill || addDays(today(), 15), gst: prev?.gst || '18', discount: prev?.discount || '0',
      advance: prev?.advance || '40', delivery: prev?.delivery || '50', commissioning: prev?.commissioning || '10',
    }
  }
  const [f, setF] = useState<Form>(() => fromInquiry(eligible.find(i => i.id === sp.get('inquiry'))))
  const [errors, setErrors] = useState<Errors>({})
  const set = (k: keyof Form, v: string) => { setF(p => ({ ...p, [k]: v })); if (errors[k]) setErrors(e => ({ ...e, [k]: undefined })) }

  const product = db.products.find(p => p.id === f.productId) || first
  const t = useMemo(() => quoteTotals({ lines: product.quoteLines, gst: Number(f.gst) || 0, discount: Number(f.discount) || 0 }), [product, f.gst, f.discount])
  const payTotal = (Number(f.advance) || 0) + (Number(f.delivery) || 0) + (Number(f.commissioning) || 0)
  const qNo = `QT/2026-27/${String((db.counters.quote || 0) + 1).padStart(4, '0')}`

  const validate = (): Errors => {
    const e: Errors = {}
    if (!f.company.trim()) e.company = 'Enter the customer / company name'
    if (!f.contact.trim()) e.contact = 'Enter the contact person'
    if (!/^(\+91[\s-]?)?[6-9]\d{9}$/.test(f.phone.replace(/[\s-]/g, '').replace(/^\+91/, '+91'))) e.phone = 'Enter a valid 10-digit Indian mobile number'
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'Enter a valid email address'
    if (!f.city.trim()) e.city = 'Enter the city'
    if (!f.capacity.trim()) e.capacity = 'Enter the plant capacity'
    if (!f.validTill || f.validTill < today()) e.validTill = 'Validity date cannot be in the past'
    const g = Number(f.gst); if (f.gst === '' || isNaN(g) || g < 0 || g > 28) e.gst = 'GST must be between 0 and 28%'
    const d = Number(f.discount); if (f.discount === '' || isNaN(d) || d < 0 || d > 100) e.discount = 'Discount must be 0 – 100%'
    if (payTotal !== 100) e.advance = 'Payment schedule must total 100%'
    return e
  }

  const create = () => {
    const e = validate(); setErrors(e)
    if (Object.keys(e).length) { toast('Please fix the highlighted fields', 'err'); document.querySelector('[data-first-error]')?.scrollIntoView?.(); return }
    let inq = db.inquiries.find(i => i.id === f.inquiryId)
    const base = { company: f.company.trim(), contact: f.contact.trim(), phone: f.phone.trim(), email: f.email.trim(), city: f.city.trim(), productId: f.productId, capacity: f.capacity.trim() }
    if (inq) {
      inq = { ...inq, ...base, stage: ['New', 'Contacted', 'Water Report Received'].includes(inq.stage) ? 'Quoted' : inq.stage }
    } else {
      // A new customer gets a linked inquiry so the quotation still traces back to the pipeline.
      const n = next('inquiry')
      inq = { id: uid(), no: `INQ-2026-${String(n).padStart(4, '0')}`, date: today(), ...base, source: f.source, requirement: `Quotation ${qNo} prepared directly`, assignedTo: f.assignedTo, stage: 'Quoted', value: Math.round(t.total), followUps: [], water: { source: '', ph: '', tds: '', hardness: '', chlorides: '', sulphates: '', iron: '', turbidity: '', silica: '', temperature: '' } }
      log(`New inquiry ${inq.no} from ${inq.company} created with its quotation`, 'inquiry')
    }
    saveInquiry(inq)
    const nq = { ...buildQuote(db, inq, next('quote'), user!.name), validTill: f.validTill, gst: Number(f.gst), discount: Number(f.discount), payment: { advance: Number(f.advance), delivery: Number(f.delivery), commissioning: Number(f.commissioning) } }
    saveQuote(nq); log(`Quotation ${nq.no} drafted for ${inq.company}`, 'quote'); toast(`Quotation ${nq.no} created`); nav(`/quotations/${nq.id}`)
  }

  const err = (k: keyof Form) => errors[k]
  const assignee = db.users.find(u => u.id === f.assignedTo)?.name
  const pay: [string, string, string][] = [['Advance', f.advance, 'bg-brand-500'], ['On delivery', f.delivery, 'bg-amber-400'], ['Commissioning', f.commissioning, 'bg-emerald-500']]

  const actions = (
    <div className="flex flex-col gap-2">
      <Button onClick={create} className="w-full !py-3 !text-[14.5px]"><Plus size={17} /> Create quotation</Button>
      <Button variant="secondary" onClick={() => nav('/quotations')} className="w-full">Cancel</Button>
    </div>
  )

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader eyebrow="Sales & CRM" icon={<FileText size={20} />} title="New Quotation" subtitle="Enter the customer and plant details. Prices and terms are pre-filled from the product template."
        actions={<Button variant="secondary" onClick={() => nav('/quotations')}><ArrowLeft size={15} /> Back to quotations</Button>} />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_350px]">
        <div className="space-y-6">
          {/* 1 — Customer */}
          <Panel n={1} icon={<Building2 size={17} />} title="Customer details" subtitle="Who is this quotation addressed to?"
            aside={<select aria-label="Pre-fill from an inquiry" className="inp !w-auto !max-w-[250px] !bg-slate-50 !py-1.5 !text-xs !font-semibold" value={f.inquiryId} onChange={e => { setErrors({}); setF(p => fromInquiry(eligible.find(i => i.id === e.target.value), p)) }}>
              <option value="">Enter manually</option>
              {eligible.map(i => <option key={i.id} value={i.id}>Use inquiry · {i.company}</option>)}
            </select>}>
            <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
              <F label="Company name" required error={err('company')} className="sm:col-span-2"><Icon icon={<Building2 size={16} />}><input className={cx('inp !pl-10', bad(err('company')))} value={f.company} onChange={e => set('company', e.target.value)} placeholder="e.g. Sunrise Pharma Pvt Ltd" /></Icon></F>
              <F label="Contact person" required error={err('contact')}><Icon icon={<UserRound size={16} />}><input className={cx('inp !pl-10', bad(err('contact')))} value={f.contact} onChange={e => set('contact', e.target.value)} placeholder="Full name" /></Icon></F>
              <F label="Mobile number" required error={err('phone')}><Icon icon={<Phone size={16} />}><input className={cx('inp !pl-10', bad(err('phone')))} value={f.phone} inputMode="tel" onChange={e => set('phone', e.target.value)} placeholder="10-digit mobile" /></Icon></F>
              <F label="Email" error={err('email')}><Icon icon={<Mail size={16} />}><input className={cx('inp !pl-10', bad(err('email')))} value={f.email} type="email" onChange={e => set('email', e.target.value)} placeholder="name@company.com (optional)" /></Icon></F>
              <F label="City" required error={err('city')}><Icon icon={<MapPin size={16} />}><input className={cx('inp !pl-10', bad(err('city')))} value={f.city} onChange={e => set('city', e.target.value)} placeholder="City, State" /></Icon></F>
            </div>
          </Panel>

          {/* 2 — Plant */}
          <Panel n={2} icon={<Droplets size={17} />} title="Plant requirement" subtitle="The product sets the price lines, specifications and guarantee.">
            <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
              <F label="Product" required><select className="inp" value={f.productId} onChange={e => { const p = db.products.find(x => x.id === e.target.value)!; setF(v => ({ ...v, productId: p.id, capacity: p.capacity })) }}>{db.products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></F>
              <F label="Capacity" required error={err('capacity')}><input className={cx('inp', bad(err('capacity')))} value={f.capacity} onChange={e => set('capacity', e.target.value)} placeholder={product.capacity} /></F>
            </div>
            <div className="mt-5 grid grid-cols-3 divide-x divide-slate-200 overflow-hidden rounded-xl bg-slate-50 ring-1 ring-inset ring-slate-200">
              {([['Output TDS', `≤ ${product.guarantee.outTds} ppm`], ['Recovery', `${product.guarantee.recovery}%`], ['Flow', product.guarantee.flow]] as const).map(([k, v]) => (
                <div key={k} className="px-4 py-3"><div className="text-[10.5px] font-bold tracking-[0.08em] text-slate-500 uppercase">{k}</div><div className="mt-0.5 text-[15px] font-extrabold text-ink">{v}</div></div>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-400">Guaranteed performance printed on the quotation (editable in the next step).</p>
          </Panel>

          {/* 3 — Commercial */}
          <Panel n={3} icon={<IndianRupee size={17} />} title="Commercial terms" subtitle="Validity, tax and the payment schedule.">
            <div className="grid gap-x-5 gap-y-4 sm:grid-cols-3">
              <F label="Valid till" error={err('validTill')}><input type="date" min={today()} className={cx('inp', bad(err('validTill')))} value={f.validTill} onChange={e => set('validTill', e.target.value)} /></F>
              <F label="GST" error={err('gst')}><Unit unit="%"><input type="number" min={0} max={28} step="0.5" className={cx('inp !pr-8', bad(err('gst')))} value={f.gst} onChange={e => set('gst', e.target.value)} /></Unit></F>
              <F label="Discount" error={err('discount')}><Unit unit="%"><input type="number" min={0} max={100} step="0.5" className={cx('inp !pr-8', bad(err('discount')))} value={f.discount} onChange={e => set('discount', e.target.value)} /></Unit></F>
            </div>
            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between"><span className="lbl !mb-0">Payment schedule</span><span className={cx('flex items-center gap-1 text-xs font-bold', payTotal === 100 ? 'text-emerald-600' : 'text-rose-600')}>{payTotal === 100 ? <CheckCircle2 size={13} /> : <TriangleAlert size={13} />}{payTotal}%{payTotal !== 100 && ' — must total 100%'}</span></div>
              <div className="mb-3 flex h-2.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">{pay.map(([l, v, c]) => <span key={l} className={cx('h-full transition-[width] duration-500', c)} style={{ width: `${Math.min(Number(v) || 0, 100)}%` }} />)}</div>
              <div className="grid gap-4 sm:grid-cols-3">
                {pay.map(([l, v, c], i) => { const k = (['advance', 'delivery', 'commissioning'] as const)[i]; return (
                  <div key={l}><div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600"><span className={cx('h-2 w-2 rounded-full', c)} />{l}</div><Unit unit="%"><input type="number" min={0} max={100} className={cx('inp !pr-8', bad(err('advance')))} value={v} onChange={e => set(k, e.target.value)} /></Unit></div>
                ) })}
              </div>
              {err('advance') && <p className="field-error mt-2 flex items-center gap-1 text-xs font-medium text-rose-600"><TriangleAlert size={12} />{err('advance')}</p>}
            </div>
          </Panel>

          <div className="xl:hidden">{actions}</div>
        </div>

        {/* Live summary — reads like the head of the finished quotation. */}
        <aside className="xl:sticky xl:top-24">
          <div className="relative overflow-hidden rounded-2xl bg-[#ed7333] bg-linear-to-br from-[#f58a4e] via-[#ed7333] to-[#c24a16] p-5 text-white shadow-[0_24px_48px_-20px_rgba(237,115,51,0.6)]">
            <div className="pointer-events-none absolute -top-16 -right-10 h-48 w-48 rounded-full bg-white/30 blur-3xl" aria-hidden="true" />
            <span className="hero-sweep pointer-events-none absolute inset-y-0 -left-1/3 w-1/4 -skew-x-12 bg-linear-to-r from-transparent via-white/25 to-transparent blur-md" aria-hidden="true" />
            <div className="relative flex items-center justify-between"><span className="text-[11px] font-bold tracking-[0.18em] uppercase text-white/80">Quotation</span><span className="rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-bold text-amber-700">Draft</span></div>
            <div className="relative mt-1 text-[15px] font-bold">{qNo}</div>
            <div className="relative mt-5 text-[11px] font-bold tracking-[0.12em] uppercase text-white/75">Estimated total · incl. GST</div>
            <div className="tnum relative text-[34px] leading-tight font-extrabold tracking-[-0.03em]">{inr(t.total)}</div>
          </div>
          <Card className="mt-4">
            <dl className="space-y-3 text-sm">
              {([[<Building2 size={15} key="a" />, 'Customer', f.company || 'Not entered yet'], [<Droplets size={15} key="b" />, 'Plant', `${product.name} · ${f.capacity || '—'}`], [<CalendarDays size={15} key="c" />, 'Valid till', fmtDate(f.validTill)], [<UserRound size={15} key="d" />, 'Prepared by', user!.name], ...(!f.inquiryId ? [[<UserRound size={15} key="e" />, 'Salesperson', assignee || '—'] as [ReactNode, string, string]] : [])] as [ReactNode, string, string][]).map(([i, k, v]) => (
                <div key={k} className="flex items-start gap-3"><span className="mt-0.5 text-slate-400">{i}</span><div className="min-w-0"><dt className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">{k}</dt><dd className={cx('truncate font-semibold', v === 'Not entered yet' ? 'text-slate-400' : 'text-ink')}>{v}</dd></div></div>
              ))}
            </dl>
            <div className="tnum mt-4 space-y-1.5 border-t border-slate-200 pt-3 text-sm">
              <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{inr(t.sub)}</span></div>
              {t.disc > 0 && <div className="flex justify-between text-slate-600"><span>Discount ({f.discount}%)</span><span>− {inr(t.disc)}</span></div>}
              <div className="flex justify-between text-slate-600"><span>GST ({f.gst || 0}%)</span><span>{inr(t.gst)}</span></div>
            </div>
            <div className="mt-4 hidden xl:block">{actions}</div>
          </Card>
        </aside>
      </div>
    </div>
  )
}
