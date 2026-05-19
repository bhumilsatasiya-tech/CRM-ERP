import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import { RequireAuth } from '../01-auth';

const Home = lazy(() => import('./pages/ReportsHomePage'));
const Viewer = lazy(() => import('./pages/ReportViewerPage'));

export const reportsPrivateRoutes: RouteObject[] = [
  { path: '/reports',         element: <RequireAuth permission="report.view"><Home /></RequireAuth> },
  { path: '/reports/:code',   element: <RequireAuth permission="report.view"><Viewer /></RequireAuth> },
];
