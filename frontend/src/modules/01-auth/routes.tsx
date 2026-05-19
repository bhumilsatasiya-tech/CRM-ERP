import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import RequireAuth from './components/RequireAuth';

const LoginPage          = lazy(() => import('./pages/LoginPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage  = lazy(() => import('./pages/ResetPasswordPage'));
const UsersListPage      = lazy(() => import('./pages/UsersListPage'));
const UserFormPage       = lazy(() => import('./pages/UserFormPage'));
const RolesListPage      = lazy(() => import('./pages/RolesListPage'));
const RoleFormPage       = lazy(() => import('./pages/RoleFormPage'));

export const authPublicRoutes: RouteObject[] = [
  { path: '/login',           element: <LoginPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password',  element: <ResetPasswordPage /> },
];

export const authPrivateRoutes: RouteObject[] = [
  {
    path: '/users',
    element: <RequireAuth permission="user.view"><UsersListPage /></RequireAuth>,
  },
  {
    path: '/users/new',
    element: <RequireAuth permission="user.create"><UserFormPage /></RequireAuth>,
  },
  {
    path: '/users/:id/edit',
    element: <RequireAuth permission="user.update"><UserFormPage /></RequireAuth>,
  },
  {
    path: '/roles',
    element: <RequireAuth permission="role.view"><RolesListPage /></RequireAuth>,
  },
  {
    path: '/roles/new',
    element: <RequireAuth permission="role.create"><RoleFormPage /></RequireAuth>,
  },
  {
    path: '/roles/:id/edit',
    element: <RequireAuth permission="role.update"><RoleFormPage /></RequireAuth>,
  },
];
