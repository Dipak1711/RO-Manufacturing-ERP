import { useLayoutEffect, useRef } from 'react'

/* FLIP animation: when `signal` changes, every `[data-flip]` child glides from
   its old position to its new one, so a card dropped into another lane travels
   there instead of teleporting. Skipped for users who prefer reduced motion. */
export function useFlip<T extends HTMLElement>(signal: string) {
  const ref = useRef<T | null>(null)
  const positions = useRef(new Map<string, { x: number; y: number }>())

  useLayoutEffect(() => {
    const root = ref.current
    if (!root) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const box = root.getBoundingClientRect()
    const next = new Map<string, { x: number; y: number }>()
    root.querySelectorAll<HTMLElement>('[data-flip]').forEach(el => {
      const id = el.dataset.flip as string
      const rect = el.getBoundingClientRect()
      const pos = { x: rect.left - box.left + root.scrollLeft, y: rect.top + window.scrollY }
      next.set(id, pos)
      const prev = positions.current.get(id)
      if (!prev || reduce) return
      const dx = prev.x - pos.x, dy = prev.y - pos.y
      if (Math.abs(dx) < 2 && Math.abs(dy) < 2) return
      // Lift the card's lane above its neighbours while it travels across them.
      const layer = el.closest<HTMLElement>('[data-flip-layer]')
      if (layer) layer.style.zIndex = '20'
      const a = el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }], { duration: 420, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' })
      a.onfinish = a.oncancel = () => { if (layer) layer.style.zIndex = '' }
    })
    positions.current = next
  }, [signal])

  return ref
}
