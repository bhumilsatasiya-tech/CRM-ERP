import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import { RequireAuth } from '../01-auth';

const FormulasList = lazy(() => import('./pages/FormulasListPage'));
const FormulaForm  = lazy(() => import('./pages/FormulaFormPage'));

export const formulaPrivateRoutes: RouteObject[] = [
  { path: '/formulas',           element: <RequireAuth permission="formula.view"><FormulasList /></RequireAuth> },
  { path: '/formulas/new',       element: <RequireAuth permission="formula.create"><FormulaForm /></RequireAuth> },
  { path: '/formulas/:id',       element: <RequireAuth permission="formula.view"><FormulaForm /></RequireAuth> },
  { path: '/formulas/:id/edit',  element: <RequireAuth permission="formula.update"><FormulaForm /></RequireAuth> },
];
