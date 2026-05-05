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
import ClientServiceHistory from '@/pages/client/ServiceHistory'
import ClientDashboard from '@/pages/client/Dashboard'
import ClientPackages from '@/pages/client/Packages'
import ClientBilling from '@/pages/client/Billing'
import ClientReports from '@/pages/client/Reports'
import Billing from '@/pages/Billing'
import Reports from '@/pages/Reports'
import ClientBookings from '@/pages/client/Bookings'
import Settings from '@/pages/Settings'
import AssetScanner from '@/pages/AssetScanner'
import NotFound from '@/pages/NotFound'
import { useAuthStore } from '@/stores/useAuthStore'

function ClientPortalRoutes() {
  return (
    <ClientPortalShell>
      <Routes>
        <Route path="/"                    element={<Navigate to="/client" replace />} />
        <Route path="/client"              element={<ClientDashboard />} />
        <Route path="/client/equipment"    element={<ClientEquipment />} />
        <Route path="/client/history"      element={<ClientServiceHistory />} />
        <Route path="/client/bookings"     element={<ClientBookings />} />
        <Route path="/client/packages"     element={<ClientPackages />} />
        <Route path="/client/billing"      element={<ClientBilling />} />
        <Route path="/client/reports"      element={<ClientReports />} />
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
        <Route path="/scan/:serial" element={<AssetScanner />} />
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
