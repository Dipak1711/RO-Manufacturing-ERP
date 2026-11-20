import { useState } from 'react'
import { Plus, RotateCcw, Trash2 } from 'lucide-react'
import { useApp } from '../store'
import { Avatar, Badge, Button, Card, Field, Modal, PageHeader, Tabs } from '../components/ui'
import { inr, uid } from '../lib/utils'
import { defaultSpecs } from '../lib/calc'
import { roleLabel } from '../lib/roles'
import type { Product } from '../types'

export default function SettingsPage() {
  const { db, setDB, toast, reset } = useApp()
  const [tab, setTab] = useState<'products' | 'company' | 'users' | 'suppliers' | 'data'>('products')
  const [edit, setEdit] = useState<Product | null>(null)
  const [co, setCo] = useState(db.company)
  return (
    <>
      <PageHeader title="Masters & Settings" subtitle="Product templates, designs, bill-of-material, users and company profile." />
      <Tabs tabs={[{ id: 'products', label: 'Products & templates' }, { id: 'company', label: 'Company' }, { id: 'users', label: 'Users' }, { id: 'suppliers', label: 'Suppliers' }, { id: 'data', label: 'Data' }]} value={tab} onChange={setTab} />
      <div className="pt-5">
        {tab === 'products' && <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{db.products.map(p => (
          <Card key={p.id}><div className="flex items-start justify-between"><div><Badge tone="blue">{p.code}</Badge><h3 className="mt-2 font-semibold text-ink">{p.name}</h3><p className="text-sm text-slate-500">Standard {p.capacity}</p></div></div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm"><div className="rounded-lg bg-slate-50 p-2"><div className="text-lg font-bold">{p.designs.length}</div><div className="text-[11px] text-slate-500">Designs</div></div><div className="rounded-lg bg-slate-50 p-2"><div className="text-lg font-bold">{p.bom.length}</div><div className="text-[11px] text-slate-500">BOQ items</div></div><div className="rounded-lg bg-slate-50 p-2"><div className="text-lg font-bold">{p.quoteLines.length}</div><div className="text-[11px] text-slate-500">Quote lines</div></div></div>
            <Button variant="secondary" className="mt-4 w-full" onClick={() => setEdit(structuredClone(p))}>Edit template</Button></Card>))}</div>}
        {tab === 'company' && <Card className="max-w-2xl"><div className="grid gap-4">{([['name', 'Company name'], ['tagline', 'Tagline'], ['address', 'Address'], ['gstin', 'GSTIN'], ['phone', 'Phone'], ['email', 'Email'], ['bank', 'Bank details']] as const).map(([k, l]) => <Field key={k} label={l}><input className="inp" value={co[k]} onChange={e => setCo({ ...co, [k]: e.target.value })} /></Field>)}</div><Button className="mt-5" onClick={() => { setDB(d => ({ ...d, company: co })); toast('Company profile saved') }}>Save</Button></Card>}
        {tab === 'users' && <Card pad={false}><table className="w-full"><thead className="bg-slate-50"><tr><th className="th">User</th><th className="th">Role</th><th className="th">Email</th><th className="th">Phone</th></tr></thead><tbody className="divide-y divide-slate-100">{db.users.map(u => <tr key={u.id}><td className="td"><div className="flex items-center gap-3"><Avatar name={u.name} />{u.name}</div></td><td className="td"><Badge tone="indigo">{roleLabel[u.role]}</Badge></td><td className="td">{u.email}</td><td className="td">{u.phone}</td></tr>)}</tbody></table></Card>}
        {tab === 'suppliers' && <Card pad={false}><table className="w-full"><thead className="bg-slate-50"><tr><th className="th">Supplier</th><th className="th">City</th><th className="th">Phone</th><th className="th">Email</th><th className="th text-right">Items supplied</th></tr></thead><tbody className="divide-y divide-slate-100">{db.suppliers.map(s => <tr key={s.id}><td className="td font-medium">{s.name}</td><td className="td">{s.city}</td><td className="td">{s.phone}</td><td className="td">{s.email}</td><td className="td text-right">{db.stock.filter(i => i.supplierId === s.id).length}</td></tr>)}</tbody></table></Card>}
        {tab === 'data' && <Card className="max-w-xl"><h3 className="font-semibold text-ink">Data</h3><p className="mt-1 text-sm text-slate-500">All records are stored securely in this browser. Restoring sample data removes everything you have entered.</p><Button variant="danger" className="mt-4" onClick={() => { if (confirm('Reset all data to the initial sample records? This cannot be undone.')) { reset(); toast('Data restored') } }}><RotateCcw size={15} /> Restore initial data</Button></Card>}
      </div>
      {edit && <ProductEditor p={edit} onClose={() => setEdit(null)} />}
    </>
  )
}

function ProductEditor({ p: init, onClose }: { p: Product; onClose: () => void }) {
  const { db, setDB, toast } = useApp()
  const [p, setP] = useState(init)
  const [t, setT] = useState<'quote' | 'specs' | 'boq' | 'designs' | 'terms'>('quote')
  const save = () => { setDB(d => ({ ...d, products: d.products.map(x => x.id === p.id ? p : x) })); toast('Template saved'); onClose() }
  return (
    <Modal title={p.name} subtitle="Template used to auto-fill quotations, BOQ and production designs" width="max-w-4xl" onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save}>Save template</Button></>}>
      <div className="mb-4 grid gap-3 sm:grid-cols-3"><Field label="Product name"><input className="inp" value={p.name} onChange={e => setP({ ...p, name: e.target.value })} /></Field><Field label="Standard capacity"><input className="inp" value={p.capacity} onChange={e => setP({ ...p, capacity: e.target.value })} /></Field><Field label="Code"><input className="inp" value={p.code} onChange={e => setP({ ...p, code: e.target.value })} /></Field></div>
      <Tabs tabs={[{ id: 'quote', label: 'Quotation lines' }, { id: 'specs', label: 'Specifications' }, { id: 'boq', label: 'BOQ (material list)' }, { id: 'designs', label: 'Designs' }, { id: 'terms', label: 'Terms' }]} value={t} onChange={setT} />
      <div className="max-h-[50vh] overflow-y-auto pt-4">
        {t === 'quote' && <div className="space-y-2">{p.quoteLines.map((l, i) => <div key={i} className="flex gap-2"><input className="inp" value={l.desc} onChange={e => setP({ ...p, quoteLines: p.quoteLines.map((x, k) => k === i ? { ...x, desc: e.target.value } : x) })} /><input type="number" className="inp !w-16" value={l.qty} onChange={e => setP({ ...p, quoteLines: p.quoteLines.map((x, k) => k === i ? { ...x, qty: +e.target.value } : x) })} /><input type="number" className="inp !w-28" value={l.rate} onChange={e => setP({ ...p, quoteLines: p.quoteLines.map((x, k) => k === i ? { ...x, rate: +e.target.value } : x) })} /><button onClick={() => setP({ ...p, quoteLines: p.quoteLines.filter((_, k) => k !== i) })} className="text-slate-300 hover:text-red-500"><Trash2 size={15} /></button></div>)}<Button size="sm" variant="secondary" onClick={() => setP({ ...p, quoteLines: [...p.quoteLines, { desc: '', qty: 1, unit: 'Set', rate: 0 }] })}><Plus size={13} /> Add line</Button></div>}
        {t === 'specs' && <div className="space-y-2">{(p.specs || defaultSpecs(p)).map((x, i) => <div key={i} className="flex gap-2"><input className="inp !w-1/3" value={x.k} onChange={e => setP({ ...p, specs: (p.specs || defaultSpecs(p)).map((y, k) => k === i ? { ...y, k: e.target.value } : y) })} /><input className="inp" value={x.v} onChange={e => setP({ ...p, specs: (p.specs || defaultSpecs(p)).map((y, k) => k === i ? { ...y, v: e.target.value } : y) })} /><button onClick={() => setP({ ...p, specs: (p.specs || defaultSpecs(p)).filter((_, k) => k !== i) })} className="text-slate-300 hover:text-red-500"><Trash2 size={15} /></button></div>)}<Button size="sm" variant="secondary" onClick={() => setP({ ...p, specs: [...(p.specs || defaultSpecs(p)), { k: '', v: '' }] })}><Plus size={13} /> Add specification</Button></div>}
        {t === 'boq' && <div className="space-y-2">{p.bom.map((b, i) => <div key={i} className="flex gap-2"><select className="inp" value={b.itemId} onChange={e => setP({ ...p, bom: p.bom.map((x, k) => k === i ? { ...x, itemId: e.target.value } : x) })}>{db.stock.map(s => <option key={s.id} value={s.id}>{s.name} ({inr(s.lastRate)})</option>)}</select><input type="number" className="inp !w-24" value={b.qty} onChange={e => setP({ ...p, bom: p.bom.map((x, k) => k === i ? { ...x, qty: +e.target.value } : x) })} /><button onClick={() => setP({ ...p, bom: p.bom.filter((_, k) => k !== i) })} className="text-slate-300 hover:text-red-500"><Trash2 size={15} /></button></div>)}<Button size="sm" variant="secondary" onClick={() => setP({ ...p, bom: [...p.bom, { itemId: db.stock[0].id, qty: 1 }] })}><Plus size={13} /> Add item</Button></div>}
        {t === 'designs' && <div className="space-y-2">{p.designs.map((d, i) => <div key={d.id} className="flex gap-2"><input className="inp !w-56" value={d.name} onChange={e => setP({ ...p, designs: p.designs.map((x, k) => k === i ? { ...x, name: e.target.value } : x) })} /><input className="inp" value={d.desc} onChange={e => setP({ ...p, designs: p.designs.map((x, k) => k === i ? { ...x, desc: e.target.value } : x) })} /><button onClick={() => setP({ ...p, designs: p.designs.filter((_, k) => k !== i) })} className="text-slate-300 hover:text-red-500"><Trash2 size={15} /></button></div>)}<Button size="sm" variant="secondary" onClick={() => setP({ ...p, designs: [...p.designs, { id: uid(), name: 'New design', desc: '', hue: Math.floor(Math.random() * 360) }] })}><Plus size={13} /> Add design</Button></div>}
        {t === 'terms' && <div className="space-y-2">{p.terms.map((x, i) => <div key={i} className="flex gap-2"><textarea rows={1} className="inp" value={x} onChange={e => setP({ ...p, terms: p.terms.map((y, k) => k === i ? e.target.value : y) })} /><button onClick={() => setP({ ...p, terms: p.terms.filter((_, k) => k !== i) })} className="text-slate-300 hover:text-red-500"><Trash2 size={15} /></button></div>)}<Button size="sm" variant="secondary" onClick={() => setP({ ...p, terms: [...p.terms, ''] })}><Plus size={13} /> Add term</Button></div>}
      </div>
    </Modal>
  )
}
