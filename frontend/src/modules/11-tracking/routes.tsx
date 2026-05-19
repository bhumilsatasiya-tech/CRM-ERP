import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import { RequireAuth } from '../01-auth';

const Dashboard = lazy(() => import('./pages/TrackingDashboardPage'));
const Timeline  = lazy(() => import('./pages/SalesOrderTimelinePage'));

export const trackingPrivateRoutes: RouteObject[] = [
  { path: '/tracking',                     element: <RequireAuth permission="tracking.view"><Dashboard /></RequireAuth> },
  { path: '/tracking/sales-orders/:id',    element: <RequireAuth permission="tracking.view"><Timeline /></RequireAuth> },
];
