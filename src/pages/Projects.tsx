import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList } from 'lucide-react'
import { useApp, userName } from '../store'
import { Badge, Card, Empty, PageHeader, Progress, SearchBox } from '../components/ui'
import { fmtDate, inrShort } from '../lib/utils'
import { projTone } from '../lib/tones'
import { PSTATUS } from '../types'

export default function Projects() {
  const { db } = useApp()
  const nav = useNavigate()
  const [q, setQ] = useState(''), [st, setSt] = useState('all')
  const list = db.projects.filter(p => (st === 'all' || p.status === st) && (!q || (p.code + p.company + p.poNo).toLowerCase().includes(q.toLowerCase())))
  return (
    <>
      <PageHeader title="Projects & Orders" subtitle="Every confirmed order lives under its own project code — from PO to the last consumable supply." />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchBox value={q} onChange={setQ} placeholder="Search code, client, PO…" />
        {['all', ...PSTATUS].map(s => <button key={s} onClick={() => setSt(s)} className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${st === s ? 'bg-brand-600 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>{s === 'all' ? 'All' : s}</button>)}
      </div>
      <Card pad={false} className="overflow-x-auto">
        {list.length === 0 ? <Empty icon={<ClipboardList size={40} />} title="No projects" text="Confirm a quotation to create a project." /> : (
          <table className="w-full"><thead className="border-b border-slate-100 bg-slate-50"><tr><th className="th">Project</th><th className="th">Client</th><th className="th">Plant</th><th className="th">Client PO</th><th className="th">Delivery</th><th className="th">Progress</th><th className="th">Status</th><th className="th text-right">Order value</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{list.map(p => {
              const prog = p.status === 'Commissioned' || p.status === 'Dispatched' ? 100 : p.updates.length ? p.updates[p.updates.length - 1].progress : 0
              return <tr key={p.id} onClick={() => nav(`/projects/${p.id}`)} className="cursor-pointer hover:bg-slate-50">
                <td className="td font-bold text-brand-700">{p.code}</td><td className="td"><div className="font-medium text-slate-800">{p.company}</div><div className="text-xs text-slate-500">{p.city} · {userName(db, p.owner)}</div></td>
                <td className="td">{db.products.find(x => x.id === p.productId)?.name}<div className="text-xs text-slate-500">{p.capacity}</div></td><td className="td">{p.poNo}</td><td className="td">{fmtDate(p.deliveryDate)}</td>
                <td className="td w-36"><Progress value={prog} /></td><td className="td"><Badge tone={projTone[p.status]}>{p.status}</Badge></td><td className="td text-right font-semibold">{inrShort(p.value)}</td></tr>
            })}</tbody></table>)}
      </Card>
    </>
  )
}
