import { useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ImagePlus, Palette, Save } from 'lucide-react'
import { useApp } from '../store'
import { Button, Card, PageHeader } from '../components/ui'
import { F, bad } from '../components/form'
import { compressImage, cx, placeholderPhoto, uid } from '../lib/utils'
import { can } from '../lib/roles'
import type { Design } from '../types'

/* One page for both "Add design" and "Edit design". */
export default function DesignForm() {
  const { id } = useParams()
  const { db, setDB, user, toast } = useApp()
  const nav = useNavigate()
  const found = id ? db.products.flatMap(p => p.designs.map(d => ({ pid: p.id, d }))).find(x => x.d.id === id) : undefined
  const [pid, setPid] = useState(found?.pid ?? db.products[0].id)
  const [d, setD] = useState<Design>(() => found?.d ?? { id: uid(), name: '', desc: '', hue: Math.floor(Math.random() * 360) })
  const [err, setErr] = useState('')
  const ref = useRef<HTMLInputElement>(null)

  if (!can.manageDesigns(user!.role)) return <Navigate to="/designs" replace />
  if (id && !found) return <p className="p-8 text-slate-500">Design not found.</p>

  const pick = async (f?: File) => {
    if (!f) return
    if (!f.type.startsWith('image/')) return toast('Please choose an image (JPG or PNG)', 'err')
    setD({ ...d, image: await compressImage(f, 900, 0.7) })
  }
  const save = () => {
    if (!d.name.trim()) { setErr('Enter a design name'); return toast('Please fix the highlighted field', 'err') }
    const clean = { ...d, name: d.name.trim(), desc: d.desc.trim() }
    setDB(s => ({ ...s, products: s.products.map(p => p.id === pid ? { ...p, designs: p.designs.some(x => x.id === clean.id) ? p.designs.map(x => x.id === clean.id ? clean : x) : [...p.designs, clean] } : p) }))
    toast(found ? 'Design updated' : 'Design added'); nav('/designs')
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader eyebrow="Factory" icon={<Palette size={20} />} title={found ? 'Edit design' : 'Add design'} actions={<Button variant="secondary" onClick={() => nav('/designs')}><ArrowLeft size={15} /> Back</Button>} />
      <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <div className="space-y-4">
            <F label="Design name" required error={err}><input className={cx('inp', bad(err))} value={d.name} onChange={e => { setD({ ...d, name: e.target.value }); setErr('') }} placeholder="e.g. Compact Skid – SS304" autoFocus /></F>
            <F label="Product" hint={found ? 'The product cannot be changed once a design is saved.' : undefined}><select className="inp" value={pid} disabled={!!found} onChange={e => setPid(e.target.value)}>{db.products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></F>
            <F label="When to use it"><textarea rows={4} className="inp" value={d.desc} onChange={e => setD({ ...d, desc: e.target.value })} placeholder="A short note, e.g. best for tight spaces" /></F>
          </div>
        </Card>
        <Card>
          <div className="lbl">Drawing or photo</div>
          <img src={d.image || placeholderPhoto(d.name || 'Preview', d.hue, 4)} alt="Design preview" className="aspect-[3/2] w-full rounded-xl object-cover ring-1 ring-slate-200" />
          <div className="mt-3 flex flex-wrap gap-2"><Button type="button" variant="secondary" size="sm" onClick={() => ref.current?.click()}><ImagePlus size={14} /> {d.image ? 'Change image' : 'Upload image'}</Button>{d.image && <Button type="button" variant="ghost" size="sm" onClick={() => setD({ ...d, image: undefined })}>Remove</Button>}</div>
          <input ref={ref} type="file" accept="image/*" hidden onChange={e => { pick(e.target.files?.[0]); e.target.value = '' }} />
        </Card>
      </div>
      <div className="sticky bottom-4 z-20 mt-6 flex items-center justify-end gap-2 rounded-2xl bg-white px-5 py-3 shadow-panel ring-1 ring-white/70">
        <Button variant="secondary" onClick={() => nav('/designs')}>Cancel</Button>
        <Button onClick={save} className="!px-5 !py-2.5"><Save size={16} /> Save design</Button>
      </div>
    </div>
  )
}
