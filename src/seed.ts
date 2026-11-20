import type { DB, Inquiry, Quotation, Project, Product, StockItem, Water, FollowUp, Milestone, Stage, PStatus } from './types'
import { addDays, today, uid, placeholderPhoto } from './lib/utils'
import { quoteTotals, genBoq } from './lib/calc'

const d = (n: number) => addDays(today(), n)

const suppliers = [
  { id: 'sup1', name: 'Shree Ganesh Pumps & Motors', phone: '9824011122', email: 'sales@ganeshpumps.in', city: 'Rajkot' },
  { id: 'sup2', name: 'Hydranautics Membranes India', phone: '9890123456', email: 'orders@hydramembranes.in', city: 'Mumbai' },
  { id: 'sup3', name: 'Navkar FRP Industries', phone: '9925566778', email: 'navkarfrp@gmail.com', city: 'Ahmedabad' },
  { id: 'sup4', name: 'Pioneer Chemicals & Media', phone: '9879900011', email: 'pioneerchem@gmail.com', city: 'Vadodara' },
  { id: 'sup5', name: 'Prakash Electricals & Controls', phone: '9712233445', email: 'prakash.elec@gmail.com', city: 'Surat' },
  { id: 'sup6', name: 'Kiran Steel & Piping', phone: '9725511223', email: 'kiransteel@gmail.com', city: 'Ahmedabad' },
]

const S = (id: string, sku: string, name: string, unit: string, stock: number, min: number, lastRate: number, supplierId: string, category: StockItem['category']): StockItem => ({ id, sku, name, unit, stock, min, lastRate, supplierId, category })
const SZ = (id: string, size: string, ...a: Parameters<typeof S> extends [string, ...infer R] ? R : never): StockItem => ({ ...S(id, ...a), size })
const stock: StockItem[] = [
  S('s1', 'FRP-1054', 'FRP Pressure Vessel 10"×54"', 'Nos', 6, 4, 14500, 'sup3', 'Component'),
  S('s2', 'FRP-1465', 'FRP Pressure Vessel 14"×65"', 'Nos', 2, 4, 21800, 'sup3', 'Component'),
  S('s3', 'MEM-4040', 'RO Membrane 4040 (BW)', 'Nos', 14, 8, 17500, 'sup2', 'Component'),
  S('s4', 'MEM-8040', 'RO Membrane 8040 (BW)', 'Nos', 3, 6, 58000, 'sup2', 'Component'),
  S('s5', 'PMP-HP', 'High Pressure Pump (CRN Multistage)', 'Nos', 1, 2, 46500, 'sup1', 'Component'),
  S('s6', 'PMP-FD', 'Feed Pump Centrifugal 2HP', 'Nos', 4, 3, 9800, 'sup1', 'Component'),
  S('s7', 'VLV-MPV', 'Multiport Valve 2"', 'Nos', 5, 3, 6200, 'sup3', 'Component'),
  S('s8', 'DOS-AS', 'Dosing Pump with Tank (Antiscalant)', 'Nos', 3, 2, 7400, 'sup1', 'Component'),
  S('s9', 'CF-20', 'Cartridge Filter Housing 20" SS', 'Nos', 4, 3, 8900, 'sup3', 'Component'),
  S('s10', 'SKD-SS', 'SS 304 Skid Frame (Fabricated)', 'Nos', 0, 2, 38000, 'sup6', 'Component'),
  S('s11', 'PNL-PLC', 'Control Panel with PLC & Starters', 'Nos', 1, 2, 52000, 'sup5', 'Electrical'),
  S('s12', 'FM-DIG', 'Digital Flow Meter 1"', 'Nos', 8, 4, 3600, 'sup5', 'Electrical'),
  S('s13', 'PG-GLY', 'Pressure Gauge Glycerin 0-25 bar', 'Nos', 22, 10, 520, 'sup5', 'Electrical'),
  S('s14', 'TDS-ON', 'Online TDS Meter', 'Nos', 5, 3, 4300, 'sup5', 'Electrical'),
  S('s15', 'UV-30', 'UV Sterilizer 30 W', 'Nos', 3, 2, 12500, 'sup5', 'Component'),
  S('s16', 'OZN-1', 'Ozonator 1 gm/hr', 'Nos', 2, 2, 9800, 'sup5', 'Component'),
  S('s17', 'TNK-1000', 'Storage Tank 1000 L (Food Grade)', 'Nos', 3, 2, 5800, 'sup3', 'Component'),
  S('s18', 'PIP-UPVC2', 'UPVC Pipe 2" Schedule 80', 'Mtr', 120, 60, 310, 'sup6', 'Piping'),
  S('s19', 'PIP-SS316', 'SS 316 High-Pressure Pipe 1"', 'Mtr', 14, 20, 1250, 'sup6', 'Piping'),
  S('s20', 'VLV-SET', 'Valve & Fittings Set (UPVC)', 'Set', 5, 3, 7800, 'sup6', 'Piping'),
  S('s21', 'CBL-25', 'Copper Cable 3C × 2.5 sq mm', 'Mtr', 340, 150, 78, 'sup5', 'Electrical'),
  S('s22', 'LVL-SW', 'Level Switch (Float)', 'Nos', 9, 4, 780, 'sup5', 'Electrical'),
  S('s23', 'PRS-SW', 'Pressure Switch (Low/High)', 'Nos', 3, 4, 1450, 'sup5', 'Electrical'),
  SZ('s24', '25 kg bag', 'MED-SND', 'Graded Silica Sand Media (25 kg)', 'Bag', 30, 12, 420, 'sup4', 'Consumable'),
  SZ('s25', '25 kg bag', 'MED-ACF', 'Activated Carbon Granular (25 kg)', 'Bag', 9, 12, 2150, 'sup4', 'Consumable'),
  SZ('s26', '25 L bag', 'RES-SAC', 'Softener Resin Cation (25 L bag)', 'Bag', 14, 8, 6200, 'sup4', 'Consumable'),
  SZ('s27', '20 inch · 5 micron', 'CRT-5M', 'Filter Cartridge 5 micron 20"', 'Nos', 60, 30, 185, 'sup4', 'Consumable'),
  SZ('s28', '20 inch · 1 micron', 'CRT-1M', 'Filter Cartridge 1 micron 20"', 'Nos', 8, 20, 240, 'sup4', 'Consumable'),
  SZ('s29', '20 kg can', 'CHM-AS', 'Antiscalant Chemical (20 kg can)', 'Can', 7, 6, 4600, 'sup4', 'Consumable'),
  SZ('s30', '25 kg bag', 'CHM-SMBS', 'SMBS Dechlorinator (25 kg)', 'Bag', 4, 4, 3100, 'sup4', 'Consumable'),
  SZ('s31', '5 L can', 'CHM-NAOCL', 'Sodium Hypochlorite 5 L', 'Can', 12, 6, 340, 'sup4', 'Consumable'),
  SZ('s32', '25 L bag', 'RES-SAN', 'Anion Resin (25 L bag)', 'Bag', 3, 6, 7400, 'sup4', 'Consumable'),
  SZ('s33', 'Standard kit', 'CHM-CIP', 'Membrane CIP Cleaner Kit', 'Kit', 6, 4, 3900, 'sup4', 'Consumable'),
]

const des = (n: string, desc: string, hue: number) => ({ id: uid(), name: n, desc, hue })
const stdTerms = [
  'Prices are ex-works Ahmedabad and exclusive of freight, insurance and transit risk.',
  'Civil work, water inlet/outlet connection, drain and 3-phase 415 V power supply to be provided by client.',
  'Installation and commissioning by our engineers is included in the scope.',
  'Delivery within 4–6 weeks from receipt of advance and approved technical details.',
  'Warranty: 12 months on mechanical parts, 6 months on membranes (against manufacturing defects only).',
  'Performance is guaranteed only for the feed water quality stated in the attached water analysis report.',
  'Quotation validity: 15 days from date of issue.',
]
const products: Product[] = [
  {
    id: 'p1', code: 'IRO', name: 'Industrial RO Plant', capacity: '1000 LPH', unitLabel: 'LPH',
    designs: [des('Compact Skid – SS304', 'Single-frame stainless skid, 2-stage pre-treatment, ideal for tight spaces.', 200), des('Modular Dual Pass', 'Two-pass RO for low-TDS process water (<10 ppm).', 175), des('Heavy Duty MS-Epoxy', 'Epoxy-coated MS frame, economical for factory floors.', 25), des('Containerised Unit', '20ft container mounted turn-key plant for remote sites.', 260), des('Vertical Stack Design', 'Space saving vertical vessel arrangement.', 140)],
    bom: [{ itemId: 's1', qty: 2 }, { itemId: 's3', qty: 6 }, { itemId: 's5', qty: 1 }, { itemId: 's6', qty: 1 }, { itemId: 's7', qty: 2 }, { itemId: 's8', qty: 1 }, { itemId: 's9', qty: 1 }, { itemId: 's10', qty: 1 }, { itemId: 's11', qty: 1 }, { itemId: 's12', qty: 2 }, { itemId: 's13', qty: 6 }, { itemId: 's14', qty: 2 }, { itemId: 's18', qty: 40 }, { itemId: 's19', qty: 18 }, { itemId: 's20', qty: 1 }, { itemId: 's21', qty: 60 }, { itemId: 's22', qty: 2 }, { itemId: 's23', qty: 2 }, { itemId: 's24', qty: 4 }, { itemId: 's25', qty: 3 }, { itemId: 's27', qty: 6 }],
    quoteLines: [
      { desc: 'Pre-treatment: Multi-grade sand filter (FRP vessel, multiport valve, media)', qty: 1, unit: 'Set', rate: 62000 },
      { desc: 'Pre-treatment: Activated carbon filter (FRP vessel, multiport valve, media)', qty: 1, unit: 'Set', rate: 68000 },
      { desc: 'Antiscalant dosing system with pump & tank', qty: 1, unit: 'Set', rate: 18500 },
      { desc: 'Cartridge filter housing SS304 with 5 micron cartridges', qty: 1, unit: 'Set', rate: 24500 },
      { desc: 'High pressure pump – CRN multistage', qty: 1, unit: 'Nos', rate: 68000 },
      { desc: 'RO membranes with FRP housings (4040 BW)', qty: 6, unit: 'Nos', rate: 26000 },
      { desc: 'SS304 skid, SS316 HP piping, valves & instrumentation', qty: 1, unit: 'Set', rate: 142000 },
      { desc: 'PLC based control panel with auto flush & protection', qty: 1, unit: 'Nos', rate: 78000 },
      { desc: 'Installation, commissioning and operator training', qty: 1, unit: 'Lot', rate: 45000 },
    ],
    terms: stdTerms, guarantee: { outTds: 30, recovery: 70, flow: '1000 LPH' },
  },
  {
    id: 'p2', code: 'MWP', name: 'Mineral Water Plant', capacity: '2000 LPH', unitLabel: 'LPH',
    designs: [des('Bottling Line Ready', 'Output manifold ready for rinsing-filling-capping line.', 195), des('Jar Filling (20 L)', 'Optimised for 20-litre jar refill operations.', 215), des('Premium SS Enclosure', 'Fully enclosed stainless steel cabinet design.', 230)],
    bom: [{ itemId: 's1', qty: 3 }, { itemId: 's3', qty: 8 }, { itemId: 's5', qty: 1 }, { itemId: 's6', qty: 1 }, { itemId: 's7', qty: 3 }, { itemId: 's8', qty: 1 }, { itemId: 's9', qty: 2 }, { itemId: 's10', qty: 1 }, { itemId: 's11', qty: 1 }, { itemId: 's12', qty: 2 }, { itemId: 's13', qty: 8 }, { itemId: 's14', qty: 2 }, { itemId: 's15', qty: 1 }, { itemId: 's16', qty: 1 }, { itemId: 's17', qty: 2 }, { itemId: 's18', qty: 50 }, { itemId: 's19', qty: 24 }, { itemId: 's20', qty: 1 }, { itemId: 's21', qty: 80 }, { itemId: 's24', qty: 5 }, { itemId: 's25', qty: 4 }, { itemId: 's28', qty: 8 }],
    quoteLines: [
      { desc: 'Raw water feed pump & pre-treatment (sand + carbon + softener)', qty: 1, unit: 'Set', rate: 195000 },
      { desc: 'Cartridge filtration 5 & 1 micron', qty: 1, unit: 'Set', rate: 32000 },
      { desc: 'RO system 2000 LPH – membranes, HP pump, SS skid, panel', qty: 1, unit: 'Set', rate: 485000 },
      { desc: 'Ozonator and UV sterilizer', qty: 1, unit: 'Set', rate: 46000 },
      { desc: 'SS storage tanks and product transfer piping', qty: 1, unit: 'Lot', rate: 52000 },
      { desc: 'Installation, commissioning, BIS-support documentation & training', qty: 1, unit: 'Lot', rate: 60000 },
    ],
    terms: stdTerms, guarantee: { outTds: 25, recovery: 60, flow: '2000 LPH' },
  },
  {
    id: 'p3', code: 'DMP', name: 'DM / Demineralisation Plant', capacity: '5 m³/hr', unitLabel: 'm³/hr',
    designs: [des('Twin Bed (Cation + Anion)', 'Standard two-bed DM with degasser.', 280), des('Mixed Bed Polisher', 'Twin-bed plus mixed-bed polisher for <1 µS/cm.', 300), des('Compact Skid Mounted', 'Skid mounted ion-exchange unit.', 320), des('Auto Regeneration PLC', 'Fully automatic regeneration with acid/alkali dosing.', 345)],
    bom: [{ itemId: 's2', qty: 4 }, { itemId: 's7', qty: 4 }, { itemId: 's6', qty: 2 }, { itemId: 's9', qty: 1 }, { itemId: 's11', qty: 1 }, { itemId: 's13', qty: 6 }, { itemId: 's14', qty: 2 }, { itemId: 's18', qty: 60 }, { itemId: 's20', qty: 2 }, { itemId: 's21', qty: 50 }, { itemId: 's24', qty: 6 }, { itemId: 's25', qty: 6 }, { itemId: 's26', qty: 10 }, { itemId: 's32', qty: 8 }],
    quoteLines: [
      { desc: 'Pressure sand filter & activated carbon filter', qty: 1, unit: 'Set', rate: 220000 },
      { desc: 'Cation exchanger with resin & distributor', qty: 1, unit: 'Nos', rate: 185000 },
      { desc: 'Anion exchanger with resin & distributor', qty: 1, unit: 'Nos', rate: 215000 },
      { desc: 'Degasser tower and transfer pump', qty: 1, unit: 'Set', rate: 98000 },
      { desc: 'Acid / alkali regeneration system, piping & valves', qty: 1, unit: 'Lot', rate: 145000 },
      { desc: 'Control panel, instrumentation & online conductivity meter', qty: 1, unit: 'Lot', rate: 112000 },
      { desc: 'Installation, commissioning & training', qty: 1, unit: 'Lot', rate: 55000 },
    ],
    terms: stdTerms, guarantee: { outTds: 5, recovery: 95, flow: '5 m³/hr' },
  },
  {
    id: 'p4', code: 'UFS', name: 'Ultrafiltration (UF) System', capacity: '3 m³/hr', unitLabel: 'm³/hr',
    designs: [des('Hollow Fibre – Vertical', 'Vertical UF module with auto backwash.', 160), des('Hollow Fibre – Horizontal', 'Horizontal skid for low headroom.', 150), des('Dual Module Redundant', 'Two parallel modules for continuous operation.', 185)],
    bom: [{ itemId: 's6', qty: 2 }, { itemId: 's9', qty: 2 }, { itemId: 's11', qty: 1 }, { itemId: 's12', qty: 2 }, { itemId: 's13', qty: 6 }, { itemId: 's18', qty: 30 }, { itemId: 's20', qty: 1 }, { itemId: 's21', qty: 40 }, { itemId: 's22', qty: 2 }, { itemId: 's27', qty: 4 }, { itemId: 's31', qty: 2 }],
    quoteLines: [
      { desc: 'UF membrane module with SS skid', qty: 1, unit: 'Set', rate: 265000 },
      { desc: 'Feed & backwash pumps', qty: 1, unit: 'Set', rate: 64000 },
      { desc: 'Auto valves, piping & instrumentation', qty: 1, unit: 'Lot', rate: 92000 },
      { desc: 'PLC panel with CEB dosing', qty: 1, unit: 'Nos', rate: 86000 },
      { desc: 'Installation & commissioning', qty: 1, unit: 'Lot', rate: 38000 },
    ],
    terms: stdTerms, guarantee: { outTds: 0, recovery: 92, flow: '3 m³/hr' },
  },
  {
    id: 'p5', code: 'SFT', name: 'Water Softener Plant', capacity: '4 m³/hr', unitLabel: 'm³/hr',
    designs: [des('Duplex Auto Softener', 'Twin alternating vessels, continuous soft water.', 90), des('Simplex Manual', 'Single vessel economy model.', 60), des('Brine Tank Integrated', 'Compact unit with integrated brine tank.', 110)],
    bom: [{ itemId: 's1', qty: 2 }, { itemId: 's7', qty: 2 }, { itemId: 's6', qty: 1 }, { itemId: 's13', qty: 4 }, { itemId: 's18', qty: 25 }, { itemId: 's20', qty: 1 }, { itemId: 's21', qty: 25 }, { itemId: 's26', qty: 4 }, { itemId: 's17', qty: 1 }],
    quoteLines: [
      { desc: 'FRP softener vessels with auto multiport valves', qty: 2, unit: 'Nos', rate: 68000 },
      { desc: 'Cation resin charge', qty: 1, unit: 'Lot', rate: 31000 },
      { desc: 'Brine tank, injector & piping', qty: 1, unit: 'Set', rate: 28000 },
      { desc: 'Installation & commissioning', qty: 1, unit: 'Lot', rate: 22000 },
    ],
    terms: stdTerms, guarantee: { outTds: 0, recovery: 98, flow: '4 m³/hr' },
  },
]

const users = [
  { id: 'u1', name: 'Rajesh Mehta', email: 'admin@aquaflow.in', password: 'admin123', role: 'Admin' as const, phone: '9825012345' },
  { id: 'u2', name: 'Amit Shah', email: 'amit@aquaflow.in', password: 'sales123', role: 'Sales' as const, phone: '9825011001' },
  { id: 'u3', name: 'Priya Desai', email: 'priya@aquaflow.in', password: 'sales123', role: 'Sales' as const, phone: '9825011002' },
  { id: 'u4', name: 'Karan Patel', email: 'karan@aquaflow.in', password: 'sales123', role: 'Sales' as const, phone: '9825011003' },
  { id: 'u5', name: 'Nilesh Joshi', email: 'nilesh@aquaflow.in', password: 'design123', role: 'Design' as const, phone: '9825011004' },
  { id: 'u6', name: 'Hemant Solanki', email: 'hemant@aquaflow.in', password: 'stores123', role: 'Stores' as const, phone: '9825011005' },
  { id: 'u7', name: 'Vijay Chauhan', email: 'vijay@aquaflow.in', password: 'factory123', role: 'Factory' as const, phone: '9825011006' },
  { id: 'u8', name: 'Imran Qureshi', email: 'imran@aquaflow.in', password: 'service123', role: 'Service' as const, phone: '9825011007' },
]

const W = (source: string, tds: number, ph = 7.4, hard = 0, extra: Partial<Water> = {}): Water => ({
  source, ph: String(ph), tds: String(tds), hardness: String(hard || Math.round(tds * 0.45)), chlorides: String(Math.round(tds * 0.28)), sulphates: String(Math.round(tds * 0.12)),
  iron: '0.2', turbidity: '2', silica: '14', temperature: '28', ...extra,
})
const noWater = (): Water => ({ source: '', ph: '', tds: '', hardness: '', chlorides: '', sulphates: '', iron: '', turbidity: '', silica: '', temperature: '' })

let inqN = 0
const FU = (type: FollowUp['type'], ago: number, note: string, by: string, next?: number): FollowUp => ({ id: uid(), type, date: d(-ago), note, by, nextDate: next === undefined ? undefined : d(next) })
const I = (company: string, contact: string, phone: string, city: string, source: string, productId: string, capacity: string, req: string, assignedTo: string, stage: Stage, value: number, ago: number, water: Water, fus: FollowUp[], next?: number): Inquiry => {
  inqN++
  return { id: 'inq' + inqN, no: `INQ-2026-${String(100 + inqN).padStart(4, '0')}`, date: d(-ago), company, contact, phone, email: contact.split(' ')[0].toLowerCase() + '@' + company.toLowerCase().replace(/[^a-z]/g, '').slice(0, 10) + '.com', city, source, productId, capacity, requirement: req, assignedTo, stage, value, followUps: fus, nextFollowUp: next === undefined ? undefined : d(next), water }
}

const inquiries: Inquiry[] = [
  I('Sunrise Pharma Pvt Ltd', 'Dr. Ketan Parikh', '9879012345', 'Ahmedabad', 'IndiaMART', 'p1', '2000 LPH', 'Process water for tablet coating, need low TDS output.', 'u2', 'Water Report Received', 780000, 3, W('Borewell', 1450, 7.6), [FU('Call', 3, 'Discussed requirement, asked for water report.', 'Amit Shah', 1), FU('Email', 1, 'Water report received on email.', 'Amit Shah', 0)], 0),
  I('Gujarat Dairy Cooperative', 'Mahesh Bhai Rabari', '9825566123', 'Mehsana', 'Door-to-door', 'p3', '5 m³/hr', 'Boiler feed DM water for dairy plant.', 'u3', 'Quoted', 1050000, 9, W('Canal + Borewell', 880, 7.8), [FU('Meeting', 9, 'Site visit completed.', 'Priya Desai', 3), FU('Call', 4, 'Quotation shared; they will discuss with management.', 'Priya Desai', -1)], -1),
  I('Blue Drop Beverages', 'Sandeep Rathod', '9898123400', 'Rajkot', 'TradeIndia', 'p2', '2000 LPH', 'New packaged drinking water unit – BIS requirement.', 'u4', 'Negotiation', 1020000, 14, W('Borewell', 1100, 7.2), [FU('Call', 6, 'Asked for 5% discount.', 'Karan Patel', 2), FU('WhatsApp', 2, 'Sent revised commercials.', 'Karan Patel', 0)], 0),
  I('Zenith Textile Mills', 'Hardik Modi', '9726011122', 'Surat', 'IndiaMART', 'p1', '5000 LPH', 'Dyeing unit process water; hard water scale problem.', 'u2', 'Contacted', 1650000, 2, noWater(), [FU('Call', 2, 'Requested water analysis report.', 'Amit Shah', 1)], 1),
  I('Kalpataru Hospital Trust', 'Mrs. Nandini Shah', '9825090012', 'Vadodara', 'Reference', 'p5', '4 m³/hr', 'Softener for dialysis & laundry section.', 'u3', 'New', 360000, 0, noWater(), [], 0),
  I('Om Sai Food Products', 'Jignesh Kakadiya', '9909988776', 'Morbi', 'JustDial', 'p2', '1000 LPH', 'Mineral water for snack factory canteen & process.', 'u4', 'Contacted', 620000, 5, noWater(), [FU('WhatsApp', 5, 'Shared brochure.', 'Karan Patel', -2)], -2),
  I('Apex Chemicals Ltd', 'Rakesh Trivedi', '9879455667', 'Ankleshwar', 'Website', 'p3', '10 m³/hr', 'High purity DM water for chemical reaction.', 'u2', 'Water Report Received', 1850000, 6, W('Municipal + Borewell', 620, 7.1), [FU('Email', 6, 'Sent preliminary offer details.', 'Amit Shah', 2)], 2),
  I('Riverside Resort & Spa', 'Anjali Sharma', '9427011223', 'Udaipur', 'Exhibition', 'p4', '3 m³/hr', 'UF treatment for lake water before RO.', 'u3', 'Quoted', 640000, 11, W('Lake', 420, 7.9, 260, { turbidity: '18' }), [FU('Call', 7, 'Quotation emailed.', 'Priya Desai', 1)], 1),
  I('Shakti Engineering Works', 'Bhavin Dave', '9724433221', 'Rajkot', 'IndiaMART', 'p1', '1000 LPH', 'Boiler & cooling tower make-up RO.', 'u4', 'Won', 720000, 25, W('Borewell', 1250, 7.5), [FU('Call', 12, 'PO received.', 'Karan Patel')]),
  I('Madhuram Ice Cream', 'Chirag Panchal', '9898776655', 'Gandhinagar', 'TradeIndia', 'p2', '3000 LPH', 'Ice cream plant process water.', 'u2', 'Lost', 1250000, 30, W('Borewell', 980), [FU('Call', 20, 'Went with a local vendor on price.', 'Amit Shah')]),
  I('Tirth Hospitals', 'Dr. Mehul Joshi', '9825700011', 'Bhavnagar', 'Reference', 'p1', '1500 LPH', 'RO water for sterilisation unit.', 'u3', 'New', 880000, 1, noWater(), [], 0),
  I('Navrang Paper Mills', 'Dinesh Gupta', '9879800900', 'Vapi', 'Door-to-door', 'p5', '8 m³/hr', 'Softener for boiler feed.', 'u4', 'Contacted', 520000, 4, noWater(), [FU('Meeting', 4, 'Visited factory, boiler capacity 6 TPH.', 'Karan Patel', 0)], 0),
  I('Pushp Agro Foods', 'Vimal Bhai Patel', '9726655443', 'Anand', 'IndiaMART', 'p4', '5 m³/hr', 'UF for pre-treatment of well water.', 'u2', 'New', 780000, 0, noWater(), [], 1),
  I('Silverline Auto Components', 'Gaurav Singh', '9898123123', 'Sanand', 'Website', 'p1', '3000 LPH', 'Washing line & paint shop pre-treatment.', 'u3', 'Quoted', 1200000, 8, W('Borewell', 1620, 7.4), [FU('Email', 8, 'Quote sent.', 'Priya Desai', -3)], -3),
  I('Harmony Cold Storage', 'Yogesh Solanki', '9909012121', 'Deesa', 'JustDial', 'p5', '2 m³/hr', 'Softener for ammonia condenser.', 'u4', 'Water Report Received', 290000, 5, W('Borewell', 1800, 7.8, 920), [FU('Call', 5, 'Got report on WhatsApp.', 'Karan Patel', 1)], 1),
  I('Heritage Chemicals & Dyes', 'Anil Kumar', '9879011010', 'Vatva GIDC', 'IndiaMART', 'p3', '5 m³/hr', 'DM plant for dye intermediates.', 'u2', 'Won', 1100000, 40, W('Borewell', 760), [FU('Call', 30, 'Order confirmed.', 'Amit Shah')]),
]

const ratios = { advance: 40, delivery: 50, commissioning: 10 }
let qN = 0
const mkQuote = (inq: Inquiry, status: Quotation['status'], ago: number, discount = 0, mult = 1): Quotation => {
  const p = products.find(x => x.id === inq.productId)!
  qN++
  return {
    id: 'q' + qN, no: `QT/2026-27/${String(200 + qN).padStart(4, '0')}`, inquiryId: inq.id, date: d(-ago), validTill: d(-ago + 15), status,
    company: inq.company, contact: inq.contact, phone: inq.phone, email: inq.email, city: inq.city, productId: p.id, capacity: inq.capacity,
    water: inq.water, lines: p.quoteLines.map(l => ({ ...l, rate: Math.round(l.rate * mult) })), terms: [...p.terms], gst: 18, discount, guarantee: { ...p.guarantee }, payment: { ...ratios },
    preparedBy: users.find(u => u.id === inq.assignedTo)!.name,
  }
}
const q1 = mkQuote(inquiries[1], 'Sent', 8, 0, 1.05)
const q2 = mkQuote(inquiries[2], 'Sent', 12, 3)
const q3 = mkQuote(inquiries[7], 'Sent', 10)
const q4 = mkQuote(inquiries[13], 'Sent', 7, 0, 1.2)
const q5 = mkQuote(inquiries[8], 'Accepted', 24, 2)       // won – to be converted to PRJ-039 live
const q6 = mkQuote(inquiries[15], 'Accepted', 38, 0, 1.15) // PRJ-038
const q7 = mkQuote(inquiries[9], 'Rejected', 28)
const q8 = mkQuote(inquiries[0], 'Draft', 0, 0, 1.4)

const mkMilestones = (q: Quotation, received: number): Milestone[] => {
  const t = quoteTotals(q).total
  const rows: [string, number][] = [['Advance with Purchase Order', q.payment.advance], ['Against Delivery / Dispatch', q.payment.delivery], ['After Installation & Commissioning', q.payment.commissioning]]
  return rows.map(([label, percent], i) => ({ id: uid(), label, percent, amount: Math.round((t * percent) / 100), status: i < received ? 'Received' : 'Pending', receivedOn: i < received ? d(-20 + i * 5) : undefined }))
}

interface PSeed { n: number; inq: Inquiry; status: PStatus; ago: number; received: number; mult: number; q?: Quotation; poNo: string }
const mkProject = ({ n, inq, status, ago, received, mult, q, poNo }: PSeed): Project => {
  const quote = q || mkQuote(inq, 'Accepted', ago + 5, 0, mult)
  const p = products.find(x => x.id === inq.productId)!
  return {
    id: 'prj' + n, code: `PRJ-${String(n).padStart(3, '0')}`, quotationId: quote.id, inquiryId: inq.id, poNo, orderDate: d(-ago), deliveryDate: d(-ago + 42),
    company: inq.company, contact: inq.contact, phone: inq.phone, email: inq.email, city: inq.city, productId: p.id, capacity: inq.capacity,
    value: Math.round(quoteTotals(quote).total), status, owner: inq.assignedTo, payments: mkMilestones(quote, received), boq: genBoq(p), boqGenerated: true,
    updates: [], voiceNotes: [], consumables: [],
  }
}

// seeded projects
const inqExtra = (id: string, productId: string, capacity: string, company: string, contact: string, phone: string, city: string, assignedTo: string, w: Water, value: number): Inquiry => {
  inqN++
  return { id, no: `INQ-2026-${String(100 + inqN).padStart(4, '0')}`, date: d(-90), company, contact, phone, email: 'accounts@' + company.toLowerCase().replace(/[^a-z]/g, '').slice(0, 9) + '.com', city, source: 'Reference', productId, capacity, requirement: 'Completed project.', assignedTo, stage: 'Won', value, followUps: [], water: w }
}
const iA = inqExtra('inqA', 'p1', '3000 LPH', 'Patel Brothers Foods Pvt Ltd', 'Hitesh Patel', '9825034567', 'Nadiad', 'u2', W('Borewell', 1380), 1150000)
const iB = inqExtra('inqB', 'p2', '2000 LPH', 'Aqua Gold Beverages', 'Naresh Rathi', '9879034001', 'Surendranagar', 'u4', W('Borewell', 940), 980000)
const iC = inqExtra('inqC', 'p3', '5 m³/hr', 'Deepak Fertilizers Unit-3', 'S. K. Iyer', '9898034555', 'Bharuch', 'u3', W('River', 540), 1380000)
const iD = inqExtra('inqD', 'p1', '1000 LPH', 'Mahavir Plastics', 'Kamlesh Jain', '9724034777', 'Kalol', 'u2', W('Borewell', 1210), 690000)
const allInq = [...inquiries, iA, iB, iC, iD]

const prj034 = mkProject({ n: 34, inq: iA, status: 'Commissioned', ago: 95, received: 3, mult: 1.1, poNo: 'PBF/PO/2026/118' })
const prj035 = mkProject({ n: 35, inq: iB, status: 'Dispatched', ago: 55, received: 2, mult: 1.05, poNo: 'AGB/2026/041' })
const prj036 = mkProject({ n: 36, inq: iC, status: 'In Production', ago: 28, received: 1, mult: 1.2, poNo: 'DF3/PUR/7782' })
const prj037 = mkProject({ n: 37, inq: iD, status: 'Procurement', ago: 12, received: 1, mult: 1, poNo: 'MP-PO-209' })
const prj038 = mkProject({ n: 38, inq: inquiries[15], status: 'Order Confirmed', ago: 4, received: 1, mult: 1.15, q: q6, poNo: 'HCD/25-26/0554' })

// project 34: commissioned, with full history
const imgs = (label: string, hue: number, st: number) => ({ id: uid(), src: placeholderPhoto(label, hue, st), caption: label })
prj034.designId = products[0].designs[0].id
prj034.updates = [
  { id: uid(), date: d(-80), progress: 30, note: 'Skid fabrication complete, vessels mounted.', by: 'Vijay Chauhan', photos: [imgs('PRJ-034 · Skid fabrication', 200, 1)], sharedWithClient: true },
  { id: uid(), date: d(-70), progress: 100, note: 'Plant fully assembled, pressure tested and trial run done.', by: 'Vijay Chauhan', photos: [imgs('PRJ-034 · Final assembly', 200, 4)], sharedWithClient: true },
]
prj034.dispatch = { date: d(-62), vehicle: 'GJ-01-DX-4521', transporter: 'Shreeji Roadlines', lrNo: 'SRL/884521', driver: 'Ramesh Thakor', destination: 'Nadiad, Gujarat', items: [{ desc: 'Industrial RO Plant 3000 LPH – complete skid', qty: 1, unit: 'Set' }, { desc: 'Pre-treatment pressure vessels', qty: 2, unit: 'Nos' }, { desc: 'Control panel with PLC', qty: 1, unit: 'Nos' }, { desc: 'Spare cartridges & O-ring kit', qty: 1, unit: 'Kit' }], photos: [imgs('PRJ-034 · Loaded on truck', 200, 4)], invoiceNo: 'INV/26-27/0412', ewayNo: '281004517896', ewayValidTill: d(-60), remarks: 'Delivered in good condition.' }
prj034.commissioning = { date: d(-55), engineer: 'Imran Qureshi', siteEngineer: 'Hitesh Patel', siteDesignation: 'Plant Manager', params: { inTds: '1380', outTds: '24', inPressure: '3.2', outPressure: '12.5', flow: '3050', recovery: '71', ph: '7.1', power: '7.4' }, remarks: 'Plant commissioned successfully. Operator trained. Output well within guaranteed values.', photos: [imgs('PRJ-034 · Commissioned at site', 200, 4)], emailed: true }
prj034.consumables = [
  { id: uid(), itemId: 's27', qty: 6, intervalDays: 30, lastSupplied: d(-24), history: [{ date: d(-54), qty: 6, note: 'First fill at commissioning' }, { date: d(-24), qty: 6 }] },
  { id: uid(), itemId: 's29', qty: 1, intervalDays: 30, lastSupplied: d(-27), history: [{ date: d(-57), qty: 1 }, { date: d(-27), qty: 1 }] },
  { id: uid(), itemId: 's25', qty: 3, intervalDays: 180, lastSupplied: d(-55), history: [{ date: d(-55), qty: 3, note: 'Media at commissioning' }] },
]
prj035.designId = products[1].designs[1].id
prj035.updates = [
  { id: uid(), date: d(-40), progress: 60, note: 'RO skid and pre-treatment assembled.', by: 'Vijay Chauhan', photos: [imgs('PRJ-035 · 60% assembled', 215, 2)], sharedWithClient: true },
  { id: uid(), date: d(-26), progress: 100, note: 'Testing complete. Ready for dispatch.', by: 'Vijay Chauhan', photos: [imgs('PRJ-035 · Test run', 215, 4)] },
]
prj035.dispatch = { date: d(-4), vehicle: 'GJ-13-AT-7782', transporter: 'Balaji Transport', lrNo: 'BT/55120', driver: 'Mukesh Solanki', destination: 'Surendranagar, Gujarat', items: [{ desc: 'Mineral Water Plant 2000 LPH – complete', qty: 1, unit: 'Set' }, { desc: 'Storage tanks 1000 L', qty: 2, unit: 'Nos' }, { desc: 'UV sterilizer & ozonator', qty: 1, unit: 'Set' }], photos: [imgs('PRJ-035 · Dispatch loading', 215, 4)], invoiceNo: 'INV/26-27/0467', ewayNo: '281004966122', ewayValidTill: d(1), remarks: '' }
prj035.consumables = [{ id: uid(), itemId: 's27', qty: 4, intervalDays: 25, lastSupplied: d(-4), history: [{ date: d(-4), qty: 4, note: 'Supplied with dispatch' }] }, { id: uid(), itemId: 's25', qty: 4, intervalDays: 120, lastSupplied: d(-4), history: [{ date: d(-4), qty: 4 }] }]
prj036.designId = products[2].designs[0].id
prj036.updates = [
  { id: uid(), date: d(-16), progress: 25, note: 'Cutting & fabrication of exchanger vessels started.', by: 'Vijay Chauhan', photos: [imgs('PRJ-036 · Fabrication', 280, 1)], sharedWithClient: true },
  { id: uid(), date: d(-5), progress: 60, note: 'Cation and anion vessels erected. Piping 50% done.', by: 'Vijay Chauhan', photos: [imgs('PRJ-036 · 60% complete', 280, 3), imgs('PRJ-036 · Piping work', 280, 2)] },
]
prj036.voiceNotes = []
prj036.boq = prj036.boq.map(b => ({ ...b, issued: true }))
prj037.boq = prj037.boq.map(b => ({ ...b }))

prj034.installation = { team: ['u8'], scheduledDate: d(-57), siteAddress: 'Patel Brothers Foods Pvt Ltd, GIDC Nadiad, Gujarat', siteContact: 'Hitesh Patel', sitePhone: '9825034567', status: 'Completed', notes: 'Power & raw water connection ready at site.', photos: [imgs('PRJ-034 · Site installation', 200, 3)] }
prj034.commissioning!.feedback = 'Smooth installation. Output quality is excellent.'; prj034.commissioning!.rating = 5
prj035.installation = { team: ['u8', 'u7'], scheduledDate: d(3), siteAddress: 'Aqua Gold Beverages, Surendranagar, Gujarat', siteContact: 'Naresh Rathi', sitePhone: '9879034001', status: 'Scheduled', notes: 'Civil platform ready. 3-phase supply to be confirmed.', photos: [] }
prj034.supplyOrders = [{ id: uid(), no: 'SUP/26-27/0001', date: d(-24), status: 'Supplied', suppliedOn: d(-24), lines: [{ planId: prj034.consumables[0].id, itemId: 's27', qty: 6 }, { planId: prj034.consumables[1].id, itemId: 's29', qty: 1 }], note: 'Monthly consumables' }]
prj034.expectedCompletion = d(-70); prj035.expectedCompletion = d(-26); prj036.expectedCompletion = d(12)
const pos = [
  { id: 'po1', no: 'PO/26-27/0188', supplierId: 'sup3', projectId: 'prj37', date: d(-8), status: 'Received' as const, lines: [{ itemId: 's1', name: 'FRP Pressure Vessel 10"×54"', unit: 'Nos', qty: 2, rate: 14200, lastRate: 14200 }], notes: 'Deliver at Vatva factory gate.' },
  { id: 'po2', no: 'PO/26-27/0191', supplierId: 'sup1', projectId: 'prj37', date: d(-2), status: 'Sent' as const, lines: [{ itemId: 's5', name: 'High Pressure Pump (CRN Multistage)', unit: 'Nos', qty: 1, rate: 46500, lastRate: 46500 }], notes: 'Urgent – needed within 5 days.' },
]

export function makeSeed(): DB {
  const events: DB['events'] = []
  const ev = (ago: number, text: string, kind: DB['events'][0]['kind'], projectId?: string) => events.push({ id: uid(), ts: new Date(Date.now() - ago * 86400000).toISOString(), text, kind, projectId })
  ev(95, 'Order received from Patel Brothers Foods (PO PBF/PO/2026/118) – project PRJ-034 created', 'order', 'prj34')
  ev(80, 'Production update 30% shared with client', 'production', 'prj34')
  ev(62, 'Dispatched via Shreeji Roadlines – Invoice INV/26-27/0412, E-way bill generated', 'dispatch', 'prj34')
  ev(55, 'Installation & commissioning completed; report emailed to client', 'install', 'prj34')
  ev(24, 'Consumables supplied – 6 × Filter Cartridge 5 micron', 'consumable', 'prj34')
  ev(4, 'Order received from Heritage Chemicals & Dyes – project PRJ-038 created', 'order', 'prj38')
  ev(2, 'PO/26-27/0191 sent to Shree Ganesh Pumps & Motors', 'po', 'prj37')
  return {
    v: 1,
    company: { name: 'AquaFlow Engineering Pvt. Ltd.', tagline: 'Industrial Water Treatment & RO Plant Manufacturers', address: 'Plot 214, Phase-II, GIDC Vatva, Ahmedabad – 382445, Gujarat', gstin: '24AAECA4821M1Z5', phone: '+91 79 4010 2233', email: 'sales@aquaflow.in', bank: 'HDFC Bank · A/c 50200012345678 · IFSC HDFC0000123 · Vatva Branch' },
    users, products, stock, suppliers, inquiries: allInq, quotations: [q1, q2, q3, q4, q5, q6, q7, q8], projects: [prj034, prj035, prj036, prj037, prj038], pos, events, movements: [
      { id: uid(), ts: new Date(Date.now() - 8 * 86400000).toISOString(), itemId: 's1', qty: 2, type: 'Receipt', ref: 'PO/26-27/0188', by: 'Hemant Solanki' },
      { id: uid(), ts: new Date(Date.now() - 20 * 86400000).toISOString(), itemId: 's3', qty: -8, type: 'Issue', ref: 'PRJ-036', by: 'Hemant Solanki' },
      { id: uid(), ts: new Date(Date.now() - 24 * 86400000).toISOString(), itemId: 's27', qty: -6, type: 'Consumable supply', ref: 'SUP/26-27/0001 · PRJ-034', by: 'Hemant Solanki' },
      { id: uid(), ts: new Date(Date.now() - 30 * 86400000).toISOString(), itemId: 's25', qty: 12, type: 'Adjustment', ref: 'Physical stock verification', by: 'Hemant Solanki' },
    ],
    counters: { inquiry: 120, quote: 210, project: 38, po: 191, invoice: 467, eway: 1 },
  }
}
