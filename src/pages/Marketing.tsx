import { useState } from "react";
import { useMarketingStore } from "@/stores/useMarketingStore";
import { useCRMStore } from "@/stores/useCRMStore";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  Mail,
  MessageSquare,
  TrendingUp,
  Users,
  MousePointer2,
  Send,
  Plus,
  Calendar,
  MoreVertical,
  CheckCircle2,
  Clock,
  ExternalLink,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Marketing() {
  const { campaigns } = useMarketingStore();
  const { leads } = useCRMStore();

  const marketingLeads = leads.filter(l => l.source === "Marketing Landing Page" || l.source === "Email Campaign");
  
  const totalSent = campaigns.reduce((sum, c) => sum + c.sentCount, 0);
  const totalClicks = campaigns.reduce((sum, c) => sum + c.clickCount, 0);
  const totalLeads = campaigns.reduce((sum, c) => sum + c.leadsGenerated, 0);

  const chartData = campaigns.filter(c => c.status === "completed").map(c => ({
    name: c.name.substring(0, 10) + "...",
    leads: c.leadsGenerated,
    clicks: c.clickCount / 5, // Scaling for visual comparison
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[32px] font-bold text-gray-900 tracking-[-0.02em]">Marketing</h1>
          <p className="text-sm text-gray-500 mt-0.5">Campaign performance & lead attribution</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="h-9 text-xs border-gray-200 hover:bg-gray-50">
            <ExternalLink className="w-3.5 h-3.5 mr-2" />
            Landing Page
          </Button>
          <Button className="h-9 text-xs bg-[#66B2B2] text-white font-bold">
            <Plus className="w-3.5 h-3.5 mr-2" />
            New Campaign
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-3">
        <div className="data-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Total Sent</span>
            <Send className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-3xl font-bold text-gray-900 font-mono-tech">{totalSent.toLocaleString()}</div>
          <div className="text-[10px] text-gray-500 mt-1">Across all channels</div>
        </div>
        <div className="data-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Engagement</span>
            <MousePointer2 className="w-4 h-4 text-[#66B2B2]" />
          </div>
          <div className="text-3xl font-bold text-[#66B2B2] font-mono-tech">{totalClicks.toLocaleString()}</div>
          <div className="text-[10px] text-gray-500 mt-1">Total link clicks</div>
        </div>
        <div className="data-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Leads Generated</span>
            <Users className="w-4 h-4 text-[#10B981]" />
          </div>
          <div className="text-3xl font-bold text-[#10B981] font-mono-tech">{totalLeads}</div>
          <div className="text-[10px] text-gray-500 mt-1">From active campaigns</div>
        </div>
        <div className="data-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Conv. Rate</span>
            <TrendingUp className="w-4 h-4 text-gray-900" />
          </div>
          <div className="text-3xl font-bold text-gray-900 font-mono-tech">
            {((totalLeads / (totalClicks || 1)) * 100).toFixed(1)}%
          </div>
          <div className="text-[10px] text-gray-500 mt-1">Click-to-Lead ratio</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {/* Performance Chart */}
        <div className="col-span-2 data-card p-4">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Campaign Conversion Impact</h3>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                <XAxis dataKey="name" stroke="#6B7280" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#6B7280" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 6, fontSize: "11px" }}
                  itemStyle={{ color: "#111827" }}
                />
                <Bar dataKey="leads" fill="#66B2B2" radius={[2, 2, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Integration Status (Module 13 Prep) */}
        <div className="data-card p-4">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Gateways & Providers</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded bg-gray-50 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-blue-500/10 flex items-center justify-center">
                  <Mail className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-gray-900">SendGrid</div>
                  <div className="text-[9px] text-gray-500">Email Gateway</div>
                </div>
              </div>
              <span className="text-[9px] font-bold text-gray-500 border border-gray-200 px-1.5 py-0.5 rounded">READY</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded bg-gray-50 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-red-500/10 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-gray-900">Twilio</div>
                  <div className="text-[9px] text-gray-500">SMS Gateway</div>
                </div>
              </div>
              <span className="text-[9px] font-bold text-gray-500 border border-gray-200 px-1.5 py-0.5 rounded">READY</span>
            </div>
            <div className="mt-6 p-3 rounded bg-[#66B2B2]/5 border border-[#66B2B2]/20">
              <div className="flex items-center gap-2 text-[10px] font-bold text-[#66B2B2] uppercase mb-1">
                <AlertCircle className="w-3 h-3" />
                MVP Note
              </div>
              <p className="text-[10px] text-gray-500 leading-relaxed">
                Gateways are pre-configured. Real API keys can be connected in the System Settings under "Integrations".
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="data-card overflow-auto">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900">Active Campaigns</h3>
          <span className="text-[10px] text-gray-500 font-mono-tech">{campaigns.length} campaigns tracked</span>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left py-3 px-4 text-gray-500 font-medium uppercase tracking-wider text-[10px]">Campaign Name</th>
              <th className="text-left py-3 px-4 text-gray-500 font-medium uppercase tracking-wider text-[10px]">Type</th>
              <th className="text-left py-3 px-4 text-gray-500 font-medium uppercase tracking-wider text-[10px]">Status</th>
              <th className="text-left py-3 px-4 text-gray-500 font-medium uppercase tracking-wider text-[10px]">Sent</th>
              <th className="text-left py-3 px-4 text-gray-500 font-medium uppercase tracking-wider text-[10px]">Clicks</th>
              <th className="text-left py-3 px-4 text-gray-500 font-medium uppercase tracking-wider text-[10px]">Leads</th>
              <th className="text-left py-3 px-4 text-gray-500 font-medium uppercase tracking-wider text-[10px]">Performance</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="py-3 px-4">
                  <div className="font-bold text-gray-900">{c.name}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">Created {new Date(c.createdAt).toLocaleDateString()}</div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    {c.type === 'email' ? <Mail className="w-3 h-3 text-blue-400" /> : <MessageSquare className="w-3 h-3 text-red-400" />}
                    <span className="capitalize">{c.type}</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                    c.status === 'completed' ? 'bg-[#10B981]/10 text-[#10B981]' : 
                    c.status === 'scheduled' ? 'bg-[#66B2B2]/10 text-[#66B2B2]' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {c.status}
                  </span>
                </td>
                <td className="py-3 px-4 font-mono-tech text-gray-900">{c.sentCount.toLocaleString()}</td>
                <td className="py-3 px-4 font-mono-tech text-gray-900">{c.clickCount.toLocaleString()}</td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1.5 font-bold text-[#10B981]">
                    {c.leadsGenerated}
                    <Users className="w-3 h-3" />
                  </div>
                </td>
                <td className="py-3 px-4">
                   <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#66B2B2]" 
                        style={{ width: `${Math.min((c.leadsGenerated / 20) * 100, 100)}%` }} 
                      />
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
