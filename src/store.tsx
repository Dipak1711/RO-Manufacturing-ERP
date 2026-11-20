import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { DB, Movement, EventLog, Inquiry, PO, Project, Quotation, StockItem, User } from './types'
import { makeSeed } from './seed'
import { uid, today } from './lib/utils'
import { genBoq, normalize, quoteTotals } from './lib/calc'

const KEY = 'aquaflow.erp.db.v1'
const SKEY = 'aquaflow.erp.session'
const load = (): DB => {
  try { const r = localStorage.getItem(KEY); if (r) return normalize(JSON.parse(r)) } catch { /* ignore */ }
  return normalize(makeSeed())
}

type Toast = { id: string; text: string; kind: 'ok' | 'err' }
interface Ctx {
  db: DB; user: User | null; toasts: Toast[]
  login: (email: string, pass: string) => boolean; logout: () => void
  toast: (t: string, kind?: 'ok' | 'err') => void
  log: (text: string, kind: EventLog['kind'], projectId?: string) => void
  setDB: (fn: (d: DB) => DB) => void
  next: (counter: string) => number
  saveInquiry: (i: Inquiry) => void
  saveQuote: (q: Quotation) => void
  saveProject: (id: string, fn: (p: Project) => Project) => void
  savePO: (p: PO) => void
  updateStock: (id: string, fn: (s: StockItem) => StockItem) => void
  convertToProject: (q: Quotation, poNo: string, deliveryDate: string) => Project
  reset: () => void
  switchUser: (id: string) => void
  applyStock: (changes: { itemId: string; delta: number; type: Movement['type']; ref: string; rate?: number }[]) => void
}
const C = createContext<Ctx>(null as unknown as Ctx)
export const useApp = () => useContext(C)

export function Provider({ children }: { children: ReactNode }) {
  const [db, _set] = useState<DB>(load)
  const [user, setUser] = useState<User | null>(() => { try { const id = localStorage.getItem(SKEY); return id ? load().users.find(u => u.id === id) || null : null } catch { return null } })
  const [toasts, setToasts] = useState<Toast[]>([])
  const timer = useRef<number | undefined>(undefined)
  const dbRef = useRef(db); dbRef.current = db
  const userRef = useRef(user); userRef.current = user

  const toast = useCallback((text: string, kind: 'ok' | 'err' = 'ok') => {
    const id = uid(); setToasts(t => [...t, { id, text, kind }]); setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3400)
  }, [])

  useEffect(() => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      try { localStorage.setItem(KEY, JSON.stringify(db)) } catch { toast('Browser storage is full – please remove some photos or voice notes.', 'err') }
    }, 300)
  }, [db, toast])

  const setDB = useCallback((fn: (d: DB) => DB) => _set(fn), [])
  const log: Ctx['log'] = useCallback((text, kind, projectId) => _set(d => ({ ...d, events: [{ id: uid(), ts: new Date().toISOString(), text, kind, projectId }, ...d.events].slice(0, 400) })), [])
  const next = (counter: string) => {
    const n = (dbRef.current.counters[counter] || 0) + 1
    _set(d => ({ ...d, counters: { ...d.counters, [counter]: n } }))
    dbRef.current = { ...dbRef.current, counters: { ...dbRef.current.counters, [counter]: n } }
    return n
  }
  const upsert = <T extends { id: string }>(arr: T[], x: T) => arr.some(a => a.id === x.id) ? arr.map(a => a.id === x.id ? x : a) : [x, ...arr]

  const value: Ctx = {
    db, user, toasts, toast, log, setDB, next,
    login: (email, pass) => { const u = db.users.find(x => x.email.toLowerCase() === email.trim().toLowerCase() && x.password === pass); if (u) { setUser(u); try { localStorage.setItem(SKEY, u.id) } catch { /* */ } } return !!u },
    logout: () => { setUser(null); try { localStorage.removeItem(SKEY) } catch { /* */ } },
    saveInquiry: i => _set(d => ({ ...d, inquiries: upsert(d.inquiries, i) })),
    saveQuote: q => _set(d => ({ ...d, quotations: upsert(d.quotations, q) })),
    saveProject: (id, fn) => _set(d => ({ ...d, projects: d.projects.map(p => p.id === id ? fn(p) : p) })),
    savePO: p => _set(d => ({ ...d, pos: upsert(d.pos, p) })),
    updateStock: (id, fn) => _set(d => ({ ...d, stock: d.stock.map(s => s.id === id ? fn(s) : s) })),
    convertToProject: (q, poNo, deliveryDate) => {
      const d = dbRef.current
      const prod = d.products.find(p => p.id === q.productId)!
      const n = next('project')
      const totals = quoteTotals(q)
      const rows: [string, number][] = [['Advance with Purchase Order', q.payment.advance], ['Against Delivery / Dispatch', q.payment.delivery], ['After Installation & Commissioning', q.payment.commissioning]]
      const inq = d.inquiries.find(i => i.id === q.inquiryId)
      const project: Project = {
        id: 'prj' + n, code: `PRJ-${String(n).padStart(3, '0')}`, quotationId: q.id, inquiryId: q.inquiryId, poNo, orderDate: today(), deliveryDate,
        company: q.company, contact: q.contact, phone: q.phone, email: q.email, city: q.city, productId: q.productId, capacity: q.capacity,
        value: Math.round(totals.total), status: 'Order Confirmed', owner: inq?.assignedTo || d.users[0].id,
        payments: rows.map(([label, percent]) => ({ id: uid(), label, percent, amount: Math.round((totals.total * percent) / 100), status: 'Pending' as const })),
        boq: genBoq(prod), boqGenerated: false, updates: [], voiceNotes: [], consumables: [],
        soNo: `SO/26-27/${String(next('so')).padStart(4, '0')}`, orderFollowUps: [], supplyOrders: [],
      }
      _set(s => ({
        ...s, projects: [project, ...s.projects],
        quotations: s.quotations.map(x => x.id === q.id ? { ...x, status: 'Accepted' } : x),
        inquiries: s.inquiries.map(x => x.id === q.inquiryId ? { ...x, stage: 'Won', nextFollowUp: undefined } : x),
      }))
      log(`Order received from ${q.company} (PO ${poNo}) – project ${project.code} created`, 'order', project.id)
      return project
    },
    reset: () => { try { localStorage.removeItem(KEY) } catch { /* */ } _set(normalize(makeSeed())) },
    switchUser: id => { const u = dbRef.current.users.find(x => x.id === id); if (u) { setUser(u); try { localStorage.setItem(SKEY, u.id) } catch { /* */ } } },
    applyStock: changes => _set(d => ({
      ...d,
      stock: d.stock.map(s => { const cs = changes.filter(c => c.itemId === s.id); if (!cs.length) return s; const delta = cs.reduce((a, c) => a + c.delta, 0); const rate = cs.find(c => c.rate)?.rate; return { ...s, stock: Math.max(0, s.stock + delta), lastRate: rate ?? s.lastRate } }),
      movements: [...changes.map(c => ({ id: uid(), ts: new Date().toISOString(), itemId: c.itemId, qty: c.delta, type: c.type, ref: c.ref, by: userRef.current?.name || 'System' })), ...d.movements].slice(0, 1500),
    })),
  }
  return <C.Provider value={value}>{children}</C.Provider>
}

export const userName = (db: DB, id: string) => db.users.find(u => u.id === id)?.name || '—'
