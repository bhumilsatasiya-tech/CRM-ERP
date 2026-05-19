import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, DatePicker, Divider, Form, Input, InputNumber, Modal, Row, Select, Space, Switch, Table, Tag, Typography, message } from 'antd';
import { confirmDelete } from '../../common/confirmDelete';
import { CloseOutlined, DeleteOutlined, DollarCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import dayjs, { type Dayjs } from 'dayjs';
import { irmApi } from '../api/irmApi';
import { exportInvoiceApi } from '../../13-export/api/exportApi';
import PartnerSmartDropdown from '../../common/PartnerSmartDropdown';
import type { Irm, IrmStatus, IrmPurpose } from '../types/irm.types';

const CURRENCY_OPTIONS = ['USD', 'EUR', 'GBP', 'AED', 'JPY', 'CNY', 'AUD', 'CAD', 'SGD', 'INR'].map((c) => ({ value: c, label: c }));

interface HeaderShape {
  code: string;
  purpose: IrmPurpose;
  partner_id?: number | null;
  export_invoice_id?: number | null;
  purchase_order_ref?: string;
  proforma_invoice_no?: string;
  bank_name?: string;
  remitter_name?: string;
  bank_ref_no?: string;
  irm_date: Dayjs;
  irm_amount_fcy: number;
  irm_currency: string;
  exchange_rate: number;
  purpose_code?: string;
  notes?: string;
}

interface AllocateShape {
  export_invoice_id: number;
  amount_fcy: number;
  exchange_rate: number;
  allocation_date: Dayjs;
  is_full_realization: boolean;
  notes?: string;
}

export default function IrmFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const fromEi = params.get('from_ei');

  const [form] = Form.useForm<HeaderShape>();
  const [closeForm] = Form.useForm<{ realization_date: Dayjs; bank_ref?: string; commission?: number; tds?: number; net_inr?: number; notes?: string }>();
  const [allocForm] = Form.useForm<AllocateShape>();

  const [irm, setIrm] = useState<Irm | null>(null);
  const [eiOpts, setEiOpts] = useState<Array<{ value: number; label: string; balance?: number; currency?: string }>>([]);
  const [partnerLabel, setPartnerLabel] = useState<string | undefined>(undefined);
  const [allocEiOpts, setAllocEiOpts] = useState<Array<{ value: number; label: string; balance: number; currency: string }>>([]);
  const [loading, setLoading] = useState(false); const [saving, setSaving] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [allocOpen, setAllocOpen] = useState(false); const [allocating, setAllocating] = useState(false);

  const watchedPurpose = (Form.useWatch('purpose', form) as IrmPurpose | undefined) ?? 'against_invoice';
  const watchedPartner = Form.useWatch('partner_id', form) as number | undefined;

  useEffect(() => {
    if (!editing || !id) return;
    setLoading(true);
    irmApi.get(Number(id)).then((x) => {
      setIrm(x);
      form.setFieldsValue({
        code: x.code,
        purpose: x.purpose,
        partner_id: x.partner_id ?? null,
        export_invoice_id: x.export_invoice_id ?? null,
        purchase_order_ref: x.purchase_order_ref ?? undefined,
        proforma_invoice_no: x.proforma_invoice_no ?? undefined,
        bank_name: x.bank_name ?? undefined,
        remitter_name: x.remitter_name ?? undefined,
        bank_ref_no: x.bank_ref_no ?? undefined,
        irm_date: dayjs(x.irm_date),
        irm_amount_fcy: x.irm_amount_fcy,
        irm_currency: x.irm_currency,
        exchange_rate: x.exchange_rate,
        purpose_code: x.purpose_code ?? undefined,
        notes: x.notes ?? undefined,
      });
      if (x.partner) setPartnerLabel(`${x.partner.code} — ${x.partner.name}`);
      if (x.export_invoice) setEiOpts([{ value: x.export_invoice.id, label: `${x.export_invoice.code} (${x.export_invoice.currency} ${Number(x.export_invoice.balance).toFixed(2)} due)`, balance: x.export_invoice.balance, currency: x.export_invoice.currency }]);
    }).catch(() => message.error('Failed to load.')).finally(() => setLoading(false));
  }, [editing, id, form]);

  // Prefill from EI (?from_ei=)
  useEffect(() => {
    if (editing) return;
    if (!fromEi) return;
    (async () => {
      try {
        const ei = await exportInvoiceApi.get(Number(fromEi));
        form.setFieldsValue({
          purpose: 'against_invoice',
          export_invoice_id: ei.id,
          partner_id: ei.partner_id,
          irm_currency: ei.currency,
          irm_amount_fcy: ei.balance,
          exchange_rate: ei.exchange_rate || 1,
          irm_date: dayjs(),
        });
        if (ei.partner) setPartnerLabel(`${ei.partner.code} — ${ei.partner.name}`);
        setEiOpts([{ value: ei.id, label: `${ei.code} (${ei.currency} ${ei.balance.toFixed(2)} due)`, balance: ei.balance, currency: ei.currency }]);
      } catch { message.error('Could not prefill from export invoice.'); }
    })();
  }, [editing, fromEi, form]);

  const onSearchEi = async (q: string) => {
    if (!q) return;
    try {
      const r = await exportInvoiceApi.list({ search: q, per_page: 20 });
      setEiOpts(r.data.map((e) => ({ value: e.id, label: `${e.code} (${e.currency} ${Number(e.balance).toFixed(2)} due)`, balance: e.balance, currency: e.currency })));
    } catch { /* ignore */ }
  };

  // Load EI options for the Allocate modal — same partner as the IRM, with open balance
  const loadAllocEis = async () => {
    if (!irm?.partner_id) return;
    try {
      const r = await exportInvoiceApi.list({ partner_id: irm.partner_id, per_page: 50 });
      const open = r.data
        .filter((e) => Number(e.balance) > 0.01 && e.status !== 'cancelled')
        .map((e) => ({ value: e.id, label: `${e.code} (${e.currency} ${Number(e.balance).toFixed(2)} due)`, balance: e.balance, currency: e.currency }));
      setAllocEiOpts(open);
    } catch { /* ignore */ }
  };

  const onSave = async () => {
    setSaving(true);
    try {
      const v = await form.validateFields();
      const payload = {
        code: v.code,
        purpose: 'advance' as IrmPurpose,
        partner_id: v.partner_id ?? null,
        export_invoice_id: null,
        purchase_order_ref: v.purchase_order_ref,
        proforma_invoice_no: v.proforma_invoice_no,
        bank_name: v.bank_name,
        remitter_name: v.remitter_name,
        bank_ref_no: v.bank_ref_no,
        irm_date: v.irm_date.format('YYYY-MM-DD'),
        irm_amount_fcy: v.irm_amount_fcy,
        irm_currency: v.irm_currency,
        exchange_rate: v.exchange_rate,
        purpose_code: v.purpose_code,
        notes: v.notes,
      };
      if (editing && irm) { setIrm(await irmApi.update(irm.id, payload)); message.success('Saved.'); }
      else {
        const created = await irmApi.create(payload);
        message.success('IRM recorded — open Export Lodgement to allocate against invoices when ready.');
        navigate(`/irms/${created.id}`, { replace: true });
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Save failed.');
    } finally { setSaving(false); }
  };

  const onClose = async () => {
    if (!irm) return;
    try {
      const v = await closeForm.validateFields();
      const r = await irmApi.close(irm.id, {
        realization_date: v.realization_date.format('YYYY-MM-DD'),
        bank_ref: v.bank_ref, commission: v.commission ?? 0, tds: v.tds ?? 0,
        net_inr: v.net_inr,
        notes: v.notes,
      });
      setIrm(r.irm);
      setCloseOpen(false); closeForm.resetFields();
      message.success('IRM closed.');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Close failed.');
    }
  };

  const onCancel = async () => { if (!irm) return; try { setIrm(await irmApi.cancel(irm.id, 'Cancelled by user')); message.success('Cancelled — all allocations reversed.'); } catch (e: unknown) { const err = e as { response?: { data?: { message?: string } } }; message.error(err.response?.data?.message ?? 'Cancel failed.'); } };

  const openAllocate = () => {
    if (!irm) return;
    void loadAllocEis();
    allocForm.setFieldsValue({
      allocation_date: dayjs(),
      exchange_rate: irm.exchange_rate || 1,
      amount_fcy: irm.outstanding_amount_fcy,
      is_full_realization: false,
    });
    setAllocOpen(true);
  };

  const onAllocate = async () => {
    if (!irm) return;
    setAllocating(true);
    try {
      const v = await allocForm.validateFields();
      const updated = await irmApi.allocate(irm.id, {
        export_invoice_id: v.export_invoice_id,
        amount_fcy: v.amount_fcy,
        exchange_rate: v.exchange_rate,
        allocation_date: v.allocation_date.format('YYYY-MM-DD'),
        is_full_realization: v.is_full_realization,
        notes: v.notes,
      });
      setIrm(updated);
      message.success('Allocation recorded.');
      setAllocOpen(false); allocForm.resetFields();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Allocation failed.');
    } finally { setAllocating(false); }
  };

  const onDeallocate = async (allocId: number) => {
    if (!irm) return;
    try {
      const updated = await irmApi.deallocate(irm.id, allocId);
      setIrm(updated);
      message.success('Allocation removed.');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'De-allocation failed.');
    }
  };

  const status: IrmStatus | undefined = irm?.status;
  const headerLocked = !!status && (status === 'closed' || status === 'cancelled');
  const editLocked = headerLocked || (irm?.allocations?.length ?? 0) > 0;
  const canAllocate = irm && !headerLocked && Number(irm.outstanding_amount_fcy) > 0.01;

  return (
    <Card loading={loading}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space style={{ justifyContent: 'space-between', width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>{editing ? `IRM ${irm?.code ?? ''}` : 'New IRM'} {status && <Tag style={{ marginLeft: 8 }} color={status === 'closed' ? 'green' : status === 'cancelled' ? 'red' : status === 'allocated' ? 'orange' : 'cyan'}>{status.replace('_', ' ')}</Tag>}</Typography.Title>
          <Space>
            <Button onClick={() => navigate('/irms')}>Back</Button>
            {!editLocked && <Button type="primary" loading={saving} onClick={onSave}>{editing ? 'Save' : 'Create'}</Button>}
            {canAllocate && <Button type="primary" icon={<PlusOutlined />} onClick={openAllocate}>Allocate to invoice</Button>}
            {!headerLocked && irm && (
              <Button type="primary" icon={<DollarCircleOutlined />} onClick={() => { closeForm.setFieldsValue({ realization_date: dayjs(), commission: 0, tds: 0, net_inr: irm.irm_amount_inr }); setCloseOpen(true); }}>Close (bank realization)</Button>
            )}
            {!headerLocked && irm && (
              <Button danger icon={<CloseOutlined />}
                onClick={() => confirmDelete({
                  title: 'Cancel this IRM?',
                  content: 'All live allocations will be reversed and the export invoice paid amounts adjusted.',
                  okText: 'Yes, cancel',
                  onOk: onCancel,
                })}>Cancel</Button>
            )}
          </Space>
        </Space>

        {irm && (
          <Card size="small" style={{ background: '#f6ffed', borderColor: '#b7eb8f' }}>
            <Row gutter={16}>
              <Col xs={12} md={4}><Typography.Text type="secondary">Received</Typography.Text><br /><strong>{irm.irm_currency} {Number(irm.irm_amount_fcy).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></Col>
              <Col xs={12} md={4}><Typography.Text type="secondary">Outstanding</Typography.Text><br /><strong style={{ color: Number(irm.outstanding_amount_fcy) > 0 ? '#d4380d' : '#52c41a' }}>{irm.irm_currency} {Number(irm.outstanding_amount_fcy).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></Col>
              <Col xs={12} md={4}><Typography.Text type="secondary">Allocated</Typography.Text><br /><strong>{irm.irm_currency} {(Number(irm.irm_amount_fcy) - Number(irm.outstanding_amount_fcy)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></Col>
              <Col xs={12} md={4}><Typography.Text type="secondary">Total INR</Typography.Text><br /><strong>₹ {Number(irm.irm_amount_inr).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></Col>
              <Col xs={12} md={4}><Typography.Text type="secondary">Available INR</Typography.Text><br /><strong>₹ {Number(irm.outstanding_amount_inr).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></Col>
              <Col xs={12} md={4}><Typography.Text type="secondary">Exchange rate</Typography.Text><br /><strong>{Number(irm.exchange_rate).toFixed(4)} INR/{irm.irm_currency}</strong></Col>
            </Row>
          </Card>
        )}

        {watchedPurpose === 'advance' && !editing && (
          <Alert type="info" showIcon message="Advance receipt: payment lands first, against a Purchase Order. Allocate to specific export invoice(s) later when goods ship." />
        )}
        {watchedPurpose === 'against_invoice' && !editing && (
          <Alert type="info" showIcon message="Direct allocation: the full amount auto-allocates to the chosen export invoice on save." />
        )}
        {editLocked && irm && (irm.allocations?.length ?? 0) > 0 && (
          <Alert type="warning" showIcon message="Header is locked because this IRM has live allocations. Remove all allocations to unlock editing." />
        )}
        {status === 'closed' && <Alert type="success" showIcon message="IRM closed. Bank realization recorded." />}

        <Form form={form} layout="vertical" initialValues={{ irm_date: dayjs(), irm_currency: 'USD', exchange_rate: 1, purpose: 'advance' }}>
          <Divider orientation="left" plain>Identity</Divider>
          <Row gutter={16}>
            <Col xs={12} md={3}><Form.Item label="IRM code (optional)" name="code" extra="auto from sequence if blank"><Input placeholder="auto" disabled={editLocked || editing} /></Form.Item></Col>
            <Col xs={12} md={3}><Form.Item label="Bank ref no." name="bank_ref_no"><Input disabled={editLocked} placeholder="e.g. 0930GRSB25..." /></Form.Item></Col>
            <Col xs={12} md={4}><Form.Item label="IRM date" name="irm_date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} disabled={editLocked} /></Form.Item></Col>
            <Col xs={12} md={5}><Form.Item label="Bank name" name="bank_name"><Input disabled={editLocked} /></Form.Item></Col>
            <Col xs={12} md={9}><Form.Item label="Remitter name" name="remitter_name"><Input disabled={editLocked} placeholder="e.g. PREMIER UK TRADING LIMITED" /></Form.Item></Col>
            {/* purpose is hidden — service defaults to 'advance' when no EI is set */}
            <Form.Item name="purpose" hidden><Input /></Form.Item>
            <Form.Item name="export_invoice_id" hidden><Input /></Form.Item>
          </Row>

          <Divider orientation="left" plain>Party & references</Divider>
          <Row gutter={16}>
            <Col xs={24} md={10}>
              <Form.Item label="Partner (client paying)" name="partner_id" rules={[{ required: true, message: 'Partner is required.' }]}>
                <PartnerSmartDropdown
                  type="client"
                  placeholder="Search client..."
                  disabled={editLocked}
                  fallbackLabel={partnerLabel}
                  onPartnerSelect={(p) => { if (p?.code && p?.name) setPartnerLabel(`${p.code} — ${p.name}`); }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={7}>
              <Form.Item label="Purchase order ref (optional)" name="purchase_order_ref">
                <Input disabled={editLocked} placeholder="Buyer PO no." />
              </Form.Item>
            </Col>
            <Col xs={24} md={7}>
              <Form.Item label="Proforma invoice no. (optional)" name="proforma_invoice_no">
                <Input disabled={editLocked} placeholder="e.g. PI/2026/0042" />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" plain>Amount</Divider>
          <Row gutter={16}>
            <Col xs={12} md={3}><Form.Item label="Currency" name="irm_currency" rules={[{ required: true }]}><Select options={CURRENCY_OPTIONS} disabled={editLocked} /></Form.Item></Col>
            <Col xs={12} md={4}><Form.Item label="Amount FCY" name="irm_amount_fcy" rules={[{ required: true }]}><InputNumber min={0.01} step={0.01} disabled={editLocked} style={{ width: '100%' }} /></Form.Item></Col>
            <Col xs={12} md={4}><Form.Item label="Receipt exchange rate" name="exchange_rate" rules={[{ required: true }]}><InputNumber min={0.000001} step={0.0001} disabled={editLocked} style={{ width: '100%' }} /></Form.Item></Col>
            <Col xs={12} md={4}><Form.Item label="RBI purpose code" name="purpose_code"><Input disabled={editLocked} placeholder="e.g. P0103" /></Form.Item></Col>
            <Col xs={24}><Form.Item label="Notes" name="notes"><Input.TextArea rows={2} disabled={editLocked} /></Form.Item></Col>
          </Row>
        </Form>

        {/* === Allocations panel === */}
        {irm && (
          <Card size="small" title={
            <Space style={{ justifyContent: 'space-between', width: '100%' }}>
              <span>Allocations ({irm.allocations?.length ?? 0})</span>
              {canAllocate && <Button size="small" type="primary" icon={<PlusOutlined />} onClick={openAllocate}>New allocation</Button>}
            </Space>
          }>
            <Table
              rowKey="id"
              dataSource={irm.allocations ?? []}
              size="small"
              pagination={false}
              locale={{ emptyText: 'No allocations yet — this IRM is sitting as advance.' }}
              columns={[
                { title: 'Date', dataIndex: 'allocation_date', width: 110 },
                { title: 'Export invoice', key: 'ei', render: (_, r) => r.export_invoice ? <Link to={`/export-invoices/${r.export_invoice.id}`}><Tag color="blue">{r.export_invoice.code}</Tag></Link> : '—' },
                { title: 'Amount FCY', dataIndex: 'amount_fcy', align: 'right' as const, width: 130, render: (v: number) => `${irm.irm_currency} ${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
                { title: 'X-rate', dataIndex: 'exchange_rate', align: 'right' as const, width: 100, render: (v: number) => Number(v).toFixed(4) },
                { title: 'Amount INR', dataIndex: 'amount_inr', align: 'right' as const, width: 140, render: (v: number) => `₹ ${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
                { title: 'Full?', dataIndex: 'is_full_realization', width: 80, align: 'center' as const, render: (v: boolean) => v ? <Tag color="green">YES</Tag> : '' },
                { title: 'Notes', dataIndex: 'notes' },
                { title: '', key: 'rm', width: 50, render: (_, r) => !headerLocked && (
                  <Button size="small" danger icon={<DeleteOutlined />}
                    onClick={() => confirmDelete({
                      title: 'Reverse this allocation?',
                      content: "The export invoice's paid amount will decrease.",
                      onOk: () => onDeallocate(r.id),
                    })} />
                )},
              ]}
            />
          </Card>
        )}

        {irm && irm.realizations && irm.realizations.length > 0 && (
          <Card size="small" title="Bank realizations">
            <Table
              rowKey="id"
              dataSource={irm.realizations}
              size="small"
              pagination={false}
              columns={[
                { title: 'Date', dataIndex: 'realization_date', width: 120 },
                { title: 'Bank ref', dataIndex: 'bank_ref' },
                { title: 'Commission', dataIndex: 'commission', align: 'right' as const, width: 120, render: (v: number) => Number(v).toFixed(2) },
                { title: 'TDS', dataIndex: 'tds', align: 'right' as const, width: 100, render: (v: number) => Number(v).toFixed(2) },
                { title: 'Net INR', dataIndex: 'net_inr', align: 'right' as const, width: 130, render: (v: number) => `₹ ${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
                { title: 'Notes', dataIndex: 'notes' },
              ]}
            />
          </Card>
        )}
      </Space>

      {/* === Allocate modal === */}
      <Modal open={allocOpen} title={`Allocate to export invoice — outstanding ${irm?.irm_currency ?? ''} ${Number(irm?.outstanding_amount_fcy ?? 0).toFixed(2)}`} onCancel={() => setAllocOpen(false)} onOk={onAllocate} confirmLoading={allocating} okText="Allocate" width={640}>
        <Form form={allocForm} layout="vertical">
          <Form.Item label="Export invoice (same partner, with open balance)" name="export_invoice_id" rules={[{ required: true }]}>
            <Select
              placeholder={allocEiOpts.length ? 'Pick an open export invoice...' : 'Loading...'}
              options={allocEiOpts}
              showSearch filterOption={(input, opt) => (opt?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())}
              onChange={(eiId: number) => {
                const o = allocEiOpts.find((x) => x.value === eiId);
                if (o) {
                  // Auto-suggest amount = min(IRM outstanding, EI balance in same currency)
                  const suggest = Math.min(Number(irm?.outstanding_amount_fcy ?? 0), Number(o.balance ?? 0));
                  if (suggest > 0) allocForm.setFieldValue('amount_fcy', Number(suggest.toFixed(2)));
                }
              }}
            />
          </Form.Item>
          <Row gutter={16}>
            <Col xs={12}><Form.Item label={`Amount (${irm?.irm_currency ?? 'FCY'})`} name="amount_fcy" rules={[{ required: true, type: 'number', min: 0.01, max: irm?.outstanding_amount_fcy }]}><InputNumber min={0.01} step={0.01} max={irm?.outstanding_amount_fcy} style={{ width: '100%' }} /></Form.Item></Col>
            <Col xs={12}><Form.Item label="Allocation exchange rate (optional override)" name="exchange_rate" rules={[{ required: true, type: 'number', min: 0.000001 }]}><InputNumber min={0.000001} step={0.0001} style={{ width: '100%' }} /></Form.Item></Col>
            <Col xs={12}><Form.Item label="Allocation date" name="allocation_date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
            <Col xs={12}><Form.Item label="Mark full realization" name="is_full_realization" valuePropName="checked"><Switch /></Form.Item></Col>
            <Col xs={24}><Form.Item label="Notes" name="notes"><Input.TextArea rows={2} /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>

      <Modal open={closeOpen} title="Close IRM (record bank realization)" onCancel={() => setCloseOpen(false)} onOk={onClose} okText="Close IRM">
        <Form form={closeForm} layout="vertical" initialValues={{ realization_date: dayjs(), commission: 0, tds: 0 }}>
          <Form.Item label="Realization date" name="realization_date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
          <Form.Item label="Bank reference" name="bank_ref"><Input placeholder="Bank credit advice no." /></Form.Item>
          <Row gutter={16}>
            <Col xs={12}><Form.Item label="Commission (INR)" name="commission"><InputNumber min={0} step={0.01} style={{ width: '100%' }} /></Form.Item></Col>
            <Col xs={12}><Form.Item label="TDS (INR)" name="tds"><InputNumber min={0} step={0.01} style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
          <Form.Item label="Net INR (auto)" name="net_inr"><InputNumber min={0} step={0.01} style={{ width: '100%' }} /></Form.Item>
          <Form.Item label="Notes" name="notes"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
