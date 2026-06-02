import { create } from "zustand";
import { persist } from "zustand/middleware";
import seedData from "@/data/seed-data.json";

interface ClientPortalState {
  selectedCompanyId: string;
  setSelectedCompanyId: (id: string) => void;
}

export const clientStore = create<ClientPortalState>()(
  persist(
    (set) => ({
      selectedCompanyId: seedData.clients[0]?.id ?? "CL-001",
      setSelectedCompanyId: (id: string) => set({ selectedCompanyId: id }),
    }),
    {
      name: "client-portal-storage",
    }
  )
);
