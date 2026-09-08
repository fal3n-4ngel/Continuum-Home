import { create } from 'zustand';
import { FirebaseUser } from "@/types";

interface AuthState {
  user: FirebaseUser | null;
  setUser: (user: FirebaseUser | null) => void;
  authLoading: boolean;
  setAuthLoading: (loading: boolean) => void;
  firebaseAuth: any | null;
  setFirebaseAuth: (auth: any) => void;
  isProUser: boolean;
  setIsProUser: (isPro: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  authLoading: true,
  setAuthLoading: (authLoading) => set({ authLoading }),
  firebaseAuth: null,
  setFirebaseAuth: (firebaseAuth) => set({ firebaseAuth }),
  isProUser: false,
  setIsProUser: (isProUser) => set({ isProUser }),
}));
