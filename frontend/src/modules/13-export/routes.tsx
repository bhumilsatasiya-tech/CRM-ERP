import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import { RequireAuth } from '../01-auth';
import { ModuleLockGuard } from '../27-security';

const EIList = lazy(() => import('./pages/ExportInvoicesListPage'));
const EIForm = lazy(() => import('./pages/ExportInvoiceFormPage'));
const SBList = lazy(() => import('./pages/ShippingBillsListPage'));
const SBForm = lazy(() => import('./pages/ShippingBillFormPage'));
const PLList = lazy(() => import('./pages/PackingListsListPage'));
const PLForm = lazy(() => import('./pages/PackingListFormPage'));
const TIList = lazy(() => import('./pages/TaxInvoicesListPage'));
const TIForm = lazy(() => import('./pages/TaxInvoiceFormPage'));

/** Wrap a route element with the Export & Bank module lock guard. */
const guard = (element: React.ReactNode) => (
  <ModuleLockGuard moduleKey="export_bank">{element}</ModuleLockGuard>
);

export const exportPrivateRoutes: RouteObject[] = [
  { path: '/export-invoices',          element: <RequireAuth permission="export.invoice.view">{guard(<EIList />)}</RequireAuth> },
  { path: '/export-invoices/new',      element: <RequireAuth permission="export.invoice.create">{guard(<EIForm />)}</RequireAuth> },
  { path: '/export-invoices/:id',      element: <RequireAuth permission="export.invoice.view">{guard(<EIForm />)}</RequireAuth> },
  { path: '/export-invoices/:id/edit', element: <RequireAuth permission="export.invoice.update">{guard(<EIForm />)}</RequireAuth> },
  { path: '/shipping-bills',           element: <RequireAuth permission="export.shipping.view">{guard(<SBList />)}</RequireAuth> },
  { path: '/shipping-bills/new',       element: <RequireAuth permission="export.shipping.create">{guard(<SBForm />)}</RequireAuth> },
  { path: '/shipping-bills/:id',       element: <RequireAuth permission="export.shipping.view">{guard(<SBForm />)}</RequireAuth> },
  { path: '/shipping-bills/:id/edit',  element: <RequireAuth permission="export.shipping.update">{guard(<SBForm />)}</RequireAuth> },
  { path: '/packing-lists',            element: <RequireAuth permission="export.packing.view">{guard(<PLList />)}</RequireAuth> },
  { path: '/packing-lists/new',        element: <RequireAuth permission="export.packing.create">{guard(<PLForm />)}</RequireAuth> },
  { path: '/packing-lists/:id',        element: <RequireAuth permission="export.packing.view">{guard(<PLForm />)}</RequireAuth> },
  { path: '/packing-lists/:id/edit',   element: <RequireAuth permission="export.packing.update">{guard(<PLForm />)}</RequireAuth> },
  { path: '/tax-invoices',             element: <RequireAuth permission="export.taxinvoice.view">{guard(<TIList />)}</RequireAuth> },
  { path: '/tax-invoices/new',         element: <RequireAuth permission="export.taxinvoice.create">{guard(<TIForm />)}</RequireAuth> },
  { path: '/tax-invoices/:id',         element: <RequireAuth permission="export.taxinvoice.view">{guard(<TIForm />)}</RequireAuth> },
  { path: '/tax-invoices/:id/edit',    element: <RequireAuth permission="export.taxinvoice.update">{guard(<TIForm />)}</RequireAuth> },
];
