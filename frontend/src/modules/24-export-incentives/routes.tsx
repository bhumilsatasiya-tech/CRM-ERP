import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import { RequireAuth } from '../01-auth';

const ListPage = lazy(() => import('./pages/ExportIncentivesListPage'));
const FormPage = lazy(() => import('./pages/ExportIncentiveFormPage'));

export const exportIncentivesPrivateRoutes: RouteObject[] = [
  { path: '/export-incentives',          element: <RequireAuth permission="export.incentive.view"><ListPage /></RequireAuth> },
  { path: '/export-incentives/new',      element: <RequireAuth permission="export.incentive.create"><FormPage /></RequireAuth> },
  { path: '/export-incentives/:id',      element: <RequireAuth permission="export.incentive.view"><FormPage /></RequireAuth> },
];
