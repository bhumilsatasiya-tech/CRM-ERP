import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import { RequireAuth } from '../01-auth';

const LoansList = lazy(() => import('./pages/LoansListPage'));
const LoanForm  = lazy(() => import('./pages/LoanFormPage'));

export const loansPrivateRoutes: RouteObject[] = [
  { path: '/loans',          element: <RequireAuth permission="loan.view"><LoansList /></RequireAuth> },
  { path: '/loans/new',      element: <RequireAuth permission="loan.create"><LoanForm /></RequireAuth> },
  { path: '/loans/:id',      element: <RequireAuth permission="loan.view"><LoanForm /></RequireAuth> },
];
