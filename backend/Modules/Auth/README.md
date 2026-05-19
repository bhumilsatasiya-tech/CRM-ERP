# Module 1.1 — Auth (Users + Roles + Permissions)

**Menu position:** #22 — Users & Roles
**Folder:** `backend/Modules/Auth`
**Frontend twin:** `frontend/src/modules/01-auth`
**Depends on:** *(nothing — this is the foundation)*

## Responsibilities

- User authentication via Sanctum (API tokens)
- Login / logout / refresh / forgot-password / reset-password
- User CRUD (admin)
- Role CRUD with permissions assignment
- Permission registry (read-only — permissions defined by each module)
- 2FA hook (placeholder for future TOTP)

## Tables owned

| Table | Purpose |
|---|---|
| `users` | Auth principals — every login session belongs here |
| `password_reset_tokens` | Forgot-password flow |
| `personal_access_tokens` | Sanctum API tokens |
| `roles` | Role definitions (super-admin, admin, manager, etc.) |
| `permissions` | Permission definitions (module.action format) |
| `model_has_roles` | User ↔ Role pivot |
| `model_has_permissions` | Direct user permissions (rare; usually via role) |
| `role_has_permissions` | Role ↔ Permission pivot |

## API endpoints (`/api/v1`)

```
POST   /auth/login                 → AuthController@login
POST   /auth/logout                → AuthController@logout            [auth]
POST   /auth/refresh               → AuthController@refresh           [auth]
GET    /auth/me                    → AuthController@me                [auth]
POST   /auth/forgot-password       → AuthController@forgotPassword
POST   /auth/reset-password        → AuthController@resetPassword

GET    /users                      → UserController@index             [auth, can:user.view]
POST   /users                      → UserController@store             [auth, can:user.create]
GET    /users/{user}               → UserController@show              [auth, can:user.view]
PUT    /users/{user}               → UserController@update            [auth, can:user.update]
DELETE /users/{user}               → UserController@destroy           [auth, can:user.delete]
POST   /users/{user}/reset-pwd     → UserController@adminResetPassword [auth, can:user.update]

GET    /roles                      → RoleController@index             [auth, can:role.view]
POST   /roles                      → RoleController@store             [auth, can:role.create]
GET    /roles/{role}               → RoleController@show              [auth, can:role.view]
PUT    /roles/{role}               → RoleController@update            [auth, can:role.update]
DELETE /roles/{role}               → RoleController@destroy           [auth, can:role.delete]

GET    /permissions                → PermissionController@index       [auth, can:role.view]
```

## Default seeded roles

| Role | Permissions |
|---|---|
| `super-admin` | * (all permissions, bypasses gate via Gate::before) |
| `admin` | All except destructive system operations |
| `manager` | View + create + update on most modules |
| `accountant` | Finance, invoices, payments, ledger |
| `production` | Products, formula, batches, quality, inventory |
| `sales` | Quotation, sales orders, invoices, CRM |
| `viewer` | Read-only on all modules |

## Default seeded super-admin

```
email:    admin@crm-erp.local
password: ChangeMe@123
```

**You MUST change this password on first login.**

## Setup steps (one-time)

See [`docs/modules/01-auth.md`](../../docs/modules/01-auth.md).
