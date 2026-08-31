import { useAuthStore } from '../store/authStore';

// Thin convenience wrapper around the auth store for components/pages.
export function useAuth() {
  const { user, isAuthenticated, isLoading, login, logout, fetchMe } = useAuthStore();
  return { user, isAuthenticated, isLoading, login, logout, fetchMe };
}
