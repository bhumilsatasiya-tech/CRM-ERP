import { useEffect, useState } from 'react';
import {
  Alert, Button, Card, Col, DatePicker, Form, Input, InputNumber, Modal, Row,
  Segmented, Select, Space, Statistic, Switch, Table, Tabs, Tag, Typography, message,
} from 'antd';
import { ArrowLeftOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs, { type Dayjs } from 'dayjs';
import { projectsApi } from '../api/projectsApi';
import {
  CATEGORY_COLOR, CATEGORY_LABEL, COST_CATEGORIES,
  type CostCategory, type CostEntryPayload, type Project, type ProjectCostEntry,
  type ProjectStatus, type ProjectSummary,
} from '../types/projects.types';
import { confirmDelete } from '../../common/confirmDelete';
import PartnerSmartDropdown from '../../common/PartnerSmartDropdown';

interface HeaderShape {
  code?: string;
  name: string;
  description?: string;
  target_qty: number;
  unit?: string;
  status: ProjectStatus;
  start_date?: Dayjs;
  end_date?: Dayjs;
  notes?: string;
}

interface EntryFormShape {
  category: CostCategory;
  description: string;
  qty: number;
  unit?: string;
  rate: number;
  amount?: number;
  partner_id?: number;
  entry_date: Dayjs;
  is_planned: boolean;
  notes?: string;
}

const STATUS_COLOR: Record<ProjectStatus, string> = {
  planning:  'default',
  active:    'blue',
  completed: 'green',
  cancelled: 'red',
};

export default function ProjectFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const [form] = Form.useForm<HeaderShape>();
  const [entryForm] = Form.useForm<EntryFormShape>();

  const [project, setProject] = useState<Project | null>(null);
  const [entries, setEntries] = useState<ProjectCostEntry[]>([]);
  const [summary, setSummary] = useState<ProjectSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ProjectCostEntry | null>(null);

  // Load
  useEffect(() => {
    if (!editing || !id) return;
    setLoading(true);
    projectsApi.get(Number(id))
      .then((p) => {
        setProject(p);
        setEntries(p.entries ?? []);
        form.setFieldsValue({
          code: p.code,
          name: p.name,
          description: p.description ?? undefined,
          target_qty: p.target_qty,
          unit: p.unit ?? undefined,
          status: p.status,
          start_date: p.start_date ? dayjs(p.start_date) : undefined,
          end_date: p.end_date ? dayjs(p.end_date) : undefined,
          notes: p.notes ?? undefined,
        });
        void projectsApi.summary(Number(id)).then(setSummary).catch(() => undefined);
      })
      .catch(() => message.error('Failed to load project.'))
      .finally(() => setLoading(false));
  }, [editing, id, form]);

  const refreshSummary = async () => {
    if (!project) return;
    try { setSummary(await projectsApi.summary(project.id)); } catch { /* ignore */ }
  };

  const onSaveHeader = async () => {
    setSaving(true);
    try {
      const v = await form.validateFields();
      const payload = {
        ...v,
        start_date: v.start_date?.format('YYYY-MM-DD'),
        end_date:   v.end_date?.format('YYYY-MM-DD'),
      };
      if (editing && project) {
        const updated = await projectsApi.update(project.id, payload);
        setProject(updated);
        message.success('Project saved.');
      } else {
        const created = await projectsApi.create(payload);
        message.success(`Project created with code ${created.code}.`);
        navigate(`/projects/${created.id}/edit`, { replace: true });
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Save failed.');
    } finally { setSaving(false); }
  };

  const openAddEntry = () => {
    setEditingEntry(null);
    entryForm.resetFields();
    entryForm.setFieldsValue({
      category: 'raw_material',
      qty: 1, rate: 0,
      entry_date: dayjs(),
      is_planned: false,
    });
    setEntryModalOpen(true);
  };

  const openEditEntry = (entry: ProjectCostEntry) => {
    setEditingEntry(entry);
    entryForm.setFieldsValue({
      category: entry.category,
      description: entry.description,
      qty: entry.qty,
      unit: entry.unit ?? undefined,
      rate: entry.rate,
      amount: entry.amount,
      partner_id: entry.partner_id ?? undefined,
      entry_date: dayjs(entry.entry_date),
      is_planned: entry.is_planned,
      notes: entry.notes ?? undefined,
    });
    setEntryModalOpen(true);
  };

  const onSaveEntry = async () => {
    if (!project) return;
    try {
      const v = await entryForm.validateFields();
      const payload: CostEntryPayload = {
        category: v.category,
        description: v.description,
        qty: v.qty,
        unit: v.unit,
        rate: v.rate,
        amount: v.amount, // optional: when blank, backend computes qty × rate
        partner_id: v.partner_id ?? null,
        entry_date: v.entry_date.format('YYYY-MM-DD'),
        is_planned: v.is_planned,
        notes: v.notes,
      };
      if (editingEntry) {
        const updated = await projectsApi.updateEntry(project.id, editingEntry.id, payload);
        setEntries((rows) => rows.map((r) => r.id === updated.id ? updated : r));
        message.success('Entry updated.');
      } else {
        const created = await projectsApi.addEntry(project.id, payload);
        setEntries((rows) => [...rows, created]);
        message.success('Entry added.');
      }
      setEntryModalOpen(false);
      // Refresh project totals + summary (recalced server-side)
      const refreshed = await projectsApi.get(project.id);
      setProject(refreshed);
      void refreshSummary();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      if (err.response?.data?.message) message.error(err.response.data.message);
    }
  };

  const onDeleteEntry = async (entry: ProjectCostEntry) => {
    if (!project) return;
    try {
      await projectsApi.deleteEntry(project.id, entry.id);
      setEntries((rows) => rows.filter((r) => r.id !== entry.id));
      message.success('Entry deleted.');
      const refreshed = await projectsApi.get(project.id);
      setProject(refreshed);
      void refreshSummary();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Failed.');
    }
  };

  const entryCols = [
    { title: 'Date', dataIndex: 'entry_date', width: 110 },
    { title: 'Category', dataIndex: 'category', width: 140,
      render: (c: CostCategory) => <Tag color={undefined} style={{ background: CATEGORY_COLOR[c] + '20', color: CATEGORY_COLOR[c], border: `1px solid ${CATEGORY_COLOR[c]}40` }}>{CATEGORY_LABEL[c]}</Tag> },
    { title: 'Description', dataIndex: 'description' },
    { title: 'Qty', dataIndex: 'qty', width: 90, align: 'right' as const, render: (v: number) => Number(v).toFixed(4) },
    { title: 'Unit', dataIndex: 'unit', width: 70 },
    { title: 'Rate', dataIndex: 'rate', width: 110, align: 'right' as const, render: (v: number) => Number(v).toFixed(4) },
    { title: 'Amount', dataIndex: 'amount', width: 130, align: 'right' as const, render: (v: number) => <strong>₹ {Number(v).toFixed(2)}</strong> },
    { title: 'Planned?', dataIndex: 'is_planned', width: 90, render: (b: boolean) => b ? <Tag color="purple">Planned</Tag> : <Tag color="cyan">Actual</Tag> },
    { title: 'Vendor', key: 'p', width: 160, render: (_: unknown, r: ProjectCostEntry) => r.partner ? `${r.partner.code} — ${r.partner.name}` : '—' },
    { title: '', key: 'a', width: 90, render: (_: unknown, r: ProjectCostEntry) => (
      <Space>
        <Button size="small" icon={<EditOutlined />} onClick={() => openEditEntry(r)} />
        <Button size="small" danger icon={<DeleteOutlined />}
          onClick={() => confirmDelete({ title: 'Delete this cost entry?', onOk: () => onDeleteEntry(r) })} />
      </Space>
    )},
  ];

  return (
    <Card loading={loading}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space style={{ justifyContent: 'space-between', width: '100%' }}>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/projects')}>Back</Button>
            <Typography.Title level={4} style={{ margin: 0 }}>
              {editing ? `Project ${project?.code ?? ''}` : 'New project'}
            </Typography.Title>
            {project && <Tag color={STATUS_COLOR[project.status]}>{project.status}</Tag>}
          </Space>
          <Space>
            <Button type="primary" loading={saving} onClick={onSaveHeader}>
              {editing ? 'Save changes' : 'Create project'}
            </Button>
          </Space>
        </Space>

        {!editing && (
          <Alert type="info" showIcon
            message="Save the project first, then add cost entries one by one (Raw material, Labour, Transport, etc.). The totals at the top auto-update." />
        )}

        {/* === HEADER FORM === */}
        <Form<HeaderShape> form={form} layout="vertical" initialValues={{ status: 'planning', target_qty: 0 }}>
          <Row gutter={16}>
            <Col xs={12} md={4}><Form.Item label="Code" name="code" extra="auto from sequence"><Input placeholder="auto" disabled={editing} /></Form.Item></Col>
            <Col xs={24} md={10}><Form.Item label="Project name" name="name" rules={[{ required: true }]}><Input placeholder="e.g. Acme batch 2026-04" /></Form.Item></Col>
            <Col xs={12} md={4}><Form.Item label="Target qty" name="target_qty"><InputNumber min={0} step={0.0001} style={{ width: '100%' }} /></Form.Item></Col>
            <Col xs={12} md={3}><Form.Item label="Unit" name="unit"><Input placeholder="kg / L / pcs" /></Form.Item></Col>
            <Col xs={12} md={3}>
              <Form.Item label="Status" name="status" rules={[{ required: true }]}>
                <Select options={[
                  { value: 'planning',  label: 'Planning' },
                  { value: 'active',    label: 'Active' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'cancelled', label: 'Cancelled' },
                ]} />
              </Form.Item>
            </Col>
            <Col xs={12} md={4}><Form.Item label="Start" name="start_date"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
            <Col xs={12} md={4}><Form.Item label="End" name="end_date"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
            <Col xs={24} md={16}><Form.Item label="Notes" name="notes"><Input.TextArea rows={2} placeholder="What is this cost study for?" /></Form.Item></Col>
          </Row>
        </Form>

        {/* === SUMMARY (visible only after project saved) === */}
        {editing && project && (
          <>
            <Card size="small" style={{ background: '#fafafa' }}>
              <Row gutter={16}>
                <Col xs={12} md={6}><Statistic title="Planned total" value={Number(project.planned_total)} precision={2} prefix="₹" /></Col>
                <Col xs={12} md={6}><Statistic title="Actual total" value={Number(project.actual_total)} precision={2} prefix="₹" valueStyle={{ fontWeight: 700 }} /></Col>
                <Col xs={12} md={6}><Statistic title="Variance"
                  value={Number(project.actual_total) - Number(project.planned_total)}
                  precision={2} prefix="₹"
                  valueStyle={{ color: Number(project.actual_total) - Number(project.planned_total) <= 0 ? '#3f8600' : '#cf1322' }} />
                </Col>
                <Col xs={12} md={6}><Statistic title="Cost / unit (actual)"
                  value={summary?.cost_per_unit_actual ?? (project.target_qty > 0 ? Number(project.actual_total) / Number(project.target_qty) : 0)}
                  precision={4} prefix="₹" />
                </Col>
              </Row>
            </Card>

            <Tabs
              defaultActiveKey="entries"
              items={[
                {
                  key: 'entries',
                  label: `Cost entries (${entries.length})`,
                  children: (
                    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                      <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          Add one entry per cost line. Toggle <Tag color="purple" style={{ margin: 0 }}>Planned</Tag> for budget, <Tag color="cyan" style={{ margin: 0 }}>Actual</Tag> for what really happened.
                        </Typography.Text>
                        <Button type="primary" icon={<PlusOutlined />} onClick={openAddEntry}>Add cost entry</Button>
                      </Space>
                      <Table<ProjectCostEntry> rowKey="id" dataSource={entries} columns={entryCols} pagination={false} size="small" scroll={{ x: 1100 }} />
                    </Space>
                  ),
                },
                {
                  key: 'summary',
                  label: 'Summary (by category)',
                  children: summary ? (
                    <Table
                      rowKey="category"
                      pagination={false}
                      size="small"
                      dataSource={summary.by_category}
                      columns={[
                        { title: 'Category', dataIndex: 'category', render: (c: CostCategory) => <Tag style={{ background: CATEGORY_COLOR[c] + '20', color: CATEGORY_COLOR[c], border: `1px solid ${CATEGORY_COLOR[c]}40` }}>{CATEGORY_LABEL[c]}</Tag> },
                        { title: 'Planned',  dataIndex: 'planned', align: 'right' as const, render: (v: number) => `₹ ${Number(v).toFixed(2)}` },
                        { title: 'Actual',   dataIndex: 'actual',  align: 'right' as const, render: (v: number) => <strong>₹ {Number(v).toFixed(2)}</strong> },
                        { title: 'Variance', dataIndex: 'variance', align: 'right' as const,
                          render: (v: number) => <span style={{ color: v <= 0 ? '#3f8600' : '#cf1322' }}>{v >= 0 ? '+' : ''}₹ {Number(v).toFixed(2)}</span> },
                        { title: 'Variance %', dataIndex: 'variance_pct', align: 'right' as const, width: 110,
                          render: (v: number | null) => v != null
                            ? <span style={{ color: v <= 0 ? '#3f8600' : '#cf1322' }}>{v >= 0 ? '+' : ''}{Number(v).toFixed(1)}%</span>
                            : '—' },
                      ]}
                      summary={() => (
                        <Table.Summary.Row>
                          <Table.Summary.Cell index={0}><strong>Grand total</strong></Table.Summary.Cell>
                          <Table.Summary.Cell index={1} align="right"><strong>₹ {Number(summary.planned_total).toFixed(2)}</strong></Table.Summary.Cell>
                          <Table.Summary.Cell index={2} align="right"><strong>₹ {Number(summary.actual_total).toFixed(2)}</strong></Table.Summary.Cell>
                          <Table.Summary.Cell index={3} align="right"><strong style={{ color: summary.variance <= 0 ? '#3f8600' : '#cf1322' }}>{summary.variance >= 0 ? '+' : ''}₹ {Number(summary.variance).toFixed(2)}</strong></Table.Summary.Cell>
                          <Table.Summary.Cell index={4} align="right"><strong>{summary.variance_pct != null ? `${summary.variance_pct >= 0 ? '+' : ''}${summary.variance_pct.toFixed(1)}%` : '—'}</strong></Table.Summary.Cell>
                        </Table.Summary.Row>
                      )}
                    />
                  ) : <Alert message="Summary loading..." type="info" />,
                },
              ]}
            />
          </>
        )}
      </Space>

      {/* === Entry modal === */}
      <Modal
        title={editingEntry ? 'Edit cost entry' : 'Add cost entry'}
        open={entryModalOpen}
        onCancel={() => setEntryModalOpen(false)}
        onOk={onSaveEntry}
        okText={editingEntry ? 'Save' : 'Add'}
        width={620}
      >
        <Form<EntryFormShape> form={entryForm} layout="vertical">
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="Category" name="category" rules={[{ required: true }]}>
                <Select options={COST_CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABEL[c] }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Planned or Actual?" name="is_planned" valuePropName="value">
                <Segmented options={[{ label: 'Actual', value: false }, { label: 'Planned (budget)', value: true }]} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="Description" name="description" rules={[{ required: true }]}>
                <Input placeholder="e.g. Active Ingredient X, 5 kg" />
              </Form.Item>
            </Col>
            <Col span={6}><Form.Item label="Qty" name="qty" rules={[{ required: true, type: 'number', min: 0 }]}><InputNumber min={0} step={0.0001} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={6}><Form.Item label="Unit" name="unit"><Input placeholder="kg / hr / km" /></Form.Item></Col>
            <Col span={6}><Form.Item label="Rate (₹)" name="rate"><InputNumber min={0} step={0.0001} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={6}><Form.Item label="Amount (₹)" name="amount" extra="leave blank = qty × rate"><InputNumber min={0} step={0.01} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={12}><Form.Item label="Vendor (optional)" name="partner_id"><PartnerSmartDropdown placeholder="Pick a supplier / vendor" allowClear /></Form.Item></Col>
            <Col span={12}><Form.Item label="Date" name="entry_date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={24}><Form.Item label="Notes" name="notes"><Input.TextArea rows={2} /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>
    </Card>
  );
}

// Silence the unused Switch import — kept reserved for a future "mark as planned" inline toggle.
void Switch;
