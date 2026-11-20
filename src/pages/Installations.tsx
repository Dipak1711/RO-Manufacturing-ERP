import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Wrench } from 'lucide-react'
import { useApp } from '../store'
import { Button, Card, Empty, Modal, PageHeader, Tabs } from '../components/ui'
import { InstBadge, InstallationEditor } from '../components/project/InstallationPanel'
import { fmtDate } from '../lib/utils'
import type { Project } from '../types'

export default function Installations() {
  const { db, user } = useApp()
  const nav = useNavigate()
  const [tab, setTab] = useState<'mine' | 'all'>(user!.role === 'Service' ? 'mine' : 'all')
  const [sel, setSel] = useState<Project | null>(null)
  const list = db.projects.filter(p => p.dispatch || p.status === 'Ready for Dispatch').filter(p => tab === 'all' || p.installation?.team.includes(user!.id) || !p.installation).sort((a, b) => (a.installation?.scheduledDate || 'z').localeCompare(b.installation?.scheduledDate || 'z'))
  const st = (p: Project) => p.installation?.status || 'Not scheduled'
  return (
    <>
      <PageHeader title="Installations" subtitle="Assign teams, track site visits and complete commissioning reports." />
      {user!.role === 'Service' && <div className="mb-4"><Tabs tabs={[{ id: 'mine', label: 'My assignments & unassigned' }, { id: 'all', label: 'All sites' }]} value={tab} onChange={setTab} /></div>}
      {list.length === 0 ? <Card><Empty icon={<Wrench size={40} />} title="No installations to show" text="Projects appear here once they are ready for dispatch." /></Card> :
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{list.map(p => { const s = st(p) as keyof typeof import('../components/project/InstallationPanel').instTone; return (
          <Card key={p.id}><div className="flex items-center justify-between"><b className="text-brand-700">{p.code}</b><InstBadge s={s} /></div>
            <div className="mt-1 font-semibold text-slate-800">{p.company}</div><div className="flex items-center gap-1 text-sm text-slate-500"><MapPin size={13} />{p.installation?.siteAddress || p.city}</div>
            <div className="mt-3 text-sm text-slate-600"><div>Team: <b>{p.installation?.team.map(id => db.users.find(u => u.id === id)?.name.split(' ')[0]).join(', ') || 'Unassigned'}</b></div><div>Visit: <b>{p.installation ? fmtDate(p.installation.scheduledDate) : '—'}</b></div><div>Plant: {db.products.find(x => x.id === p.productId)?.name} {p.capacity}</div></div>
            <div className="mt-4 flex gap-2"><Button size="sm" variant="secondary" className="max-sm:!py-2.5 max-sm:flex-1" onClick={() => setSel(p)}>{p.installation ? 'Update' : 'Assign team'}</Button><Button size="sm" className="max-sm:!py-2.5 max-sm:flex-1" onClick={() => nav(`/projects/${p.id}`)}>{p.status === 'Commissioned' ? 'View report' : 'Open & commission'}</Button></div></Card>) })}</div>}
      {sel && <Modal title={`Installation – ${sel.code}`} subtitle={sel.company} width="max-w-2xl" onClose={() => setSel(null)}><InstallationEditor p={db.projects.find(x => x.id === sel.id)!} onDone={() => setSel(null)} /></Modal>}
    </>
  )
}
