# Module 1.1 — Auth (Users + Roles + Permissions)

Foundation module. Required by every other module — install before anything else.

| | |
|---|---|
| Backend | `backend/Modules/Auth/` |
| Frontend | `frontend/src/modules/01-auth/` |
| Menu # | 22 (Users & Roles) |
| Tables created | `users`, `password_reset_tokens`, `personal_access_tokens`, `roles`, `permissions`, `model_has_roles`, `model_has_permissions`, `role_has_permissions` |
| Default super-admin | `admin@crm-erp.local` / `ChangeMe@123` (forced change on first login) |

---

## 1. Prerequisites (one-time, host machine)

| Tool | Required version | Where |
|---|---|---|
| PHP | 8.2+ | XAMPP includes — add `C:\xampp\php` to PATH |
| Composer | 2.x | https://getcomposer.org/ |
| Node | 20 LTS | https://nodejs.org/ |
| MySQL | 8.x | XAMPP — start via control panel |
| Git | latest | https://git-scm.com/download/win |

Verify in a fresh PowerShell:

```powershell
php -v ; composer --version ; node -v ; npm -v ; git --version
```

All five must print versions. Node must be `v20.x` or higher.

---

## 2. Database

Open phpMyAdmin (http://localhost/phpmyadmin) and run:

```sql
CREATE DATABASE IF NOT EXISTS crm_erp DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'crm_erp_user'@'localhost' IDENTIFIED BY 'StrongPasswordHere';
GRANT ALL PRIVILEGES ON crm_erp.* TO 'crm_erp_user'@'localhost';
FLUSH PRIVILEGES;
```

Update the password in `backend/.env` → `DB_PASSWORD`.

---

## 3. Install (one command)

```powershell
E:\CRM+ERP\scripts\install-module-1.bat
```

This script:

1. Verifies all CLI tools are on PATH.
2. Runs `composer create-project laravel/laravel backend` if `backend/` is empty.
3. Installs `laravel/sanctum`, `spatie/laravel-permission`, `spatie/laravel-activitylog`.
4. Copies `.env.example` → `.env`, generates `APP_KEY`.
5. Publishes Spatie permission + activitylog migrations.
6. Runs all migrations + seeders.
7. Scaffolds Vite + React if `frontend/` is empty.
8. Installs `antd`, `axios`, `react-router-dom`, `@reduxjs/toolkit`, `react-redux`.

> **Manual integration step required after `composer create-project`:**
> open `backend/bootstrap/providers.php` (Laravel 11) and add:
> ```php
> Modules\Auth\Providers\AuthServiceProvider::class,
> ```
> Also add to `backend/composer.json` under `autoload.psr-4`:
> ```json
> "Modules\\": "Modules/"
> ```
> Then run `composer dump-autoload`.

---

## 4. Run

Open three terminals:

```powershell
E:\CRM+ERP\scripts\start-backend.bat     # http://localhost:8000
E:\CRM+ERP\scripts\start-frontend.bat    # http://localhost:5173
E:\CRM+ERP\scripts\queue-worker.bat      # background jobs
```

For scheduled jobs (reminders, daily exports), open Windows Task Scheduler and create a task that runs `E:\CRM+ERP\scripts\scheduler.bat` every 1 minute.

---

## 5. First login

1. Open http://localhost:5173/login
2. Email: `admin@crm-erp.local`
3. Password: `ChangeMe@123`
4. The system flags `must_change_password = true` → change it on first sign-in.

---

## 6. API smoke test

```powershell
# Login
curl -X POST http://localhost:8000/api/v1/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"admin@crm-erp.local","password":"ChangeMe@123"}'

# Use the access_token from the response:
curl http://localhost:8000/api/v1/auth/me `
  -H "Authorization: Bearer <access_token>"
```

---

## 7. Default seeded roles

| Role | Permissions | Use case |
|---|---|---|
| `super-admin` | * (bypass via `Gate::before`) | System owner |
| `admin` | All non-system management | Daily admin |
| `manager` | Read on all modules, write on assigned modules | Team lead |
| `viewer` | Read-only | Auditor |

Additional business roles (`accountant`, `production`, `sales`) get added once their respective modules ship.

---

## 8. Permission naming convention

`<module>.<action>` — e.g. `user.view`, `role.update`, `invoice.create`.

Each future module appends its permission set in `RolePermissionSeeder` (or its own seeder). Frontend `<RequireAuth permission="...">` gate wraps protected routes.

---

## 9. File map (Module 1.1)

### Backend — `backend/Modules/Auth/`

```
module.json
README.md
Config/config.php
Database/
├── Migrations/
│   ├── 2026_01_01_000001_create_users_table.php
│   ├── 2026_01_01_000002_create_password_reset_tokens_table.php
│   ├── 2026_01_01_000003_create_personal_access_tokens_table.php
│   └── 2026_01_01_000004_create_permission_tables.php
└── Seeders/
    ├── AuthDatabaseSeeder.php
    ├── RolePermissionSeeder.php
    └── AdminUserSeeder.php
Models/User.php
Http/
├── Controllers/{Auth,User,Role,Permission}Controller.php
├── Requests/{Login,ForgotPassword,ResetPassword,StoreUser,UpdateUser,AdminResetPassword,StoreRole,UpdateRole}Request.php
└── Resources/{User,Role,Permission}Resource.php
Services/{Auth,User,Role}Service.php
Policies/{User,Role}Policy.php
Providers/AuthServiceProvider.php
Routes/api.php
```

### Frontend — `frontend/src/modules/01-auth/`

```
README.md
index.ts
routes.tsx
api/{axiosInstance,authApi,userApi,roleApi}.ts
store/authSlice.ts
types/auth.types.ts
components/{RequireAuth,PermissionMatrix}.tsx
pages/{Login,ForgotPassword,ResetPassword,UsersList,UserForm,RolesList,RoleForm}Page.tsx
```

---

## 10. Cloud deployment (later)

Module 1.1 needs **zero code change** to deploy. Switch in `.env`:

| Local | Cloud |
|---|---|
| `DB_HOST=127.0.0.1` | RDS endpoint |
| `SHARED_STORAGE_DRIVER=local` | `s3` (fill AWS_*) |
| `QUEUE_CONNECTION=database` | `redis` / `sqs` |
| `MAIL_HOST=smtp.gmail.com` | SES / Mailgun |
| `VITE_API_BASE_URL=http://localhost:8000/api/v1` | `https://api.yourdomain.com/api/v1` |

`SANCTUM_STATEFUL_DOMAINS` and `CORS_ALLOWED_ORIGINS` must list the production frontend domain.

---

## 11. What's next

When Module 1.1 is verified working (login + user CRUD + role CRUD), proceed to:

> **Module 1.2 — Companies + Branches + Warehouses** (multi-company foundation, used by every business table from here on).
