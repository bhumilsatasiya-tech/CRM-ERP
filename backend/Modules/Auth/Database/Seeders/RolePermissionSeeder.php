<?php

namespace Modules\Auth\Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolePermissionSeeder extends Seeder
{
    /**
     * Permission catalog.
     * Format: 'module.action' — e.g. 'user.view'.
     * Each future module will append its permissions here (or via its own seeder).
     */
    private const PERMISSIONS = [
        // Module 1.1 — Auth
        'user.view', 'user.create', 'user.update', 'user.delete', 'user.restore',
        'role.view', 'role.create', 'role.update', 'role.delete',
        'permission.view',

        // Module 1.2 — Companies (placeholders for forward-compat)
        'company.view', 'company.create', 'company.update', 'company.delete',
        'branch.view', 'branch.create', 'branch.update', 'branch.delete',
        'warehouse.view', 'warehouse.create', 'warehouse.update', 'warehouse.delete',

        // Module 1.3 — Settings + Sequences + Audit
        'setting.view', 'setting.update',
        'sequence.view', 'sequence.create', 'sequence.update', 'sequence.delete',
        'audit.view',

        // Module 2.1 — CRM (Partners)
        'partner.view', 'partner.create', 'partner.update', 'partner.delete', 'partner.export',

        // Module 2.2 — Products + Categories + Units
        'product.view', 'product.create', 'product.update', 'product.delete', 'product.export',
        'category.view', 'category.create', 'category.update', 'category.delete',
        'unit.view', 'unit.create', 'unit.update', 'unit.delete',

        // Module 3.1 — Inventory + Stock Ledger
        'stock.ledger.view',
        'stock.adjustment.view', 'stock.adjustment.create', 'stock.adjustment.update', 'stock.adjustment.delete', 'stock.adjustment.approve',
        'stock.transfer.view',   'stock.transfer.create',   'stock.transfer.update',   'stock.transfer.delete',

        // Module 3.2 — Purchase
        'purchase.order.view',   'purchase.order.create',   'purchase.order.update',   'purchase.order.delete',   'purchase.order.approve',
        'purchase.grn.view',     'purchase.grn.create',     'purchase.grn.update',     'purchase.grn.delete',
        'purchase.invoice.view', 'purchase.invoice.create', 'purchase.invoice.update', 'purchase.invoice.delete', 'purchase.invoice.post',

        // Module 4.1 — Quotation
        'quotation.view', 'quotation.create', 'quotation.update', 'quotation.delete', 'quotation.approve',

        // Module 4.2 — Sales
        'sales.order.view', 'sales.order.create', 'sales.order.update', 'sales.order.delete', 'sales.order.approve',
        'invoice.view',     'invoice.create',     'invoice.update',     'invoice.delete',
        'invoice.post',     'invoice.payment',

        // Module 4.3 — Production Batches + QC
        'production.view', 'production.create', 'production.update', 'production.delete',
        'production.submit', 'production.approve', 'production.start', 'production.complete', 'production.cancel',
        'production.quality.view', 'production.quality.record',

        // Module 4.4 — Order Tracking
        'tracking.view',

        // Module 2.3 — Formula + Costing
        'formula.view', 'formula.create', 'formula.update', 'formula.delete', 'formula.activate',

        // Module 4.5 — Export Management
        'export.invoice.view', 'export.invoice.create', 'export.invoice.update', 'export.invoice.delete', 'export.invoice.post',
        'export.shipping.view', 'export.shipping.create', 'export.shipping.update', 'export.shipping.delete', 'export.shipping.dispatch',
        'export.packing.view', 'export.packing.create', 'export.packing.update', 'export.packing.delete', 'export.packing.finalize',
        'export.taxinvoice.view', 'export.taxinvoice.create', 'export.taxinvoice.update', 'export.taxinvoice.delete', 'export.taxinvoice.post',

        // Module 4.6 — IRM + Bank Closure
        'irm.view', 'irm.create', 'irm.update', 'irm.delete', 'irm.close',
        'lodgement.view', 'lodgement.create', 'lodgement.update', 'lodgement.delete', 'lodgement.submit',

        // Module 5.4 — Inter-Company Billing
        'intercompany.view', 'intercompany.create', 'intercompany.update', 'intercompany.delete', 'intercompany.post', 'intercompany.cancel',

        // Module 5.1 — Finance + Ledger
        'finance.account.view', 'finance.account.create', 'finance.account.update', 'finance.account.delete',
        'finance.journal.view', 'finance.journal.create', 'finance.journal.update', 'finance.journal.delete', 'finance.journal.post', 'finance.journal.cancel',
        'finance.period.view', 'finance.period.close', 'finance.period.reopen',
        'finance.report.view',

        // Module 5.2 — Loans
        'loan.view', 'loan.create', 'loan.update', 'loan.delete', 'loan.payment', 'loan.close',

        // Module 5.3 — HR + Salary
        'hr.employee.view', 'hr.employee.create', 'hr.employee.update', 'hr.employee.delete',
        'hr.designation.view', 'hr.designation.create', 'hr.designation.update', 'hr.designation.delete',
        'hr.salary.structure.view', 'hr.salary.structure.edit',
        'hr.payroll.view', 'hr.payroll.run', 'hr.payroll.post', 'hr.payroll.cancel', 'hr.payroll.markpaid',

        // Module 6.1 — Documents
        'document.view', 'document.upload', 'document.delete',

        // Module 6.2 — Tasks + Reminders
        'task.view', 'task.create', 'task.update', 'task.delete', 'task.assign',

        // Module 6.3 — Communication
        'comm.view', 'comm.send.email', 'comm.send.whatsapp', 'comm.template.manage',

        // Module 6.4 — Reports
        'report.view',

        // Module 6.5 — Dashboard
        'dashboard.view',

        // Module 6.6 — Export Incentives (Drawback / IGST refund / RoDTEP)
        'export.incentive.view', 'export.incentive.create', 'export.incentive.update', 'export.incentive.delete',

        // Module 6.7 — Document Templates (PDF rendering)
        'template.view', 'template.create', 'template.update', 'template.delete',
        'document.pdf.download',

        // Module 26 — Project Costing (manual cost entries per project)
        'project.cost.view', 'project.cost.create', 'project.cost.update',
        'project.cost.delete', 'project.cost.finalize',

        // Security module — module-lock toggle (admin-only). PIN set/use is open to every authenticated user.
        'security.lock.manage',
    ];

    private const ROLES = [
        'super-admin' => ['*'],
        'admin' => [
            'user.view', 'user.create', 'user.update', 'user.delete',
            'role.view', 'role.create', 'role.update', 'role.delete',
            'permission.view',
            'company.view', 'company.update',
            'branch.view', 'branch.create', 'branch.update',
            'warehouse.view', 'warehouse.create', 'warehouse.update',
            'setting.view', 'setting.update',
            'sequence.view', 'sequence.create', 'sequence.update', 'sequence.delete',
            'audit.view',
            'partner.view', 'partner.create', 'partner.update', 'partner.delete', 'partner.export',
            'product.view', 'product.create', 'product.update', 'product.delete', 'product.export',
            'category.view', 'category.create', 'category.update', 'category.delete',
            'unit.view', 'unit.create', 'unit.update', 'unit.delete',
            'stock.ledger.view',
            'stock.adjustment.view', 'stock.adjustment.create', 'stock.adjustment.update', 'stock.adjustment.delete', 'stock.adjustment.approve',
            'stock.transfer.view', 'stock.transfer.create', 'stock.transfer.update', 'stock.transfer.delete',
            'purchase.order.view', 'purchase.order.create', 'purchase.order.update', 'purchase.order.delete', 'purchase.order.approve',
            'purchase.grn.view', 'purchase.grn.create', 'purchase.grn.update', 'purchase.grn.delete',
            'purchase.invoice.view', 'purchase.invoice.create', 'purchase.invoice.update', 'purchase.invoice.delete', 'purchase.invoice.post',
            'quotation.view', 'quotation.create', 'quotation.update', 'quotation.delete', 'quotation.approve',
            'sales.order.view', 'sales.order.create', 'sales.order.update', 'sales.order.delete', 'sales.order.approve',
            'invoice.view', 'invoice.create', 'invoice.update', 'invoice.delete', 'invoice.post', 'invoice.payment',
            'production.view', 'production.create', 'production.update', 'production.delete',
            'production.submit', 'production.approve', 'production.start', 'production.complete', 'production.cancel',
            'production.quality.view', 'production.quality.record',
            'tracking.view',
            'formula.view', 'formula.create', 'formula.update', 'formula.delete', 'formula.activate',
            'export.invoice.view', 'export.invoice.create', 'export.invoice.update', 'export.invoice.delete', 'export.invoice.post',
            'export.shipping.view', 'export.shipping.create', 'export.shipping.update', 'export.shipping.delete', 'export.shipping.dispatch',
            'export.packing.view', 'export.packing.create', 'export.packing.update', 'export.packing.delete', 'export.packing.finalize',
            'export.taxinvoice.view', 'export.taxinvoice.create', 'export.taxinvoice.update', 'export.taxinvoice.delete', 'export.taxinvoice.post',
            'irm.view', 'irm.create', 'irm.update', 'irm.delete', 'irm.close',
            'lodgement.view', 'lodgement.create', 'lodgement.update', 'lodgement.delete', 'lodgement.submit',
            'intercompany.view', 'intercompany.create', 'intercompany.update', 'intercompany.delete', 'intercompany.post', 'intercompany.cancel',
            'finance.account.view', 'finance.account.create', 'finance.account.update', 'finance.account.delete',
            'finance.journal.view', 'finance.journal.create', 'finance.journal.update', 'finance.journal.delete', 'finance.journal.post', 'finance.journal.cancel',
            'finance.period.view', 'finance.period.close', 'finance.period.reopen', 'finance.report.view',
            'loan.view', 'loan.create', 'loan.update', 'loan.delete', 'loan.payment', 'loan.close',
            'hr.employee.view', 'hr.employee.create', 'hr.employee.update', 'hr.employee.delete',
            'hr.designation.view', 'hr.designation.create', 'hr.designation.update', 'hr.designation.delete',
            'hr.salary.structure.view', 'hr.salary.structure.edit',
            'hr.payroll.view', 'hr.payroll.run', 'hr.payroll.post', 'hr.payroll.cancel', 'hr.payroll.markpaid',
            'document.view', 'document.upload', 'document.delete',
            'task.view', 'task.create', 'task.update', 'task.delete', 'task.assign',
            'comm.view', 'comm.send.email', 'comm.send.whatsapp', 'comm.template.manage',
            'report.view', 'dashboard.view',
            'export.incentive.view', 'export.incentive.create', 'export.incentive.update', 'export.incentive.delete',
            'template.view', 'template.create', 'template.update', 'template.delete', 'document.pdf.download',
            'project.cost.view', 'project.cost.create', 'project.cost.update', 'project.cost.delete', 'project.cost.finalize',
            'security.lock.manage',
        ],
        'manager' => [
            'user.view',
            'role.view', 'permission.view',
            'company.view', 'branch.view', 'warehouse.view',
            'setting.view', 'sequence.view', 'audit.view',
            'partner.view', 'partner.create', 'partner.update', 'partner.export',
            'product.view', 'product.create', 'product.update', 'product.export',
            'category.view', 'category.create', 'category.update',
            'unit.view',
            'stock.ledger.view',
            'stock.adjustment.view', 'stock.adjustment.create', 'stock.adjustment.update', 'stock.adjustment.approve',
            'stock.transfer.view', 'stock.transfer.create', 'stock.transfer.update',
            'purchase.order.view', 'purchase.order.create', 'purchase.order.update', 'purchase.order.approve',
            'purchase.grn.view', 'purchase.grn.create', 'purchase.grn.update',
            'purchase.invoice.view', 'purchase.invoice.create', 'purchase.invoice.update', 'purchase.invoice.post',
            'quotation.view', 'quotation.create', 'quotation.update', 'quotation.approve',
            'sales.order.view', 'sales.order.create', 'sales.order.update', 'sales.order.approve',
            'invoice.view', 'invoice.create', 'invoice.update', 'invoice.post', 'invoice.payment',
            'production.view', 'production.create', 'production.update',
            'production.submit', 'production.approve', 'production.start', 'production.complete', 'production.cancel',
            'production.quality.view', 'production.quality.record',
            'tracking.view',
            'formula.view', 'formula.create', 'formula.update', 'formula.activate',
            'export.invoice.view', 'export.invoice.create', 'export.invoice.update', 'export.invoice.post',
            'export.shipping.view', 'export.shipping.create', 'export.shipping.update', 'export.shipping.dispatch',
            'export.packing.view', 'export.packing.create', 'export.packing.update', 'export.packing.finalize',
            'export.taxinvoice.view', 'export.taxinvoice.create', 'export.taxinvoice.update', 'export.taxinvoice.post',
            'irm.view', 'irm.create', 'irm.update', 'irm.close',
            'lodgement.view', 'lodgement.create', 'lodgement.update', 'lodgement.submit',
            'intercompany.view', 'intercompany.create', 'intercompany.update', 'intercompany.post', 'intercompany.cancel',
            'finance.account.view', 'finance.account.create', 'finance.account.update',
            'finance.journal.view', 'finance.journal.create', 'finance.journal.update', 'finance.journal.post', 'finance.journal.cancel',
            'finance.period.view', 'finance.report.view',
            'loan.view', 'loan.create', 'loan.update', 'loan.payment', 'loan.close',
            'hr.employee.view', 'hr.employee.create', 'hr.employee.update',
            'hr.designation.view', 'hr.designation.create', 'hr.designation.update',
            'hr.salary.structure.view', 'hr.salary.structure.edit',
            'hr.payroll.view', 'hr.payroll.run', 'hr.payroll.post', 'hr.payroll.markpaid',
            'document.view', 'document.upload',
            'task.view', 'task.create', 'task.update', 'task.assign',
            'comm.view', 'comm.send.email', 'comm.send.whatsapp',
            'report.view', 'dashboard.view',
            'export.incentive.view', 'export.incentive.create', 'export.incentive.update',
            'template.view', 'template.update', 'document.pdf.download',
            'project.cost.view', 'project.cost.create', 'project.cost.update',
        ],
        'viewer' => [
            'user.view', 'role.view', 'permission.view',
            'company.view', 'branch.view', 'warehouse.view',
            'setting.view', 'audit.view',
            'partner.view',
            'product.view', 'category.view', 'unit.view',
            'stock.ledger.view', 'stock.adjustment.view', 'stock.transfer.view',
            'purchase.order.view', 'purchase.grn.view', 'purchase.invoice.view',
            'quotation.view', 'sales.order.view', 'invoice.view',
            'production.view', 'production.quality.view',
            'tracking.view',
            'formula.view',
            'export.invoice.view', 'export.shipping.view', 'export.packing.view', 'export.taxinvoice.view',
            'irm.view', 'lodgement.view',
            'intercompany.view',
            'finance.account.view', 'finance.journal.view', 'finance.report.view',
            'loan.view',
            'hr.employee.view', 'hr.designation.view', 'hr.salary.structure.view', 'hr.payroll.view',
            'document.view',
            'task.view',
            'comm.view',
            'report.view', 'dashboard.view',
            'export.incentive.view',
            'template.view', 'document.pdf.download',
            'project.cost.view',
        ],
    ];

    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach (self::PERMISSIONS as $perm) {
            [$module] = explode('.', $perm);
            Permission::firstOrCreate(
                ['name' => $perm, 'guard_name' => 'web'],
                ['module' => $module]
            );
            Permission::firstOrCreate(
                ['name' => $perm, 'guard_name' => 'api'],
                ['module' => $module]
            );
        }

        foreach (self::ROLES as $roleName => $perms) {
            $role = Role::firstOrCreate(
                ['name' => $roleName, 'guard_name' => 'api'],
                ['is_system' => true, 'description' => ucfirst($roleName) . ' role']
            );

            if ($perms === ['*']) {
                $role->syncPermissions(Permission::where('guard_name', 'api')->get());
            } else {
                $role->syncPermissions(
                    Permission::where('guard_name', 'api')->whereIn('name', $perms)->get()
                );
            }
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
