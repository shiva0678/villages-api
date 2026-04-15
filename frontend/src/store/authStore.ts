import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  role: 'ADMIN' | 'CLIENT';
  plan?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (userData: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  login: (userData, token) => {
    localStorage.setItem('auth_token', token);
    set({ user: userData, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('api_key');
    set({ user: null, isAuthenticated: false });
  },
}));
