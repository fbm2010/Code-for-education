import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { LanternLoader } from '../ui/LanternLoader';

interface ProtectedRouteProps {
  adminOnly?: boolean;
}

export function ProtectedRoute({ adminOnly = false }: ProtectedRouteProps) {
  const { user, isLoading } = useAuthStore();

  if (isLoading) return <LanternLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { user, isLoading } = useAuthStore();
  if (isLoading) return <LanternLoader />;
  if (user && user.role !== 'guest') return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
