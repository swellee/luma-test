import { create } from "zustand";
import { User } from "../lib/types";
import { api } from "@/lib/api";

interface UserStore {
  user?: User;
  unreadMsgCount: number;
  setUser: (user?: User) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
  checkAuthStatus: () => Promise<boolean>;
  refreshData: () => Promise<boolean>;
  refreshUnreadMsgCount: () => Promise<void>;
}

export const useUserStore = create<UserStore>((set, get) => ({
  user: undefined,
  unreadMsgCount: 0,
  setUser: (user?: User) => set({ user }),
  setToken: (token) => {
    if (token) {
      localStorage.setItem("token", token);
    } else {
      localStorage.removeItem("token");
    }
  },
  refreshData: async () => {
    const res = await api.user.getProfile();
    if (res) {
      set({ user: res });
      return true;
    }
    return false;
  },
  logout: () => {
    localStorage.removeItem("token");
    set({ user: undefined });
  },
  checkAuthStatus: async () => {
    const { refreshData } = get();
    const token = localStorage.getItem("token");

    if (token && !get().user) {
      return await refreshData();
    }
    return false;
  },
  refreshUnreadMsgCount: async () => {
    const res = await api.msg.getSysMsgUnreadCount();
    if (res) {
      set({ unreadMsgCount: res.count });
    }
  }
}));
