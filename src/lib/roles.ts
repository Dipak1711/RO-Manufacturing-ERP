import type { Role } from '../types'
export const roleLabel: Record<Role, string> = { Admin: 'Admin / Management', Sales: 'Salesperson', Design: 'Designer', Stores: 'Purchase / Store', Factory: 'Factory Engineer', Service: 'Installation Engineer' }
export const roleHome: Record<Role, string> = { Admin: '/', Sales: '/', Stores: '/', Factory: '/production', Service: '/installations', Design: '/designs' }
export const navAccess: Record<Role, string[]> = {
  Admin: ['/', '/inquiries', '/quotations', '/projects', '/production', '/designs', '/dispatches', '/installations', '/stock', '/purchase', '/consumables', '/settings'],
  Sales: ['/', '/inquiries', '/quotations', '/projects', '/production', '/dispatches', '/consumables'],
  Design: ['/designs', '/production', '/projects'],
  Stores: ['/', '/projects', '/stock', '/purchase', '/dispatches', '/consumables'],
  Factory: ['/production', '/projects', '/dispatches', '/designs'],
  Service: ['/installations', '/projects', '/consumables', '/dispatches'],
}
export type PTab = 'overview' | 'sales' | 'boq' | 'production' | 'dispatch' | 'install' | 'consumables' | 'payments' | 'timeline'
export const tabAccess: Record<Role, PTab[]> = {
  Admin: ['overview', 'sales', 'boq', 'production', 'dispatch', 'install', 'consumables', 'payments', 'timeline'],
  Sales: ['overview', 'sales', 'production', 'dispatch', 'install', 'consumables', 'payments', 'timeline'],
  Design: ['overview', 'production'],
  Stores: ['overview', 'boq', 'dispatch', 'consumables', 'timeline'],
  Factory: ['overview', 'boq', 'production', 'dispatch'],
  Service: ['overview', 'dispatch', 'install', 'consumables', 'timeline'],
}
export const can = {
  editRates: (r: Role) => r === 'Admin' || r === 'Stores',
  manageDesigns: (r: Role) => r === 'Admin' || r === 'Design',
  postProduction: (r: Role) => r === 'Admin' || r === 'Factory',
  voice: (r: Role) => r === 'Admin' || r === 'Factory' || r === 'Design',
  install: (r: Role) => r === 'Admin' || r === 'Service',
  payments: (r: Role) => r === 'Admin' || r === 'Sales',
}
