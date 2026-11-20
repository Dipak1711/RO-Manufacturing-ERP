export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
export const today = () => new Date().toISOString().slice(0, 10)
export const addDays = (d: string | Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10) }
export const daysBetween = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000)
export const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN')
export const inrShort = (n: number) => n >= 1e7 ? `₹${(n / 1e7).toFixed(2)} Cr` : n >= 1e5 ? `₹${(n / 1e5).toFixed(2)} L` : inr(n)
export const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
export const fmtDateTime = (d: string) => new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ')
export const initials = (n: string) => n.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()
export const num = (v: unknown) => { const n = parseFloat(String(v)); return isNaN(n) ? 0 : n }

export function numberToWords(n: number): string {
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  const two = (x: number) => x < 20 ? a[x] : b[Math.floor(x / 10)] + (x % 10 ? ' ' + a[x % 10] : '')
  const three = (x: number) => (x >= 100 ? a[Math.floor(x / 100)] + ' Hundred' + (x % 100 ? ' ' : '') : '') + (x % 100 ? two(x % 100) : '')
  n = Math.round(n); if (n === 0) return 'Zero'
  const parts: string[] = []
  const cr = Math.floor(n / 1e7), lk = Math.floor((n % 1e7) / 1e5), th = Math.floor((n % 1e5) / 1e3), rest = n % 1e3
  if (cr) parts.push(three(cr) + ' Crore'); if (lk) parts.push(two(lk) + ' Lakh'); if (th) parts.push(two(th) + ' Thousand'); if (rest) parts.push(three(rest))
  return parts.join(' ') + ' Rupees Only'
}

export function compressImage(file: File, max = 760, q = 0.62): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onerror = rej
    r.onload = () => {
      const img = new Image()
      img.onload = () => {
        const s = Math.min(1, max / Math.max(img.width, img.height))
        const c = document.createElement('canvas'); c.width = img.width * s; c.height = img.height * s
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
        res(c.toDataURL('image/jpeg', q))
      }
      img.onerror = rej; img.src = r.result as string
    }
    r.readAsDataURL(file)
  })
}

export const waLink = (phone: string, text: string) => `https://wa.me/${phone.replace(/\D/g, '').replace(/^(\d{10})$/, '91$1')}?text=${encodeURIComponent(text)}`
export const mailLink = (to: string, subject: string, body: string) => `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`

export function placeholderPhoto(label: string, hue: number, stage = 3): string {
  const tanks = Array.from({ length: Math.min(stage + 1, 4) }, (_, i) => `<rect x="${60 + i * 95}" y="${120 - i * 6}" width="58" height="${130 + i * 6}" rx="26" fill="hsl(${hue},45%,${62 - i * 4}%)" stroke="#0a2d42" stroke-width="2"/><rect x="${70 + i * 95}" y="${135 - i * 6}" width="10" height="${90 + i * 6}" rx="5" fill="white" opacity=".35"/>`).join('')
  const pipes = stage > 0 ? `<path d="M30 275 H430 M89 120 V80 H400 V275" stroke="#475569" stroke-width="7" fill="none" stroke-linecap="round"/>` : ''
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320" viewBox="0 0 480 320"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e8eef3"/><stop offset="1" stop-color="#b9c5d0"/></linearGradient></defs><rect width="480" height="320" fill="url(#g)"/><rect y="270" width="480" height="50" fill="#8895a3"/>${pipes}${tanks}<rect x="360" y="170" width="70" height="80" rx="6" fill="#0f6a92" stroke="#0a2d42" stroke-width="2"/><circle cx="395" cy="200" r="14" fill="#e2f1f8" stroke="#0a2d42"/><rect x="0" y="288" width="480" height="32" fill="#0a2d42" opacity=".75"/><text x="14" y="309" fill="#fff" font-family="Arial" font-size="13">${label}</text></svg>`
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg)
}
