import { Routes, Route, Navigate } from 'react-router'
import AppShell from '@/components/AppShell'
import ClientPortalShell from '@/components/ClientPortalShell'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import CRM from '@/pages/CRM'
import Services from '@/pages/Services'
import Fleet from '@/pages/Fleet'
import ClientPortal from '@/pages/ClientPortal'
import ClientEquipment from '@/pages/client/Equipment'
import Billing from '@/pages/Billing'
import Reports from '@/pages/Reports'
import Settings from '@/pages/Settings'
import NotFound from '@/pages/NotFound'
import { useAuthStore } from '@/stores/useAuthStore'

function ClientPortalPlaceholder() {
  return (
    <div className="flex h-full min-h-screen items-center justify-center">
      <p className="text-[#88888C] text-sm font-mono-tech">
        Select a page from the navigation
      </p>
    </div>
  )
}

function ClientPortalRoutes() {
  return (
    <ClientPortalShell>
      <Routes>
        <Route path="/"                    element={<Navigate to="/client" replace />} />
        <Route path="/client"              element={<ClientPortalPlaceholder />} />
        <Route path="/client/equipment"    element={<ClientEquipment />} />
        <Route path="/client/history"      element={<ClientPortalPlaceholder />} />
        <Route path="/client/bookings"     element={<ClientPortalPlaceholder />} />
        <Route path="/client/packages"     element={<ClientPortalPlaceholder />} />
        <Route path="/client/billing"      element={<ClientPortalPlaceholder />} />
        <Route path="/client/reports"      element={<ClientPortalPlaceholder />} />
        <Route path="*"                    element={<Navigate to="/client" replace />} />
      </Routes>
    </ClientPortalShell>
  )
}

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
  const { isAuthenticated, user } = useAuthStore()

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          !isAuthenticated ? <Login /> :
          user?.role === 'client' ? <ClientPortalRoutes /> :
          <AuthenticatedRoutes />
        }
      />
    </Routes>
  )
}
