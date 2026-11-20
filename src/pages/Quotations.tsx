import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Plus } from 'lucide-react'
import { useApp } from '../store'
import { Badge, Button, Card, Empty, PageHeader, SearchBox } from '../components/ui'
import { fmtDate, inr } from '../lib/utils'
import { quoteTone } from '../lib/tones'
import { quoteTotals } from '../lib/calc'

export default function Quotations() {
  const { db } = useApp()
  const nav = useNavigate()
  const [q, setQ] = useState(''), [st, setSt] = useState('all')
  const list = db.quotations.filter(x => (st === 'all' || x.status === st) && (!q || (x.no + x.company).toLowerCase().includes(q.toLowerCase()))).sort((a, b) => b.date.localeCompare(a.date))
  return (
    <>
      <PageHeader title="Quotations" subtitle="Customised quotations built from product templates in minutes — not hours." actions={<Button onClick={() => nav('/quotations/new')}><Plus size={16} /> New Quotation</Button>} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchBox value={q} onChange={setQ} placeholder="Search quotation or company…" />
        {['all', 'Draft', 'Sent', 'Accepted', 'Rejected'].map(s => <button key={s} onClick={() => setSt(s)} className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${st === s ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>{s === 'all' ? 'All' : s}</button>)}
      </div>
      <Card pad={false} className="overflow-x-auto">
        {list.length === 0 ? <Empty icon={<FileText size={40} />} title="No quotations found" /> : (
          <table className="w-full"><thead className="border-b border-slate-100 bg-slate-50"><tr><th className="th">Quotation</th><th className="th">Customer</th><th className="th">Product</th><th className="th">Date</th><th className="th">Valid till</th><th className="th">Status</th><th className="th text-right">Amount (incl. GST)</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{list.map(x => (
              <tr key={x.id} className="cursor-pointer hover:bg-slate-50" onClick={() => nav(`/quotations/${x.id}`)}>
                <td className="td font-semibold text-brand-700">{x.no}</td><td className="td"><div className="font-medium text-slate-800">{x.company}</div><div className="text-xs text-slate-500">{x.contact}</div></td>
                <td className="td">{db.products.find(p => p.id === x.productId)?.name}<div className="text-xs text-slate-500">{x.capacity}</div></td><td className="td">{fmtDate(x.date)}</td><td className="td">{fmtDate(x.validTill)}</td>
                <td className="td"><Badge tone={quoteTone[x.status]}>{x.status}</Badge></td><td className="td text-right font-semibold">{inr(quoteTotals(x).total)}</td></tr>))}</tbody></table>)}
      </Card>
    </>
  )
}
