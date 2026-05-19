import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import { RequireAuth } from '../01-auth';

const ProductsListPage = lazy(() => import('./pages/ProductsListPage'));
const ProductFormPage  = lazy(() => import('./pages/ProductFormPage'));
const CategoriesPage   = lazy(() => import('./pages/CategoriesPage'));
const UnitsPage        = lazy(() => import('./pages/UnitsPage'));

export const productsPrivateRoutes: RouteObject[] = [
  { path: '/products',                  element: <RequireAuth permission="product.view"><ProductsListPage /></RequireAuth> },
  { path: '/products/new',              element: <RequireAuth permission="product.create"><ProductFormPage /></RequireAuth> },
  { path: '/products/:id/edit',         element: <RequireAuth permission="product.update"><ProductFormPage /></RequireAuth> },
  { path: '/product-categories',        element: <RequireAuth permission="category.view"><CategoriesPage /></RequireAuth> },
  { path: '/product-units',             element: <RequireAuth permission="unit.view"><UnitsPage /></RequireAuth> },
];
