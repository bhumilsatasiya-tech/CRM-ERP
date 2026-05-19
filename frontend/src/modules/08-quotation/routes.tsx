import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import { RequireAuth } from '../01-auth';

const QList = lazy(() => import('./pages/QuotationsListPage'));
const QForm = lazy(() => import('./pages/QuotationFormPage'));

export const quotationPrivateRoutes: RouteObject[] = [
  { path: '/quotations',          element: <RequireAuth permission="quotation.view"><QList /></RequireAuth> },
  { path: '/quotations/new',      element: <RequireAuth permission="quotation.create"><QForm /></RequireAuth> },
  { path: '/quotations/:id',      element: <RequireAuth permission="quotation.view"><QForm /></RequireAuth> },
  { path: '/quotations/:id/edit', element: <RequireAuth permission="quotation.update"><QForm /></RequireAuth> },
];
