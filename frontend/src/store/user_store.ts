import { create } from "zustand";
import { User } from "../lib/types";
import { api } from "@/lib/api";

interface UserStore {
  user: User | null;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
  checkAuthStatus: () => Promise<boolean>;
  refreshData: () => Promise<boolean>;
}

export const useUserStore = create<UserStore>((set, get) => ({
  user: null,
  setUser: (user: User | null) => set({ user }),
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
    set({ user: null });
  },
  checkAuthStatus: async () => {
    const { refreshData } = get();
    const token = localStorage.getItem("token");

    if (token && !get().user) {
      return await refreshData();
    }
    return false;
  },
}));
