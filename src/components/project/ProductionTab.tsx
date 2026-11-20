import { useState } from 'react'
import { CheckCircle2, ClipboardList, Mail, MessageCircle, Mic, Play, Plus, Send } from 'lucide-react'
import { PrintModal, DocHeader, SignBlock } from '../PrintModal'
import { can } from '../../lib/roles'
import type { Photo, Project } from '../../types'
import { useApp } from '../../store'
import { Badge, Button, Card, Field, Modal, Progress } from '../ui'
import { PhotoStrip, PhotoUploader, VoiceRecorder } from '../Media'
import { cx, fmtDate, fmtDateTime, mailLink, placeholderPhoto, today, uid, waLink } from '../../lib/utils'

export default function ProductionTab({ p }: { p: Project }) {
  const { db, user, saveProject, toast, log } = useApp()
  const prod = db.products.find(x => x.id === p.productId)!
  const [notes, setNotes] = useState(p.designNotes || '')
  const [add, setAdd] = useState(false)
  const [voiceNote, setVoiceNote] = useState(''), [wo, setWo] = useState(false)
  const role = user!.role, canDesign = role === 'Admin' || role === 'Design', canPost = can.postProduction(role), canVoice = can.voice(role)
  const prog = p.updates.length ? p.updates[p.updates.length - 1].progress : 0
  const started = p.status === 'In Production' || p.status === 'Ready for Dispatch' || p.status === 'Dispatched' || p.status === 'Commissioned'
  const locked = p.status === 'Dispatched' || p.status === 'Commissioned'

  const pick = (id: string) => { if (locked) return; if (!canDesign) return toast('Only Admin or the Design team can select the approved design', 'err'); saveProject(p.id, x => ({ ...x, designId: id })) }
  const release = () => {
    if (!p.designId) return toast('Select a design first', 'err')
    saveProject(p.id, x => ({ ...x, designNotes: notes, status: 'In Production' }))
    log(`${p.code} released to factory floor – design "${prod.designs.find(d => d.id === p.designId)?.name}"`, 'production', p.id); toast('Released to the factory floor')
  }
  const share = (id: string, via: 'wa' | 'mail') => {
    const u = p.updates.find(x => x.id === id)!
    const text = `Dear ${p.contact},\n\nStatus update on your ${prod.name} (${p.code}): ${u.progress}% complete as of ${fmtDate(u.date)}.\n${u.note}\n\nPlease plan your next payment as per schedule.\n\nRegards,\n${user!.name}, AquaFlow Engineering`
    if (via === 'wa') window.open(waLink(p.phone, text), '_blank'); else window.location.href = mailLink(p.email, `Production status ${u.progress}% – ${p.code}`, text)
    saveProject(p.id, x => ({ ...x, updates: x.updates.map(y => y.id === id ? { ...y, sharedWithClient: true } : y) })); toast('Update shared with client')
  }
  const saveVoice = (audio: string, duration: number) => {
    saveProject(p.id, x => ({ ...x, voiceNotes: [{ id: uid(), date: new Date().toISOString(), by: user!.name, audio, duration, note: voiceNote || undefined }, ...x.voiceNotes] }))
    setVoiceNote(''); toast('Voice instruction sent to the floor team'); log(`Voice instruction added on ${p.code}`, 'production', p.id)
  }

  return (
    <div className="space-y-5">
      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-semibold text-ink">Design selection</h3><p className="text-sm text-slate-500">Pick the approved design for the {prod.name} — the factory builds exactly this.</p></div>
          <div className="flex gap-2"><Button variant="secondary" onClick={() => setWo(true)}><ClipboardList size={15} /> Work order</Button>{!started && canDesign && <Button variant="accent" onClick={release}><Send size={15} /> Release to factory floor</Button>}</div></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">{prod.designs.map(d => (
          <button key={d.id} onClick={() => pick(d.id)} className={cx('overflow-hidden rounded-xl border-2 text-left transition', p.designId === d.id ? 'border-brand-600 ring-4 ring-brand-100' : 'border-slate-200 hover:border-brand-300', locked && 'cursor-default')}>
            <img src={d.image || placeholderPhoto(d.name, d.hue, 4)} className="aspect-[3/2] w-full object-cover" />
            <div className="p-3"><div className="flex items-center justify-between gap-1 text-sm font-semibold text-slate-800">{d.name}{p.designId === d.id && <CheckCircle2 size={16} className="text-brand-600" />}</div><p className="mt-0.5 text-xs text-slate-500">{d.desc}</p></div></button>))}</div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3"><Field label="Expected completion date"><input type="date" className="inp" disabled={locked} value={p.expectedCompletion || ''} onChange={e => saveProject(p.id, x => ({ ...x, expectedCompletion: e.target.value }))} /></Field></div>
        <Field label="Manufacturing instructions for factory" className="mt-4"><textarea rows={2} className="inp" disabled={locked} value={notes} onChange={e => setNotes(e.target.value)} onBlur={() => saveProject(p.id, x => ({ ...x, designNotes: notes }))} placeholder="e.g. Use SS316 for all HP piping, nameplate in Gujarati + English…" /></Field>
      </Card>

      <div className="grid gap-5 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <div className="mb-4 flex items-center justify-between"><div><h3 className="font-semibold text-ink">Production status</h3><p className="text-sm text-slate-500">Floor engineer posts photos; sales forwards to the client in one tap.</p></div>
            <Button onClick={() => setAdd(true)} disabled={!started || locked || !canPost} title={canPost ? '' : 'Only the factory engineer can post updates'} className="max-sm:!w-full max-sm:!py-3 max-sm:!text-base"><Plus size={15} /> Post update</Button></div>
          {p.expectedCompletion && <p className="mb-2 text-sm text-slate-500">Expected completion <b>{fmtDate(p.expectedCompletion)}</b></p>}<div className="mb-5 flex items-center gap-4"><Progress value={prog} className="flex-1 !h-3" /><span className="text-xl font-bold text-ink">{prog}%</span></div>
          {!started && <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">Select a design and release to the factory floor to start posting production updates.</p>}
          <div className="space-y-5">{[...p.updates].reverse().map(u => (
            <div key={u.id} className="rounded-xl border border-slate-200 p-4">
              <div className="mb-2 flex items-center justify-between"><div className="flex items-center gap-2"><Badge tone="purple">{u.progress}% complete</Badge>{u.sharedWithClient && <Badge tone="green">Shared with client</Badge>}</div><span className="text-xs text-slate-400">{fmtDate(u.date)} · {u.by}</span></div>
              <p className="mb-3 text-sm text-slate-700">{u.note}</p>{u.expectedDate && <p className="mb-2 text-xs text-slate-500">Expected completion: <b>{fmtDate(u.expectedDate)}</b></p>}<PhotoStrip photos={u.photos} />
              <div className="mt-3 flex gap-2"><Button size="sm" variant="secondary" onClick={() => share(u.id, 'wa')}><MessageCircle size={14} className="text-emerald-600" /> Send on WhatsApp</Button><Button size="sm" variant="secondary" onClick={() => share(u.id, 'mail')}><Mail size={14} className="text-sky-600" /> Email</Button></div>
            </div>))}
            {started && !p.updates.length && <p className="py-6 text-center text-sm text-slate-400">No updates posted yet.</p>}</div>
        </Card>

        <Card className="xl:col-span-2">
          <h3 className="flex items-center gap-2 font-semibold text-ink"><Mic size={17} className="text-red-500" /> Voice instructions</h3>
          <p className="mb-4 text-sm text-slate-500">Record a voice note in your language — floor engineers and workers just press play.</p>
          {canVoice && <input className="inp mb-3" placeholder="Short title (optional)" value={voiceNote} onChange={e => setVoiceNote(e.target.value)} />}
          {canVoice ? <VoiceRecorder onSave={saveVoice} /> : <p className="text-sm text-slate-400">Voice instructions are recorded by management and the design team. You can listen below.</p>}
          <div className="mt-5 space-y-3">{p.voiceNotes.map(v => (
            <div key={v.id} className="rounded-xl bg-slate-50 p-3"><div className="mb-1.5 flex justify-between text-xs text-slate-500"><span className="flex items-center gap-1 font-semibold text-slate-700"><Play size={12} /> {v.note || 'Voice instruction'}</span><span>{fmtDateTime(v.date)}</span></div>
              <audio controls src={v.audio} className="h-9 w-full" />
              <div className="mt-1.5 flex items-center justify-between text-xs"><span className="text-slate-400">by {v.by}</span>
                <button onClick={() => saveProject(p.id, x => ({ ...x, voiceNotes: x.voiceNotes.map(n => n.id === v.id ? { ...n, ack: !n.ack } : n) }))} className={v.ack ? 'font-semibold text-emerald-600' : 'text-slate-500 hover:text-brand-600'}>{v.ack ? '✓ Acknowledged by floor team' : 'Mark as heard'}</button></div></div>))}
            {!p.voiceNotes.length && <p className="py-4 text-center text-sm text-slate-400">No voice instructions yet.</p>}</div>
        </Card>
      </div>
      {wo && <PrintModal title={`Work order ${p.code}`} onClose={() => setWo(false)}>
        <DocHeader title="Production Work Order" no={`WO-${p.code}`} date={fmtDate(today())} />
        <table style={{ marginBottom: 8 }}><tbody><tr><td><b>Project</b><br />{p.code} · {p.company}<br />{p.city}</td><td><b>Plant</b><br />{prod.name} – {p.capacity}<br />SO {p.soNo} · PO {p.poNo}</td><td><b>Schedule</b><br />Delivery: {fmtDate(p.deliveryDate)}<br />Expected completion: {fmtDate(p.expectedCompletion)}</td></tr></tbody></table>
        <h3>Approved design</h3>{p.designId ? (() => { const d = prod.designs.find(x => x.id === p.designId)!; return <div style={{ display: 'flex', gap: 12 }}><img src={d.image || placeholderPhoto(d.name, d.hue, 4)} style={{ width: 220, border: '1px solid #cbd5e1' }} /><div><b>{d.name}</b><br />{d.desc}</div></div> })() : <p>No design selected yet.</p>}
        <h3>Manufacturing instructions</h3><p style={{ whiteSpace: 'pre-wrap' }}>{notes || 'As per approved design and standard fabrication practice.'}</p>
        <h3>Material list</h3><table><thead><tr><th>#</th><th>Item</th><th>Qty</th><th>Unit</th><th>Issued</th></tr></thead><tbody>{p.boq.map((b, i) => { const it = db.stock.find(x => x.id === b.itemId)!; return <tr key={b.itemId}><td>{i + 1}</td><td>{it.name}</td><td>{b.qty}</td><td>{it.unit}</td><td>{b.issued ? 'Yes' : 'No'}</td></tr> })}</tbody></table>
        <SignBlock left="Issued by (Production head)" right="Received by (Factory engineer)" />
      </PrintModal>}
      {add && <UpdateModal p={p} onClose={() => setAdd(false)} />}
    </div>
  )
}

function UpdateModal({ p, onClose }: { p: Project; onClose: () => void }) {
  const { user, saveProject, toast, log } = useApp()
  const last = p.updates.length ? p.updates[p.updates.length - 1].progress : 0
  const [expected, setExpected] = useState(p.expectedCompletion || ''), [progress, setProgress] = useState(Math.min(100, last + 20)), [note, setNote] = useState(''), [photos, setPhotos] = useState<Photo[]>([])
  const save = () => {
    if (!note.trim()) return toast('Add a short note', 'err')
    saveProject(p.id, x => ({ ...x, expectedCompletion: expected || x.expectedCompletion, status: progress >= 100 ? 'Ready for Dispatch' : x.status, updates: [...x.updates, { id: uid(), date: today(), progress, note, by: user!.name, photos, expectedDate: expected || undefined }] }))
    log(`Production update ${progress}% on ${p.code}`, 'production', p.id); toast('Update posted'); onClose()
  }
  return (
    <Modal title="Post production update" subtitle={`${p.code} · ${p.company}`} onClose={onClose} width="max-w-lg" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save}>Post update</Button></>}>
      <Field label={`Machine completion – ${progress}%`}><input type="range" min={last} max={100} step={5} value={progress} onChange={e => setProgress(+e.target.value)} className="h-8 w-full accent-brand-600" /></Field>
      <Field label="What was done?" className="mt-4"><textarea rows={3} className="inp" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Pressure vessels mounted, HP piping 50% complete" /></Field>
      <Field label="Expected completion date" className="mt-4"><input type="date" className="inp" value={expected} onChange={e => setExpected(e.target.value)} /></Field>
      <div className="mt-4"><div className="lbl">Photos</div><PhotoUploader photos={photos} onChange={setPhotos} /></div>
      {progress >= 100 && <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">At 100% the project moves to “Ready for Dispatch”.</p>}
    </Modal>
  )
}
