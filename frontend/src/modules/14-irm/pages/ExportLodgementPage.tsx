import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, DatePicker, Divider, Empty, Input, InputNumber, Modal, Row, Select, Space, Switch, Table, Tag, Typography, message } from 'antd';
import { DollarCircleOutlined, ReloadOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import dayjs, { type Dayjs } from 'dayjs';
import { irmApi } from '../api/irmApi';
import { lodgementApi } from '../api/lodgementApi';
import { exportInvoiceApi } from '../../13-export/api/exportApi';
import PartnerSmartDropdown from '../../common/PartnerSmartDropdown';
import type { Irm, IrmStatus } from '../types/irm.types';
import type { ExportInvoice } from '../../13-export/types/export.types';

interface MappingRow {
  key: string;
  irm_id: number;
  irm_code: string;
  irm_currency: string;
  irm_outstanding_fcy: number;
  irm_partner_name?: string;
  irm_remitter_name?: string;
  irm_date?: string;
  ei_id: number;
  ei_code: string;
  ei_balance: number;
  amount_fcy: number;
  exchange_rate: number;
  is_full_realization: boolean;
  is_third_party_payment: boolean;
  notes?: string;
}

const STATUSES_OPEN: IrmStatus[] = ['received', 'partially_allocated'];

export default function ExportLodgementPage() {
  const navigate = useNavigate();

  const [partnerId, setPartnerId] = useState<number | undefined>();
  const [partnerLabel, setPartnerLabel] = useState<string>('');

  const [irms, setIrms] = useState<Irm[]>([]);
  const [eis, setEis] = useState<ExportInvoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [includeThirdParty, setIncludeThirdParty] = useState<boolean>(false);

  const [mappings, setMappings] = useState<MappingRow[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Lodgement header inputs (manual fields the user fills in)
  const [lodgementDate, setLodgementDate] = useState<Dayjs>(dayjs());
  const [bankReceiptNo, setBankReceiptNo] = useState<string>('');
  const [bankReceiptDate, setBankReceiptDate] = useState<Dayjs | null>(null);
  const [headerNotes, setHeaderNotes] = useState<string>('');

  // Quick-allocate modal state
  const [qaOpen, setQaOpen] = useState(false);
  const [qaSourceIrm, setQaSourceIrm] = useState<Irm | null>(null);
  const [qaState, setQaState] = useState<{ ei_id?: number; amount_fcy?: number; exchange_rate?: number; is_full_realization: boolean; notes?: string }>({ is_full_realization: false });

  const fetchAll = async (pId: number, allIrms: boolean) => {
    setLoading(true);
    try {
      const irmParams = allIrms ? { per_page: 200 } : { partner_id: pId, per_page: 200 };
      const [irmRes, eiRes] = await Promise.all([
        irmApi.list(irmParams),
        exportInvoiceApi.list({ partner_id: pId, per_page: 100 }),
      ]);
      const openIrms = irmRes.data.filter((i) => STATUSES_OPEN.includes(i.status) && Number(i.outstanding_amount_fcy) > 0.01);
      const openEis = eiRes.data.filter((e) => Number(e.balance) > 0.01 && e.status !== 'cancelled');
      setIrms(openIrms);
      setEis(openEis);
    } catch { message.error('Failed to load.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (partnerId) void fetchAll(partnerId, includeThirdParty); else { setIrms([]); setEis([]); setMappings([]); } }, [partnerId, includeThirdParty]);

  const totalIrmReceived = irms.reduce((s, i) => s + Number(i.irm_amount_fcy), 0);
  const totalIrmUtilised = irms.reduce((s, i) => s + (Number(i.irm_amount_fcy) - Number(i.outstanding_amount_fcy)), 0);
  const totalIrmPending  = irms.reduce((s, i) => s + Number(i.outstanding_amount_fcy), 0);
  const totalEiOutstanding = eis.reduce((s, e) => s + Number(e.balance), 0);

  const totalToLodge = useMemo(() => mappings.reduce((s, m) => s + Number(m.amount_fcy || 0), 0), [mappings]);
  const totalToLodgeInr = useMemo(() => mappings.reduce((s, m) => s + Number(m.amount_fcy || 0) * Number(m.exchange_rate || 0), 0), [mappings]);

  const openQa = (irm: Irm) => {
    setQaSourceIrm(irm);
    setQaState({
      exchange_rate: irm.exchange_rate,
      amount_fcy: irm.outstanding_amount_fcy,
      is_full_realization: false,
    });
    setQaOpen(true);
  };

  const addMapping = () => {
    if (!qaSourceIrm) return;
    if (!qaState.ei_id) { message.error('Pick an export invoice.'); return; }
    if (!qaState.amount_fcy || qaState.amount_fcy <= 0) { message.error('Enter an amount.'); return; }
    const ei = eis.find((e) => e.id === qaState.ei_id);
    if (!ei) return;

    const alreadyMappedFromIrm = mappings.filter((m) => m.irm_id === qaSourceIrm.id).reduce((s, m) => s + Number(m.amount_fcy || 0), 0);
    const irmRemaining = Number(qaSourceIrm.outstanding_amount_fcy) - alreadyMappedFromIrm;
    if (qaState.amount_fcy > irmRemaining + 0.01) {
      message.error(`Amount exceeds IRM remaining (${qaSourceIrm.irm_currency} ${irmRemaining.toFixed(2)}) after pending mappings.`);
      return;
    }
    const alreadyMappedToEi = mappings.filter((m) => m.ei_id === qaState.ei_id).reduce((s, m) => s + Number(m.amount_fcy || 0), 0);
    const eiRemaining = Number(ei.balance) - alreadyMappedToEi;
    if (qaState.amount_fcy > eiRemaining + 0.01) {
      message.error(`Amount exceeds EI remaining (${ei.currency} ${eiRemaining.toFixed(2)}) after pending mappings.`);
      return;
    }

    // Auto-detect third party: IRM partner ≠ lodgement client (or IRM has no partner)
    const isThirdParty = !!partnerId && (!qaSourceIrm.partner_id || qaSourceIrm.partner_id !== partnerId);

    setMappings((prev) => [...prev, {
      key: `m-${Date.now()}-${Math.random()}`,
      irm_id: qaSourceIrm.id,
      irm_code: qaSourceIrm.code,
      irm_currency: qaSourceIrm.irm_currency,
      irm_outstanding_fcy: qaSourceIrm.outstanding_amount_fcy,
      irm_partner_name: qaSourceIrm.partner?.name,
      irm_remitter_name: qaSourceIrm.remitter_name ?? undefined,
      irm_date: qaSourceIrm.irm_date,
      ei_id: ei.id,
      ei_code: ei.code,
      ei_balance: ei.balance,
      amount_fcy: qaState.amount_fcy!,
      exchange_rate: qaState.exchange_rate ?? qaSourceIrm.exchange_rate,
      is_full_realization: !!qaState.is_full_realization,
      is_third_party_payment: isThirdParty,
      notes: qaState.notes,
    }]);
    setQaOpen(false);
  };

  const removeMapping = (key: string) => setMappings((prev) => prev.filter((m) => m.key !== key));
  const updateMapping = (key: string, patch: Partial<MappingRow>) => setMappings((prev) => prev.map((m) => m.key === key ? { ...m, ...patch } : m));

  const onSave = async () => {
    if (!partnerId) { message.error('Pick a client first.'); return; }
    if (mappings.length === 0) { message.warning('Add at least one mapping row.'); return; }
    setSubmitting(true);
    try {
      const lodge = await lodgementApi.create({
        partner_id: partnerId,
        lodgement_date: lodgementDate.format('YYYY-MM-DD'),
        bank_receipt_no: bankReceiptNo || undefined,
        bank_receipt_date: bankReceiptDate ? bankReceiptDate.format('YYYY-MM-DD') : undefined,
        notes: headerNotes || undefined,
        rows: mappings.map((m) => ({
          irm_id: m.irm_id,
          export_invoice_id: m.ei_id,
          amount_fcy: m.amount_fcy,
          exchange_rate: m.exchange_rate,
          is_full_realization: m.is_full_realization,
          is_third_party_payment: m.is_third_party_payment,
          notes: m.notes,
        })),
      });
      message.success(`Lodgement ${lodge.code} created — open it to enter bank receipt details and per-row status.`);
      navigate(`/export-lodgement/${lodge.id}`);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Save failed.');
    } finally { setSubmitting(false); }
  };

  return (
    <Card>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space style={{ justifyContent: 'space-between', width: '100%' }} wrap>
          <Typography.Title level={4} style={{ margin: 0 }}>New Export Lodgement</Typography.Title>
          <Space>
            <Button onClick={() => navigate('/export-lodgement')}>Back to list</Button>
            <PartnerSmartDropdown
              type="client"
              placeholder="Pick a client..."
              style={{ width: 320 }}
              value={partnerId ?? null}
              onChange={(v) => setPartnerId(v ?? undefined)}
              fallbackLabel={partnerLabel || undefined}
              onPartnerSelect={(p) => { if (p?.code && p?.name) setPartnerLabel(`${p.code} — ${p.name}`); }}
            />
            {partnerId && (
              <Space>
                <Switch checked={includeThirdParty} onChange={setIncludeThirdParty} />
                <Typography.Text>Show third-party IRMs</Typography.Text>
              </Space>
            )}
            {partnerId && <Button icon={<ReloadOutlined />} onClick={() => void fetchAll(partnerId, includeThirdParty)} loading={loading}>Refresh</Button>}
          </Space>
        </Space>

        <Alert type="info" showIcon message="Build a lodgement: pick the client, map IRM amounts to specific export invoices, then save as a draft Lodgement. After the bank confirms, open the lodgement to enter the receipt no/date and mark which rows the bank actually utilised. Rejected/unutilised rows are reversed automatically." />

        {!partnerId && <Empty description="Pick a client to begin." />}

        {partnerId && (
          <>
            <Card size="small" style={{ background: '#f6ffed', borderColor: '#b7eb8f' }}>
              <Row gutter={16}>
                <Col xs={12} md={6}><Typography.Text type="secondary">Client</Typography.Text><br /><strong>{partnerLabel}</strong></Col>
                <Col xs={12} md={4}><Typography.Text type="secondary">IRMs received</Typography.Text><br /><strong>{totalIrmReceived.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></Col>
                <Col xs={12} md={4}><Typography.Text type="secondary">IRMs utilised</Typography.Text><br /><strong>{totalIrmUtilised.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></Col>
                <Col xs={12} md={4}><Typography.Text type="secondary">IRMs pending</Typography.Text><br /><strong style={{ color: '#52c41a' }}>{totalIrmPending.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></Col>
                <Col xs={12} md={6}><Typography.Text type="secondary">EIs outstanding</Typography.Text><br /><strong style={{ color: '#d4380d' }}>{totalEiOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></Col>
              </Row>
            </Card>

            <Divider orientation="left" plain>Lodgement header</Divider>
            <Row gutter={16}>
              <Col xs={12} md={4}>
                <Typography.Text type="secondary">Lodgement date</Typography.Text>
                <DatePicker style={{ width: '100%' }} value={lodgementDate} onChange={(d) => setLodgementDate(d ?? dayjs())} />
              </Col>
              <Col xs={12} md={4}>
                <Typography.Text type="secondary">Bank receipt no. (if known)</Typography.Text>
                <Input value={bankReceiptNo} onChange={(e) => setBankReceiptNo(e.target.value)} placeholder="leave blank for now" />
              </Col>
              <Col xs={12} md={4}>
                <Typography.Text type="secondary">Bank receipt date</Typography.Text>
                <DatePicker style={{ width: '100%' }} value={bankReceiptDate} onChange={(d) => setBankReceiptDate(d)} />
              </Col>
              <Col xs={24} md={12}>
                <Typography.Text type="secondary">Notes</Typography.Text>
                <Input value={headerNotes} onChange={(e) => setHeaderNotes(e.target.value)} placeholder="optional" />
              </Col>
            </Row>

            <Divider orientation="left" plain>IRMs received from {partnerLabel || 'client'}</Divider>
            <Table
              rowKey="id"
              dataSource={irms}
              loading={loading}
              size="middle"
              pagination={false}
              locale={{ emptyText: 'No open IRMs for this client.' }}
              columns={[
                { title: 'IRM code', dataIndex: 'code', width: 160, render: (c: string, r) => <Link to={`/irms/${r.id}`}><Tag>{c}</Tag></Link> },
                { title: 'Bank ref', dataIndex: 'bank_ref_no', width: 160 },
                { title: 'Date', dataIndex: 'irm_date', width: 110 },
                { title: 'Client (IRM partner)', key: 'cli', width: 200, render: (_, r) => {
                  const isOther = !!partnerId && (!r.partner_id || r.partner_id !== partnerId);
                  return (
                    <Space direction="vertical" size={0}>
                      {r.partner ? <strong>{r.partner.name}</strong> : <Typography.Text type="secondary">—</Typography.Text>}
                      {isOther && <Tag color="purple">Third-party</Tag>}
                    </Space>
                  );
                }},
                { title: 'Remitter', dataIndex: 'remitter_name', width: 180, render: (v?: string | null) => v || <Typography.Text type="secondary">—</Typography.Text> },
                { title: 'Type', dataIndex: 'purpose', width: 130, render: (p: string) => <Tag color={p === 'advance' ? 'purple' : 'blue'}>{p === 'advance' ? 'Advance' : 'Against inv'}</Tag> },
                { title: 'CCY', dataIndex: 'irm_currency', width: 70 },
                { title: 'Received', dataIndex: 'irm_amount_fcy', align: 'right', width: 130, render: (v: number) => Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 }) },
                { title: 'Utilised', key: 'used', align: 'right', width: 120, render: (_, r) => (Number(r.irm_amount_fcy) - Number(r.outstanding_amount_fcy)).toLocaleString(undefined, { minimumFractionDigits: 2 }) },
                { title: 'Pending', key: 'pen', align: 'right', width: 130, render: (_, r) => <strong style={{ color: '#52c41a' }}>{Number(r.outstanding_amount_fcy).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong> },
                { title: '', key: 'a', width: 130, render: (_, r) => <Button size="small" type="primary" icon={<ThunderboltOutlined />} onClick={() => openQa(r)} disabled={Number(r.outstanding_amount_fcy) <= 0.01}>Map to EI</Button> },
              ]}
              scroll={{ x: 1700 }}
            />

            <Divider orientation="left" plain>Open Export Invoices of {partnerLabel || 'client'}</Divider>
            <Table
              rowKey="id"
              dataSource={eis}
              loading={loading}
              size="middle"
              pagination={false}
              locale={{ emptyText: 'No open export invoices for this client.' }}
              columns={[
                { title: 'EI code', dataIndex: 'code', width: 160, render: (c: string, r) => <Link to={`/export-invoices/${r.id}`}><Tag color="blue">{c}</Tag></Link> },
                { title: 'Date', dataIndex: 'invoice_date', width: 110 },
                { title: 'CCY', dataIndex: 'currency', width: 70 },
                { title: 'Total', dataIndex: 'total', align: 'right', width: 130, render: (v: number) => Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 }) },
                { title: 'Paid', dataIndex: 'paid_amount', align: 'right', width: 130, render: (v: number) => Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 }) },
                { title: 'Balance (open)', dataIndex: 'balance', align: 'right', width: 140, render: (v: number) => <strong style={{ color: '#d4380d' }}>{Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong> },
                { title: 'Status', dataIndex: 'status', width: 130, render: (s: string) => <Tag>{s.replace('_', ' ')}</Tag> },
              ]}
              scroll={{ x: 1000 }}
            />

            <Divider orientation="left" plain>Mappings to lodge ({mappings.length})</Divider>
            {mappings.length === 0 ? (
              <Empty description={'Click "Map to EI" on an IRM row above to start mapping.'} />
            ) : (
              <>
                <Table
                  rowKey="key"
                  dataSource={mappings}
                  size="small"
                  pagination={false}
                  columns={[
                    { title: 'IRM (client / date)', key: 'irm', render: (_, r: MappingRow) => (
                      <Space direction="vertical" size={0}>
                        <Space>
                          <Tag>{r.irm_code}</Tag>
                          {r.is_third_party_payment && <Tag color="purple">3rd-party</Tag>}
                        </Space>
                        {r.irm_partner_name && <Typography.Text type="secondary" style={{ fontSize: 11 }}>{r.irm_partner_name}{r.irm_date ? ` · ${r.irm_date}` : ''}</Typography.Text>}
                        {r.irm_remitter_name && <Typography.Text type="secondary" style={{ fontSize: 11 }}>Remitter: {r.irm_remitter_name}</Typography.Text>}
                      </Space>
                    )},
                    { title: 'EI', key: 'ei', render: (_, r: MappingRow) => <Tag color="blue">{r.ei_code}</Tag> },
                    { title: 'CCY', key: 'ccy', width: 70, render: (_, r: MappingRow) => r.irm_currency },
                    { title: 'Amount FCY', key: 'amt', width: 150, render: (_, r: MappingRow) => (
                      <InputNumber min={0.01} step={0.01} value={r.amount_fcy} onChange={(v) => updateMapping(r.key, { amount_fcy: Number(v ?? 0) })} style={{ width: '100%' }} />
                    )},
                    { title: 'X-rate', key: 'xr', width: 110, render: (_, r: MappingRow) => (
                      <InputNumber min={0.000001} step={0.0001} value={r.exchange_rate} onChange={(v) => updateMapping(r.key, { exchange_rate: Number(v ?? 0) })} style={{ width: '100%' }} />
                    )},
                    { title: 'Amount INR', key: 'inr', width: 130, align: 'right', render: (_, r: MappingRow) => `₹ ${(Number(r.amount_fcy || 0) * Number(r.exchange_rate || 0)).toFixed(2)}` },
                    { title: 'Full?', key: 'full', width: 70, align: 'center', render: (_, r: MappingRow) => (
                      <Switch size="small" checked={r.is_full_realization} onChange={(v) => updateMapping(r.key, { is_full_realization: v })} />
                    )},
                    { title: 'Notes', key: 'n', render: (_, r: MappingRow) => (
                      <Input value={r.notes} placeholder="optional" onChange={(e) => updateMapping(r.key, { notes: e.target.value })} />
                    )},
                    { title: '', key: 'rm', width: 70, render: (_, r: MappingRow) => (
                      <Button size="small" danger onClick={() => removeMapping(r.key)}>Remove</Button>
                    )},
                  ]}
                  summary={() => (
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={3}><strong>Total to lodge</strong></Table.Summary.Cell>
                      <Table.Summary.Cell index={1} align="right"><strong>{totalToLodge.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></Table.Summary.Cell>
                      <Table.Summary.Cell index={2} />
                      <Table.Summary.Cell index={3} align="right"><strong>₹ {totalToLodgeInr.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></Table.Summary.Cell>
                      <Table.Summary.Cell index={4} colSpan={3} />
                    </Table.Summary.Row>
                  )}
                />
                <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
                  <Button onClick={() => setMappings([])} disabled={submitting}>Clear all</Button>
                  <Button type="primary" icon={<DollarCircleOutlined />} loading={submitting} onClick={onSave}>Save lodgement ({mappings.length} rows)</Button>
                </Space>
              </>
            )}
          </>
        )}
      </Space>

      <Modal
        open={qaOpen}
        title={qaSourceIrm ? `Map IRM ${qaSourceIrm.code} (pending ${qaSourceIrm.irm_currency} ${Number(qaSourceIrm.outstanding_amount_fcy).toFixed(2)})` : 'Map'}
        onCancel={() => setQaOpen(false)}
        onOk={addMapping}
        okText="Add to mapping list"
        width={640}
      >
        {qaSourceIrm && (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Card size="small" style={{ background: '#fafafa' }}>
              <Row gutter={16}>
                <Col xs={12}><Typography.Text type="secondary">IRM client</Typography.Text><br /><strong>{qaSourceIrm.partner?.name ?? '—'}</strong></Col>
                <Col xs={6}><Typography.Text type="secondary">IRM date</Typography.Text><br /><strong>{qaSourceIrm.irm_date}</strong></Col>
                <Col xs={6}><Typography.Text type="secondary">Bank ref</Typography.Text><br /><strong>{qaSourceIrm.bank_ref_no ?? '—'}</strong></Col>
                {qaSourceIrm.remitter_name && <Col xs={24} style={{ marginTop: 8 }}><Typography.Text type="secondary">Remitter</Typography.Text><br /><strong>{qaSourceIrm.remitter_name}</strong></Col>}
                {!!partnerId && (qaSourceIrm.partner_id ?? null) !== partnerId && (
                  <Col xs={24} style={{ marginTop: 8 }}><Tag color="purple">Third-party payment — IRM client differs from lodgement client</Tag></Col>
                )}
              </Row>
            </Card>
            <div>
              <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>Export invoice (open balance)</Typography.Text>
              <Select
                placeholder="Pick an open EI..."
                value={qaState.ei_id}
                onChange={(v: number) => {
                  const ei = eis.find((x) => x.id === v);
                  setQaState((s) => ({ ...s, ei_id: v, amount_fcy: ei ? Math.min(Number(qaSourceIrm.outstanding_amount_fcy), Number(ei.balance)) : s.amount_fcy }));
                }}
                options={eis.map((e) => ({ value: e.id, label: `${e.code} (${e.currency} ${Number(e.balance).toFixed(2)} due)` }))}
                style={{ width: '100%' }}
              />
            </div>
            <Row gutter={16}>
              <Col xs={12}>
                <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>Amount ({qaSourceIrm.irm_currency})</Typography.Text>
                <InputNumber min={0.01} step={0.01} value={qaState.amount_fcy} onChange={(v) => setQaState((s) => ({ ...s, amount_fcy: Number(v ?? 0) }))} style={{ width: '100%' }} />
              </Col>
              <Col xs={12}>
                <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>Exchange rate</Typography.Text>
                <InputNumber min={0.000001} step={0.0001} value={qaState.exchange_rate} onChange={(v) => setQaState((s) => ({ ...s, exchange_rate: Number(v ?? 0) }))} style={{ width: '100%' }} />
              </Col>
              <Col xs={12} style={{ marginTop: 12 }}>
                <Space>
                  <Switch checked={qaState.is_full_realization} onChange={(v) => setQaState((s) => ({ ...s, is_full_realization: v }))} />
                  <Typography.Text>Mark full realization</Typography.Text>
                </Space>
              </Col>
              <Col xs={24} style={{ marginTop: 12 }}>
                <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>Notes</Typography.Text>
                <Input.TextArea rows={2} value={qaState.notes} onChange={(e) => setQaState((s) => ({ ...s, notes: e.target.value }))} />
              </Col>
            </Row>
          </Space>
        )}
      </Modal>
    </Card>
  );
}
