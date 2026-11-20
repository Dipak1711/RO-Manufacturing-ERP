import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check } from 'lucide-react'
import { useApp, userName } from '../store'
import { Badge, Button, Card, PageHeader, Tabs } from '../components/ui'
import { cx, fmtDate, inr } from '../lib/utils'
import { projTone } from '../lib/tones'
import { PSTATUS } from '../types'
import { useAlerts } from '../lib/alerts'
import Payments from '../components/project/Payments'
import Boq from '../components/project/Boq'
import ProductionTab from '../components/project/ProductionTab'
import DispatchTab from '../components/project/DispatchTab'
import Commissioning from '../components/project/Commissioning'
import ConsumablesTab from '../components/project/ConsumablesTab'
import Timeline from '../components/project/Timeline'
import SalesTab from '../components/project/SalesTab'
import { tabAccess } from '../lib/roles'
import { paidOf } from '../lib/calc'

type T = import('../lib/roles').PTab
export default function ProjectDetail() {
  const { id } = useParams()
  const { db, user } = useApp()
  const nav = useNavigate()
  const al = useAlerts()
  const [tab, setTab] = useState<T>('overview')
  const p = db.projects.find(x => x.id === id)
  if (!p) return <p className="p-8 text-slate-500">Project not found.</p>
  const prod = db.products.find(x => x.id === p.productId)!
  const step = PSTATUS.indexOf(p.status)
  const short = p.boq.filter(b => !b.issued && (db.stock.find(s => s.id === b.itemId)?.stock || 0) < b.qty).length
  const due = al.consumables.filter(c => c.project.id === p.id).length
  const paid = p.payments.reduce((s, m) => s + paidOf(m), 0)
  const prog = p.status === 'Commissioned' || p.status === 'Dispatched' ? 100 : p.updates.length ? p.updates[p.updates.length - 1].progress : 0
  const nextHint: Record<string, [string, T]> = {
    'Order Confirmed': ['Generate the BOQ and check material availability', 'boq'], Procurement: ['Raise POs for shortages, then release to the factory floor', 'boq'],
    'In Production': ['Post production updates with photos and share with the client', 'production'], 'Ready for Dispatch': ['Create dispatch, invoice and e-way bill', 'dispatch'],
    Dispatched: ['Complete installation & commissioning report at site', 'install'], Commissioned: ['Plant is live — track consumable supplies', 'consumables'],
  }
  const [hint, hintTab] = nextHint[p.status]
  const tabs: { id: T; label: string; badge?: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview' }, { id: 'sales', label: 'Inquiry & Quotes' },
    { id: 'boq', label: 'BOQ & Material', badge: short > 0 && p.boqGenerated && p.status !== 'In Production' ? <Badge tone="red">{short} short</Badge> : undefined },
    { id: 'production', label: 'Production' }, { id: 'dispatch', label: 'Dispatch & Invoice' }, { id: 'install', label: 'Installation' },
    { id: 'consumables', label: 'Consumables', badge: due ? <Badge tone="amber">{due} due</Badge> : undefined },
    { id: 'payments', label: 'Payments' }, { id: 'timeline', label: 'History' },
  ]
  const allowed = tabAccess[user!.role]
  const visibleTabs = tabs.filter(t => allowed.includes(t.id))
  const cur = allowed.includes(tab) ? tab : allowed[0]
  return (
    <>
      <button onClick={() => nav('/projects')} className="mb-3 flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600"><ArrowLeft size={15} /> All projects</button>
      <PageHeader title={`${p.code} · ${p.company}`} subtitle={`${prod.name} ${p.capacity} · SO ${p.soNo || '—'} · PO ${p.poNo} · ${p.city}`} actions={<Badge tone={projTone[p.status]} className="!px-3 !py-1.5 !text-sm">{p.status}</Badge>} />

      <Card className="mb-5 !py-6">
        <div className="flex items-start">{PSTATUS.map((s, i) => (
          <div key={s} className="relative flex flex-1 flex-col items-center text-center">
            {i > 0 && <div className={cx('absolute left-[-50%] right-[50%] top-4 h-0.5', i <= step ? 'bg-accent-500' : 'bg-slate-200')} />}
            <div className={cx('relative z-10 grid h-8 w-8 place-items-center rounded-full border-2 text-xs font-bold', i < step ? 'border-accent-500 bg-accent-500 text-white' : i === step ? 'border-brand-600 bg-brand-600 text-white ring-4 ring-brand-100' : 'border-slate-200 bg-white text-slate-400')}>{i < step ? <Check size={15} /> : i + 1}</div>
            <div className={cx('mt-2 hidden px-1 text-xs font-medium sm:block', i <= step ? 'text-slate-800' : 'text-slate-400')}>{s}</div>
          </div>))}</div>
        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-800"><span className="font-semibold">Next step:</span> {hint}{allowed.includes(hintTab) && <Button size="sm" className="ml-auto" onClick={() => setTab(hintTab)}>Go</Button>}</div>
      </Card>

      <Tabs tabs={visibleTabs} value={cur} onChange={setTab} />
      <div className="pt-5">
        {cur === 'sales' && <SalesTab p={p} />}
        {cur === 'overview' && (
          <div className="grid gap-5 lg:grid-cols-3">
            <Card className="lg:col-span-2"><h3 className="mb-4 font-semibold text-ink">Project details</h3>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3">
                {[['Client', p.company], ['Contact', `${p.contact} · ${p.phone}`], ['Email', p.email], ['Site', p.city], ['Plant', `${prod.name} – ${p.capacity}`], ['Client PO', p.poNo], ['Order date', fmtDate(p.orderDate)], ['Delivery due', fmtDate(p.deliveryDate)], ['Project owner', userName(db, p.owner)]].map(([k, v]) => <div key={k}><dt className="text-[11px] uppercase tracking-wide text-slate-400">{k}</dt><dd className="font-medium text-slate-800">{v}</dd></div>)}
              </dl>
              {p.designId && <p className="mt-5 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600"><b>Selected design:</b> {prod.designs.find(d => d.id === p.designId)?.name}</p>}
            </Card>
            <div className="space-y-5">
              <Card><div className="text-xs uppercase tracking-wide text-slate-400">Order value</div><div className="text-2xl font-bold text-ink">{inr(p.value)}</div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-accent-500" style={{ width: `${(paid / p.value) * 100}%` }} /></div><div className="mt-1.5 flex justify-between text-xs text-slate-500"><span>Received {inr(paid)}</span><span>Balance {inr(p.value - paid)}</span></div></Card>
              <Card><div className="text-xs uppercase tracking-wide text-slate-400">Production progress</div><div className="text-2xl font-bold text-ink">{prog}%</div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-brand-500" style={{ width: `${prog}%` }} /></div></Card>
            </div>
          </div>)}
        {cur === 'boq' && <Boq p={p} />}
        {cur === 'production' && <ProductionTab p={p} />}
        {cur === 'dispatch' && <DispatchTab p={p} />}
        {cur === 'install' && <Commissioning p={p} />}
        {cur === 'consumables' && <ConsumablesTab p={p} />}
        {cur === 'payments' && <Payments p={p} />}
        {cur === 'timeline' && <Timeline p={p} />}
      </div>
    </>
  )
}
