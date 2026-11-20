import type { Tone } from '../components/ui'
export const stageTone: Record<string, Tone> = { New: 'blue', Contacted: 'indigo', 'Water Report Received': 'purple', Quoted: 'amber', Negotiation: 'teal', Won: 'green', Lost: 'red' }
export const projTone: Record<string, Tone> = { 'Order Confirmed': 'blue', Procurement: 'amber', 'In Production': 'purple', 'Ready for Dispatch': 'teal', Dispatched: 'indigo', Commissioned: 'green' }
export const quoteTone: Record<string, Tone> = { Draft: 'slate', Sent: 'blue', Accepted: 'green', Rejected: 'red' }
