import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarClock, Check, Droplets, FileText, Handshake, IndianRupee, Mail, MessageCircle, Pencil, Phone, Send, StickyNote, Trash2, XCircle } from 'lucide-react'
import { useApp, userName } from '../store'
import { DocUploader } from '../components/Media'
import { Avatar, Badge, Button, Card, CardTitle, Field, PageHeader, Stat, Tabs } from '../components/ui'
import { addDays, cx, fmtDate, inrShort, mailLink, today, uid, waLink } from '../lib/utils'
import { STAGES, type FollowType, type Stage } from '../types'
import { stageTone, quoteTone } from '../lib/tones'
import { buildQuote } from '../lib/quote'

const fIcon: Record<FollowType, typeof Phone> = { Call: Phone, Email: Mail, WhatsApp: MessageCircle, Meeting: Handshake, Note: StickyNote }
const fColor: Record<FollowType, string> = { Call: 'bg-sky-100 text-sky-600', Email: 'bg-violet-100 text-violet-600', WhatsApp: 'bg-emerald-100 text-emerald-600', Meeting: 'bg-amber-100 text-amber-600', Note: 'bg-slate-100 text-slate-600' }
const waterKeys = [['source', 'Water source'], ['tds', 'TDS (ppm)'], ['ph', 'pH'], ['hardness', 'Hardness (ppm)'], ['chlorides', 'Chlorides (ppm)'], ['sulphates', 'Sulphates (ppm)'], ['iron', 'Iron (ppm)'], ['turbidity', 'Turbidity (NTU)'], ['silica', 'Silica (ppm)'], ['temperature', 'Temperature (°C)']] as const

export default function InquiryDetail() {
  const { id } = useParams()
  const { db, user, saveInquiry, saveQuote, next, toast, log, setDB } = useApp()
  const nav = useNavigate()
  const i = db.inquiries.find(x => x.id === id)
  const [type, setType] = useState<FollowType>('Call'), [note, setNote] = useState(''), [nextDate, setNext] = useState(addDays(today(), 2))
  const [tab, setTab] = useState<'follow' | 'water'>('follow')
  if (!i) return <div className="p-8 text-center"><p className="text-slate-500">Inquiry not found.</p><Button className="mt-4" onClick={() => nav('/inquiries')}>Back to inquiries</Button></div>

  const product = db.products.find(p => p.id === i.productId)
  const quotes = db.quotations.filter(q => q.inquiryId === i.id)
  const linked = db.projects.some(p => p.inquiryId === i.id)

  const addFU = (t: FollowType, n: string, nd?: string) => {
    const fu = { id: uid(), type: t, date: today(), note: n, by: user!.name, nextDate: nd }
    const stage: Stage = i.stage === 'New' ? 'Contacted' : i.stage
    saveInquiry({ ...i, stage, followUps: [fu, ...i.followUps], nextFollowUp: nd })
  }
  const quick = (t: FollowType) => {
    if (t === 'Call') window.open(`tel:${i.phone}`)
    if (t === 'WhatsApp') window.open(waLink(i.phone, `Dear ${i.contact}, thank you for your inquiry for ${product?.name} (${i.capacity}). – ${user!.name}, AquaFlow Engineering`), '_blank')
    if (t === 'Email') window.location.href = mailLink(i.email, `Your inquiry for ${product?.name} – AquaFlow Engineering`, `Dear ${i.contact},\n\nThank you for your inquiry.\n\nRegards,\n${user!.name}`)
    addFU(t, `${t} initiated with ${i.contact}`, i.nextFollowUp); toast(`${t} saved in follow-ups`)
  }
  const submit = () => { if (!note.trim()) return toast('Please write a short note', 'err'); addFU(type, note.trim(), nextDate || undefined); setNote(''); toast('Follow-up saved') }
  const setW = (k: string, v: string) => saveInquiry({ ...i, water: { ...i.water, [k]: v } })
  const makeQuote = () => {
    const ex = quotes.find(q => q.status === 'Draft'); if (ex) return nav(`/quotations/${ex.id}`)
    const q = buildQuote(db, i, next('quote'), user!.name)
    const st: Stage = i.stage === 'New' || i.stage === 'Contacted' || i.stage === 'Water Report Received' ? 'Quoted' : i.stage
    saveInquiry({ ...i, stage: st }); saveQuote(q); log(`Quotation ${q.no} drafted for ${i.company}`, 'quote'); nav(`/quotations/${q.id}`)
  }
  const del = () => {
    if (linked) return toast('This inquiry has a confirmed project and cannot be deleted', 'err')
    if (!confirm(`Delete ${i.no} – ${i.company} along with its quotations? This cannot be undone.`)) return
    setDB(d => ({ ...d, inquiries: d.inquiries.filter(x => x.id !== i.id), quotations: d.quotations.filter(q => q.inquiryId !== i.id) })); toast('Inquiry deleted'); nav('/inquiries')
  }
  const flow: Stage[] = STAGES.filter(x => x !== 'Lost')
  const at = flow.indexOf(i.stage)
  const lost = i.stage === 'Lost'
  const setStage = (st: Stage) => { if (st === i.stage) return; saveInquiry({ ...i, stage: st }); toast(st === 'Lost' ? 'Marked as lost' : `Moved to ${st}`, st === 'Lost' ? 'err' : 'ok') }
  const due = i.nextFollowUp
  const dueLate = !!due && due < today() && !lost && i.stage !== 'Won'
  const info: [string, string][] = [['Contact', i.contact], ['Phone', i.phone], ['Email', i.email], ['City', i.city], ['Product', product?.name || ''], ['Capacity', i.capacity], ['Source', i.source], ['Received', fmtDate(i.date)]]

  return (
    <>
      <button onClick={() => nav('/inquiries')} className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-brand-600"><ArrowLeft size={15} /> All inquiries</button>
      <PageHeader eyebrow={i.no} icon={<FileText size={20} />} title={i.company} subtitle={`${i.city ? i.city + ' · ' : ''}${product?.name ?? ''}${i.capacity ? ' · ' + i.capacity : ''}`}
        actions={<>
          <Badge tone={stageTone[i.stage]} className="!px-3 !py-1.5 !text-xs">{i.stage}</Badge>
          <div className="flex rounded-xl bg-white p-0.5 shadow-flat">
            {([['Call', Phone, ''], ['WhatsApp', MessageCircle, 'text-emerald-600'], ['Email', Mail, 'text-sky-600']] as const).map(([t, Ic, c]) => <button key={t} onClick={() => quick(t)} className="flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-ink"><Ic size={15} className={c} />{t}</button>)}
          </div>
          <Button variant="secondary" onClick={() => nav(`/inquiries/${i.id}/edit`)}><Pencil size={15} /> Edit</Button>
          <Button onClick={makeQuote}><FileText size={15} /> {quotes.length ? 'Open quotation' : 'Create quotation'}</Button>
        </>} />

      {/* Where this inquiry is in the pipeline. Click any step to move it. */}
      <Card className="mb-5">
        <div className="flex items-center justify-between gap-3">
          <ol className="flex min-w-0 flex-1 items-center overflow-x-auto pb-1">
            {flow.map((st, k) => {
              const done = !lost && k < at, current = !lost && k === at
              return (
                <li key={st} className="flex min-w-0 flex-1 items-center last:flex-none">
                  <button onClick={() => setStage(st)} title={`Move to ${st}`} className="group flex shrink-0 items-center gap-2 rounded-lg px-1 py-1">
                    <span className={cx('grid h-7 w-7 place-items-center rounded-full text-xs font-extrabold transition-all duration-200 group-hover:scale-110', done && 'bg-emerald-500 text-white', current && 'bg-linear-to-br from-[#f58a4e] to-[#d9622a] text-white shadow-[0_6px_14px_-6px_rgba(237,115,51,0.8)] ring-4 ring-brand-100', !done && !current && 'bg-slate-100 text-slate-400 ring-1 ring-inset ring-slate-200')}>{done ? <Check size={14} /> : k + 1}</span>
                    <span className={cx('text-[13px] whitespace-nowrap', current ? 'hidden font-extrabold text-ink sm:block' : cx('hidden 2xl:block', done ? 'font-semibold text-slate-600' : 'font-medium text-slate-400'))}>{st}</span>
                  </button>
                  {k < flow.length - 1 && <span className={cx('mx-2 h-0.5 min-w-4 flex-1 rounded-full', done ? 'bg-emerald-400' : 'bg-slate-200')} />}
                </li>)
            })}
          </ol>
          {lost ? <Button variant="secondary" size="sm" onClick={() => setStage('New')}>Re-open</Button> : i.stage !== 'Won' && <Button variant="danger" size="sm" onClick={() => setStage('Lost')}><XCircle size={14} /> Mark lost</Button>}
        </div>
        {lost && <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 ring-1 ring-inset ring-rose-200"><XCircle size={15} /> This inquiry is marked as lost.</p>}
      </Card>

      <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Expected value" value={inrShort(i.value)} icon={<IndianRupee size={18} />} tone="brand" />
        <Stat label="Follow-ups" value={i.followUps.length} icon={<Send size={18} />} tone="blue" />
        <Stat label="Next follow-up" value={due ? fmtDate(due) : 'Not set'} sub={dueLate ? 'Overdue' : due === today() ? 'Today' : undefined} icon={<CalendarClock size={18} />} tone={dueLate ? 'red' : 'amber'} />
        <Stat label="Quotations" value={quotes.length} icon={<FileText size={18} />} tone="violet" />
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card pad={false}>
          <div className="px-5 pt-1"><Tabs tabs={[{ id: 'follow', label: 'Follow-ups', badge: i.followUps.length ? <span className="rounded-full bg-slate-100 px-1.5 text-[11px] font-bold text-slate-600">{i.followUps.length}</span> : undefined }, { id: 'water', label: 'Water analysis' }]} value={tab} onChange={setTab} /></div>
          <div className="p-5">
            {tab === 'follow' ? (
              <>
                <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-200">
                  <div className="mb-3 flex flex-wrap gap-1.5">{(Object.keys(fIcon) as FollowType[]).map(t => { const I = fIcon[t]; return <button key={t} onClick={() => setType(t)} className={cx('pressable flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold', type === t ? fColor[t] + ' ring-2 ring-current/20' : 'bg-white text-slate-500 shadow-flat hover:text-ink')}><I size={13} />{t}</button> })}</div>
                  <textarea rows={2} className="inp !bg-white" placeholder="What was discussed?" value={note} onChange={e => setNote(e.target.value)} />
                  <div className="mt-3 flex flex-wrap items-center gap-3"><label className="text-xs font-semibold text-slate-500">Remind me on</label><input type="date" className="inp !w-44 !bg-white" value={nextDate} onChange={e => setNext(e.target.value)} /><Button size="sm" className="ml-auto" onClick={submit}><Send size={13} /> Save follow-up</Button></div>
                </div>
                <ol className="relative mt-6 space-y-4 before:absolute before:top-2 before:bottom-2 before:left-[17px] before:w-px before:bg-slate-200">
                  {i.followUps.length === 0 && <p className="py-8 text-center text-sm text-slate-400">No follow-ups yet.</p>}
                  {i.followUps.map(f => { const I = fIcon[f.type]; return (
                    <li key={f.id} className="relative flex gap-3"><div className={cx('relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full ring-4 ring-white', fColor[f.type])}><I size={15} /></div>
                      <div className="flex-1 rounded-xl bg-slate-50 px-4 py-2.5 ring-1 ring-inset ring-slate-200"><div className="flex justify-between text-xs text-slate-500"><span className="font-bold text-slate-700">{f.type} · {f.by}</span><span>{fmtDate(f.date)}</span></div><p className="mt-0.5 text-sm text-slate-700">{f.note}</p>{f.nextDate && <p className="mt-1 text-xs font-semibold text-amber-600">Next: {fmtDate(f.nextDate)}</p>}</div></li>) })}
                </ol>
              </>
            ) : (
              <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                {waterKeys.map(([k, l]) => <Field key={k} label={l}><input className="inp" value={i.water[k]} onChange={e => setW(k, e.target.value)} /></Field>)}
                <div className="sm:col-span-2 lg:col-span-3"><div className="lbl">Water report (PDF or image)</div><DocUploader docs={i.water.reports || []} onChange={r => { saveInquiry({ ...i, stage: (i.stage === 'New' || i.stage === 'Contacted') ? 'Water Report Received' : i.stage, water: { ...i.water, reports: r } }) }} /></div>
                <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-3">
                  <Button variant="secondary" size="sm" onClick={() => { if (i.stage === 'New' || i.stage === 'Contacted') saveInquiry({ ...i, stage: 'Water Report Received' }); toast('Marked as water report received') }}><Droplets size={14} /> Mark report received</Button>
                  {i.water.tds && <Button variant="ghost" size="sm" className="!text-rose-500" onClick={() => saveInquiry({ ...i, water: { ...i.water, tds: '', ph: '', hardness: '', chlorides: '', sulphates: '', iron: '', turbidity: '', silica: '', temperature: '', source: '' } })}><Trash2 size={13} /> Clear values</Button>}
                </div>
              </div>
            )}
          </div>
        </Card>

        <aside className="space-y-5 xl:sticky xl:top-24">
          <Card>
            <CardTitle>Customer</CardTitle>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3.5 text-sm">
              {info.map(([k, v]) => <div key={k} className={cx(k === 'Email' && 'col-span-2')}><dt className="text-[11px] font-bold tracking-[0.06em] text-slate-400 uppercase">{k}</dt><dd className="break-words font-semibold text-ink">{v || '—'}</dd></div>)}
            </dl>
            {i.requirement && <p className="mt-4 border-t border-slate-200 pt-3 text-sm text-slate-600">{i.requirement}</p>}
          </Card>

          <Card>
            <CardTitle accent="gold">Handling</CardTitle>
            <div className="mt-4 space-y-4">
              <Field label="Assigned to"><div className="flex items-center gap-2"><Avatar name={userName(db, i.assignedTo)} size={8} /><select className="inp" value={i.assignedTo} onChange={e => { saveInquiry({ ...i, assignedTo: e.target.value }); toast('Inquiry re-assigned') }}>{db.users.filter(u => u.role === 'Sales' || u.role === 'Admin').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div></Field>
              <Field label="Next follow-up"><input type="date" className="inp" value={i.nextFollowUp || ''} onChange={e => saveInquiry({ ...i, nextFollowUp: e.target.value || undefined })} /></Field>
            </div>
          </Card>

          <Card>
            <CardTitle accent="blue">Quotations</CardTitle>
            <div className="mt-3 space-y-2">
              {quotes.map(q => <button key={q.id} onClick={() => nav(`/quotations/${q.id}`)} className="flex w-full items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 text-sm ring-1 ring-inset ring-slate-200 transition-colors hover:bg-brand-50"><span className="font-bold text-brand-700">{q.no}</span><Badge tone={quoteTone[q.status]}>{q.status}</Badge></button>)}
              {!quotes.length && <p className="py-2 text-sm text-slate-400">No quotation yet.</p>}
            </div>
          </Card>

          <button onClick={del} className="flex items-center gap-1.5 px-1 text-sm font-semibold text-rose-500 transition-colors hover:text-rose-700"><Trash2 size={15} /> Delete this inquiry</button>
        </aside>
      </div>
    </>
  )
}
