import { useState } from 'react'
import { MapPin } from 'lucide-react'
import type { Installation, Project } from '../../types'
import { useApp } from '../../store'
import { Badge, Button, Field } from '../ui'
import { PhotoUploader } from '../Media'
import { addDays, today } from '../../lib/utils'
import { can } from '../../lib/roles'

export const instTone = { 'Not scheduled': 'slate', Scheduled: 'blue', 'In progress': 'amber', Completed: 'green' } as const

export function InstallationEditor({ p, onDone }: { p: Project; onDone?: () => void }) {
  const { db, user, saveProject, toast, log } = useApp()
  const ro = !can.install(user!.role) && user!.role !== 'Sales'
  const engineers = db.users.filter(u => u.role === 'Service' || u.role === 'Factory')
  const [f, setF] = useState<Installation>(p.installation || { team: [db.users.find(u => u.role === 'Service')?.id || ''], scheduledDate: addDays(today(), 5), siteAddress: `${p.company}, ${p.city}, Gujarat`, siteContact: p.contact, sitePhone: p.phone, status: 'Scheduled', notes: '', photos: [] })
  const save = () => {
    if (!f.team.length) return toast('Assign at least one team member', 'err')
    if (!f.siteAddress.trim()) return toast('Site address is required', 'err')
    saveProject(p.id, x => ({ ...x, installation: f }))
    log(`Installation ${f.status.toLowerCase()} for ${p.code} – team: ${f.team.map(id => db.users.find(u => u.id === id)?.name).join(', ')}`, 'install', p.id); toast('Installation details saved'); onDone?.()
  }
  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><div className="lbl">Installation team</div><div className="flex flex-wrap gap-2">{engineers.map(u => <button key={u.id} disabled={ro} type="button" onClick={() => setF({ ...f, team: f.team.includes(u.id) ? f.team.filter(x => x !== u.id) : [...f.team, u.id] })} className={`rounded-full border px-3 py-1.5 text-sm ${f.team.includes(u.id) ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-200 bg-white text-slate-600'}`}>{u.name} <span className="opacity-70">· {u.role === 'Service' ? 'Installer' : 'Factory'}</span></button>)}</div></div>
        <Field label="Scheduled visit"><input type="date" className="inp" disabled={ro} value={f.scheduledDate} onChange={e => setF({ ...f, scheduledDate: e.target.value })} /></Field>
        <Field label="Status"><select className="inp" disabled={ro} value={f.status} onChange={e => setF({ ...f, status: e.target.value as Installation['status'] })}>{Object.keys(instTone).map(s => <option key={s}>{s}</option>)}</select></Field>
        <Field label="Site address" className="sm:col-span-2"><input className="inp" disabled={ro} value={f.siteAddress} onChange={e => setF({ ...f, siteAddress: e.target.value })} /></Field>
        <Field label="Site contact"><input className="inp" disabled={ro} value={f.siteContact} onChange={e => setF({ ...f, siteContact: e.target.value })} /></Field>
        <Field label="Site phone"><input className="inp" disabled={ro} value={f.sitePhone} onChange={e => setF({ ...f, sitePhone: e.target.value })} /></Field>
        <Field label="Site notes (power, civil, water connection readiness)" className="sm:col-span-2"><textarea rows={2} className="inp" disabled={ro} value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} /></Field>
        <div className="sm:col-span-2"><div className="lbl">Installation photos</div><PhotoUploader photos={f.photos} onChange={photos => setF({ ...f, photos })} /></div>
      </div>
      <div className="mt-4 flex items-center gap-3"><a className="flex items-center gap-1 text-sm text-brand-600" target="_blank" href={`https://www.google.com/maps/search/${encodeURIComponent(f.siteAddress)}`}><MapPin size={14} /> View on map</a>{!ro && <Button className="ml-auto max-sm:!w-full max-sm:!py-3" onClick={save}>Save installation details</Button>}</div>
    </div>
  )
}
export const InstBadge = ({ s }: { s: keyof typeof instTone }) => <Badge tone={instTone[s]}>{s}</Badge>
