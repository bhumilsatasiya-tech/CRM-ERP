import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import { RequireAuth } from '../01-auth';

const POList   = lazy(() => import('./pages/PurchaseOrdersListPage'));
const POForm   = lazy(() => import('./pages/PurchaseOrderFormPage'));
const GrnList  = lazy(() => import('./pages/GrnsListPage'));
const GrnForm  = lazy(() => import('./pages/GrnFormPage'));
const PIList   = lazy(() => import('./pages/PurchaseInvoicesListPage'));
const PIForm   = lazy(() => import('./pages/PurchaseInvoiceFormPage'));

export const purchasePrivateRoutes: RouteObject[] = [
  { path: '/purchase-orders',                element: <RequireAuth permission="purchase.order.view"><POList /></RequireAuth> },
  { path: '/purchase-orders/new',            element: <RequireAuth permission="purchase.order.create"><POForm /></RequireAuth> },
  { path: '/purchase-orders/:id',            element: <RequireAuth permission="purchase.order.view"><POForm /></RequireAuth> },
  { path: '/purchase-orders/:id/edit',       element: <RequireAuth permission="purchase.order.update"><POForm /></RequireAuth> },
  { path: '/grns',                           element: <RequireAuth permission="purchase.grn.view"><GrnList /></RequireAuth> },
  { path: '/grns/new',                       element: <RequireAuth permission="purchase.grn.create"><GrnForm /></RequireAuth> },
  { path: '/grns/:id',                       element: <RequireAuth permission="purchase.grn.view"><GrnForm /></RequireAuth> },
  { path: '/grns/:id/edit',                  element: <RequireAuth permission="purchase.grn.update"><GrnForm /></RequireAuth> },
  { path: '/purchase-invoices',              element: <RequireAuth permission="purchase.invoice.view"><PIList /></RequireAuth> },
  { path: '/purchase-invoices/new',          element: <RequireAuth permission="purchase.invoice.create"><PIForm /></RequireAuth> },
  { path: '/purchase-invoices/:id',          element: <RequireAuth permission="purchase.invoice.view"><PIForm /></RequireAuth> },
  { path: '/purchase-invoices/:id/edit',     element: <RequireAuth permission="purchase.invoice.update"><PIForm /></RequireAuth> },
];
