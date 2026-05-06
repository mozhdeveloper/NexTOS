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
          <h1 className="text-[32px] font-bold text-[#EAEAEA] tracking-[-0.02em]">Marketing</h1>
          <p className="text-sm text-[#88888C] mt-0.5">Campaign performance & lead attribution</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="h-9 text-xs border-white/10 hover:bg-white/5">
            <ExternalLink className="w-3.5 h-3.5 mr-2" />
            Landing Page
          </Button>
          <Button className="h-9 text-xs bg-[#F2A900] text-[#050505] font-bold">
            <Plus className="w-3.5 h-3.5 mr-2" />
            New Campaign
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-3">
        <div className="data-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-[#88888C] uppercase font-bold tracking-wider">Total Sent</span>
            <Send className="w-4 h-4 text-[#88888C]" />
          </div>
          <div className="text-3xl font-bold text-[#EAEAEA] font-mono-tech">{totalSent.toLocaleString()}</div>
          <div className="text-[10px] text-[#88888C] mt-1">Across all channels</div>
        </div>
        <div className="data-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-[#88888C] uppercase font-bold tracking-wider">Engagement</span>
            <MousePointer2 className="w-4 h-4 text-[#F2A900]" />
          </div>
          <div className="text-3xl font-bold text-[#F2A900] font-mono-tech">{totalClicks.toLocaleString()}</div>
          <div className="text-[10px] text-[#88888C] mt-1">Total link clicks</div>
        </div>
        <div className="data-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-[#88888C] uppercase font-bold tracking-wider">Leads Generated</span>
            <Users className="w-4 h-4 text-[#10B981]" />
          </div>
          <div className="text-3xl font-bold text-[#10B981] font-mono-tech">{totalLeads}</div>
          <div className="text-[10px] text-[#88888C] mt-1">From active campaigns</div>
        </div>
        <div className="data-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-[#88888C] uppercase font-bold tracking-wider">Conv. Rate</span>
            <TrendingUp className="w-4 h-4 text-[#EAEAEA]" />
          </div>
          <div className="text-3xl font-bold text-[#EAEAEA] font-mono-tech">
            {((totalLeads / (totalClicks || 1)) * 100).toFixed(1)}%
          </div>
          <div className="text-[10px] text-[#88888C] mt-1">Click-to-Lead ratio</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {/* Performance Chart */}
        <div className="col-span-2 data-card p-4">
          <h3 className="text-sm font-bold text-[#EAEAEA] mb-4">Campaign Conversion Impact</h3>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A30" vertical={false} />
                <XAxis dataKey="name" stroke="#88888C" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#88888C" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ background: "#0A0A0C", border: "1px solid rgba(255,255,255,0.1)", fontSize: "11px" }}
                  itemStyle={{ color: "#EAEAEA" }}
                />
                <Bar dataKey="leads" fill="#F2A900" radius={[2, 2, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Integration Status (Module 13 Prep) */}
        <div className="data-card p-4">
          <h3 className="text-sm font-bold text-[#EAEAEA] mb-4">Gateways & Providers</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded bg-white/5 border border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-blue-500/10 flex items-center justify-center">
                  <Mail className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-[#EAEAEA]">SendGrid</div>
                  <div className="text-[9px] text-[#88888C]">Email Gateway</div>
                </div>
              </div>
              <span className="text-[9px] font-bold text-[#88888C] border border-white/10 px-1.5 py-0.5 rounded">READY</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded bg-white/5 border border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-red-500/10 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-[#EAEAEA]">Twilio</div>
                  <div className="text-[9px] text-[#88888C]">SMS Gateway</div>
                </div>
              </div>
              <span className="text-[9px] font-bold text-[#88888C] border border-white/10 px-1.5 py-0.5 rounded">READY</span>
            </div>
            <div className="mt-6 p-3 rounded bg-[#F2A900]/5 border border-[#F2A900]/20">
              <div className="flex items-center gap-2 text-[10px] font-bold text-[#F2A900] uppercase mb-1">
                <AlertCircle className="w-3 h-3" />
                MVP Note
              </div>
              <p className="text-[10px] text-[#88888C] leading-relaxed">
                Gateways are pre-configured. Real API keys can be connected in the System Settings under "Integrations".
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="data-card overflow-auto">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#EAEAEA]">Active Campaigns</h3>
          <span className="text-[10px] text-[#88888C] font-mono-tech">{campaigns.length} campaigns tracked</span>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#0A0A0C]">
              <th className="text-left py-3 px-4 text-[#88888C] font-medium uppercase tracking-wider text-[10px]">Campaign Name</th>
              <th className="text-left py-3 px-4 text-[#88888C] font-medium uppercase tracking-wider text-[10px]">Type</th>
              <th className="text-left py-3 px-4 text-[#88888C] font-medium uppercase tracking-wider text-[10px]">Status</th>
              <th className="text-left py-3 px-4 text-[#88888C] font-medium uppercase tracking-wider text-[10px]">Sent</th>
              <th className="text-left py-3 px-4 text-[#88888C] font-medium uppercase tracking-wider text-[10px]">Clicks</th>
              <th className="text-left py-3 px-4 text-[#88888C] font-medium uppercase tracking-wider text-[10px]">Leads</th>
              <th className="text-left py-3 px-4 text-[#88888C] font-medium uppercase tracking-wider text-[10px]">Performance</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                <td className="py-3 px-4">
                  <div className="font-bold text-[#EAEAEA]">{c.name}</div>
                  <div className="text-[10px] text-[#88888C] mt-0.5">Created {new Date(c.createdAt).toLocaleDateString()}</div>
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
                    c.status === 'scheduled' ? 'bg-[#F2A900]/10 text-[#F2A900]' : 'bg-white/10 text-[#88888C]'
                  }`}>
                    {c.status}
                  </span>
                </td>
                <td className="py-3 px-4 font-mono-tech text-[#EAEAEA]">{c.sentCount.toLocaleString()}</td>
                <td className="py-3 px-4 font-mono-tech text-[#EAEAEA]">{c.clickCount.toLocaleString()}</td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1.5 font-bold text-[#10B981]">
                    {c.leadsGenerated}
                    <Users className="w-3 h-3" />
                  </div>
                </td>
                <td className="py-3 px-4">
                   <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#F2A900]" 
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
