import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import { RequireAuth } from '../01-auth';

const MessagesList = lazy(() => import('./pages/MessagesListPage'));
const Templates    = lazy(() => import('./pages/TemplatesPage'));

export const commsPrivateRoutes: RouteObject[] = [
  { path: '/comm/messages',  element: <RequireAuth permission="comm.view"><MessagesList /></RequireAuth> },
  { path: '/comm/templates', element: <RequireAuth permission="comm.view"><Templates /></RequireAuth> },
];
