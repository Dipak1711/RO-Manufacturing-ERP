import { useEffect, useRef, useState } from 'react'
import { Camera, Mic, Square, Trash2, X, Upload } from 'lucide-react'
import type { Photo } from '../types'
import { compressImage, uid } from '../lib/utils'
import { Button } from './ui'
import { useApp } from '../store'

export function PhotoUploader({ photos, onChange, label = 'Add photos', max = 8 }: { photos: Photo[]; onChange: (p: Photo[]) => void; label?: string; max?: number }) {
  const ref = useRef<HTMLInputElement>(null)
  const [view, setView] = useState<Photo | null>(null)
  const add = async (files: FileList | null) => {
    if (!files) return
    const out: Photo[] = []
    for (const f of Array.from(files).slice(0, max - photos.length)) out.push({ id: uid(), src: await compressImage(f) })
    onChange([...photos, ...out])
  }
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {photos.map(p => (
          <div key={p.id} className="group relative h-20 w-24 overflow-hidden rounded-lg border border-slate-200">
            <img src={p.src} className="h-full w-full cursor-zoom-in object-cover" onClick={() => setView(p)} />
            <button type="button" onClick={() => onChange(photos.filter(x => x.id !== p.id))} className="absolute right-1 top-1 hidden rounded bg-black/60 p-0.5 text-white group-hover:block"><X size={12} /></button>
          </div>
        ))}
        {photos.length < max && (
          <button type="button" onClick={() => ref.current?.click()} className="flex h-20 w-24 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-300 text-xs text-slate-500 transition hover:border-brand-400 hover:bg-brand-50 hover:text-brand-600">
            <Camera size={18} />{label}
          </button>
        )}
      </div>
      <input ref={ref} type="file" accept="image/*" multiple capture={undefined} hidden onChange={e => { add(e.target.files); e.target.value = '' }} />
      {view && <Lightbox photo={view} onClose={() => setView(null)} />}
    </div>
  )
}

export function Lightbox({ photo, onClose }: { photo: Photo; onClose: () => void }) {
  return <div className="fixed inset-0 z-[70] grid place-items-center bg-black/80 p-6" onClick={onClose}><img src={photo.src} className="max-h-full max-w-full rounded-lg shadow-2xl" /></div>
}

export function PhotoStrip({ photos }: { photos: Photo[] }) {
  const [view, setView] = useState<Photo | null>(null)
  if (!photos.length) return null
  return (
    <>
      <div className="flex flex-wrap gap-2">{photos.map(p => <img key={p.id} src={p.src} onClick={() => setView(p)} className="h-20 w-28 cursor-zoom-in rounded-lg border border-slate-200 object-cover transition hover:opacity-90" />)}</div>
      {view && <Lightbox photo={view} onClose={() => setView(null)} />}
    </>
  )
}

export function VoiceRecorder({ onSave }: { onSave: (audio: string, duration: number) => void }) {
  const { toast } = useApp()
  const [rec, setRec] = useState(false)
  const [secs, setSecs] = useState(0)
  const mr = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const tick = useRef<number | undefined>(undefined)
  const fileRef = useRef<HTMLInputElement>(null)
  useEffect(() => () => window.clearInterval(tick.current), [])

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const m = new MediaRecorder(stream, { audioBitsPerSecond: 24000 })
      chunks.current = []
      m.ondataavailable = e => e.data.size && chunks.current.push(e.data)
      let dur = 0
      m.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunks.current, { type: m.mimeType })
        const r = new FileReader(); r.onload = () => onSave(r.result as string, dur); r.readAsDataURL(blob)
      }
      m.start(); mr.current = m; setRec(true); setSecs(0)
      tick.current = window.setInterval(() => setSecs(s => { dur = s + 1; if (s + 1 >= 90) stop(); return s + 1 }), 1000)
    } catch { toast('Microphone permission denied or not available. You can upload an audio file instead.', 'err') }
  }
  const stop = () => { window.clearInterval(tick.current); mr.current?.state === 'recording' && mr.current.stop(); setRec(false) }
  const upload = (f?: File | null) => { if (!f) return; if (f.size > 900_000) return toast('Audio file too large (max ~900 KB).', 'err'); const r = new FileReader(); r.onload = () => onSave(r.result as string, 0); r.readAsDataURL(f) }

  return (
    <div className="flex items-center gap-2">
      {!rec ? (
        <Button type="button" variant="secondary" onClick={start}><Mic size={16} className="text-red-500" /> Record voice note</Button>
      ) : (
        <Button type="button" variant="danger" onClick={stop}><Square size={14} className="animate-pulse" fill="currentColor" /> Stop · {String(Math.floor(secs / 60)).padStart(2, '0')}:{String(secs % 60).padStart(2, '0')}</Button>
      )}
      <Button type="button" variant="ghost" size="sm" onClick={() => fileRef.current?.click()}><Upload size={14} /> Upload audio</Button>
      <input ref={fileRef} type="file" accept="audio/*" hidden onChange={e => { upload(e.target.files?.[0]); e.target.value = '' }} />
    </div>
  )
}

export function SignaturePad({ value, onChange }: { value?: string; onChange: (s?: string) => void }) {
  const cv = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  useEffect(() => {
    const c = cv.current!, ctx = c.getContext('2d')!
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height)
    if (value) { const i = new Image(); i.onload = () => ctx.drawImage(i, 0, 0); i.src = value }
  }, []) // eslint-disable-line
  const pos = (e: React.PointerEvent) => { const r = cv.current!.getBoundingClientRect(); return [(e.clientX - r.left) * (cv.current!.width / r.width), (e.clientY - r.top) * (cv.current!.height / r.height)] }
  const down = (e: React.PointerEvent) => { drawing.current = true; const ctx = cv.current!.getContext('2d')!; ctx.beginPath(); ctx.moveTo(...(pos(e) as [number, number])); cv.current!.setPointerCapture(e.pointerId) }
  const move = (e: React.PointerEvent) => { if (!drawing.current) return; const ctx = cv.current!.getContext('2d')!; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.strokeStyle = '#0a2d42'; ctx.lineTo(...(pos(e) as [number, number])); ctx.stroke() }
  const up = () => { if (!drawing.current) return; drawing.current = false; onChange(cv.current!.toDataURL('image/png')) }
  const clear = () => { const c = cv.current!, ctx = c.getContext('2d')!; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); onChange(undefined) }
  return (
    <div>
      <canvas ref={cv} width={460} height={140} className="w-full max-w-md touch-none rounded-lg border border-slate-300 bg-white" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up} />
      <button type="button" onClick={clear} className="mt-1 flex items-center gap-1 text-xs text-slate-500 hover:text-red-600"><Trash2 size={12} /> Clear signature</button>
    </div>
  )
}

const MAX_DOC = 700_000
export function DocUploader({ docs, onChange }: { docs: import('../types').Doc[]; onChange: (d: import('../types').Doc[]) => void }) {
  const { toast } = useApp()
  const ref = useRef<HTMLInputElement>(null)
  const add = async (files: FileList | null) => {
    if (!files) return
    const out: import('../types').Doc[] = []
    for (const f of Array.from(files)) {
      if (!/^(application\/pdf|image\/)/.test(f.type)) { toast(`${f.name}: only PDF or image files are supported`, 'err'); continue }
      let data: string
      if (f.type.startsWith('image/')) data = await compressImage(f, 1400, 0.7)
      else { if (f.size > MAX_DOC) { toast(`${f.name} is ${(f.size / 1024).toFixed(0)} KB — PDFs above ${MAX_DOC / 1000} KB can't be stored in the browser. Upload a photo/scan of the report instead.`, 'err'); continue }
        data = await new Promise<string>(r => { const fr = new FileReader(); fr.onload = () => r(fr.result as string); fr.readAsDataURL(f) }) }
      out.push({ id: uid(), name: f.name, type: f.type, size: f.size, data, date: new Date().toISOString().slice(0, 10) })
    }
    if (out.length) { onChange([...docs, ...out]); toast(`${out.length} document(s) attached`) }
  }
  const open = (d: import('../types').Doc) => { const w = window.open(); if (w) w.document.write(d.type.startsWith('image/') ? `<img src="${d.data}" style="max-width:100%">` : `<iframe src="${d.data}" style="border:0;width:100%;height:100vh"></iframe>`) }
  return (
    <div>
      <div className="space-y-1.5">{docs.map(d => (
        <div key={d.id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
          <span className="grid h-8 w-8 place-items-center rounded bg-brand-50 text-[10px] font-bold text-brand-600">{d.type.includes('pdf') ? 'PDF' : 'IMG'}</span>
          <button type="button" onClick={() => open(d)} className="min-w-0 flex-1 truncate text-left font-medium text-brand-700 hover:underline">{d.name}</button>
          <span className="text-xs text-slate-400">{(d.size / 1024).toFixed(0)} KB</span>
          <button type="button" onClick={() => onChange(docs.filter(x => x.id !== d.id))} className="text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>
        </div>))}</div>
      <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={() => ref.current?.click()}><Upload size={14} /> Upload water analysis report</Button>
      <input ref={ref} type="file" accept="application/pdf,image/*" multiple hidden onChange={e => { add(e.target.files); e.target.value = '' }} />
    </div>
  )
}
