import { Navigate, Route, Routes } from 'react-router-dom'
import { CheckCircle2, XCircle } from 'lucide-react'
import { useApp } from './store'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Inquiries from './pages/Inquiries'
import InquiryForm from './pages/InquiryForm'
import InquiryDetail from './pages/InquiryDetail'
import Quotations from './pages/Quotations'
import QuoteEditor from './pages/QuoteEditor'
import NewQuotation from './pages/NewQuotation'
import Projects from './pages/Projects'
import ProjectDetail from './pages/ProjectDetail'
import Production from './pages/Production'
import Stock from './pages/Stock'
import Purchase from './pages/Purchase'
import Consumables from './pages/Consumables'
import SettingsPage from './pages/Settings'
import Designs from './pages/Designs'
import DesignForm from './pages/DesignForm'
import Dispatches from './pages/Dispatches'
import Installations from './pages/Installations'
import { roleHome } from './lib/roles'
import { cx } from './lib/utils'

export default function App() {
  const { user, toasts } = useApp()
  return (
    <>
      {!user ? <Login /> : (
        <Routes>
          <Route element={<Layout />}>
            <Route index element={user.role === 'Admin' || user.role === 'Sales' || user.role === 'Stores' ? <Dashboard /> : <Navigate to={roleHome[user.role]} replace />} />
            <Route path="designs" element={<Designs />} />
            <Route path="designs/new" element={<DesignForm />} />
            <Route path="designs/:id/edit" element={<DesignForm />} />
            <Route path="dispatches" element={<Dispatches />} />
            <Route path="installations" element={<Installations />} />
            <Route path="inquiries" element={<Inquiries />} />
            <Route path="inquiries/new" element={<InquiryForm />} />
            <Route path="inquiries/:id" element={<InquiryDetail />} />
            <Route path="inquiries/:id/edit" element={<InquiryForm />} />
            <Route path="quotations" element={<Quotations />} />
            <Route path="quotations/new" element={<NewQuotation />} />
            <Route path="quotations/:id" element={<QuoteEditor />} />
            <Route path="projects" element={<Projects />} />
            <Route path="projects/:id" element={<ProjectDetail />} />
            <Route path="production" element={<Production />} />
            <Route path="stock" element={<Stock />} />
            <Route path="purchase" element={<Purchase />} />
            <Route path="consumables" element={<Consumables />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Route>
        </Routes>
      )}
      <div className="fixed bottom-5 right-5 z-[80] flex flex-col gap-2">
        {toasts.map(t => <div key={t.id} className={cx('fade-in flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-xl', t.kind === 'ok' ? 'bg-slate-900' : 'bg-red-600')}>{t.kind === 'ok' ? <CheckCircle2 size={16} className="text-accent-400" /> : <XCircle size={16} />}{t.text}</div>)}
      </div>
    </>
  )
}
