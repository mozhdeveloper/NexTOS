import { useAuthStore } from "@/stores/useAuthStore";
import {
  User,
  Bell,
  Shield,
  Database,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export default function Settings() {
  const { user } = useAuthStore();

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h1 className="text-[32px] font-bold text-[#EAEAEA] tracking-[-0.02em]">Settings</h1>
        <p className="text-sm text-[#88888C] mt-0.5">Configure your NexTOS instance</p>
      </div>

      {/* Profile */}
      <div className="data-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-4 h-4 text-[#F2A900]" />
          <h3 className="text-sm font-semibold text-[#EAEAEA]">Profile</h3>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-[#88888C] uppercase tracking-wider mb-1 block">Name</label>
              <input
                type="text"
                defaultValue={user?.name}
                className="w-full h-8 px-3 rounded bg-[#1A1A20] border border-white/10 text-[#EAEAEA] text-xs focus:outline-none focus:border-[#F2A900]/50"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#88888C] uppercase tracking-wider mb-1 block">Email</label>
              <input
                type="email"
                defaultValue={user?.email}
                className="w-full h-8 px-3 rounded bg-[#1A1A20] border border-white/10 text-[#EAEAEA] text-xs focus:outline-none focus:border-[#F2A900]/50"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-[#88888C] uppercase tracking-wider mb-1 block">Role</label>
            <div className="h-8 px-3 rounded bg-[#1A1A20] border border-white/10 text-[#88888C] text-xs flex items-center capitalize">
              {user?.role}
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="data-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-4 h-4 text-[#F2A900]" />
          <h3 className="text-sm font-semibold text-[#EAEAEA]">Notifications</h3>
        </div>
        <div className="space-y-3">
          {[
            { label: "Email alerts for overdue tasks", desc: "Get notified when tasks become overdue" },
            { label: "Service due reminders", desc: "Notifications when equipment needs maintenance" },
            { label: "New lead notifications", desc: "Alert when a new lead is added" },
            { label: "Invoice status updates", desc: "Get notified on payment received" },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center justify-between">
              <div>
                <div className="text-xs text-[#EAEAEA]">{item.label}</div>
                <div className="text-[10px] text-[#88888C]">{item.desc}</div>
              </div>
              <Switch defaultChecked={idx < 2} />
            </div>
          ))}
        </div>
      </div>

      {/* Security */}
      <div className="data-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-[#F2A900]" />
          <h3 className="text-sm font-semibold text-[#EAEAEA]">Security</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-[#EAEAEA]">Two-factor authentication</div>
              <div className="text-[10px] text-[#88888C]">Add an extra layer of security</div>
            </div>
            <Button variant="outline" size="sm" className="h-7 text-[10px] border-white/10 text-[#88888C]">
              Enable
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-[#EAEAEA]">Session timeout</div>
              <div className="text-[10px] text-[#88888C]">Auto-logout after 30 minutes</div>
            </div>
            <Switch defaultChecked />
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div className="data-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-4 h-4 text-[#F2A900]" />
          <h3 className="text-sm font-semibold text-[#EAEAEA]">Data & Integration</h3>
        </div>
        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between p-2 rounded bg-[#0A0A0C]">
            <div>
              <div className="text-[#EAEAEA]">Supabase Connection</div>
              <div className="text-[10px] text-[#88888C]">Database sync for Phase 2</div>
            </div>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#F2A900]/20 text-[#F2A900]">Mock Mode</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded bg-[#0A0A0C]">
            <div>
              <div className="text-[#EAEAEA]">Local Storage</div>
              <div className="text-[10px] text-[#88888C]">All data stored locally</div>
            </div>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#10B981]/20 text-[#10B981]">Active</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded bg-[#0A0A0C]">
            <div>
              <div className="text-[#EAEAEA]">Export Data</div>
              <div className="text-[10px] text-[#88888C]">Download all records as JSON</div>
            </div>
            <Button variant="outline" size="sm" className="h-7 text-[10px] border-white/10 text-[#88888C]">
              Export
            </Button>
          </div>
        </div>
      </div>

      <Button className="w-full h-9 bg-[#F2A900] hover:bg-[#F2A900]/80 text-[#050505] font-bold text-sm">
        <Save className="w-4 h-4 mr-1.5" />
        Save Changes
      </Button>
    </div>
  );
}
