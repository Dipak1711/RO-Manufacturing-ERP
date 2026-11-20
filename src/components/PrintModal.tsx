import { type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Download, Mail, MessageCircle, Printer } from 'lucide-react'
import { Modal, Button } from './ui'
import { useApp } from '../store'
import { mailLink, waLink } from '../lib/utils'

export interface Share { phone: string; email: string; subject: string; text: string }

export function PrintModal({ title, subtitle, onClose, children, share, onShared }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode; share?: Share; onShared?: (via: 'WhatsApp' | 'Email') => void }) {
  const { toast } = useApp()
  const print = () => { const t = document.title; document.title = title.replace(/[^\w\- ]/g, ''); window.print(); document.title = t }
  return (
    <>
      <Modal title={title} subtitle={subtitle} onClose={onClose} width="max-w-4xl"
        footer={<>
          {share && <>
            <Button variant="secondary" onClick={() => { window.open(waLink(share.phone, share.text), '_blank'); toast('Opening WhatsApp – attach the downloaded PDF and send'); onShared?.('WhatsApp') }}><MessageCircle size={16} className="text-emerald-600" /> WhatsApp</Button>
            <Button variant="secondary" onClick={() => { window.location.href = mailLink(share.email, share.subject, share.text); toast('Opening your email app'); onShared?.('Email') }}><Mail size={16} className="text-sky-600" /> Email</Button>
          </>}
          <Button variant="secondary" onClick={print}><Download size={16} /> Download PDF</Button>
          <Button onClick={print}><Printer size={16} /> Print</Button>
        </>}>
        <div className="print-doc mx-auto max-w-[780px] rounded-lg border border-slate-200 bg-white p-8 shadow-inner">{children}</div>
      </Modal>
      {createPortal(<div className="print-doc">{children}</div>, document.getElementById('print-root')!)}
    </>
  )
}

export function DocHeader({ title, no, date, extra }: { title: string; no?: string; date?: string; extra?: ReactNode }) {
  const { db } = useApp(); const c = db.company
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid #0f6a92', paddingBottom: 10 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: 'linear-gradient(135deg,#0f6a92,#14b894)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 20 }}>AF</div>
          <div><div style={{ fontSize: 17, fontWeight: 800, color: '#0a2d42' }}>{c.name}</div><div style={{ fontSize: 10.5, color: '#475569' }}>{c.tagline}</div></div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 10.5, color: '#475569', maxWidth: 260 }}>{c.address}<br />GSTIN: {c.gstin}<br />{c.phone} · {c.email}</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '12px 0 4px' }}>
        <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '.05em', color: '#0a2d42', textTransform: 'uppercase' }}>{title}</div>
        <div style={{ textAlign: 'right', fontSize: 11.5 }}>{no && <div><b>No:</b> {no}</div>}{date && <div><b>Date:</b> {date}</div>}{extra}</div>
      </div>
    </div>
  )
}

export function SignBlock({ left, right, sig }: { left: string; right: string; sig?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 46, fontSize: 11.5 }}>
      <div style={{ textAlign: 'center', minWidth: 180 }}><div style={{ borderTop: '1px solid #475569', paddingTop: 4 }}>{left}</div></div>
      <div style={{ textAlign: 'center', minWidth: 180 }}>{sig && <img src={sig} style={{ height: 50, margin: '-48px auto 0', display: 'block' }} />}<div style={{ borderTop: '1px solid #475569', paddingTop: 4 }}>{right}</div></div>
    </div>
  )
}
