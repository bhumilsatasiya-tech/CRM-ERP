# Frontend Module 1.1 — Auth

**Backend twin:** `backend/Modules/Auth`

## Pages
- `LoginPage` — `/login`
- `ForgotPasswordPage` — `/forgot-password`
- `ResetPasswordPage` — `/reset-password`
- `UsersListPage` — `/users`
- `UserFormPage` — `/users/new`, `/users/:id/edit`
- `RolesListPage` — `/roles`
- `RoleFormPage` — `/roles/new`, `/roles/:id/edit`

## State
- `authSlice` — current user, access token, login/logout actions, persisted to localStorage
- `authApi` (RTK Query) — login, refresh, me, forgot/reset
- `userApi` (RTK Query) — user CRUD
- `roleApi` (RTK Query) — role CRUD + permissions

## Auth flow
1. Login → token stored in memory + localStorage (`auth.access_token`)
2. Axios interceptor adds `Authorization: Bearer <token>` to every request
3. On 401 → tries `POST /auth/refresh` once; if that fails → logout + redirect to `/login`
4. `me` is fetched on app boot if token exists
