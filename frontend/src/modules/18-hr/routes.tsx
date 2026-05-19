import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import { RequireAuth } from '../01-auth';

const EmployeesList = lazy(() => import('./pages/EmployeesListPage'));
const EmployeeForm  = lazy(() => import('./pages/EmployeeFormPage'));
const Designations  = lazy(() => import('./pages/DesignationsPage'));
const Components    = lazy(() => import('./pages/SalaryComponentsPage'));
const RunsList      = lazy(() => import('./pages/SalaryRunsListPage'));
const RunForm       = lazy(() => import('./pages/SalaryRunFormPage'));

export const hrPrivateRoutes: RouteObject[] = [
  { path: '/employees',                element: <RequireAuth permission="hr.employee.view"><EmployeesList /></RequireAuth> },
  { path: '/employees/new',            element: <RequireAuth permission="hr.employee.create"><EmployeeForm /></RequireAuth> },
  { path: '/employees/:id',            element: <RequireAuth permission="hr.employee.view"><EmployeeForm /></RequireAuth> },
  { path: '/employees/:id/edit',       element: <RequireAuth permission="hr.employee.update"><EmployeeForm /></RequireAuth> },
  { path: '/designations',             element: <RequireAuth permission="hr.designation.view"><Designations /></RequireAuth> },
  { path: '/salary-components',        element: <RequireAuth permission="hr.salary.structure.view"><Components /></RequireAuth> },
  { path: '/salary-runs',              element: <RequireAuth permission="hr.payroll.view"><RunsList /></RequireAuth> },
  { path: '/salary-runs/:id',          element: <RequireAuth permission="hr.payroll.view"><RunForm /></RequireAuth> },
];
