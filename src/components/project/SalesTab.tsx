import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Droplets, FileText, Mail, MessageCircle, Phone, Send, StickyNote, Handshake } from 'lucide-react'
import type { FollowType, Project } from '../../types'
import { useApp } from '../../store'
import { Badge, Button, Card } from '../ui'
import { quoteTone } from '../../lib/tones'
import { quoteTotals } from '../../lib/calc'
import { addDays, fmtDate, inr, today, uid } from '../../lib/utils'

const icons = { Call: Phone, Email: Mail, WhatsApp: MessageCircle, Meeting: Handshake, Note: StickyNote }
export default function SalesTab({ p }: { p: Project }) {
  const { db, user, saveProject, toast } = useApp()
  const nav = useNavigate()
  const inq = db.inquiries.find(i => i.id === p.inquiryId)
  const quotes = db.quotations.filter(q => q.inquiryId === p.inquiryId)
  const [type, setType] = useState<FollowType>('Call'), [note, setNote] = useState(''), [next, setNext] = useState(addDays(today(), 3))
  const add = () => {
    if (!note.trim()) return toast('Write a short note', 'err')
    saveProject(p.id, x => ({ ...x, orderFollowUps: [{ id: uid(), type, date: today(), note: note.trim(), by: user!.name, nextDate: next }, ...(x.orderFollowUps || [])] })); setNote(''); toast('PO/SO follow-up saved')
  }
  const water = inq?.water
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <h3 className="mb-3 font-semibold text-ink">Order references</h3>
        <dl className="grid grid-cols-2 gap-3 text-sm">{[['Project code', p.code], ['Sales order', p.soNo || '—'], ['Client PO', p.poNo], ['Order date', fmtDate(p.orderDate)], ['Inquiry', inq?.no || '—'], ['Source', inq?.source || '—']].map(([k, v]) => <div key={k}><dt className="text-[11px] uppercase text-slate-400">{k}</dt><dd className="font-medium">{v}</dd></div>)}</dl>
        <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600"><b>Original requirement:</b> {inq?.requirement || '—'}</p>
        <h4 className="mb-2 mt-5 text-sm font-semibold text-ink">Quotations & revisions</h4>
        <div className="space-y-2">{quotes.map(q => (
          <div key={q.id} className="rounded-lg border border-slate-200 p-3"><div className="flex items-center justify-between"><button onClick={() => nav(`/quotations/${q.id}`)} className="flex items-center gap-2 font-medium text-brand-700"><FileText size={15} />{q.no} · Rev {q.rev || 1}</button><Badge tone={quoteTone[q.status]}>{q.status}</Badge></div>
            <div className="text-sm text-slate-500">{inr(quoteTotals(q).total)} · {fmtDate(q.date)}{q.id === p.quotationId && ' · order basis'}</div>
            {(q.versions || []).map(v => <div key={v.id} className="mt-1 text-xs text-slate-400">Rev {v.rev} · {fmtDate(v.ts)} · {v.note} · {inr(quoteTotals(v.snapshot).total)}</div>)}</div>))}
          {!quotes.length && <p className="text-sm text-slate-400">No quotations on record.</p>}</div>
      </Card>

      <Card>
        <h3 className="mb-3 flex items-center gap-2 font-semibold text-ink"><Droplets size={17} className="text-brand-500" /> Water analysis</h3>
        {water && water.tds ? <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">{([['source', 'Source'], ['tds', 'TDS ppm'], ['ph', 'pH'], ['hardness', 'Hardness'], ['chlorides', 'Chlorides'], ['sulphates', 'Sulphates'], ['iron', 'Iron'], ['turbidity', 'Turbidity'], ['silica', 'Silica'], ['temperature', 'Temp °C']] as const).map(([k, l]) => <div key={k} className="rounded-lg bg-slate-50 px-3 py-2"><div className="text-[11px] uppercase text-slate-400">{l}</div><div className="font-semibold">{water[k] || '—'}</div></div>)}</div> : <p className="text-sm text-slate-400">No water parameters recorded.</p>}
        {(water?.reports || []).map(d => <a key={d.id} href={d.data} download={d.name} className="mt-2 flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm text-brand-700 hover:bg-brand-50"><span>{d.name}</span><span className="text-xs text-slate-400">{fmtDate(d.date)}</span></a>)}
        <h3 className="mb-2 mt-6 font-semibold text-ink">Inquiry follow-up history</h3>
        <div className="max-h-60 space-y-2 overflow-y-auto">{(inq?.followUps || []).map(f => { const I = icons[f.type]; return <div key={f.id} className="flex gap-2 text-sm"><I size={15} className="mt-0.5 shrink-0 text-slate-400" /><div><span className="font-medium">{f.type}</span> <span className="text-xs text-slate-400">{fmtDate(f.date)} · {f.by}</span><div className="text-slate-600">{f.note}</div></div></div> })}{!(inq?.followUps || []).length && <p className="text-sm text-slate-400">No follow-ups recorded.</p>}</div>
      </Card>

      <Card className="lg:col-span-2">
        <h3 className="font-semibold text-ink">PO / SO follow-up</h3><p className="mb-3 text-sm text-slate-500">Track client PO, advance payment and technical-approval follow-ups after the order is confirmed.</p>
        <div className="rounded-xl border border-slate-200 p-3"><div className="mb-2 flex flex-wrap gap-1.5">{(Object.keys(icons) as FollowType[]).map(t => <button key={t} onClick={() => setType(t)} className={`rounded-lg px-2.5 py-1.5 text-xs font-medium ${type === t ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{t}</button>)}</div>
          <textarea rows={2} className="inp" placeholder="e.g. Client confirmed advance will be released on Friday" value={note} onChange={e => setNote(e.target.value)} />
          <div className="mt-2 flex items-center gap-3"><label className="text-xs text-slate-500">Next follow-up</label><input type="date" className="inp !w-40" value={next} onChange={e => setNext(e.target.value)} /><Button size="sm" className="ml-auto" onClick={add}><Send size={13} /> Save</Button></div></div>
        <div className="mt-4 space-y-2">{(p.orderFollowUps || []).map(f => <div key={f.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm"><div className="flex justify-between text-xs text-slate-500"><b className="text-slate-700">{f.type} · {f.by}</b><span>{fmtDate(f.date)}</span></div>{f.note}{f.nextDate && <div className="text-xs text-amber-600">Next: {fmtDate(f.nextDate)}</div>}</div>)}{!(p.orderFollowUps || []).length && <p className="text-sm text-slate-400">No order follow-ups yet.</p>}</div>
      </Card>
    </div>
  )
}
