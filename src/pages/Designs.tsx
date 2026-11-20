import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Palette, Pencil, Plus, Trash2 } from 'lucide-react'
import { useApp } from '../store'
import { Badge, Button, Card, Empty, PageHeader, SearchBox } from '../components/ui'
import { placeholderPhoto } from '../lib/utils'
import { can } from '../lib/roles'
import type { Design } from '../types'

export default function Designs() {
  const { db, setDB, user, toast } = useApp()
  const nav = useNavigate()
  const [prodId, setProdId] = useState('all'), [q, setQ] = useState('')
  const manage = can.manageDesigns(user!.role)
  const used = (id: string) => db.projects.filter(x => x.designId === id).length
  const groups = db.products.filter(p => prodId === 'all' || p.id === prodId)
    .map(p => ({ p, designs: p.designs.filter(d => !q || (d.name + d.desc).toLowerCase().includes(q.toLowerCase())) })).filter(g => g.designs.length)
  const total = groups.reduce((n, g) => n + g.designs.length, 0)

  const del = (pid: string, d: Design) => {
    const n = used(d.id)
    if (n) return toast(`"${d.name}" is used in ${n} ${n === 1 ? 'project' : 'projects'}, so it cannot be deleted`, 'err')
    if (confirm(`Delete the design "${d.name}"?`)) { setDB(s => ({ ...s, products: s.products.map(p => p.id === pid ? { ...p, designs: p.designs.filter(x => x.id !== d.id) } : p) })); toast('Design deleted') }
  }

  return (
    <>
      <PageHeader eyebrow="Factory" icon={<Palette size={20} />} title="Designs"
        actions={manage ? <Button onClick={() => nav('/designs/new')}><Plus size={16} /> Add design</Button> : undefined} />

      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl bg-white/75 p-3 shadow-card ring-1 ring-white/60">
        <SearchBox value={q} onChange={setQ} placeholder="Search designs" />
        <select aria-label="Product" className="inp !w-auto" value={prodId} onChange={e => setProdId(e.target.value)}><option value="all">All products</option>{db.products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        {(prodId !== 'all' || q) && <button onClick={() => { setProdId('all'); setQ('') }} className="text-sm font-semibold text-brand-600 transition-colors hover:text-brand-800">Clear</button>}
        <span className="ml-auto text-sm font-semibold text-slate-500">{total} {total === 1 ? 'design' : 'designs'}</span>
      </div>

      {total === 0 ? <Card><Empty icon={<Palette size={30} />} title="No designs found" text={q || prodId !== 'all' ? 'Try a different search or product.' : 'Add your first design.'} action={manage ? <Button onClick={() => nav('/designs/new')}><Plus size={15} /> Add design</Button> : undefined} /></Card> : (
        <div className="space-y-8">{groups.map(({ p, designs }) => (
          <section key={p.id}>
            <div className="mb-3 flex items-center gap-2.5"><span className="h-5 w-1 rounded-full bg-linear-to-b from-[#f28c4c] to-[#c4531c]" /><h2 className="text-[16px] font-extrabold tracking-[-0.02em] text-ink">{p.name}</h2><Badge tone="slate">{designs.length}</Badge></div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">{designs.map(d => { const n = used(d.id); return (
              <Card key={d.id} pad={false} className="lift overflow-hidden">
                <img src={d.image || placeholderPhoto(d.name, d.hue, 4)} alt={d.name} className="aspect-[3/2] w-full object-cover" />
                <div className="p-4">
                  <div className="text-[15px] font-extrabold tracking-[-0.01em] text-ink">{d.name}</div>
                  <p className="mt-0.5 line-clamp-2 min-h-[2.5rem] text-sm text-slate-500">{d.desc || 'No description'}</p>
                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-200 pt-3">
                    {n > 0 ? <Badge tone="green">Used in {n} {n === 1 ? 'project' : 'projects'}</Badge> : <span className="text-xs text-slate-400">Not used yet</span>}
                    {manage && <div className="flex gap-1"><Button size="sm" variant="secondary" onClick={() => nav(`/designs/${d.id}/edit`)}><Pencil size={13} /> Edit</Button><Button size="sm" variant="ghost" className="!text-rose-500" onClick={() => del(p.id, d)} aria-label={`Delete ${d.name}`}><Trash2 size={14} /></Button></div>}
                  </div>
                </div>
              </Card>) })}</div>
          </section>))}</div>)}
    </>
  )
}
