import { useState } from 'react'
import { Droplets, ShieldCheck, Workflow, BarChart3 } from 'lucide-react'
import { useApp } from '../store'
import { Button } from '../components/ui'
import { roleLabel } from '../lib/roles'

export default function Login() {
  const { login, db } = useApp()
  const [email, setEmail] = useState('admin@aquaflow.in')
  const [pass, setPass] = useState('admin123')
  const [err, setErr] = useState('')
  return (
    <div className="grid min-h-full lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-[#ed7333] bg-linear-to-br from-[#f58a4e] via-[#ed7333] to-[#c24a16] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/30 blur-3xl" /><div className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-rose-500/30 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(520px_240px_at_100%_100%,rgba(122,46,14,0.45),transparent_70%)]" />
        <span className="hero-sweep pointer-events-none absolute inset-y-0 -left-1/3 w-1/4 -skew-x-12 bg-linear-to-r from-transparent via-white/25 to-transparent blur-md" />
        <Droplets className="pointer-events-none absolute -right-10 -bottom-12 h-72 w-72 -rotate-12 text-white/[0.06]" />
        <div className="relative flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-[14px] bg-white/20 text-[14px] font-black ring-1 ring-inset ring-white/40 backdrop-blur">AF</div><div className="text-lg font-bold">AquaFlow Engineering</div></div>
        <div className="relative">
          <h1 className="text-4xl font-bold leading-tight">From first inquiry to<br />the last consumable —<br /><span className="text-amber-200">one connected system.</span></h1>
          <div className="mt-10 grid gap-4 text-sm text-white/90">
            {[[Workflow, 'Inquiry → Quotation → Order → Production → Dispatch → Service'], [Droplets, 'Project-wise history of every RO plant you ever built'], [BarChart3, 'Live stock, BOQ shortages and purchase orders'], [ShieldCheck, 'Quality reports signed on site, shared instantly']].map(([Icon, t], i) => { const I = Icon as typeof Droplets; return <div key={i} className="flex items-center gap-3"><span className="lift grid h-9 w-9 place-items-center rounded-[11px] bg-white/20 ring-1 ring-inset ring-white/30 backdrop-blur"><I size={18} /></span>{t as string}</div> })}
          </div>
        </div>
        <div className="relative text-xs text-white/75">© {new Date().getFullYear()} AquaFlow Engineering Pvt. Ltd.</div>
      </div>
      <div className="app-canvas grid place-items-center p-8"><div className="animate-slide-up w-full max-w-md rounded-3xl bg-white/80 p-8 shadow-panel ring-1 ring-white/70 backdrop-blur-xl">
        <form className="w-full" onSubmit={e => { e.preventDefault(); if (!login(email, pass)) setErr('Incorrect email or password.') }}>
          <div className="mb-8 flex items-center gap-3 lg:hidden"><div className="grid h-10 w-10 place-items-center rounded-[14px] bg-linear-to-br from-[#f58a4e] via-[#ed7333] to-[#d9622a] font-black text-white shadow-[0_10px_24px_-8px_rgba(237,115,51,0.65)]">AF</div><span className="font-extrabold text-ink">AquaFlow ERP</span></div>
          <h2 className="text-2xl font-extrabold tracking-[-0.03em] text-ink">Welcome back</h2>
          <p className="mb-8 mt-1 text-sm text-slate-500">Sign in to continue to your workspace.</p>
          <label className="lbl">Email</label><input className="inp mb-4" value={email} onChange={e => setEmail(e.target.value)} />
          <label className="lbl">Password</label><input type="password" className="inp" value={pass} onChange={e => setPass(e.target.value)} />
          {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
          <Button className="mt-6 w-full !py-2.5">Sign in</Button>
          <div className="mt-8"><div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Sign in as</div><div className="flex flex-wrap gap-2">{db.users.filter((u, i, a) => a.findIndex(x => x.role === u.role) === i).map(u => <button type="button" key={u.id} onClick={() => { setEmail(u.email); setPass(u.password); setErr('') }} className="pressable rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-flat hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700">{roleLabel[u.role]}</button>)}</div></div>
        </form>
      </div></div>
    </div>
  )
}
