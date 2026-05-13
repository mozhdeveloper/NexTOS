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
        <h1 className="text-[32px] font-bold text-black tracking-[-0.02em]">Settings</h1>
        <p className="text-sm text-gray-600 mt-0.5">Configure your NexTOS instance</p>
      </div>

      {/* Profile */}
      <div className="data-card p-4 bg-white shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-4 h-4 text-[#66B2B2]" />
          <h3 className="text-sm font-semibold text-black">Profile</h3>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-600 uppercase tracking-wider mb-1 block">Name</label>
              <input
                type="text"
                defaultValue={user?.name}
                className="w-full h-8 px-3 rounded bg-white border border-gray-200 text-black text-xs focus:outline-none focus:border-[#66B2B2]/60"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-600 uppercase tracking-wider mb-1 block">Email</label>
              <input
                type="email"
                defaultValue={user?.email}
                className="w-full h-8 px-3 rounded bg-white border border-gray-200 text-black text-xs focus:outline-none focus:border-[#66B2B2]/60"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-gray-600 uppercase tracking-wider mb-1 block">Role</label>
            <div className="h-8 px-3 rounded bg-gray-50 border border-gray-200 text-gray-600 text-xs flex items-center capitalize">
              {user?.role}
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="data-card p-4 bg-white shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-4 h-4 text-[#66B2B2]" />
          <h3 className="text-sm font-semibold text-black">Notifications</h3>
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
                <div className="text-xs text-black">{item.label}</div>
                <div className="text-[10px] text-gray-600">{item.desc}</div>
              </div>
              <Switch defaultChecked={idx < 2} />
            </div>
          ))}
        </div>
      </div>

      {/* Security */}
      <div className="data-card p-4 bg-white shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-[#66B2B2]" />
          <h3 className="text-sm font-semibold text-black">Security</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-black">Two-factor authentication</div>
              <div className="text-[10px] text-gray-600">Add an extra layer of security</div>
            </div>
            <Button variant="outline" size="sm" className="h-7 text-[10px] border-gray-200 text-gray-600">
              Enable
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-black">Session timeout</div>
              <div className="text-[10px] text-gray-600">Auto-logout after 30 minutes</div>
            </div>
            <Switch defaultChecked />
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div className="data-card p-4 bg-white shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-4 h-4 text-[#66B2B2]" />
          <h3 className="text-sm font-semibold text-black">Data & Integration</h3>
        </div>
        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between p-2 rounded bg-gray-50">
            <div>
              <div className="text-black">Supabase Connection</div>
              <div className="text-[10px] text-gray-600">Database sync for Phase 2</div>
            </div>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#66B2B2]/20 text-[#66B2B2]">Mock Mode</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded bg-gray-50">
            <div>
              <div className="text-black">Local Storage</div>
              <div className="text-[10px] text-gray-600">All data stored locally</div>
            </div>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#10B981]/20 text-[#10B981]">Active</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded bg-gray-50">
            <div>
              <div className="text-black">Export Data</div>
              <div className="text-[10px] text-gray-600">Download all records as JSON</div>
            </div>
            <Button variant="outline" size="sm" className="h-7 text-[10px] border-gray-200 text-gray-600">
              Export
            </Button>
          </div>
        </div>
      </div>

      <Button className="w-full h-9 bg-[#66B2B2] hover:bg-[#66B2B2]/80 text-white font-bold text-sm">
        <Save className="w-4 h-4 mr-1.5" />
        Save Changes
      </Button>
    </div>
  );
}
