// src/app/routeConfig.ts

import type { ElementType } from "react";
import type { UserRole } from "@/types";

import {
  LayoutDashboard,
  Users,
  Wrench,
  Box,
  MapPin,
  Shield,
  Settings,
  ClipboardList,
  CreditCard,
} from "lucide-react";

export type AppNavItem = {
  label: string;
  path: string;
  icon: ElementType;
  roles: UserRole[];
};

export const internalNavItems: AppNavItem[] = [
  {
    label: "Dashboard",
    path: "/",
    icon: LayoutDashboard,
    roles: ["admin", "sales", "tech", "client"],
  },
  {
    label: "CRM",
    path: "/crm",
    icon: Users,
    roles: ["admin", "sales"],
  },
  {
    label: "Services",
    path: "/services",
    icon: Wrench,
    roles: ["admin", "tech"],
  },
  {
    label: "Inventory",
    path: "/inventory",
    icon: Box,
    roles: ["admin", "tech"],
  },
  {
    label: "Fleet",
    path: "/fleet",
    icon: MapPin,
    roles: ["admin", "tech", "client"],
  },
  {
    label: "Client Portal",
    path: "/portal",
    icon: Shield,
    roles: ["admin", "client"],
  },
  {
    label: "Billing",
    path: "/billing",
    icon: CreditCard,
    roles: ["admin", "client"],
  },
  {
    label: "Reports",
    path: "/reports",
    icon: ClipboardList,
    roles: ["admin", "sales", "tech"],
  },
  {
    label: "Settings",
    path: "/settings",
    icon: Settings,
    roles: ["admin", "sales", "tech", "client"],
  },
];