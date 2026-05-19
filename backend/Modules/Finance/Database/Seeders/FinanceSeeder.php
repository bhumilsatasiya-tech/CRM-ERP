<?php

namespace Modules\Finance\Database\Seeders;

use Illuminate\Database\Seeder;
use Modules\Companies\Models\Company;
use Modules\Finance\Models\Account;
use Modules\Settings\Models\Sequence;

class FinanceSeeder extends Seeder
{
    public function run(): void
    {
        // Add 'journal_entry' sequence to all companies (idempotent)
        foreach (Company::all() as $company) {
            Sequence::firstOrCreate(
                ['company_id' => $company->id, 'doc_type' => 'journal_entry'],
                [
                    'name' => 'Journal Entry',
                    'prefix' => 'JE',
                    'format' => '{prefix}/{year}/{number}',
                    'padding' => 5,
                    'reset_period' => 'yearly',
                    'is_active' => true,
                    'current_number' => 0,
                ]
            );

            $this->seedChartOfAccounts($company->id);
        }
    }

    private function seedChartOfAccounts(int $companyId): void
    {
        // Group: Assets
        $assets = $this->upsert($companyId, '1000', 'Assets', 'asset', null, true);
        $bank   = $this->upsert($companyId, '1100', 'Bank',                    'asset', $assets->id);
        $cash   = $this->upsert($companyId, '1110', 'Cash',                    'asset', $assets->id);
        $ar     = $this->upsert($companyId, '1200', 'Accounts Receivable',     'asset', $assets->id);
        $arx    = $this->upsert($companyId, '1210', 'AR — Export',             'asset', $assets->id);
        $invR   = $this->upsert($companyId, '1300', 'Inventory — Raw',         'asset', $assets->id);
        $invF   = $this->upsert($companyId, '1310', 'Inventory — Finished',    'asset', $assets->id);

        // Group: Liabilities
        $liab   = $this->upsert($companyId, '2000', 'Liabilities', 'liability', null, true);
        $ap     = $this->upsert($companyId, '2100', 'Accounts Payable',        'liability', $liab->id);
        $taxP   = $this->upsert($companyId, '2200', 'Tax Payable',             'liability', $liab->id);
        $salP   = $this->upsert($companyId, '2300', 'Salary Payable',          'liability', $liab->id);

        // Group: Equity
        $eq     = $this->upsert($companyId, '3000', 'Equity', 'equity', null, true);
        $cap    = $this->upsert($companyId, '3100', 'Capital',                 'equity', $eq->id);
        $ret    = $this->upsert($companyId, '3200', 'Retained Earnings',       'equity', $eq->id);

        // Group: Income
        $inc    = $this->upsert($companyId, '4000', 'Income', 'income', null, true);
        $sales  = $this->upsert($companyId, '4100', 'Sales — Domestic',        'income', $inc->id);
        $salesX = $this->upsert($companyId, '4110', 'Sales — Export',          'income', $inc->id);
        $oInc   = $this->upsert($companyId, '4900', 'Other Income',            'income', $inc->id);

        // Group: Expense
        $exp    = $this->upsert($companyId, '5000', 'Expenses', 'expense', null, true);
        $cogs   = $this->upsert($companyId, '5100', 'Cost of Goods Sold',      'expense', $exp->id);
        $purch  = $this->upsert($companyId, '5110', 'Purchase Expenses',       'expense', $exp->id);
        $sal    = $this->upsert($companyId, '5200', 'Salary Expense',          'expense', $exp->id);
        $bnkChg = $this->upsert($companyId, '5300', 'Bank Charges & Comm.',    'expense', $exp->id);
        $tdsX   = $this->upsert($companyId, '5310', 'TDS Expense',             'expense', $exp->id);
        $taxIn  = $this->upsert($companyId, '5400', 'Tax — Input',             'expense', $exp->id);
        $office = $this->upsert($companyId, '5900', 'Office Expenses',         'expense', $exp->id);

        // Settings: default account ids per company (idempotent)
        $this->setSetting($companyId, 'finance.default_ar_account_id',                $ar->id);
        $this->setSetting($companyId, 'finance.default_ap_account_id',                $ap->id);
        $this->setSetting($companyId, 'finance.default_revenue_account_id',           $sales->id);
        $this->setSetting($companyId, 'finance.default_purchase_expense_account_id',  $purch->id);
        $this->setSetting($companyId, 'finance.default_tax_input_account_id',         $taxIn->id);
        $this->setSetting($companyId, 'finance.default_tax_output_account_id',        $taxP->id);
        $this->setSetting($companyId, 'finance.default_bank_account_id',              $bank->id);
        $this->setSetting($companyId, 'finance.default_cash_account_id',              $cash->id);
        $this->setSetting($companyId, 'finance.default_export_ar_account_id',         $arx->id);
        $this->setSetting($companyId, 'finance.default_inventory_account_id',         $invF->id);
        $this->setSetting($companyId, 'finance.default_cogs_account_id',              $cogs->id);
        $this->setSetting($companyId, 'finance.default_salary_expense_account_id',    $sal->id);
        $this->setSetting($companyId, 'finance.default_salary_payable_account_id',    $salP->id);
    }

    private function upsert(int $companyId, string $code, string $name, string $type, ?int $parentId = null, bool $isGroup = false): Account
    {
        return Account::firstOrCreate(
            ['company_id' => $companyId, 'code' => $code],
            ['name' => $name, 'type' => $type, 'parent_id' => $parentId, 'is_group' => $isGroup, 'is_system' => true]
        );
    }

    private function setSetting(int $companyId, string $key, mixed $value): void
    {
        \Modules\Settings\Models\Setting::updateOrCreate(
            ['scope' => 'company', 'scope_id' => $companyId, 'key' => $key],
            [
                'group' => 'finance',
                'value' => (string) $value,
                'type' => 'int',
                'label' => str_replace(['finance.default_', '_account_id'], ['', ''], $key) . ' account',
                'is_public' => false,
                'is_system' => true,
            ]
        );
    }
}
