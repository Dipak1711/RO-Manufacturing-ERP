import type { DB, Inquiry, Quotation } from '../types'
import { addDays, today, uid } from './utils'
import { defaultSections, defaultSpecs } from './calc'

export function buildQuote(db: DB, inq: Inquiry, n: number, preparedBy: string): Quotation {
  const p = db.products.find(x => x.id === inq.productId) || db.products[0]
  return {
    id: 'q' + uid(), no: `QT/2026-27/${String(n).padStart(4, '0')}`, inquiryId: inq.id, date: today(), validTill: addDays(today(), 15), status: 'Draft',
    company: inq.company, contact: inq.contact, phone: inq.phone, email: inq.email, city: inq.city, productId: p.id, capacity: inq.capacity || p.capacity,
    water: { ...inq.water }, lines: p.quoteLines.map(l => ({ ...l })), terms: [...p.terms], gst: 18, discount: 0,
    guarantee: { ...p.guarantee }, payment: { advance: 40, delivery: 50, commissioning: 10 }, preparedBy,
    rev: 1, versions: [], sections: defaultSections(), specs: defaultSpecs(p),
  }
}
