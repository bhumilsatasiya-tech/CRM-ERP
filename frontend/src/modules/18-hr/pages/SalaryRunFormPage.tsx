import { useEffect, useState } from 'react';
import { Alert, Button, Card, Form, Input, Modal, Space, Table, Tag, Typography, message } from 'antd';
import { confirmDelete } from '../../common/confirmDelete';
import { CheckOutlined, CloseOutlined, DollarCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { salaryRunApi } from '../api/hrApi';
import type { Payslip, SalaryRun, SalaryRunStatus } from '../types/hr.types';

export default function SalaryRunFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [run, setRun] = useState<SalaryRun | null>(null);
  const [loading, setLoading] = useState(false);
  const [payModal, setPayModal] = useState<{ open: boolean; payslip?: Payslip }>({ open: false });
  const [payForm] = Form.useForm<{ payment_ref: string }>();

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try { setRun(await salaryRunApi.get(Number(id))); } catch { message.error('Failed.'); } finally { setLoading(false); }
  };
  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [id]);

  if (!run) return <Card loading={loading}><Typography.Text>—</Typography.Text></Card>;
  const status: SalaryRunStatus = run.status;

  const onRecompute = async () => { try { setRun(await salaryRunApi.recompute(run.id)); message.success('Recomputed.'); } catch { message.error('Failed.'); } };
  const onPost = async () => { try { setRun(await salaryRunApi.post(run.id)); message.success('Posted — auto-journal queued.'); } catch (e: unknown) { const err = e as { response?: { data?: { message?: string } } }; message.error(err.response?.data?.message ?? 'Failed.'); } };
  const onCancel = async () => { try { setRun(await salaryRunApi.cancel(run.id)); message.success('Cancelled.'); } catch { message.error('Failed.'); } };
  const onMarkPaid = async () => {
    if (!payModal.payslip) return;
    try {
      const v = await payForm.validateFields();
      setRun(await salaryRunApi.markPaid(run.id, payModal.payslip.id, v.payment_ref));
      setPayModal({ open: false }); payForm.resetFields();
      message.success('Marked paid.');
    } catch { message.error('Failed.'); }
  };

  const totals = (run.payslips ?? []).reduce((acc, p) => ({ g: acc.g + p.gross, d: acc.d + p.total_deductions, n: acc.n + p.net_pay }), { g: 0, d: 0, n: 0 });

  return (
    <Card>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space style={{ justifyContent: 'space-between', width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>Salary run {run.code} <Tag style={{ marginLeft: 8 }}>{status}</Tag></Typography.Title>
          <Space>
            <Button onClick={() => navigate('/salary-runs')}>Back</Button>
            {status === 'draft' && <Button icon={<ReloadOutlined />} onClick={onRecompute}>Recompute</Button>}
            {status === 'draft' && <Button type="primary" icon={<CheckOutlined />}
              onClick={() => confirmDelete({ title: 'Post this salary run?', content: 'Locks the run and fires SalaryRunPosted (Finance auto-journals).', okText: 'Yes, post', danger: false, onOk: onPost })}>Post</Button>}
            {status !== 'cancelled' && <Button danger icon={<CloseOutlined />}
              onClick={() => confirmDelete({ title: 'Cancel this salary run?', okText: 'Yes, cancel', onOk: onCancel })}>Cancel</Button>}
          </Space>
        </Space>
        <Alert type="info" showIcon message={`Period ${run.period} (${run.period_start} → ${run.period_end}) · ${(run.payslips ?? []).length} payslips · Gross ${totals.g.toFixed(2)} · Net ${totals.n.toFixed(2)}.`} />

        <Table<Payslip>
          rowKey="id"
          dataSource={run.payslips ?? []}
          pagination={false}
          size="middle"
          columns={[
            { title: 'Code', dataIndex: 'employee_code', width: 130 },
            { title: 'Employee', dataIndex: 'employee_name' },
            { title: 'Gross', dataIndex: 'gross', align: 'right' as const, width: 130, render: (v: number) => Number(v).toFixed(2) },
            { title: 'Deductions', dataIndex: 'total_deductions', align: 'right' as const, width: 140, render: (v: number) => Number(v).toFixed(2) },
            { title: 'Net pay', dataIndex: 'net_pay', align: 'right' as const, width: 140, render: (v: number) => <strong>{Number(v).toFixed(2)}</strong> },
            { title: 'Paid', key: 'p', width: 200, render: (_: unknown, r) => r.paid_at ? `${dayjs(r.paid_at).format('YYYY-MM-DD')} (${r.payment_ref ?? ''})` : '—' },
            { title: '', key: 'a', width: 110, render: (_: unknown, r) => status === 'posted' && ! r.paid_at ? (
              <Button size="small" icon={<DollarCircleOutlined />} onClick={() => { payForm.resetFields(); setPayModal({ open: true, payslip: r }); }}>Mark paid</Button>
            ) : null },
          ]}
        />
      </Space>
      <Modal open={payModal.open} title={`Mark paid — ${payModal.payslip?.employee_name}`} onCancel={() => setPayModal({ open: false })} onOk={onMarkPaid} okText="Mark paid">
        <Form form={payForm} layout="vertical">
          <Form.Item label="Payment reference" name="payment_ref" rules={[{ required: true }]}><Input placeholder="Bank transfer ref / cheque #" /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
