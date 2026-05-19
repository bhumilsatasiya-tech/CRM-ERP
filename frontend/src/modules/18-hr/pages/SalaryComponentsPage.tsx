import { useEffect, useState } from 'react';
import { Button, Card, Form, Input, InputNumber, Modal, Select, Space, Switch, Table, Tag, Typography, message } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { salaryComponentApi } from '../api/hrApi';
import { confirmDelete } from '../../common/confirmDelete';
import type { ComponentType, FormulaType, SalaryComponent } from '../types/hr.types';

export default function SalaryComponentsPage() {
  const [data, setData] = useState<SalaryComponent[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<{ open: boolean; editing?: SalaryComponent }>({ open: false });
  const [form] = Form.useForm<Partial<SalaryComponent>>();

  const fetch = async () => {
    setLoading(true);
    try { setData(await salaryComponentApi.list()); } catch { message.error('Failed.'); } finally { setLoading(false); }
  };
  useEffect(() => { void fetch(); }, []);

  const onSubmit = async () => {
    try {
      const v = await form.validateFields();
      if (modal.editing) await salaryComponentApi.update(modal.editing.id, v);
      else await salaryComponentApi.create(v);
      setModal({ open: false }); form.resetFields();
      message.success('Saved.');
      await fetch();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      if (err.response) message.error(err.response.data?.message ?? 'Failed.');
    }
  };

  return (
    <Card>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space style={{ justifyContent: 'space-between', width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>Salary components</Typography.Title>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); form.setFieldsValue({ type: 'earning', formula_type: 'fixed', is_active: true }); setModal({ open: true }); }}>New</Button>
        </Space>
        <Table<SalaryComponent>
          rowKey="id" dataSource={data} loading={loading} pagination={false} size="middle"
          columns={[
            { title: 'Code', dataIndex: 'code', width: 100 },
            { title: 'Name', dataIndex: 'name' },
            { title: 'Type', dataIndex: 'type', width: 110, render: (t: ComponentType) => <Tag color={t === 'earning' ? 'green' : 'red'}>{t}</Tag> },
            { title: 'Formula', dataIndex: 'formula_type', width: 150, render: (f: FormulaType) => <Tag>{f}</Tag> },
            { title: 'Value', dataIndex: 'formula_value', align: 'right' as const, width: 110, render: (v: number) => Number(v).toFixed(2) },
            { title: 'Active', dataIndex: 'is_active', width: 80, render: (a: boolean) => a ? 'Yes' : 'No' },
            { title: '', key: 'a', width: 110, render: (_, r) => (
              <Space>
                <Button size="small" icon={<EditOutlined />} onClick={() => { form.setFieldsValue(r); setModal({ open: true, editing: r }); }} />
                <Button danger size="small" icon={<DeleteOutlined />}
                  onClick={() => confirmDelete({
                    title: `Delete component "${r.name}"?`,
                    onOk: async () => { await salaryComponentApi.remove(r.id); await fetch(); },
                  })} />
              </Space>
            )},
          ]}
        />
      </Space>
      <Modal open={modal.open} title={modal.editing ? 'Edit component' : 'New component'} onCancel={() => setModal({ open: false })} onOk={onSubmit}>
        <Form form={form} layout="vertical">
          <Form.Item label="Code" name="code" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="Name" name="name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="Type" name="type" rules={[{ required: true }]}><Select options={[{ value: 'earning', label: 'Earning' }, { value: 'deduction', label: 'Deduction' }]} /></Form.Item>
          <Form.Item label="Formula" name="formula_type" rules={[{ required: true }]}><Select options={[{ value: 'fixed', label: 'Fixed' }, { value: 'percent_of_basic', label: '% of basic' }]} /></Form.Item>
          <Form.Item label="Value" name="formula_value" rules={[{ required: true }]}><InputNumber min={0} step={0.01} style={{ width: '100%' }} /></Form.Item>
          <Form.Item label="Taxable" name="is_taxable" valuePropName="checked"><Switch /></Form.Item>
          <Form.Item label="Active" name="is_active" valuePropName="checked"><Switch /></Form.Item>
          <Form.Item label="Notes" name="notes"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
