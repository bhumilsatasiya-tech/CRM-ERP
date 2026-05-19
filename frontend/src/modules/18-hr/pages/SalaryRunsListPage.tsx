import { useEffect, useState } from 'react';
import { Button, Card, Form, Input, Modal, Space, Table, Tag, Typography, message } from 'antd';
import { EyeOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import dayjs from 'dayjs';
import { salaryRunApi } from '../api/hrApi';
import type { SalaryRun, SalaryRunStatus } from '../types/hr.types';

const COLORS: Record<SalaryRunStatus, string> = { draft: 'default', posted: 'green', cancelled: 'red' };

export default function SalaryRunsListPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<SalaryRun[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1); const [perPage, setPerPage] = useState(20);
  const [modal, setModal] = useState(false);
  const [form] = Form.useForm<{ period: string }>();

  const fetch = async () => {
    setLoading(true);
    try {
      const r = await salaryRunApi.list({ page, per_page: perPage });
      setData(r.data); setTotal(r.meta.total);
    } catch { message.error('Failed.'); } finally { setLoading(false); }
  };
  useEffect(() => { void fetch(); /* eslint-disable-next-line */ }, [page, perPage]);

  const onCreate = async () => {
    try {
      const v = await form.validateFields();
      const created = await salaryRunApi.create(v.period);
      setModal(false); form.resetFields();
      message.success('Run created with payslips.');
      navigate(`/salary-runs/${created.id}`);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      if (err.response) message.error(err.response.data?.message ?? 'Failed.');
    }
  };

  const cols: ColumnsType<SalaryRun> = [
    { title: 'Code', dataIndex: 'code', width: 160, render: (c: string, r) => <Link to={`/salary-runs/${r.id}`}><Tag>{c}</Tag></Link> },
    { title: 'Period', dataIndex: 'period', width: 110 },
    { title: 'Range', key: 'r', width: 220, render: (_, r) => `${r.period_start} → ${r.period_end}` },
    { title: 'Payslips', dataIndex: 'payslips_count', width: 100 },
    { title: 'Status', dataIndex: 'status', width: 110, render: (s: SalaryRunStatus) => <Tag color={COLORS[s]}>{s}</Tag> },
    { title: 'Posted at', dataIndex: 'posted_at', width: 170, render: (v?: string | null) => v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '—' },
    { title: '', key: 'a', width: 60, render: (_, r) => <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/salary-runs/${r.id}`)} /> },
  ];

  const pagination: TablePaginationConfig = { current: page, pageSize: perPage, total, showSizeChanger: true, onChange: (p, ps) => { setPage(p); setPerPage(ps); } };

  return (
    <Card>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space style={{ justifyContent: 'space-between', width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>Salary runs</Typography.Title>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => void fetch()}>Refresh</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.setFieldsValue({ period: dayjs().format('YYYY-MM') }); setModal(true); }}>New run</Button>
          </Space>
        </Space>
        <Table<SalaryRun> rowKey="id" dataSource={data} columns={cols} loading={loading} pagination={pagination} size="middle" />
      </Space>
      <Modal open={modal} title="New salary run" onCancel={() => setModal(false)} onOk={onCreate} okText="Create">
        <Form form={form} layout="vertical">
          <Form.Item label="Period (YYYY-MM)" name="period" rules={[{ required: true, pattern: /^\d{4}-\d{2}$/, message: 'Use YYYY-MM' }]}><Input placeholder="2026-05" /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
