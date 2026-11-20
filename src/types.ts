export type Role = 'Admin' | 'Sales' | 'Design' | 'Stores' | 'Factory' | 'Service'
export interface User { id: string; name: string; email: string; password: string; role: Role; phone: string }
export interface Design { id: string; name: string; desc: string; hue: number; image?: string }
export interface BomItem { itemId: string; qty: number }
export interface QuoteLine { desc: string; qty: number; unit: string; rate: number }
export interface Product {
  id: string; code: string; name: string; capacity: string; unitLabel: string; specs?: { k: string; v: string }[]
  designs: Design[]; bom: BomItem[]; quoteLines: QuoteLine[]; terms: string[]; guarantee: { outTds: number; recovery: number; flow: string }
}
export interface StockItem { id: string; sku: string; name: string; unit: string; stock: number; min: number; lastRate: number; supplierId: string; size?: string; category: 'Component' | 'Consumable' | 'Electrical' | 'Piping' }
export interface Supplier { id: string; name: string; phone: string; email: string; city: string }
export type FollowType = 'Call' | 'Email' | 'WhatsApp' | 'Meeting' | 'Note'
export interface FollowUp { id: string; type: FollowType; date: string; note: string; by: string; nextDate?: string }
export const STAGES = ['New', 'Contacted', 'Water Report Received', 'Quoted', 'Negotiation', 'Won', 'Lost'] as const
export type Stage = typeof STAGES[number]
export const SOURCES = ['IndiaMART', 'TradeIndia', 'Website', 'Door-to-door', 'Reference', 'Exhibition', 'JustDial'] as const
export interface Water { source: string; ph: string; tds: string; hardness: string; chlorides: string; sulphates: string; iron: string; turbidity: string; silica: string; temperature: string; reports?: Doc[] }
export interface Doc { id: string; name: string; type: string; size: number; data: string; date: string }
export interface Inquiry {
  id: string; no: string; date: string; company: string; contact: string; phone: string; email: string; city: string
  source: string; productId: string; capacity: string; requirement: string; assignedTo: string; stage: Stage; value: number
  followUps: FollowUp[]; nextFollowUp?: string; water: Water; lostReason?: string
}
export type SectionType = 'water' | 'guarantee' | 'specs' | 'scope' | 'payment' | 'terms' | 'text'
export interface Section { id: string; type: SectionType; title: string; visible: boolean; text?: string }
export interface Quotation {
  rev?: number; sections?: Section[]; specs?: { k: string; v: string }[]; versions?: QuoteVersion[]
  id: string; no: string; inquiryId: string; date: string; validTill: string; status: 'Draft' | 'Sent' | 'Accepted' | 'Rejected'
  company: string; contact: string; phone: string; email: string; city: string; productId: string; capacity: string
  water: Water; lines: QuoteLine[]; terms: string[]; gst: number; discount: number
  guarantee: { outTds: number; recovery: number; flow: string }; payment: { advance: number; delivery: number; commissioning: number }
  preparedBy: string
}
export interface QuoteVersion { id: string; rev: number; ts: string; by: string; note: string; snapshot: Quotation }
export interface Receipt { id: string; date: string; amount: number; mode: string; ref: string }
export interface Milestone { id: string; label: string; percent: number; amount: number; status: 'Pending' | 'Partial' | 'Received'; receivedOn?: string; dueDate?: string; receipts?: Receipt[] }
export interface BoqLine { itemId: string; qty: number; issued: boolean }
export interface Photo { id: string; src: string; caption?: string }
export interface ProdUpdate { id: string; date: string; progress: number; note: string; by: string; expectedDate?: string; photos: Photo[]; sharedWithClient?: boolean }
export interface VoiceNote { id: string; date: string; by: string; audio: string; duration: number; note?: string; ack?: boolean }
export interface Dispatch {
  date: string; vehicle: string; transporter: string; lrNo: string; driver: string; destination: string
  items: { desc: string; qty: number; unit: string }[]; photos: Photo[]; invoiceNo: string; ewayNo: string; ewayValidTill: string; remarks: string
}
export interface Commissioning {
  date: string; engineer: string; siteEngineer: string; siteDesignation: string
  params: { inTds: string; outTds: string; inPressure: string; outPressure: string; flow: string; recovery: string; ph: string; power: string }
  remarks: string; photos: Photo[]; signature?: string; emailed?: boolean; feedback?: string; rating?: number
}
export interface Installation { team: string[]; scheduledDate: string; siteAddress: string; siteContact: string; sitePhone: string; status: 'Not scheduled' | 'Scheduled' | 'In progress' | 'Completed'; notes: string; photos: Photo[] }
export interface SupplyOrder { id: string; no: string; date: string; status: 'Pending' | 'Supplied'; suppliedOn?: string; lines: { planId: string; itemId: string; qty: number }[]; note: string }
export interface ConsumablePlan { id: string; itemId: string; qty: number; intervalDays: number; lastSupplied: string; history: { date: string; qty: number; note?: string }[] }
export const PSTATUS = ['Order Confirmed', 'Procurement', 'In Production', 'Ready for Dispatch', 'Dispatched', 'Commissioned'] as const
export type PStatus = typeof PSTATUS[number]
export interface Project {
  id: string; code: string; quotationId: string; inquiryId: string; poNo: string; orderDate: string; deliveryDate: string
  company: string; contact: string; phone: string; email: string; city: string; productId: string; capacity: string
  value: number; status: PStatus; owner: string; payments: Milestone[]; boq: BoqLine[]; boqGenerated: boolean
  designId?: string; designNotes?: string; updates: ProdUpdate[]; voiceNotes: VoiceNote[]
  dispatch?: Dispatch; commissioning?: Commissioning; consumables: ConsumablePlan[]
  soNo?: string; orderFollowUps?: FollowUp[]; installation?: Installation; supplyOrders?: SupplyOrder[]; expectedCompletion?: string
}
export interface POLine { itemId: string; name: string; unit: string; qty: number; rate: number; lastRate: number }
export interface PO { id: string; no: string; supplierId: string; projectId?: string; date: string; status: 'Draft' | 'Sent' | 'Received'; lines: POLine[]; notes: string }
export interface EventLog { id: string; ts: string; projectId?: string; text: string; kind: 'inquiry' | 'quote' | 'order' | 'payment' | 'boq' | 'po' | 'production' | 'dispatch' | 'install' | 'consumable' | 'stock' }
export interface Movement { id: string; ts: string; itemId: string; qty: number; type: 'Issue' | 'Receipt' | 'Adjustment' | 'Consumable supply' | 'Opening'; ref: string; by: string }
export interface Company { name: string; tagline: string; address: string; gstin: string; phone: string; email: string; bank: string }
export interface DB {
  v: number; company: Company; users: User[]; products: Product[]; stock: StockItem[]; suppliers: Supplier[]
  inquiries: Inquiry[]; quotations: Quotation[]; projects: Project[]; pos: PO[]; events: EventLog[]; movements: Movement[]
  counters: Record<string, number>
}
