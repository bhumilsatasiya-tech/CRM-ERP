import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import { RequireAuth } from '../01-auth';

const TasksList = lazy(() => import('./pages/TasksListPage'));
const TaskForm  = lazy(() => import('./pages/TaskFormPage'));

export const tasksPrivateRoutes: RouteObject[] = [
  { path: '/tasks',        element: <RequireAuth permission="task.view"><TasksList /></RequireAuth> },
  { path: '/tasks/new',    element: <RequireAuth permission="task.create"><TaskForm /></RequireAuth> },
  { path: '/tasks/:id',    element: <RequireAuth permission="task.view"><TaskForm /></RequireAuth> },
];
