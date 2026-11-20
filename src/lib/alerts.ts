import { useMemo } from 'react'
import { useApp } from '../store'
import { addDays, daysBetween, today } from './utils'
import { paidOf } from './calc'

export const REMIND_BEFORE = 5
export function useAlerts() {
  const { db } = useApp()
  return useMemo(() => {
    const t = today()
    const followUps = db.inquiries.filter(i => i.nextFollowUp && i.nextFollowUp <= t && i.stage !== 'Won' && i.stage !== 'Lost').sort((a, b) => a.nextFollowUp!.localeCompare(b.nextFollowUp!))
    const consumables = db.projects.flatMap(p => p.consumables.map(c => {
      const due = addDays(c.lastSupplied, c.intervalDays)
      const left = daysBetween(t, due)
      return { project: p, plan: c, due, left, item: db.stock.find(s => s.id === c.itemId) }
    })).filter(x => x.left <= REMIND_BEFORE).sort((a, b) => a.left - b.left)
    const lowStock = db.stock.filter(s => s.stock < s.min)
    const pendingPay = db.projects.flatMap(p => p.payments.filter(m => m.status !== 'Received').map(m => ({ project: p, m, due: m.amount - paidOf(m) })))
    return { followUps, consumables, lowStock, pendingPay, total: followUps.length + consumables.length }
  }, [db])
}
