import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, DatePicker, Divider, Form, Input, Modal, Row, Select, Space, Table, Tag, Typography, message } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, DeleteOutlined, ExclamationCircleOutlined, SendOutlined, StopOutlined } from '@ant-design/icons';
import { Link, useNavigate, useParams } from 'react-router-dom';
import dayjs, { type Dayjs } from 'dayjs';
import { lodgementApi } from '../api/lodgementApi';
import type { Lodgement, LodgementStatus, UtilizationStatus } from '../types/lodgement.types';
import { confirmDelete } from '../../common/confirmDelete';

const STATUS_COLOR: Record<LodgementStatus, string> = { draft: 'default', submitted: 'cyan', accepted: 'green', rejected: 'red', cancelled: 'red' };
const ROW_COLOR: Record<UtilizationStatus, string> = { pending: 'default', utilised: 'green', unutilised: 'orange', rejected: 'red' };

export default function ExportLodgementDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lodge, setLodge] = useState<Lodgement | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingHeader, setSavingHeader] = useState(false);

  const [headerForm] = Form.useForm<{ lodgement_date: Dayjs; bank_receipt_no?: string; bank_receipt_date?: Dayjs; notes?: string }>();
  const [acceptForm] = Form.useForm<{ bank_receipt_no?: string; bank_receipt_date: Dayjs; notes?: string }>();
  const [rejectForm] = Form.useForm<{ reason?: string }>();
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await lodgementApi.get(Number(id));
      setLodge(data);
      headerForm.setFieldsValue({
        lodgement_date: dayjs(data.lodgement_date),
        bank_receipt_no: data.bank_receipt_no ?? undefined,
        bank_receipt_date: data.bank_receipt_date ? dayjs(data.bank_receipt_date) : undefined,
        notes: data.notes ?? undefined,
      });
    } catch { message.error('Failed to load lodgement.'); } finally { setLoading(false); }
  };
  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [id]);

  const onSaveHeader = async () => {
    if (!lodge) return;
    setSavingHeader(true);
    try {
      const v = await headerForm.validateFields();
      const updated = await lodgementApi.update(lodge.id, {
        lodgement_date: v.lodgement_date.format('YYYY-MM-DD'),
        bank_receipt_no: v.bank_receipt_no,
        bank_receipt_date: v.bank_receipt_date?.format('YYYY-MM-DD'),
        notes: v.notes,
      });
      setLodge(updated);
      message.success('Saved.');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Save failed.');
    } finally { setSavingHeader(false); }
  };

  const markRow = async (allocId: number, status: UtilizationStatus, note?: string) => {
    if (!lodge) return;
    try {
      const updated = await lodgementApi.markRow(lodge.id, allocId, status, note);
      setLodge(updated);
      message.success(status === 'utilised' ? 'Marked utilised.' : 'Row reversed — IRM outstanding restored.');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Mark failed.');
    }
  };

  const removeRow = async (allocId: number) => {
    if (!lodge) return;
    try {
      const updated = await lodgementApi.removeRow(lodge.id, allocId);
      setLodge(updated);
      message.success('Row removed — allocation reversed.');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Remove failed.');
    }
  };

  const onSubmit = async () => {
    if (!lodge) return;
    try { setLodge(await lodgementApi.submit(lodge.id)); message.success('Submitted to bank.'); }
    catch (e: unknown) { const err = e as { response?: { data?: { message?: string } } }; message.error(err.response?.data?.message ?? 'Submit failed.'); }
  };

  const onAccept = async () => {
    if (!lodge) return;
    try {
      const v = await acceptForm.validateFields();
      const updated = await lodgementApi.accept(lodge.id, {
        bank_receipt_no: v.bank_receipt_no,
        bank_receipt_date: v.bank_receipt_date.format('YYYY-MM-DD'),
        notes: v.notes,
      });
      setLodge(updated); setAcceptOpen(false); acceptForm.resetFields();
      message.success('Lodgement accepted.');
    } catch (e: unknown) { const err = e as { response?: { data?: { message?: string } } }; message.error(err.response?.data?.message ?? 'Accept failed.'); }
  };

  const onReject = async () => {
    if (!lodge) return;
    try {
      const v = await rejectForm.validateFields();
      const updated = await lodgementApi.reject(lodge.id, v.reason);
      setLodge(updated); setRejectOpen(false); rejectForm.resetFields();
      message.warning('Lodgement rejected — non-utilised rows reversed.');
    } catch (e: unknown) { const err = e as { response?: { data?: { message?: string } } }; message.error(err.response?.data?.message ?? 'Reject failed.'); }
  };

  const onCancel = async () => {
    if (!lodge) return;
    try { setLodge(await lodgementApi.cancel(lodge.id)); message.warning('Cancelled — all allocations reversed.'); }
    catch (e: unknown) { const err = e as { response?: { data?: { message?: string } } }; message.error(err.response?.data?.message ?? 'Cancel failed.'); }
  };

  const status = lodge?.status;
  const editable = status === 'draft' || status === 'submitted';
  const isFinal = status === 'accepted' || status === 'rejected' || status === 'cancelled';

  const totalFcy = (lodge?.allocations ?? []).reduce((s, a) => s + Number(a.amount_fcy), 0);
  const totalInr = (lodge?.allocations ?? []).reduce((s, a) => s + Number(a.amount_inr), 0);
  const utilisedInr = (lodge?.allocations ?? []).filter((a) => a.utilization_status === 'utilised').reduce((s, a) => s + Number(a.amount_inr), 0);

  return (
    <Card loading={loading}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space style={{ justifyContent: 'space-between', width: '100%' }} wrap>
          <Space direction="vertical" size={0}>
            <Typography.Title level={4} style={{ margin: 0 }}>
              Lodgement {lodge?.code ?? ''}
              {status && <Tag style={{ marginLeft: 8 }} color={STATUS_COLOR[status]}>{status}</Tag>}
            </Typography.Title>
            {lodge?.partner && <Typography.Text type="secondary">Client: <strong>{lodge.partner.code} — {lodge.partner.name}</strong></Typography.Text>}
          </Space>
          <Space wrap>
            <Button onClick={() => navigate('/export-lodgement')}>Back to list</Button>
            {status === 'draft' && <Button icon={<SendOutlined />}
              onClick={() => confirmDelete({ title: 'Submit to bank?', content: 'Marks the lodgement as submitted; the bank will respond with accepted/rejected.', okText: 'Yes, submit', danger: false, onOk: onSubmit })}>Submit to bank</Button>}
            {!isFinal && <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => { acceptForm.setFieldsValue({ bank_receipt_date: lodge?.bank_receipt_date ? dayjs(lodge.bank_receipt_date) : dayjs(), bank_receipt_no: lodge?.bank_receipt_no ?? undefined }); setAcceptOpen(true); }}>Accept (bank confirmed)</Button>}
            {!isFinal && <Button danger icon={<CloseCircleOutlined />} onClick={() => setRejectOpen(true)}>Reject (bank refused)</Button>}
            {!isFinal && <Button icon={<StopOutlined />}
              onClick={() => confirmDelete({ title: 'Cancel this lodgement?', content: 'ALL allocations will be reversed (IRM outstanding restored, EI balances restored).', okText: 'Yes, cancel', onOk: onCancel })}>Cancel</Button>}
          </Space>
        </Space>

        {status === 'accepted' && <Alert type="success" showIcon message="Lodgement accepted. Bank receipt recorded." />}
        {status === 'rejected' && <Alert type="error" showIcon message={`Rejected. ${lodge?.rejection_reason ?? ''}`} />}
        {status === 'cancelled' && <Alert type="warning" showIcon message="Cancelled. All allocations reversed." />}

        <Card size="small" style={{ background: '#fafafa' }}>
          <Row gutter={16}>
            <Col xs={12} md={6}><Typography.Text type="secondary">Lodgement code</Typography.Text><br /><strong>{lodge?.code}</strong></Col>
            <Col xs={12} md={6}><Typography.Text type="secondary">Lodgement date</Typography.Text><br /><strong>{lodge?.lodgement_date}</strong></Col>
            <Col xs={12} md={6}><Typography.Text type="secondary">Bank receipt no.</Typography.Text><br /><strong>{lodge?.bank_receipt_no || <Typography.Text type="warning">— pending —</Typography.Text>}</strong></Col>
            <Col xs={12} md={6}><Typography.Text type="secondary">Bank receipt date</Typography.Text><br /><strong>{lodge?.bank_receipt_date || <Typography.Text type="warning">— pending —</Typography.Text>}</strong></Col>
            <Col xs={12} md={6}><Typography.Text type="secondary">Total FCY</Typography.Text><br /><strong>{totalFcy.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></Col>
            <Col xs={12} md={6}><Typography.Text type="secondary">Total INR</Typography.Text><br /><strong>₹ {totalInr.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></Col>
            <Col xs={12} md={6}><Typography.Text type="secondary">Utilised INR</Typography.Text><br /><strong style={{ color: '#389e0d' }}>₹ {utilisedInr.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></Col>
            <Col xs={12} md={6}><Typography.Text type="secondary">Rows</Typography.Text><br /><strong>{lodge?.allocations?.length ?? 0}</strong></Col>
          </Row>
        </Card>

        {editable && (
          <>
            <Divider orientation="left" plain>Header (editable while not finalized)</Divider>
            <Form form={headerForm} layout="vertical">
              <Row gutter={16}>
                <Col xs={12} md={4}><Form.Item label="Lodgement date" name="lodgement_date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
                <Col xs={12} md={5}><Form.Item label="Bank receipt no." name="bank_receipt_no"><Input placeholder="e.g. LOD/2026-04/9182" /></Form.Item></Col>
                <Col xs={12} md={4}><Form.Item label="Bank receipt date" name="bank_receipt_date"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
                <Col xs={24} md={11}><Form.Item label="Notes" name="notes"><Input /></Form.Item></Col>
              </Row>
              <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
                <Button type="primary" loading={savingHeader} onClick={onSaveHeader}>Save header</Button>
              </Space>
            </Form>
          </>
        )}

        <Divider orientation="left" plain>Allocation rows ({lodge?.allocations?.length ?? 0})</Divider>
        <Table
          rowKey="id"
          dataSource={lodge?.allocations ?? []}
          size="middle"
          pagination={false}
          locale={{ emptyText: 'No rows.' }}
          columns={[
            { title: 'IRM (client / date / remitter)', key: 'irm', render: (_, r) => r.irm ? (
              <Space direction="vertical" size={0}>
                <Space size={4}>
                  <Link to={`/irms/${r.irm.id}`}><Tag>{r.irm.code}</Tag></Link>
                  {r.is_third_party_payment && <Tag color="purple">3rd-party</Tag>}
                </Space>
                {r.irm.partner_name && <Typography.Text type="secondary" style={{ fontSize: 11 }}>{r.irm.partner_name}{r.irm.irm_date ? ` · ${r.irm.irm_date}` : ''}</Typography.Text>}
                {r.irm.remitter_name && <Typography.Text type="secondary" style={{ fontSize: 11 }}>Remitter: {r.irm.remitter_name}</Typography.Text>}
              </Space>
            ) : '—' },
            { title: 'Export invoice (closure)', key: 'ei', render: (_, r) => (
              <Space direction="vertical" size={0}>
                {r.export_invoice ? <Link to={`/export-invoices/${r.export_invoice.id}`}><Tag color="blue">{r.export_invoice.code}</Tag></Link> : '—'}
                {lodge?.partner?.name && <Typography.Text type="secondary" style={{ fontSize: 11 }}>For: {lodge.partner.name}</Typography.Text>}
              </Space>
            )},
            { title: 'Amount FCY', dataIndex: 'amount_fcy', align: 'right', width: 130, render: (v: number, r) => `${r.irm?.currency ?? ''} ${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
            { title: 'X-rate', dataIndex: 'exchange_rate', align: 'right', width: 100, render: (v: number) => Number(v).toFixed(4) },
            { title: 'Amount INR', dataIndex: 'amount_inr', align: 'right', width: 130, render: (v: number) => `₹ ${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
            { title: 'Utilization', key: 'us', width: 130, render: (_, r) => <Tag color={ROW_COLOR[r.utilization_status]}>{r.utilization_status}</Tag> },
            { title: 'Note', dataIndex: 'utilization_note' },
            { title: 'Actions', key: 'a', width: 280, render: (_, r) => isFinal ? null : (
              <Space size={4} wrap>
                {r.utilization_status !== 'utilised' && <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={() => void markRow(r.id, 'utilised')}>Utilised</Button>}
                {r.utilization_status === 'utilised' && (
                  <Button size="small" icon={<ExclamationCircleOutlined />}
                    onClick={() => confirmDelete({ title: 'Mark as unutilised?', content: 'Reverses the allocation — IRM outstanding restored, EI balance restored.', onOk: () => markRow(r.id, 'unutilised', 'Marked unutilised by user') })}>Unutilise</Button>
                )}
                {r.utilization_status !== 'rejected' && (
                  <Button size="small" danger icon={<CloseCircleOutlined />}
                    onClick={() => confirmDelete({ title: 'Mark as rejected by bank?', content: 'Reverses the allocation.', onOk: () => markRow(r.id, 'rejected', 'Bank rejected — discrepancy') })}>Reject</Button>
                )}
                <Button size="small" danger icon={<DeleteOutlined />}
                  onClick={() => confirmDelete({ title: 'Remove this row from the lodgement?', content: 'Reverses the allocation entirely.', onOk: () => removeRow(r.id) })} />
              </Space>
            )},
          ]}
        />
      </Space>

      <Modal open={acceptOpen} title="Accept lodgement (bank confirmed)" onCancel={() => setAcceptOpen(false)} onOk={onAccept} okText="Accept">
        <Alert type="info" showIcon message="Records the bank receipt details. All rows currently 'pending' become 'utilised'. Rows already individually marked unutilised/rejected stay as-is." style={{ marginBottom: 16 }} />
        <Form form={acceptForm} layout="vertical">
          <Form.Item label="Bank receipt no." name="bank_receipt_no" rules={[{ required: true }]}><Input placeholder="e.g. LOD/2026-04/9182" /></Form.Item>
          <Form.Item label="Bank receipt date" name="bank_receipt_date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
          <Form.Item label="Notes" name="notes"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      <Modal open={rejectOpen} title="Reject lodgement (bank refused)" onCancel={() => setRejectOpen(false)} onOk={onReject} okText="Reject" okButtonProps={{ danger: true }}>
        <Alert type="warning" showIcon message="Reverses every row that hasn't been individually marked utilised. IRM outstanding + EI balances are restored for those rows." style={{ marginBottom: 16 }} />
        <Form form={rejectForm} layout="vertical">
          <Form.Item label="Rejection reason" name="reason" rules={[{ required: true }]}><Input.TextArea rows={3} placeholder="e.g. Document discrepancy on EXP-03/2026-27" /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
