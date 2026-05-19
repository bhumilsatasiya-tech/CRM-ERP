export type EmployeeStatus = 'active' | 'inactive' | 'resigned' | 'terminated';
export type SalaryRunStatus = 'draft' | 'posted' | 'cancelled';
export type ComponentType = 'earning' | 'deduction';
export type FormulaType = 'fixed' | 'percent_of_basic';

export interface Designation { id: number; code: string; name: string; notes?: string }

export interface SalaryComponent {
  id: number;
  code: string;
  name: string;
  type: ComponentType;
  is_taxable: boolean;
  formula_type: FormulaType;
  formula_value: number;
  is_active: boolean;
  notes?: string | null;
}

export interface SalaryStructureSnapshot {
  effective_from: string;
  basic: number;
  components: Array<{
    code?: string; name: string; type: ComponentType; formula_type: FormulaType; formula_value: number;
  }>;
}

export interface Employee {
  id: number;
  company_id: number;
  code: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  designation_id?: number | null;
  designation?: { id: number; name: string } | null;
  user_id?: number | null;
  joining_date?: string | null;
  date_of_birth?: string | null;
  gender?: 'male' | 'female' | 'other' | null;
  status: EmployeeStatus;
  pan?: string | null;
  aadhar?: string | null;
  bank_name?: string | null;
  bank_account_no?: string | null;
  bank_ifsc?: string | null;
  notes?: string | null;
  latest_structure?: SalaryStructureSnapshot | null;
}

export interface PayslipBreakdown {
  earnings: Record<string, number>;
  deductions: Record<string, number>;
  gross: number;
  total_deductions: number;
  net_pay: number;
}

export interface Payslip {
  id: number;
  employee_id: number;
  employee_name?: string;
  employee_code?: string;
  gross: number;
  total_deductions: number;
  net_pay: number;
  breakdown?: PayslipBreakdown;
  paid_at?: string | null;
  payment_ref?: string | null;
}

export interface SalaryRun {
  id: number;
  company_id: number;
  code: string;
  period: string;
  period_start: string;
  period_end: string;
  status: SalaryRunStatus;
  posted_at?: string | null;
  cancelled_at?: string | null;
  payslips?: Payslip[];
  payslips_count?: number;
}
