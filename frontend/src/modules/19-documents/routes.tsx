import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import { RequireAuth } from '../01-auth';

const DocsList = lazy(() => import('./pages/DocumentsListPage'));

export const documentsPrivateRoutes: RouteObject[] = [
  { path: '/documents', element: <RequireAuth permission="document.view"><DocsList /></RequireAuth> },
];
