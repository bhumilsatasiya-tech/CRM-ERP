import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, DatePicker, Form, Input, InputNumber, Row, Select, Space, Table, Tabs, Tag, Typography, message } from 'antd';
import { DeleteOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs, { type Dayjs } from 'dayjs';
import { designationApi, employeeApi, salaryComponentApi } from '../api/hrApi';
import type { ComponentType, Designation, Employee, EmployeeStatus, FormulaType, SalaryComponent } from '../types/hr.types';

interface HeaderShape {
  name: string;
  email?: string;
  phone?: string;
  designation_id?: number;
  joining_date?: Dayjs;
  date_of_birth?: Dayjs;
  gender?: 'male' | 'female' | 'other';
  status: EmployeeStatus;
  pan?: string; aadhar?: string;
  bank_name?: string; bank_account_no?: string; bank_ifsc?: string;
  notes?: string;
}

interface CompRow {
  key: string;
  code?: string; name: string; type: ComponentType;
  formula_type: FormulaType; formula_value: number;
}

export default function EmployeeFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const [form] = Form.useForm<HeaderShape>();
  const [structForm] = Form.useForm<{ effective_from: Dayjs; basic: number }>();
  const [emp, setEmp] = useState<Employee | null>(null);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [components, setComponents] = useState<SalaryComponent[]>([]);
  const [structRows, setStructRows] = useState<CompRow[]>([]);
  const [loading, setLoading] = useState(false); const [saving, setSaving] = useState(false);

  useEffect(() => {
    designationApi.list().then(setDesignations).catch(() => undefined);
    salaryComponentApi.list().then(setComponents).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!editing || !id) return;
    setLoading(true);
    employeeApi.get(Number(id)).then((x) => {
      setEmp(x);
      form.setFieldsValue({
        name: x.name, email: x.email ?? undefined, phone: x.phone ?? undefined,
        designation_id: x.designation_id ?? undefined,
        joining_date: x.joining_date ? dayjs(x.joining_date) : undefined,
        date_of_birth: x.date_of_birth ? dayjs(x.date_of_birth) : undefined,
        gender: x.gender ?? undefined, status: x.status,
        pan: x.pan ?? undefined, aadhar: x.aadhar ?? undefined,
        bank_name: x.bank_name ?? undefined, bank_account_no: x.bank_account_no ?? undefined, bank_ifsc: x.bank_ifsc ?? undefined,
        notes: x.notes ?? undefined,
      });
      if (x.latest_structure) {
        structForm.setFieldsValue({
          effective_from: dayjs(x.latest_structure.effective_from),
          basic: x.latest_structure.basic,
        });
        setStructRows((x.latest_structure.components ?? []).map((c, i) => ({
          key: `e-${i}`, code: c.code, name: c.name, type: c.type,
          formula_type: c.formula_type, formula_value: c.formula_value,
        })));
      } else {
        structForm.setFieldsValue({ effective_from: dayjs(), basic: 0 });
      }
    }).catch(() => message.error('Failed to load.')).finally(() => setLoading(false));
  }, [editing, id, form, structForm]);

  const onSave = async () => {
    setSaving(true);
    try {
      const v = await form.validateFields();
      const payload = {
        ...v,
        joining_date: v.joining_date?.format('YYYY-MM-DD'),
        date_of_birth: v.date_of_birth?.format('YYYY-MM-DD'),
      };
      if (editing && emp) { setEmp(await employeeApi.update(emp.id, payload)); message.success('Saved.'); }
      else {
        const created = await employeeApi.create(payload);
        message.success('Employee created.');
        navigate(`/employees/${created.id}/edit`, { replace: true });
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Save failed.');
    } finally { setSaving(false); }
  };

  const onSaveStructure = async () => {
    if (!emp) return;
    try {
      const v = await structForm.validateFields();
      await employeeApi.setStructure(emp.id, {
        effective_from: v.effective_from.format('YYYY-MM-DD'),
        basic: v.basic,
        components: structRows.map((r) => ({ code: r.code, name: r.name, type: r.type, formula_type: r.formula_type, formula_value: r.formula_value })),
      });
      message.success('Structure saved.');
      const fresh = await employeeApi.get(emp.id);
      setEmp(fresh);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Save failed.');
    }
  };

  const addRow = () => setStructRows((rows) => [...rows, { key: `n-${Date.now()}`, name: '', type: 'earning', formula_type: 'fixed', formula_value: 0 }]);
  const updateRow = (k: string, p: Partial<CompRow>) => setStructRows((rows) => rows.map((r) => r.key === k ? { ...r, ...p } : r));
  const removeRow = (k: string) => setStructRows((rows) => rows.filter((r) => r.key !== k));

  return (
    <Card loading={loading}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space style={{ justifyContent: 'space-between', width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>{editing ? `Employee ${emp?.code ?? ''}` : 'New employee'} {emp && <Tag>{emp.status}</Tag>}</Typography.Title>
          <Space>
            <Button onClick={() => navigate('/employees')}>Back</Button>
            <Button type="primary" loading={saving} onClick={onSave}>{editing ? 'Save' : 'Create'}</Button>
          </Space>
        </Space>

        <Tabs defaultActiveKey="profile" items={[
          {
            key: 'profile', label: 'Profile',
            children: (
              <Form form={form} layout="vertical" initialValues={{ status: 'active' }}>
                <Row gutter={16}>
                  <Col xs={12} md={8}><Form.Item label="Name" name="name" rules={[{ required: true }]}><Input /></Form.Item></Col>
                  <Col xs={12} md={6}><Form.Item label="Email" name="email"><Input type="email" /></Form.Item></Col>
                  <Col xs={12} md={4}><Form.Item label="Phone" name="phone"><Input /></Form.Item></Col>
                  <Col xs={12} md={6}><Form.Item label="Designation" name="designation_id"><Select allowClear options={designations.map((d) => ({ value: d.id, label: d.name }))} /></Form.Item></Col>
                  <Col xs={12} md={4}><Form.Item label="Joining date" name="joining_date"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
                  <Col xs={12} md={4}><Form.Item label="Date of birth" name="date_of_birth"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
                  <Col xs={12} md={3}><Form.Item label="Gender" name="gender"><Select allowClear options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'other', label: 'Other' }]} /></Form.Item></Col>
                  <Col xs={12} md={3}><Form.Item label="Status" name="status" rules={[{ required: true }]}><Select options={(['active', 'inactive', 'resigned', 'terminated'] as EmployeeStatus[]).map((s) => ({ value: s, label: s }))} /></Form.Item></Col>
                  <Col xs={12} md={4}><Form.Item label="PAN" name="pan"><Input /></Form.Item></Col>
                  <Col xs={12} md={5}><Form.Item label="Aadhar" name="aadhar"><Input /></Form.Item></Col>
                  <Col xs={12} md={6}><Form.Item label="Bank name" name="bank_name"><Input /></Form.Item></Col>
                  <Col xs={12} md={6}><Form.Item label="Account no." name="bank_account_no"><Input /></Form.Item></Col>
                  <Col xs={12} md={4}><Form.Item label="IFSC" name="bank_ifsc"><Input /></Form.Item></Col>
                  <Col xs={24}><Form.Item label="Notes" name="notes"><Input.TextArea rows={2} /></Form.Item></Col>
                </Row>
              </Form>
            ),
          },
          ...(editing ? [{
            key: 'salary', label: 'Salary structure',
            children: (
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                {emp?.latest_structure
                  ? <Alert type="info" showIcon message={`Active structure effective from ${emp.latest_structure.effective_from}, basic ${emp.latest_structure.basic.toFixed(2)}.`} />
                  : <Alert type="warning" showIcon message="No structure set yet. Adding a new one will be the active structure." />}
                <Form form={structForm} layout="vertical" initialValues={{ effective_from: dayjs(), basic: 0 }}>
                  <Row gutter={16}>
                    <Col xs={12} md={4}><Form.Item label="Effective from" name="effective_from" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
                    <Col xs={12} md={4}><Form.Item label="Basic" name="basic" rules={[{ required: true }]}><InputNumber min={0} step={100} style={{ width: '100%' }} /></Form.Item></Col>
                  </Row>
                </Form>
                <Typography.Text strong>Components</Typography.Text>
                <Table<CompRow>
                  rowKey="key" dataSource={structRows} pagination={false} size="small"
                  columns={[
                    { title: 'Pick from CoA', key: 'pick', width: 200, render: (_: unknown, r: CompRow) => (
                      <Select size="small" style={{ width: '100%' }} placeholder="Optional"
                        options={components.map((c) => ({ value: c.code, label: `${c.code} (${c.type})` }))}
                        onChange={(code) => {
                          const c = components.find((x) => x.code === code);
                          if (c) updateRow(r.key, { code: c.code, name: c.name, type: c.type, formula_type: c.formula_type, formula_value: c.formula_value });
                        }}
                      />
                    )},
                    { title: 'Name', key: 'n', render: (_: unknown, r: CompRow) => <Input value={r.name} onChange={(e) => updateRow(r.key, { name: e.target.value })} /> },
                    { title: 'Type', key: 't', width: 130, render: (_: unknown, r: CompRow) => <Select value={r.type} options={[{ value: 'earning', label: 'Earning' }, { value: 'deduction', label: 'Deduction' }]} onChange={(v: ComponentType) => updateRow(r.key, { type: v })} style={{ width: '100%' }} /> },
                    { title: 'Formula', key: 'f', width: 180, render: (_: unknown, r: CompRow) => <Select value={r.formula_type} options={[{ value: 'fixed', label: 'Fixed' }, { value: 'percent_of_basic', label: '% of basic' }]} onChange={(v: FormulaType) => updateRow(r.key, { formula_type: v })} style={{ width: '100%' }} /> },
                    { title: 'Value', key: 'v', width: 120, render: (_: unknown, r: CompRow) => <InputNumber value={r.formula_value} min={0} step={0.01} onChange={(v) => updateRow(r.key, { formula_value: Number(v ?? 0) })} style={{ width: '100%' }} /> },
                    { title: '', key: 'rm', width: 50, render: (_: unknown, r: CompRow) => <Button size="small" danger icon={<DeleteOutlined />} onClick={() => removeRow(r.key)} /> },
                  ]}
                />
                <Space>
                  <Button icon={<PlusOutlined />} onClick={addRow}>Add component</Button>
                  <Button type="primary" icon={<SaveOutlined />} onClick={onSaveStructure}>Save structure</Button>
                </Space>
              </Space>
            ),
          }] : []),
        ]} />
      </Space>
    </Card>
  );
}
