import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import { RequireAuth } from '../../01-auth';

const Crm        = lazy(() => import('./CrmGateway'));
const Products   = lazy(() => import('./ProductsGateway'));
const Inventory  = lazy(() => import('./InventoryGateway'));
const Purchase   = lazy(() => import('./PurchaseGateway'));
const Sales      = lazy(() => import('./SalesGateway'));
const Production = lazy(() => import('./ProductionGateway'));
const Export     = lazy(() => import('./ExportGateway'));
const ICI        = lazy(() => import('./InterCompanyGateway'));
const Finance    = lazy(() => import('./FinanceGateway'));
const Hr         = lazy(() => import('./HrGateway'));
const Reports    = lazy(() => import('./ReportsGateway'));
const Settings   = lazy(() => import('./SettingsGateway'));
const StatementHub = lazy(() => import('./StatementHub'));

/**
 * Tally-style Gateway pages — one per top-level module. Each Gateway lists every
 * action available within the module as a tile (with its keyboard shortcut shown
 * inline). All tiles are clickable; many are also accessible via Alt+letter from
 * anywhere via `GlobalKeyboard`.
 */
export const gatewayPrivateRoutes: RouteObject[] = [
  { path: '/gateway/crm',          element: <RequireAuth><Crm /></RequireAuth> },
  { path: '/gateway/products',     element: <RequireAuth><Products /></RequireAuth> },
  { path: '/gateway/inventory',    element: <RequireAuth><Inventory /></RequireAuth> },
  { path: '/gateway/purchase',     element: <RequireAuth><Purchase /></RequireAuth> },
  { path: '/gateway/sales',        element: <RequireAuth><Sales /></RequireAuth> },
  { path: '/gateway/production',   element: <RequireAuth><Production /></RequireAuth> },
  { path: '/gateway/export',       element: <RequireAuth><Export /></RequireAuth> },
  { path: '/gateway/intercompany', element: <RequireAuth><ICI /></RequireAuth> },
  { path: '/gateway/finance',      element: <RequireAuth><Finance /></RequireAuth> },
  { path: '/gateway/hr',           element: <RequireAuth><Hr /></RequireAuth> },
  { path: '/gateway/reports',      element: <RequireAuth><Reports /></RequireAuth> },
  { path: '/gateway/settings',     element: <RequireAuth><Settings /></RequireAuth> },

  // Centralized Statement Hub — one place for every ledger statement.
  { path: '/reports/statement',    element: <RequireAuth permission="finance.report.view"><StatementHub /></RequireAuth> },
];
