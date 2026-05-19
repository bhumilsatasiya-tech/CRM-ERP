import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import { RequireAuth } from '../01-auth';

const CurrentStockPage          = lazy(() => import('./pages/CurrentStockPage'));
const StockLedgerPage           = lazy(() => import('./pages/StockLedgerPage'));
const StockAdjustmentsListPage  = lazy(() => import('./pages/StockAdjustmentsListPage'));
const StockAdjustmentFormPage   = lazy(() => import('./pages/StockAdjustmentFormPage'));
const StockTransfersListPage    = lazy(() => import('./pages/StockTransfersListPage'));
const StockTransferFormPage     = lazy(() => import('./pages/StockTransferFormPage'));

export const inventoryPrivateRoutes: RouteObject[] = [
  { path: '/stock/current',                       element: <RequireAuth permission="stock.ledger.view"><CurrentStockPage /></RequireAuth> },
  { path: '/stock/ledger',                        element: <RequireAuth permission="stock.ledger.view"><StockLedgerPage /></RequireAuth> },
  { path: '/stock/adjustments',                   element: <RequireAuth permission="stock.adjustment.view"><StockAdjustmentsListPage /></RequireAuth> },
  { path: '/stock/adjustments/new',               element: <RequireAuth permission="stock.adjustment.create"><StockAdjustmentFormPage /></RequireAuth> },
  { path: '/stock/adjustments/:id',               element: <RequireAuth permission="stock.adjustment.view"><StockAdjustmentFormPage /></RequireAuth> },
  { path: '/stock/adjustments/:id/edit',          element: <RequireAuth permission="stock.adjustment.update"><StockAdjustmentFormPage /></RequireAuth> },
  { path: '/stock/transfers',                     element: <RequireAuth permission="stock.transfer.view"><StockTransfersListPage /></RequireAuth> },
  { path: '/stock/transfers/new',                 element: <RequireAuth permission="stock.transfer.create"><StockTransferFormPage /></RequireAuth> },
  { path: '/stock/transfers/:id',                 element: <RequireAuth permission="stock.transfer.view"><StockTransferFormPage /></RequireAuth> },
  { path: '/stock/transfers/:id/edit',            element: <RequireAuth permission="stock.transfer.update"><StockTransferFormPage /></RequireAuth> },
];
