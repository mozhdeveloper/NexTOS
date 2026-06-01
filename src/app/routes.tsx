// src/app/routes.tsx

import { Routes, Route, Navigate } from "react-router";

import AppShell from "@/app/layouts/AppShell";
import ClientPortalShell from "@/features/client-portal/layout/ClientPortalShell";

import Login from "@/shared/pages/LoginPage";
import Landing from "@/features/landing/pages/LandingPage";
import Dashboard from "@/features/dashboard/pages/DashboardPage";
import CRM from "@/features/crm/pages/CRMPage";
import Services from "@/features/services/pages/ServicesPage";
import Fleet from "@/features/fleet/pages/FleetPage";
import ClientPortal from "@/features/client-portal/pages/admin/ClientPortal";
import Billing from "@/features/billing/pages/BillingPage";
import Reports from "@/features/reports/pages/ReportsPage";
import Marketing from "@/features/marketing/pages/MarketingPage";
import Inventory from "@/features/inventory/pages/InventoryPage";
import Settings from "@/shared/pages/Settings";
import AssetScanner from "@/features/services/components/AssetScanner";
import NotFound from "@/shared/pages/NotFound";

import ClientDashboard from "@/features/client-portal/pages/client/ClientDashboard";
import ClientEquipment from "@/features/client-portal/pages/client/ClientEquipment";
import ClientServiceHistory from "@/features/client-portal/pages/client/ClientServiceHistory";
import ClientBookings from "@/features/client-portal/pages/client/ClientBookings";
import ClientPackages from "@/features/client-portal/pages/client/ClientPackages";
import ClientBilling from "@/features/client-portal/pages/client/ClientBilling";
import ClientReports from "@/features/client-portal/pages/client/ClientReports";

import { useAuthStore } from "@/features/auth/useAuthStore";

function ClientPortalRoutes() {
  return (
    <ClientPortalShell>
      <Routes>
        <Route path="/" element={<Navigate to="/client" replace />} />
        <Route path="/client" element={<ClientDashboard />} />
        <Route path="/client/equipment" element={<ClientEquipment />} />
        <Route path="/client/history" element={<ClientServiceHistory />} />
        <Route path="/client/bookings" element={<ClientBookings />} />
        <Route path="/client/packages" element={<ClientPackages />} />
        <Route path="/client/billing" element={<ClientBilling />} />
        <Route path="/client/reports" element={<ClientReports />} />
        <Route path="*" element={<Navigate to="/client" replace />} />
      </Routes>
    </ClientPortalShell>
  );
}

function AuthenticatedRoutes() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/crm" element={<CRM />} />
        <Route path="/services" element={<Services />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/fleet" element={<Fleet />} />
        <Route path="/portal" element={<ClientPortal />} />
        <Route path="/billing" element={<Billing />} />
        <Route path="/marketing" element={<Marketing />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/scan/:serial" element={<AssetScanner />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppShell>
  );
}

export function AppRoutes() {
  const { isAuthenticated, user } = useAuthStore();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/landing" element={<Landing />} />

      <Route
        path="/*"
        element={
          !isAuthenticated ? (
            <Login />
          ) : user?.role === "client" ? (
            <ClientPortalRoutes />
          ) : (
            <AuthenticatedRoutes />
          )
        }
      />
    </Routes>
  );
}
