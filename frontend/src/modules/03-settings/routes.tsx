import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import { RequireAuth } from '../01-auth';

const SettingsPage         = lazy(() => import('./pages/SettingsPage'));
const SequencesPage        = lazy(() => import('./pages/SequencesPage'));
const AuditLogPage         = lazy(() => import('./pages/AuditLogPage'));
const DocumentTemplatesPage = lazy(() => import('./pages/DocumentTemplatesPage'));

export const settingsPrivateRoutes: RouteObject[] = [
  { path: '/settings',           element: <RequireAuth permission="setting.view"><SettingsPage /></RequireAuth> },
  { path: '/sequences',          element: <RequireAuth permission="sequence.view"><SequencesPage /></RequireAuth> },
  { path: '/audit-logs',         element: <RequireAuth permission="audit.view"><AuditLogPage /></RequireAuth> },
  { path: '/document-templates', element: <RequireAuth permission="template.view"><DocumentTemplatesPage /></RequireAuth> },
];
