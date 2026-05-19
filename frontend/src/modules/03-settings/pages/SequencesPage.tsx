import { useEffect, useState } from 'react';
import { Button, Card, Form, Input, InputNumber, Modal, Select, Space, Switch, Table, Tag, Typography, message } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { sequenceApi } from '../api/settingsApi';
import { companyApi } from '../../02-companies/api/companyApi';
import type { Sequence, SequenceResetPeriod } from '../types/settings.types';
import type { Company } from '../../02-companies/types/companies.types';
import { confirmDelete } from '../../common/confirmDelete';

interface SeqForm {
  id?: number;
  company_id: number;
  doc_type: string;
  name: string;
  prefix: string;
  suffix?: string;
  current_number: number;
  padding: number;
  format: string;
  reset_period: SequenceResetPeriod;
  is_active: boolean;
}

export default function SequencesPage() {
  const [list, setList] = useState<Sequence[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [companyFilter, setCompanyFilter] = useState<number | undefined>(undefined);
  const [editing, setEditing] = useState<SeqForm | null>(null);
  const [form] = Form.useForm<SeqForm>();

  const fetchData = async () => {
    setLoading(true);
    try {
      const r = await sequenceApi.list({ company_id: companyFilter });
      setList(r);
    } catch { message.error('Failed to load sequences.'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    companyApi.myCompanies().then((r) => setCompanies(r.data)).catch(() => undefined);
  }, []);
  useEffect(() => { void fetchData(); /* eslint-disable-next-line */ }, [companyFilter]);

  const openNew = () => {
    setEditing({
      company_id: companyFilter ?? companies[0]?.id ?? 0,
      doc_type: '',
      name: '',
      prefix: '',
      suffix: '',
      current_number: 0,
      padding: 5,
      format: '{prefix}/{year}/{number}',
      reset_period: 'yearly',
      is_active: true,
    });
    form.resetFields();
  };

  const openEdit = (s: Sequence) => {
    setEditing({ ...(s as unknown as SeqForm), suffix: s.suffix ?? '' });
    setTimeout(() => form.setFieldsValue({ ...(s as unknown as SeqForm), suffix: s.suffix ?? '' }), 0);
  };

  const onSave = async () => {
    const v = await form.validateFields();
    try {
      if (editing?.id) {
        await sequenceApi.update(editing.id, v);
        message.success('Sequence updated.');
      } else {
        await sequenceApi.create(v);
        message.success('Sequence created.');
      }
      setEditing(null);
      void fetchData();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Save failed.');
    }
  };

  const onDelete = async (s: Sequence) => {
    try {
      await sequenceApi.remove(s.id);
      message.success('Deleted.');
      void fetchData();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Delete failed.');
    }
  };

  const columns: ColumnsType<Sequence> = [
    {
      title: 'Company',
      dataIndex: 'company_id',
      key: 'company_id',
      render: (id: number) => companies.find((c) => c.id === id)?.code ?? id,
    },
    { title: 'Doc type', dataIndex: 'doc_type', key: 'doc_type', render: (v: string) => <Tag>{v}</Tag> },
    { title: 'Name', dataIndex: 'name', key: 'name' },
    {
      title: 'Format',
      dataIndex: 'format',
      key: 'format',
      render: (f: string, row) => <code style={{ fontSize: 12 }}>{f.replace('{prefix}', row.prefix).replace('{year}', new Date().getFullYear().toString())}</code>,
    },
    { title: 'Current #', dataIndex: 'current_number', key: 'current_number' },
    { title: 'Reset', dataIndex: 'reset_period', key: 'reset_period', render: (r: string) => <Tag color={r === 'never' ? 'default' : 'blue'}>{r}</Tag> },
    {
      title: 'Next preview',
      dataIndex: 'next_preview',
      key: 'next_preview',
      render: (v: string) => v ? <code style={{ background: '#f5f5f5', padding: '2px 6px', borderRadius: 4 }}>{v}</code> : '—',
    },
    { title: 'Active', dataIndex: 'is_active', key: 'is_active', render: (v: boolean) => <Switch checked={v} disabled /> },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, row) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(row)} />
          <Button icon={<DeleteOutlined />} size="small" danger
            onClick={() => confirmDelete({
              title: `Delete sequence ${row.doc_type}?`,
              content: 'New documents of this type will fail to save until you re-create a sequence.',
              onOk: () => onDelete(row),
            })} />
        </Space>
      ),
    },
  ];

  return (
    <Card>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>Sequence Management</Typography.Title>
          <Space>
            <Select
              placeholder="Filter by company"
              allowClear
              value={companyFilter}
              onChange={setCompanyFilter}
              style={{ width: 220 }}
              options={companies.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))}
            />
            <Button icon={<ReloadOutlined />} onClick={() => void fetchData()}>Refresh</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openNew}>New sequence</Button>
          </Space>
        </Space>

        <Table<Sequence> rowKey="id" dataSource={list} columns={columns} loading={loading} pagination={false} size="middle" />
      </Space>

      <Modal
        open={!!editing}
        title={editing?.id ? 'Edit sequence' : 'New sequence'}
        onCancel={() => setEditing(null)}
        onOk={onSave}
        okText="Save"
        width={700}
      >
        <Form<SeqForm> form={form} layout="vertical" initialValues={editing ?? undefined}>
          <Form.Item label="Company" name="company_id" rules={[{ required: true }]}>
            <Select disabled={!!editing?.id} options={companies.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))} />
          </Form.Item>
          <Form.Item label="Doc type (slug)" name="doc_type" rules={[{ required: true }]}>
            <Input disabled={!!editing?.id} placeholder="e.g. sales_order" />
          </Form.Item>
          <Form.Item label="Name" name="name" rules={[{ required: true }]}><Input /></Form.Item>
          <Space.Compact style={{ display: 'flex' }}>
            <Form.Item label="Prefix" name="prefix" style={{ flex: 1 }}><Input placeholder="SO" /></Form.Item>
            <Form.Item label="Suffix" name="suffix" style={{ flex: 1 }}><Input /></Form.Item>
            <Form.Item label="Padding" name="padding" rules={[{ required: true }]} style={{ width: 110 }}>
              <InputNumber min={1} max={12} style={{ width: '100%' }} />
            </Form.Item>
          </Space.Compact>
          <Form.Item label="Format" name="format" rules={[{ required: true }]}>
            <Input placeholder="{prefix}/{year}/{number}" />
          </Form.Item>
          <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: -8 }}>
            Tokens: <code>{'{prefix}'}</code> <code>{'{suffix}'}</code> <code>{'{year}'}</code> <code>{'{year_short}'}</code> <code>{'{month}'}</code> <code>{'{day}'}</code> <code>{'{number}'}</code>
          </Typography.Paragraph>
          <Space.Compact style={{ display: 'flex' }}>
            <Form.Item label="Reset period" name="reset_period" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Select options={[{ value: 'never', label: 'Never' }, { value: 'yearly', label: 'Yearly' }, { value: 'monthly', label: 'Monthly' }]} />
            </Form.Item>
            <Form.Item label="Current number" name="current_number" style={{ flex: 1 }}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Space.Compact>
          <Form.Item label="Active" name="is_active" valuePropName="checked"><Switch /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
