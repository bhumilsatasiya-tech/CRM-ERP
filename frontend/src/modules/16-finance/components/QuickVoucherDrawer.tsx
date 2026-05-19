import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Button, Col, DatePicker, Drawer, Form, Input, InputNumber, Row, Select, Space, Tabs, Typography, message,
} from 'antd';
import { CheckOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import PartnerSmartDropdown from '../../common/PartnerSmartDropdown';
import { accountApi } from '../api/financeApi';
import { voucherApi, type OpenInvoicesResp } from '../api/voucherApi';
import type { Account } from '../types/finance.types';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Optional initial tab — set by external events (keyboard shortcuts, gateway tiles). */
  initialTab?: string;
}

type TabKey = 'buyer-receipt' | 'supplier-payment' | 'bank-receipt' | 'expense' | 'contra';
const VALID_TABS: TabKey[] = ['buyer-receipt', 'supplier-payment', 'bank-receipt', 'expense', 'contra'];

const MODE_OPTIONS = [
  { value: 'bank', label: 'Bank' },
  { value: 'cash', label: 'Cash' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' },
];

/**
 * One-stop quick-entry drawer for vouchers. Five tabs share the same drawer
 * so the user can switch between Buyer Receipt → Supplier Payment etc. without
 * losing context (each tab has its own AntD Form so state is preserved while
 * the drawer is open). Closing the drawer resets everything.
 */
export default function QuickVoucherDrawer({ open, onClose, initialTab }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('buyer-receipt');
  const [accounts, setAccounts] = useState<Account[]>([]);

  useEffect(() => {
    if (!open) return;
    accountApi.list({ per_page: 500 }).then((r) => setAccounts(r.data.filter((a) => !a.is_group))).catch(() => undefined);
  }, [open]);

  // When opened with a specific tab id (from a keyboard shortcut or gateway tile), jump to it.
  useEffect(() => {
    if (open && initialTab && (VALID_TABS as string[]).includes(initialTab)) {
      setActiveTab(initialTab as TabKey);
    }
  }, [open, initialTab]);

  return (
    <Drawer
      title="+ New voucher"
      width={460}
      open={open}
      onClose={onClose}
      destroyOnClose
      bodyStyle={{ paddingTop: 0 }}
    >
      <Tabs
        activeKey={activeTab}
        onChange={(k) => setActiveTab(k as TabKey)}
        items={[
          { key: 'buyer-receipt',    label: 'Buyer Receipt',    children: <BuyerReceiptTab onSaved={() => undefined} /> },
          { key: 'supplier-payment', label: 'Supplier Payment', children: <SupplierPaymentTab onSaved={() => undefined} /> },
          { key: 'bank-receipt',     label: 'Bank Receipt',     children: <BankReceiptTab accounts={accounts} onSaved={() => undefined} /> },
          { key: 'expense',          label: 'Expense',          children: <ExpenseTab accounts={accounts} onSaved={() => undefined} /> },
          { key: 'contra',           label: 'Contra',           children: <ContraTab accounts={accounts} onSaved={() => undefined} /> },
        ]}
      />
    </Drawer>
  );
}

/* ---------- Buyer Receipt tab ---------- */

function BuyerReceiptTab({ onSaved }: { onSaved: () => void }) {
  return <PartnerVoucherTab type="buyer-receipt" partnerType="client" partnerLabel="Buyer (client)" successWord="received" onSaved={onSaved} />;
}

function SupplierPaymentTab({ onSaved }: { onSaved: () => void }) {
  return <PartnerVoucherTab type="supplier-payment" partnerType="supplier" partnerLabel="Supplier" successWord="paid" onSaved={onSaved} />;
}

interface PartnerVoucherTabProps {
  type: 'buyer-receipt' | 'supplier-payment';
  partnerType: 'client' | 'supplier';
  partnerLabel: string;
  successWord: string;
  onSaved: () => void;
}

interface PartnerVoucherShape {
  partner_id?: number;
  amount?: number;
  payment_date?: Dayjs;
  mode?: string;
  reference?: string;
  notes?: string;
}

function PartnerVoucherTab({ type, partnerType, partnerLabel, successWord, onSaved }: PartnerVoucherTabProps) {
  const [form] = Form.useForm<PartnerVoucherShape>();
  const [partnerId, setPartnerId] = useState<number | undefined>();
  const [openData, setOpenData] = useState<OpenInvoicesResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadOpen = async (pid: number) => {
    setLoading(true);
    try { setOpenData(await voucherApi.openInvoices(pid, type === 'buyer-receipt' ? 'sales' : 'purchase')); }
    catch { message.error('Failed to load open invoices.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (partnerId) void loadOpen(partnerId); }, [partnerId, type]); // eslint-disable-line

  const onSave = async (resetAndContinue: boolean) => {
    try {
      const v = await form.validateFields();
      if (!v.partner_id || !v.amount) return;
      if (openData && v.amount > openData.total_outstanding + 0.01) {
        message.error(`Amount ${v.amount} exceeds total outstanding ${openData.total_outstanding.toFixed(2)}.`);
        return;
      }
      setSaving(true);
      const payload = {
        partner_id: v.partner_id,
        amount: v.amount,
        payment_date: (v.payment_date ?? dayjs()).format('YYYY-MM-DD'),
        mode: v.mode ?? 'bank',
        reference: v.reference,
        notes: v.notes,
      };
      const r = type === 'buyer-receipt'
        ? await voucherApi.buyerReceipt(payload)
        : await voucherApi.supplierPayment(payload);
      message.success(`${successWord} ${r.total_applied.toFixed(2)} across ${r.payments_created} invoices.`);
      if (resetAndContinue) {
        form.resetFields(['amount', 'reference', 'notes']);
        if (partnerId) void loadOpen(partnerId);
      } else {
        form.resetFields();
        setPartnerId(undefined);
        setOpenData(null);
      }
      onSaved();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      if (err.response?.data?.message) message.error(err.response.data.message);
    } finally { setSaving(false); }
  };

  return (
    <Form<PartnerVoucherShape> form={form} layout="vertical" initialValues={{ payment_date: dayjs(), mode: 'bank' }}>
      <Form.Item label={partnerLabel} name="partner_id" rules={[{ required: true }]}>
        <PartnerSmartDropdown
          type={partnerType}
          placeholder={`Search ${partnerLabel.toLowerCase()}...`}
          onPartnerSelect={(p) => p?.id && setPartnerId(Number(p.id))}
        />
      </Form.Item>

      {openData && (
        <Alert
          style={{ marginBottom: 12 }} type="info" showIcon
          message={`${openData.count} open invoices · total outstanding ${openData.total_outstanding.toFixed(2)}`}
          action={<Button size="small" icon={<ReloadOutlined />} loading={loading} onClick={() => partnerId && loadOpen(partnerId)} />}
        />
      )}

      <Row gutter={12}>
        <Col span={12}><Form.Item label="Amount" name="amount" rules={[{ required: true, type: 'number', min: 0.01 }]}><InputNumber min={0.01} step={0.01} style={{ width: '100%' }} /></Form.Item></Col>
        <Col span={12}><Form.Item label="Date" name="payment_date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
        <Col span={12}><Form.Item label="Mode" name="mode"><Select options={MODE_OPTIONS} /></Form.Item></Col>
        <Col span={12}><Form.Item label="Reference" name="reference"><Input placeholder="Bank ref / cheque no." /></Form.Item></Col>
        <Col span={24}><Form.Item label="Notes" name="notes"><Input.TextArea rows={2} /></Form.Item></Col>
      </Row>

      <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>
        Auto-applied oldest-first across open invoices.
      </Typography.Text>

      <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
        <Button onClick={() => onSave(true)} loading={saving}>Save &amp; add another</Button>
        <Button type="primary" icon={<CheckOutlined />} onClick={() => onSave(false)} loading={saving}>Save</Button>
      </Space>
    </Form>
  );
}

/* ---------- Bank Receipt tab ---------- */

interface BankExpenseShape {
  amount?: number;
  account_id?: number;
  payment_date?: Dayjs;
  mode?: 'bank' | 'cash';
  reference?: string;
  notes?: string;
}

function BankReceiptTab({ accounts, onSaved }: { accounts: Account[]; onSaved: () => void }) {
  return <BankOrExpenseTab
    accounts={accounts}
    title="Bank Receipt"
    accountLabel="Source / counter-account (e.g. Capital, Loan, Other Income)"
    apiCall={voucherApi.bankReceipt}
    suggestedTypes={['equity', 'income', 'liability']}
    onSaved={onSaved}
  />;
}

function ExpenseTab({ accounts, onSaved }: { accounts: Account[]; onSaved: () => void }) {
  return <BankOrExpenseTab
    accounts={accounts}
    title="Expense"
    accountLabel="Expense account"
    apiCall={voucherApi.expense}
    suggestedTypes={['expense']}
    onSaved={onSaved}
  />;
}

interface BankOrExpenseTabProps {
  accounts: Account[];
  title: string;
  accountLabel: string;
  apiCall: typeof voucherApi.bankReceipt;
  suggestedTypes: string[];
  onSaved: () => void;
}

function BankOrExpenseTab({ accounts, accountLabel, apiCall, suggestedTypes, onSaved }: BankOrExpenseTabProps) {
  const [form] = Form.useForm<BankExpenseShape>();
  const [saving, setSaving] = useState(false);

  const opts = useMemo(() => {
    const filtered = accounts.filter((a) => suggestedTypes.includes(a.type));
    return filtered.map((a) => ({ value: a.id, label: `${a.code} — ${a.name}` }));
  }, [accounts, suggestedTypes]);

  const onSave = async (resetAndContinue: boolean) => {
    try {
      const v = await form.validateFields();
      if (!v.amount || !v.account_id) return;
      setSaving(true);
      const r = await apiCall({
        amount: v.amount,
        account_id: v.account_id,
        payment_date: (v.payment_date ?? dayjs()).format('YYYY-MM-DD'),
        mode: v.mode ?? 'bank',
        reference: v.reference,
        notes: v.notes,
      });
      message.success(`Posted journal ${r.code}.`);
      if (resetAndContinue) form.resetFields(['amount', 'reference', 'notes']);
      else form.resetFields();
      onSaved();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      if (err.response?.data?.message) message.error(err.response.data.message);
    } finally { setSaving(false); }
  };

  return (
    <Form<BankExpenseShape> form={form} layout="vertical" initialValues={{ payment_date: dayjs(), mode: 'bank' }}>
      <Form.Item label={accountLabel} name="account_id" rules={[{ required: true }]}>
        <Select
          showSearch placeholder="Pick account..."
          filterOption={(q, opt) => String(opt?.label ?? '').toLowerCase().includes(q.toLowerCase())}
          options={opts}
        />
      </Form.Item>
      <Row gutter={12}>
        <Col span={12}><Form.Item label="Amount" name="amount" rules={[{ required: true, type: 'number', min: 0.01 }]}><InputNumber min={0.01} step={0.01} style={{ width: '100%' }} /></Form.Item></Col>
        <Col span={12}><Form.Item label="Date" name="payment_date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
        <Col span={12}><Form.Item label="Through" name="mode"><Select options={[{ value: 'bank', label: 'Bank' }, { value: 'cash', label: 'Cash' }]} /></Form.Item></Col>
        <Col span={12}><Form.Item label="Reference" name="reference"><Input placeholder="Bank ref / cheque" /></Form.Item></Col>
        <Col span={24}><Form.Item label="Notes" name="notes"><Input.TextArea rows={2} /></Form.Item></Col>
      </Row>
      <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
        <Button onClick={() => onSave(true)} loading={saving}>Save &amp; add another</Button>
        <Button type="primary" icon={<CheckOutlined />} onClick={() => onSave(false)} loading={saving}>Save</Button>
      </Space>
    </Form>
  );
}

/* ---------- Contra tab ---------- */

interface ContraShape {
  amount?: number;
  from_account_id?: number;
  to_account_id?: number;
  payment_date?: Dayjs;
  reference?: string;
  notes?: string;
}

function ContraTab({ accounts, onSaved }: { accounts: Account[]; onSaved: () => void }) {
  const [form] = Form.useForm<ContraShape>();
  const [saving, setSaving] = useState(false);

  // Contra is always between asset accounts (cash/bank).
  const opts = useMemo(() =>
    accounts.filter((a) => a.type === 'asset').map((a) => ({ value: a.id, label: `${a.code} — ${a.name}` })),
  [accounts]);

  const onSave = async (resetAndContinue: boolean) => {
    try {
      const v = await form.validateFields();
      if (!v.amount || !v.from_account_id || !v.to_account_id) return;
      if (v.from_account_id === v.to_account_id) {
        message.error('From and To accounts must differ.');
        return;
      }
      setSaving(true);
      const r = await voucherApi.contra({
        amount: v.amount,
        from_account_id: v.from_account_id,
        to_account_id: v.to_account_id,
        payment_date: (v.payment_date ?? dayjs()).format('YYYY-MM-DD'),
        reference: v.reference,
        notes: v.notes,
      });
      message.success(`Posted journal ${r.code}.`);
      if (resetAndContinue) form.resetFields(['amount', 'reference', 'notes']);
      else form.resetFields();
      onSaved();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      if (err.response?.data?.message) message.error(err.response.data.message);
    } finally { setSaving(false); }
  };

  return (
    <Form<ContraShape> form={form} layout="vertical" initialValues={{ payment_date: dayjs() }}>
      <Form.Item label="From account" name="from_account_id" rules={[{ required: true }]}>
        <Select showSearch placeholder="Pick source account..."
          filterOption={(q, opt) => String(opt?.label ?? '').toLowerCase().includes(q.toLowerCase())}
          options={opts} />
      </Form.Item>
      <Form.Item label="To account" name="to_account_id" rules={[{ required: true }]}>
        <Select showSearch placeholder="Pick destination account..."
          filterOption={(q, opt) => String(opt?.label ?? '').toLowerCase().includes(q.toLowerCase())}
          options={opts} />
      </Form.Item>
      <Row gutter={12}>
        <Col span={12}><Form.Item label="Amount" name="amount" rules={[{ required: true, type: 'number', min: 0.01 }]}><InputNumber min={0.01} step={0.01} style={{ width: '100%' }} /></Form.Item></Col>
        <Col span={12}><Form.Item label="Date" name="payment_date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
        <Col span={24}><Form.Item label="Reference" name="reference"><Input placeholder="Cheque / transfer no." /></Form.Item></Col>
        <Col span={24}><Form.Item label="Notes" name="notes"><Input.TextArea rows={2} /></Form.Item></Col>
      </Row>
      <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>
        Used for Bank ↔ Cash withdrawals/deposits and Bank ↔ Bank transfers.
      </Typography.Text>
      <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
        <Button onClick={() => onSave(true)} loading={saving}>Save &amp; add another</Button>
        <Button type="primary" icon={<CheckOutlined />} onClick={() => onSave(false)} loading={saving}>Save</Button>
      </Space>
    </Form>
  );
}
