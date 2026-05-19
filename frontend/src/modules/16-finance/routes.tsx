import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import { RequireAuth } from '../01-auth';

const AccountsList = lazy(() => import('./pages/AccountsListPage'));
const JEList = lazy(() => import('./pages/JournalEntriesListPage'));
const JEForm = lazy(() => import('./pages/JournalEntryFormPage'));
const TB     = lazy(() => import('./pages/TrialBalancePage'));
const Ledgers = lazy(() => import('./pages/LedgersLandingPage'));
const AccountLedger = lazy(() => import('./pages/AccountLedgerPage'));
const PartnerStatement = lazy(() => import('./pages/PartnerStatementPage'));
const Voucher = lazy(() => import('./pages/VoucherPage'));

export const financePrivateRoutes: RouteObject[] = [
  { path: '/accounts',                     element: <RequireAuth permission="finance.account.view"><AccountsList /></RequireAuth> },
  { path: '/journal-entries',              element: <RequireAuth permission="finance.journal.view"><JEList /></RequireAuth> },
  { path: '/journal-entries/new',          element: <RequireAuth permission="finance.journal.create"><JEForm /></RequireAuth> },
  { path: '/journal-entries/:id',          element: <RequireAuth permission="finance.journal.view"><JEForm /></RequireAuth> },
  { path: '/finance/trial-balance',        element: <RequireAuth permission="finance.report.view"><TB /></RequireAuth> },
  { path: '/finance/ledgers',              element: <RequireAuth permission="finance.report.view"><Ledgers /></RequireAuth> },
  { path: '/finance/ledger',               element: <RequireAuth permission="finance.report.view"><AccountLedger /></RequireAuth> },
  { path: '/finance/ledger/:accountId',    element: <RequireAuth permission="finance.report.view"><AccountLedger /></RequireAuth> },
  { path: '/partners/:id/statement',       element: <RequireAuth permission="finance.report.view"><PartnerStatement /></RequireAuth> },
  { path: '/vouchers/supplier-payment',    element: <RequireAuth permission="purchase.invoice.update"><Voucher mode="supplier-payment" /></RequireAuth> },
  { path: '/vouchers/buyer-receipt',       element: <RequireAuth permission="sales.invoice.update"><Voucher mode="buyer-receipt" /></RequireAuth> },
];
