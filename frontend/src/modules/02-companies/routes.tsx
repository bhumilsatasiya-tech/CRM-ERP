import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import { RequireAuth } from '../01-auth';

const CompaniesListPage   = lazy(() => import('./pages/CompaniesListPage'));
const CompanyFormPage     = lazy(() => import('./pages/CompanyFormPage'));
const BranchesListPage    = lazy(() => import('./pages/BranchesListPage'));
const BranchFormPage      = lazy(() => import('./pages/BranchFormPage'));
const WarehousesListPage  = lazy(() => import('./pages/WarehousesListPage'));
const WarehouseFormPage   = lazy(() => import('./pages/WarehouseFormPage'));

export const companiesPrivateRoutes: RouteObject[] = [
  { path: '/companies',                                      element: <RequireAuth permission="company.view"><CompaniesListPage /></RequireAuth> },
  { path: '/companies/new',                                  element: <RequireAuth permission="company.create"><CompanyFormPage /></RequireAuth> },
  { path: '/companies/:id/edit',                             element: <RequireAuth permission="company.update"><CompanyFormPage /></RequireAuth> },

  { path: '/companies/:companyId/branches',                  element: <RequireAuth permission="branch.view"><BranchesListPage /></RequireAuth> },
  { path: '/companies/:companyId/branches/new',              element: <RequireAuth permission="branch.create"><BranchFormPage /></RequireAuth> },
  { path: '/companies/:companyId/branches/:branchId/edit',   element: <RequireAuth permission="branch.update"><BranchFormPage /></RequireAuth> },

  { path: '/companies/:companyId/warehouses',                                element: <RequireAuth permission="warehouse.view"><WarehousesListPage /></RequireAuth> },
  { path: '/companies/:companyId/warehouses/new',                            element: <RequireAuth permission="warehouse.create"><WarehouseFormPage /></RequireAuth> },
  { path: '/companies/:companyId/warehouses/:warehouseId/edit',              element: <RequireAuth permission="warehouse.update"><WarehouseFormPage /></RequireAuth> },
];
