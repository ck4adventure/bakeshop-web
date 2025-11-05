// ProtectedRoute provides a control for checking users access via token

import React from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '@/context/auth';

export function ProtectedRoute({ children }: { children: React.ReactElement }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="p-4">Loading...</div>;
  if (!user) return <Navigate to="/" replace />;
  return children;
}
