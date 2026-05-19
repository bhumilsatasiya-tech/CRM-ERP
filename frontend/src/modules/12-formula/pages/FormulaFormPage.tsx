import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Form, Input, InputNumber, Row, Select, Space, Tag, Typography, message } from 'antd';
import { confirmDelete } from '../../common/confirmDelete';
import DownloadPdfButton from '../../common/DownloadPdfButton';
import { CheckOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { formulaApi } from '../api/formulaApi';
import { productApi } from '../../05-products/api/productsApi';
import FormulaComponentsEditor, { type ComponentRow } from '../components/FormulaComponentsEditor';
import type { Formula, FormulaStatus } from '../types/formula.types';

interface HeaderShape {
  target_product_id: number;
  output_qty: number;
  output_uom_id?: number | null;
  notes?: string;
}

export default function FormulaFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const [form] = Form.useForm<HeaderShape>();
  const [f, setF] = useState<Formula | null>(null);
  const [components, setComponents] = useState<ComponentRow[]>([]);
  const [targetOpts, setTargetOpts] = useState<Array<{ value: number; label: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing || !id) return;
    setLoading(true);
    formulaApi.get(Number(id)).then((x) => {
      setF(x);
      form.setFieldsValue({
        target_product_id: x.target_product_id,
        output_qty: Number(x.output_qty),
        output_uom_id: x.output_uom_id ?? undefined,
        notes: x.notes ?? undefined,
      });
      if (x.target_product) setTargetOpts([{ value: x.target_product.id, label: `${x.target_product.code} — ${x.target_product.name}` }]);
      setComponents((x.components ?? []).map((c, i) => ({
        key: `e-${c.id ?? i}`, id: c.id,
        product_id: c.product_id,
        product_code: c.product?.code, product_name: c.product?.name,
        qty: Number(c.qty), wastage_pct: Number(c.wastage_pct),
        notes: c.notes ?? undefined,
      })));
    }).catch(() => message.error('Failed to load.')).finally(() => setLoading(false));
  }, [editing, id, form]);

  const onSearchTarget = async (q: string) => {
    if (!q) return;
    const list = await productApi.lookup(q, 'finished', undefined, 20);
    setTargetOpts(list.map((p) => ({ value: Number(p.id), label: `${p.code} — ${p.name}` })));
  };

  const onSave = async () => {
    setSaving(true);
    try {
      const v = await form.validateFields();
      const payload = {
        target_product_id: v.target_product_id,
        output_qty: v.output_qty,
        output_uom_id: v.output_uom_id ?? null,
        notes: v.notes,
        components: components.filter((c) => c.product_id && c.qty > 0).map((c) => ({
          product_id: c.product_id!, qty: c.qty, wastage_pct: c.wastage_pct ?? 0,
          notes: c.notes,
        })),
      };
      if (payload.components.length === 0) { message.error('Add at least one component.'); return; }
      if (editing && f) { await formulaApi.update(f.id, payload); message.success('Saved.'); }
      else {
        const created = await formulaApi.create(payload);
        message.success('Formula created.');
        navigate(`/formulas/${created.id}/edit`, { replace: true });
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Save failed.');
    } finally { setSaving(false); }
  };

  const onActivate = async () => {
    if (!f) return;
    try { setF(await formulaApi.activate(f.id)); message.success('Activated. Other versions of this product deactivated.'); }
    catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Activate failed.');
    }
  };

  const status: FormulaStatus | undefined = f?.status;
  const readOnly = !!status && status !== 'draft';

  return (
    <Card loading={loading}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space style={{ justifyContent: 'space-between', width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {editing ? `Formula ${f?.code ?? ''}` : 'New formula'}
            {status && <Tag style={{ marginLeft: 8 }}>{status} v{f?.version ?? 1}</Tag>}
          </Typography.Title>
          <Space>
            <Button onClick={() => navigate('/formulas')}>Back</Button>
            {editing && f && <DownloadPdfButton url={`/formulas/${f.id}/pdf`} filename={`formula-${f.code ?? f.id}.pdf`} />}
            {!readOnly && <Button type="primary" loading={saving} onClick={onSave}>{editing ? 'Save' : 'Create'}</Button>}
            {status === 'draft' && f && (
              <Button type="primary" icon={<CheckOutlined />}
                onClick={() => confirmDelete({
                  title: 'Activate this formula?',
                  content: 'Other versions of the same product will be deactivated.',
                  okText: 'Yes, activate',
                  danger: false,
                  onOk: onActivate,
                })}>Activate</Button>
            )}
          </Space>
        </Space>
        {status === 'active' && f?.is_active && (
          <Alert type="success" showIcon message={`Active v${f.version}. Production batches with this target product will scaffold inputs from here.`} />
        )}
        {status === 'inactive' && (
          <Alert type="warning" showIcon message="This formula is inactive. A different version is currently active for this product." />
        )}

        <Form form={form} layout="vertical" initialValues={{ output_qty: 1 }}>
          <Row gutter={16}>
            <Col xs={24} md={14}>
              <Form.Item label="Target product (finished)" name="target_product_id" rules={[{ required: true }]}>
                <Select showSearch placeholder="Search finished product..." disabled={readOnly} filterOption={false} onSearch={onSearchTarget} options={targetOpts} />
              </Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item label="Output qty (yield)" name="output_qty" rules={[{ required: true }]}>
                <InputNumber min={0.001} step={0.001} disabled={readOnly} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item label="Notes" name="notes">
                <Input.TextArea rows={2} disabled={readOnly} />
              </Form.Item>
            </Col>
          </Row>
        </Form>

        <FormulaComponentsEditor rows={components} onChange={setComponents} readOnly={readOnly} />
      </Space>
    </Card>
  );
}
