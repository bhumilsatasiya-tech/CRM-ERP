import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import { RequireAuth } from '../01-auth';

const PartnersListPage = lazy(() => import('./pages/PartnersListPage'));
const PartnerFormPage  = lazy(() => import('./pages/PartnerFormPage'));

export const crmPrivateRoutes: RouteObject[] = [
  { path: '/partners',          element: <RequireAuth permission="partner.view"><PartnersListPage /></RequireAuth> },
  { path: '/partners/new',      element: <RequireAuth permission="partner.create"><PartnerFormPage /></RequireAuth> },
  { path: '/partners/:id/edit', element: <RequireAuth permission="partner.update"><PartnerFormPage /></RequireAuth> },
];
