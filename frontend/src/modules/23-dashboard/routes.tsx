import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import { RequireAuth } from '../01-auth';

const Dash = lazy(() => import('./pages/DashboardPage'));

export const dashboardPrivateRoutes: RouteObject[] = [
  { path: '/dashboard', element: <RequireAuth permission="dashboard.view"><Dash /></RequireAuth> },
];
