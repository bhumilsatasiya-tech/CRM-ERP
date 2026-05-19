import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import { RequireAuth } from '../01-auth';

const IciList = lazy(() => import('./pages/InterCompanyInvoicesListPage'));
const IciForm = lazy(() => import('./pages/InterCompanyInvoiceFormPage'));

export const interCompanyPrivateRoutes: RouteObject[] = [
  { path: '/inter-company-invoices',          element: <RequireAuth permission="intercompany.view"><IciList /></RequireAuth> },
  { path: '/inter-company-invoices/new',      element: <RequireAuth permission="intercompany.create"><IciForm /></RequireAuth> },
  { path: '/inter-company-invoices/:id',      element: <RequireAuth permission="intercompany.view"><IciForm /></RequireAuth> },
  { path: '/inter-company-invoices/:id/edit', element: <RequireAuth permission="intercompany.update"><IciForm /></RequireAuth> },
];
