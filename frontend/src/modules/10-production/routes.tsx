import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import { RequireAuth } from '../01-auth';
import { ModuleLockGuard } from '../27-security';

const BatchesList = lazy(() => import('./pages/ProductionBatchesListPage'));
const BatchForm   = lazy(() => import('./pages/ProductionBatchFormPage'));

// Production routes are guarded by ModuleLockGuard. When admin toggles
// "Production" lock OFF (default), the guard passes through transparently.
// When ON, every entry into a production page prompts for the user's PIN.
export const productionPrivateRoutes: RouteObject[] = [
  { path: '/production-batches',           element: <RequireAuth permission="production.view"><ModuleLockGuard moduleKey="production"><BatchesList /></ModuleLockGuard></RequireAuth> },
  { path: '/production-batches/new',       element: <RequireAuth permission="production.create"><ModuleLockGuard moduleKey="production"><BatchForm /></ModuleLockGuard></RequireAuth> },
  { path: '/production-batches/:id',       element: <RequireAuth permission="production.view"><ModuleLockGuard moduleKey="production"><BatchForm /></ModuleLockGuard></RequireAuth> },
  { path: '/production-batches/:id/edit',  element: <RequireAuth permission="production.update"><ModuleLockGuard moduleKey="production"><BatchForm /></ModuleLockGuard></RequireAuth> },
];
