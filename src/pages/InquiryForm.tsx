import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Building2, Droplets, Mail, MapPin, Phone, Save, Inbox, UserRound } from 'lucide-react'
import { useApp } from '../store'
import { Button, PageHeader } from '../components/ui'
import { F, Icon, Panel, Unit, bad } from '../components/form'
import { cx, today, uid } from '../lib/utils'
import { SOURCES, type Inquiry } from '../types'

type Form = { company: string; contact: string; phone: string; email: string; city: string; source: string; productId: string; capacity: string; requirement: string; assignedTo: string; value: string }
type Errors = Partial<Record<keyof Form, string>>

/* One page for both "New inquiry" and "Edit inquiry". */
export default function InquiryForm() {
  const { id } = useParams()
  const { db, user, saveInquiry, next, log, toast } = useApp()
  const nav = useNavigate()
  const existing = id ? db.inquiries.find(i => i.id === id) : undefined
  const team = db.users.filter(u => u.role === 'Sales' || u.role === 'Admin')
  const [f, setF] = useState<Form>(() => existing
    ? { company: existing.company, contact: existing.contact, phone: existing.phone, email: existing.email, city: existing.city, source: existing.source, productId: existing.productId, capacity: existing.capacity, requirement: existing.requirement, assignedTo: existing.assignedTo, value: String(existing.value || '') }
    : { company: '', contact: '', phone: '', email: '', city: '', source: 'IndiaMART', productId: db.products[0].id, capacity: '', requirement: '', assignedTo: user!.role === 'Sales' ? user!.id : (db.users.find(u => u.role === 'Sales') || db.users[0]).id, value: '' })
  const [errors, setErrors] = useState<Errors>({})
  const set = (k: keyof Form, v: string) => { setF(p => ({ ...p, [k]: v })); if (errors[k]) setErrors(e => ({ ...e, [k]: undefined })) }
  const err = (k: keyof Form) => errors[k]
  const product = db.products.find(p => p.id === f.productId)

  if (id && !existing) return <p className="p-8 text-slate-500">Inquiry not found.</p>
  const back = existing ? `/inquiries/${existing.id}` : '/inquiries'

  const save = () => {
    const e: Errors = {}
    if (!f.company.trim()) e.company = 'Enter the company name'
    if (!f.contact.trim()) e.contact = 'Enter the contact person'
    if (!/^(\+91[\s-]?)?[6-9]\d{9}$/.test(f.phone.replace(/[\s-]/g, '').replace(/^\+91/, '+91'))) e.phone = 'Enter a valid 10-digit mobile number'
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'Enter a valid email address'
    if (f.value && (isNaN(Number(f.value)) || Number(f.value) < 0)) e.value = 'Enter a valid amount'
    setErrors(e)
    if (Object.keys(e).length) return toast('Please fix the highlighted fields', 'err')
    const clean = { ...f, company: f.company.trim(), contact: f.contact.trim(), phone: f.phone.trim(), email: f.email.trim(), city: f.city.trim(), capacity: f.capacity.trim(), requirement: f.requirement.trim(), value: Number(f.value) || 0 }
    if (existing) { saveInquiry({ ...existing, ...clean }); toast('Inquiry updated'); return nav(`/inquiries/${existing.id}`) }
    const n = next('inquiry')
    const inq: Inquiry = { id: uid(), no: `INQ-2026-${String(n).padStart(4, '0')}`, date: today(), ...clean, stage: 'New', followUps: [], nextFollowUp: today(), water: { source: '', ph: '', tds: '', hardness: '', chlorides: '', sulphates: '', iron: '', turbidity: '', silica: '', temperature: '' } }
    saveInquiry(inq); log(`New inquiry ${inq.no} from ${inq.company} assigned to ${db.users.find(u => u.id === f.assignedTo)?.name}`, 'inquiry'); toast('Inquiry added'); nav(`/inquiries/${inq.id}`)
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader eyebrow="Sales & CRM" icon={<Inbox size={20} />} title={existing ? `Edit ${existing.no}` : 'New Inquiry'}
        actions={<Button variant="secondary" onClick={() => nav(back)}><ArrowLeft size={15} /> Back</Button>} />

      <div className="space-y-6">
        <Panel n={1} icon={<Building2 size={17} />} title="Customer" subtitle="Who sent the inquiry?">
          <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
            <F label="Company name" required error={err('company')} className="sm:col-span-2"><Icon icon={<Building2 size={16} />}><input className={cx('inp !pl-10', bad(err('company')))} value={f.company} onChange={e => set('company', e.target.value)} placeholder="e.g. Sunrise Pharma Pvt Ltd" /></Icon></F>
            <F label="Contact person" required error={err('contact')}><Icon icon={<UserRound size={16} />}><input className={cx('inp !pl-10', bad(err('contact')))} value={f.contact} onChange={e => set('contact', e.target.value)} placeholder="Full name" /></Icon></F>
            <F label="Mobile number" required error={err('phone')}><Icon icon={<Phone size={16} />}><input className={cx('inp !pl-10', bad(err('phone')))} value={f.phone} inputMode="tel" onChange={e => set('phone', e.target.value)} placeholder="10-digit mobile" /></Icon></F>
            <F label="Email" error={err('email')}><Icon icon={<Mail size={16} />}><input className={cx('inp !pl-10', bad(err('email')))} value={f.email} type="email" onChange={e => set('email', e.target.value)} placeholder="Optional" /></Icon></F>
            <F label="City"><Icon icon={<MapPin size={16} />}><input className="inp !pl-10" value={f.city} onChange={e => set('city', e.target.value)} placeholder="City, State" /></Icon></F>
          </div>
        </Panel>

        <Panel n={2} icon={<Droplets size={17} />} title="What they need" subtitle="Plant, size and budget.">
          <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
            <F label="Product"><select className="inp" value={f.productId} onChange={e => set('productId', e.target.value)}>{db.products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></F>
            <F label="Capacity" hint={product ? `Standard: ${product.capacity}` : undefined}><input className="inp" placeholder="e.g. 2000 LPH" value={f.capacity} onChange={e => set('capacity', e.target.value)} /></F>
            <F label="Expected value" error={err('value')}><Unit unit="₹"><input type="number" min={0} className={cx('inp !pr-8', bad(err('value')))} value={f.value} onChange={e => set('value', e.target.value)} placeholder="Optional" /></Unit></F>
            <F label="Notes"  className="sm:col-span-2"><textarea rows={3} className="inp" value={f.requirement} onChange={e => set('requirement', e.target.value)} placeholder="What does the customer want? (optional)" /></F>
          </div>
        </Panel>

        <Panel n={3} icon={<UserRound size={17} />} title="Handling" subtitle="Where it came from and who follows up.">
          <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
            <F label="Lead source"><select className="inp" value={f.source} onChange={e => set('source', e.target.value)}>{SOURCES.map(s => <option key={s}>{s}</option>)}</select></F>
            <F label="Assigned to"><select className="inp" value={f.assignedTo} onChange={e => set('assignedTo', e.target.value)}>{team.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></F>
          </div>
        </Panel>

        <div className="sticky bottom-4 z-20 flex items-center justify-end gap-2 rounded-2xl bg-white px-5 py-3 shadow-panel ring-1 ring-white/70">
          <Button variant="secondary" onClick={() => nav(back)}>Cancel</Button>
          <Button onClick={save} className="!px-5 !py-2.5"><Save size={16} /> {existing ? 'Save changes' : 'Create inquiry'}</Button>
        </div>
      </div>
    </div>
  )
}
