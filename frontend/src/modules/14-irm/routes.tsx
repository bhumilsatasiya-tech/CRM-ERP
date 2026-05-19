import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import { RequireAuth } from '../01-auth';

const IrmList         = lazy(() => import('./pages/IrmsListPage'));
const IrmForm         = lazy(() => import('./pages/IrmFormPage'));
const LodgementsList  = lazy(() => import('./pages/ExportLodgementsListPage'));
const LodgementBuild  = lazy(() => import('./pages/ExportLodgementPage'));
const LodgementDetail = lazy(() => import('./pages/ExportLodgementDetailPage'));

export const irmPrivateRoutes: RouteObject[] = [
  { path: '/irms',                    element: <RequireAuth permission="irm.view"><IrmList /></RequireAuth> },
  { path: '/irms/new',                element: <RequireAuth permission="irm.create"><IrmForm /></RequireAuth> },
  { path: '/irms/:id',                element: <RequireAuth permission="irm.view"><IrmForm /></RequireAuth> },
  { path: '/irms/:id/edit',           element: <RequireAuth permission="irm.update"><IrmForm /></RequireAuth> },
  { path: '/export-lodgement',        element: <RequireAuth permission="lodgement.view"><LodgementsList /></RequireAuth> },
  { path: '/export-lodgement/new',    element: <RequireAuth permission="lodgement.create"><LodgementBuild /></RequireAuth> },
  { path: '/export-lodgement/:id',    element: <RequireAuth permission="lodgement.view"><LodgementDetail /></RequireAuth> },
];
