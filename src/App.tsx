import { Routes, Route } from 'react-router'
import AppShell from '@/components/AppShell'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import CRM from '@/pages/CRM'
import Services from '@/pages/Services'
import Fleet from '@/pages/Fleet'
import ClientPortal from '@/pages/ClientPortal'
import Billing from '@/pages/Billing'
import Reports from '@/pages/Reports'
import Settings from '@/pages/Settings'
import NotFound from '@/pages/NotFound'
import { useAuthStore } from '@/stores/useAuthStore'

function AuthenticatedRoutes() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/crm" element={<CRM />} />
        <Route path="/services" element={<Services />} />
        <Route path="/fleet" element={<Fleet />} />
        <Route path="/portal" element={<ClientPortal />} />
        <Route path="/billing" element={<Billing />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppShell>
  )
}

export default function App() {
  const { isAuthenticated } = useAuthStore()

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/*" element={isAuthenticated ? <AuthenticatedRoutes /> : <Login />} />
    </Routes>
  )
}
