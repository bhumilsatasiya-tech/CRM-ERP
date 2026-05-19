import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import { RequireAuth } from '../01-auth';

const SOList   = lazy(() => import('./pages/SalesOrdersListPage'));
const SOForm   = lazy(() => import('./pages/SalesOrderFormPage'));
const InvList  = lazy(() => import('./pages/InvoicesListPage'));
const InvForm  = lazy(() => import('./pages/InvoiceFormPage'));

export const salesPrivateRoutes: RouteObject[] = [
  { path: '/sales-orders',                element: <RequireAuth permission="sales.order.view"><SOList /></RequireAuth> },
  { path: '/sales-orders/new',            element: <RequireAuth permission="sales.order.create"><SOForm /></RequireAuth> },
  { path: '/sales-orders/:id',            element: <RequireAuth permission="sales.order.view"><SOForm /></RequireAuth> },
  { path: '/sales-orders/:id/edit',       element: <RequireAuth permission="sales.order.update"><SOForm /></RequireAuth> },
  { path: '/invoices',                    element: <RequireAuth permission="invoice.view"><InvList /></RequireAuth> },
  { path: '/invoices/new',                element: <RequireAuth permission="invoice.create"><InvForm /></RequireAuth> },
  { path: '/invoices/:id',                element: <RequireAuth permission="invoice.view"><InvForm /></RequireAuth> },
  { path: '/invoices/:id/edit',           element: <RequireAuth permission="invoice.update"><InvForm /></RequireAuth> },
];
