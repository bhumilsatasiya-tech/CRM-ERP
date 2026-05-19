import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import { RequireAuth } from '../01-auth';
import { ModuleLockGuard } from '../27-security';

const ProjectsList = lazy(() => import('./pages/ProjectsListPage'));
const ProjectForm  = lazy(() => import('./pages/ProjectFormPage'));

// All Project Costing routes go through ModuleLockGuard — if admin toggled
// "Project Costing" lock ON (Settings → Security), users must enter their PIN.
// If toggled OFF the guard is a transparent pass-through.
export const projectsPrivateRoutes: RouteObject[] = [
  { path: '/projects',           element: <RequireAuth permission="project.cost.view"><ModuleLockGuard moduleKey="project_costing"><ProjectsList /></ModuleLockGuard></RequireAuth> },
  { path: '/projects/new',       element: <RequireAuth permission="project.cost.create"><ModuleLockGuard moduleKey="project_costing"><ProjectForm /></ModuleLockGuard></RequireAuth> },
  { path: '/projects/:id/edit',  element: <RequireAuth permission="project.cost.view"><ModuleLockGuard moduleKey="project_costing"><ProjectForm /></ModuleLockGuard></RequireAuth> },
];
