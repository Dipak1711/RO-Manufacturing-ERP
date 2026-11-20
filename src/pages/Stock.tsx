import { useState } from 'react'
import { AlertTriangle, Boxes, PackagePlus, Pencil, Plus } from 'lucide-react'
import { Tabs } from '../components/ui'
import { fmtDateTime } from '../lib/utils'
import { useApp } from '../store'
import { Badge, Button, Card, Field, Modal, PageHeader, SearchBox } from '../components/ui'
import { cx, inr, uid } from '../lib/utils'
import type { StockItem } from '../types'

const cats = ['Component', 'Consumable', 'Electrical', 'Piping'] as const
export default function Stock() {
  const { db, setDB, applyStock, toast } = useApp()
  const [tab, setTab] = useState<'items' | 'moves'>('items')
  const [q, setQ] = useState(''), [cat, setCat] = useState('all'), [low, setLow] = useState(false)
  const [edit, setEdit] = useState<StockItem | null>(null), [adj, setAdj] = useState<StockItem | null>(null), [qty, setQty] = useState(0)
  const list = db.stock.filter(s => (cat === 'all' || s.category === cat) && (!low || s.stock < s.min) && (!q || (s.name + s.sku).toLowerCase().includes(q.toLowerCase())))
  const value = db.stock.reduce((s, i) => s + i.stock * i.lastRate, 0)
  const saveItem = (s: StockItem) => { setDB(d => ({ ...d, stock: d.stock.some(x => x.id === s.id) ? d.stock.map(x => x.id === s.id ? s : x) : [s, ...d.stock] })); setEdit(null); toast('Item saved') }
  const moves = db.movements.filter(m => !q || (db.stock.find(s => s.id === m.itemId)?.name + m.ref).toLowerCase().includes(q.toLowerCase()))
  return (
    <>
      <PageHeader title="Stock & Materials" subtitle={`${db.stock.length} items · stock value ${inr(value)}`} actions={<Button onClick={() => setEdit({ id: uid(), sku: '', name: '', unit: 'Nos', stock: 0, min: 0, lastRate: 0, supplierId: db.suppliers[0].id, category: 'Component' })}><Plus size={16} /> New item</Button>} />
      <div className="mb-4"><Tabs tabs={[{ id: 'items', label: 'Stock list' }, { id: 'moves', label: 'Stock movements', badge: <Badge>{db.movements.length}</Badge> }]} value={tab} onChange={setTab} /></div>
      {tab === 'moves' ? <><div className="mb-4"><SearchBox value={q} onChange={setQ} placeholder="Search item or reference…" /></div><Card pad={false} className="overflow-x-auto"><table className="w-full"><thead className="border-b border-slate-100 bg-slate-50"><tr><th className="th">When</th><th className="th">Item</th><th className="th">Type</th><th className="th">Reference</th><th className="th">By</th><th className="th text-right">Qty</th></tr></thead><tbody className="divide-y divide-slate-100">{moves.map(m => { const it = db.stock.find(s => s.id === m.itemId); return <tr key={m.id}><td className="td text-xs">{fmtDateTime(m.ts)}</td><td className="td">{it?.name}</td><td className="td"><Badge tone={m.qty > 0 ? 'green' : 'amber'}>{m.type}</Badge></td><td className="td">{m.ref}</td><td className="td text-xs">{m.by}</td><td className={`td text-right font-bold ${m.qty > 0 ? 'text-emerald-600' : 'text-red-600'}`}>{m.qty > 0 ? '+' : ''}{m.qty} {it?.unit}</td></tr> })}</tbody></table>{!moves.length && <p className="py-10 text-center text-sm text-slate-400">No stock movements yet — issuing material, receiving POs and adjustments are recorded here.</p>}</Card></> : <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchBox value={q} onChange={setQ} placeholder="Search item or SKU…" />
        {['all', ...cats].map(c => <button key={c} onClick={() => setCat(c)} className={cx('rounded-full px-3.5 py-1.5 text-sm font-medium', cat === c ? 'bg-brand-600 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50')}>{c === 'all' ? 'All' : c}</button>)}
        <button onClick={() => setLow(!low)} className={cx('ml-auto flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium', low ? 'bg-red-600 text-white' : 'border border-red-200 bg-red-50 text-red-600')}><AlertTriangle size={14} /> Low stock only</button>
      </div>
      <Card pad={false} className="overflow-x-auto"><table className="w-full"><thead className="border-b border-slate-100 bg-slate-50"><tr><th className="th">SKU</th><th className="th">Item</th><th className="th">Category</th><th className="th text-right">In stock</th><th className="th text-right">Min</th><th className="th text-right">Last rate</th><th className="th">Supplier</th><th className="th" /></tr></thead>
        <tbody className="divide-y divide-slate-100">{list.map(s => (
          <tr key={s.id} className="hover:bg-slate-50"><td className="td text-xs text-slate-500">{s.sku}</td><td className="td font-medium text-slate-800">{s.name}{s.size && <span className="ml-1 text-xs font-normal text-slate-400">· {s.size}</span>}</td><td className="td"><Badge>{s.category}</Badge></td>
            <td className="td text-right"><span className={cx('font-bold', s.stock < s.min ? 'text-red-600' : 'text-slate-800')}>{s.stock}</span> <span className="text-xs text-slate-400">{s.unit}</span></td><td className="td text-right text-slate-500">{s.min}</td><td className="td text-right">{inr(s.lastRate)}</td><td className="td text-xs text-slate-500">{db.suppliers.find(x => x.id === s.supplierId)?.name}</td>
            <td className="td text-right whitespace-nowrap"><Button size="sm" variant="ghost" onClick={() => { setAdj(s); setQty(0) }}><PackagePlus size={14} /> Adjust</Button><Button size="sm" variant="ghost" onClick={() => setEdit(s)}><Pencil size={14} /></Button></td></tr>))}</tbody></table>
        {!list.length && <div className="py-12 text-center text-sm text-slate-400"><Boxes className="mx-auto mb-2" /> No items match</div>}</Card>

      </>}
      {adj && <Modal title="Adjust stock" subtitle={adj.name} width="max-w-sm" onClose={() => setAdj(null)} footer={<><Button variant="secondary" onClick={() => setAdj(null)}>Cancel</Button><Button onClick={() => { if (!qty) return toast('Enter a quantity', 'err'); if (adj.stock + qty < 0) return toast('Stock cannot go below zero', 'err'); applyStock([{ itemId: adj.id, delta: qty, type: 'Adjustment', ref: 'Manual adjustment' }]); toast('Stock updated'); setAdj(null) }}>Apply</Button></>}>
        <p className="mb-3 text-sm text-slate-500">Current stock: <b>{adj.stock} {adj.unit}</b>. Enter a positive number to add, negative to remove.</p><Field label="Quantity change"><input type="number" className="inp" value={qty} onChange={e => setQty(+e.target.value)} autoFocus /></Field><p className="mt-2 text-sm">New stock: <b>{Math.max(0, adj.stock + qty)}</b></p></Modal>}
      {edit && <ItemModal item={edit} onClose={() => setEdit(null)} onSave={saveItem} />}
    </>
  )
}
function ItemModal({ item, onClose, onSave }: { item: StockItem; onClose: () => void; onSave: (s: StockItem) => void }) {
  const { db, toast } = useApp()
  const [f, setF] = useState(item)
  const set = <K extends keyof StockItem>(k: K, v: StockItem[K]) => setF({ ...f, [k]: v })
  return (
    <Modal title={item.name ? 'Edit item' : 'New item'} onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={() => f.name && f.sku ? onSave(f) : toast('Name and SKU are required', 'err')}>Save</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2"><Field label="Item name" className="sm:col-span-2"><input className="inp" value={f.name} onChange={e => set('name', e.target.value)} /></Field>
        <Field label="SKU"><input className="inp" value={f.sku} onChange={e => set('sku', e.target.value)} /></Field><Field label="Category"><select className="inp" value={f.category} onChange={e => set('category', e.target.value as StockItem['category'])}>{cats.map(c => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Unit"><input className="inp" value={f.unit} onChange={e => set('unit', e.target.value)} /></Field><Field label="Size / specification"><input className="inp" placeholder='e.g. 20 inch, 25 kg' value={f.size || ''} onChange={e => set('size', e.target.value)} /></Field><Field label="Supplier"><select className="inp" value={f.supplierId} onChange={e => set('supplierId', e.target.value)}>{db.suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
        <Field label="Stock"><input type="number" className="inp" value={f.stock} onChange={e => set('stock', +e.target.value)} /></Field><Field label="Minimum level"><input type="number" className="inp" value={f.min} onChange={e => set('min', +e.target.value)} /></Field>
        <Field label="Last purchase rate (₹)"><input type="number" className="inp" value={f.lastRate} onChange={e => set('lastRate', +e.target.value)} /></Field></div></Modal>
  )
}
