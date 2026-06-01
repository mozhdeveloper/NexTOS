import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { MarketingCampaign } from "@/types";

interface MarketingState {
  campaigns: MarketingCampaign[];
  addCampaign: (campaign: Omit<MarketingCampaign, "id" | "createdAt">) => void;
  updateCampaign: (id: number, data: Partial<MarketingCampaign>) => void;
  deleteCampaign: (id: number) => void;
}

const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString();
const yesterday = new Date(Date.now() - 86400000).toISOString();

const mockCampaigns: MarketingCampaign[] = [
  {
    id: 1,
    name: "Q2 Preventative Maintenance Promo",
    type: "email",
    status: "completed",
    sentCount: 1250,
    openCount: 482,
    clickCount: 156,
    leadsGenerated: 12,
    scheduledDate: lastWeek,
    createdAt: lastWeek,
  },
  {
    id: 2,
    name: "New GPS Tracker Launch SMS",
    type: "sms",
    status: "completed",
    sentCount: 850,
    openCount: 0, // SMS doesn't usually track opens directly without shortlinks
    clickCount: 94,
    leadsGenerated: 8,
    scheduledDate: yesterday,
    createdAt: yesterday,
  },
  {
    id: 3,
    name: "Summer Equipment Calibration Blast",
    type: "email",
    status: "scheduled",
    sentCount: 0,
    openCount: 0,
    clickCount: 0,
    leadsGenerated: 0,
    scheduledDate: new Date(Date.now() + 2 * 86400000).toISOString(),
    createdAt: yesterday,
  },
];

export const useMarketingStore = create<MarketingState>()(
  persist(
    (set) => ({
      campaigns: mockCampaigns,
      addCampaign: (campaign) => {
        const newCampaign = { 
          ...campaign, 
          id: Date.now(), 
          createdAt: new Date().toISOString() 
        };
        set((state) => ({ campaigns: [...state.campaigns, newCampaign] }));
      },
      updateCampaign: (id, data) => {
        set((state) => ({
          campaigns: state.campaigns.map((c) => (c.id === id ? { ...c, ...data } : c)),
        }));
      },
      deleteCampaign: (id) => {
        set((state) => ({
          campaigns: state.campaigns.filter((c) => c.id !== id),
        }));
      },
    }),
    {
      name: "nextos-marketing",
    }
  )
);
