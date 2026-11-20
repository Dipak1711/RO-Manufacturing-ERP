import type { Quotation, Product, BoqLine, Milestone, DB } from '../types'
export function quoteTotals(q: Pick<Quotation, 'lines' | 'discount' | 'gst'>) {
  const sub = q.lines.reduce((s, l) => s + l.qty * l.rate, 0)
  const disc = (sub * (q.discount || 0)) / 100
  const taxable = sub - disc
  const gst = (taxable * q.gst) / 100
  return { sub, disc, taxable, gst, total: taxable + gst }
}
export const genBoq = (p: Product): BoqLine[] => p.bom.map(b => ({ itemId: b.itemId, qty: b.qty, issued: false }))

export const paidOf = (m: Milestone) => (m.receipts?.length ? m.receipts.reduce((s, r) => s + r.amount, 0) : m.status === 'Received' ? m.amount : 0)

export const defaultSpecs = (p?: Product) => p?.specs?.length ? p.specs.map(s => ({ ...s })) : [
  { k: 'Plant model', v: p?.name || '' }, { k: 'Design capacity', v: p?.capacity || '' }, { k: 'Membrane', v: 'Thin-film composite, spiral wound' },
  { k: 'High pressure pump', v: 'Multistage vertical, SS316 wetted parts' }, { k: 'Skid / frame', v: 'SS304 fabricated, powder-coated' }, { k: 'Piping', v: 'UPVC Sch-80 (LP), SS316 (HP)' },
  { k: 'Control', v: 'PLC with auto flush & low-pressure protection' }, { k: 'Power supply', v: '415 V, 3-phase, 50 Hz' }, { k: 'Operating pressure', v: '10 – 14 bar' },
]
export const defaultSections = () => [
  { id: 'water', type: 'water' as const, title: 'Feed water analysis (as provided by client)', visible: true },
  { id: 'guarantee', type: 'guarantee' as const, title: 'Performance guarantee', visible: true },
  { id: 'specs', type: 'specs' as const, title: 'Technical specifications', visible: true },
  { id: 'scope', type: 'scope' as const, title: 'Scope of supply & price', visible: true },
  { id: 'payment', type: 'payment' as const, title: 'Payment terms', visible: true },
  { id: 'terms', type: 'terms' as const, title: 'Terms & conditions', visible: true },
]
export function normalize(d: DB): DB {
  const prod = (id: string) => d.products.find(p => p.id === id)
  return {
    ...d, movements: d.movements || [],
    quotations: d.quotations.map(q => ({ ...q, rev: q.rev || 1, versions: q.versions || [], sections: q.sections || defaultSections(), specs: q.specs || defaultSpecs(prod(q.productId)), water: { ...q.water, reports: q.water.reports || [] } })),
    inquiries: d.inquiries.map(i => ({ ...i, water: { ...i.water, reports: i.water.reports || [] } })),
    projects: d.projects.map((p, n) => ({ ...p, soNo: p.soNo || `SO/26-27/${String(100 + n).padStart(4, '0')}`, orderFollowUps: p.orderFollowUps || [], supplyOrders: p.supplyOrders || [] })),
    counters: { so: 105, supply: 0, ...d.counters },
  }
}
