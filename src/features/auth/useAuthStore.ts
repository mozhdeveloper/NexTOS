import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, UserRole } from "@/types";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  users: User[];
  login: (role: UserRole, clientId?: number) => void;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  generateMagicLink: (email: string) => string;
}

const mockUsers: User[] = [
  { id: 1, email: "admin@nextos.io", name: "Marcus Chen", role: "admin", avatar: "MC" },
  { id: 2, email: "sales@nextos.io", name: "Sarah Blake", role: "sales", avatar: "SB" },
  { id: 3, email: "tech@nextos.io", name: "James Rodriguez", role: "tech", avatar: "JR" },
  { id: 4, email: "client@acme.com", name: "Robert Hale", role: "client", clientId: 1, avatar: "RH" },
  { id: 5, email: "client@techcorp.com", name: "Lisa Park", role: "client", clientId: 2, avatar: "LP" },
];

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      users: mockUsers,

      login: (role, clientId) => {
        const user = mockUsers.find(
          (u) => u.role === role && (role !== "client" || u.clientId === clientId)
        );
        if (user) {
          set({ user, isAuthenticated: true });
        }
      },

      logout: () => {
        set({ user: null, isAuthenticated: false });
      },

      switchRole: (role) => {
        const user = get().users.find((u) => u.role === role);
        if (user) {
          set({ user, isAuthenticated: true });
        }
      },

      generateMagicLink: (email) => {
        const token = btoa(`${email}:${Date.now()}`);
        return `https://nextos.io/auth/magic?token=${token}`;
      },
    }),
    {
      name: "nextos-auth",
    }
  )
);
