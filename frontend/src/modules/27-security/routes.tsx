import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import { RequireAuth } from '../01-auth';

const SecuritySettings = lazy(() => import('./pages/SecuritySettingsPage'));

export const securityPrivateRoutes: RouteObject[] = [
  { path: '/settings/security', element: <RequireAuth><SecuritySettings /></RequireAuth> },
];
