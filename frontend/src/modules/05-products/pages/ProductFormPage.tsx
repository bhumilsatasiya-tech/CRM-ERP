import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Form, Input, InputNumber, Row, Select, Space, Switch, Tabs, Typography, message } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { productApi, unitApi } from '../api/productsApi';
import type { CreateProductPayload, Product, ProductUnit } from '../types/products.types';
import UomConversionsTab from '../components/UomConversionsTab';
import CategorySmartDropdown from '../../common/CategorySmartDropdown';
import UnitSmartDropdown from '../../common/UnitSmartDropdown';

export default function ProductFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const [form] = Form.useForm<CreateProductPayload>();

  const [product, setProduct] = useState<Product | null>(null);
  const [units, setUnits] = useState<ProductUnit[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('general');
  const [categoryLabel, setCategoryLabel] = useState<string | undefined>(undefined);
  const [unitLabel, setUnitLabel] = useState<string | undefined>(undefined);

  // Loaded only for the weight-UoM dropdown on the Inventory tab (filters by type=weight client-side).
  useEffect(() => {
    unitApi.list().then(setUnits).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!editing || !id) return;
    setLoading(true);
    productApi.get(Number(id))
      .then((p) => {
        setProduct(p);
        form.setFieldsValue(p as unknown as CreateProductPayload);
        if (p.category) setCategoryLabel(`${p.category.code} — ${p.category.name}`);
        if (p.unit) setUnitLabel(`${p.unit.symbol} — ${p.unit.code}`);
      })
      .catch(() => message.error('Failed to load product.'))
      .finally(() => setLoading(false));
  }, [editing, id, form]);

  const onSave = async () => {
    setSaving(true);
    try {
      const v = await form.validateFields();
      if (editing && product) {
        const updated = await productApi.update(product.id, v);
        setProduct(updated);
        message.success('Product updated.');
      } else {
        const created = await productApi.create(v);
        message.success('Product created. You can now configure UoM conversions.');
        navigate(`/products/${created.id}/edit`, { replace: true });
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Save failed.');
    } finally { setSaving(false); }
  };

  return (
    <Card loading={loading}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space style={{ justifyContent: 'space-between', width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {editing ? `Edit product — ${product?.code ?? ''} ${product?.name ?? ''}` : 'New product'}
          </Typography.Title>
          <Space>
            <Button onClick={() => navigate('/products')}>Back to list</Button>
            <Button type="primary" loading={saving} onClick={onSave}>{editing ? 'Save changes' : 'Create product'}</Button>
          </Space>
        </Space>

        {!editing && (
          <Alert type="info" showIcon message="Save the product first; UoM Conversions tab will unlock after." />
        )}

        <Tabs
          activeKey={tab}
          onChange={setTab}
          items={[
            {
              key: 'general',
              label: 'General',
              children: (
                <Form<CreateProductPayload> form={form} layout="vertical"
                  initialValues={{
                    type: 'finished', tax_rate: 0, is_active: true,
                    is_purchasable: true, is_sellable: true, is_stockable: true,
                    has_batches: false, has_expiry: false, has_serials: false,
                    is_company_made: false, currency: 'INR',
                    standard_cost: 0, standard_price: 0, mrp: 0, last_purchase_cost: 0,
                    opening_stock_qty: 0, opening_stock_value: 0,
                    reorder_level: 0, reorder_qty: 0, min_stock: 0, max_stock: 0,
                    lead_time_days: 0,
                  }}
                >
                  <Typography.Text strong>Identity</Typography.Text>
                  <Row gutter={16}>
                    <Col xs={24} md={6}>
                      <Form.Item label="Code (optional)" name="code" extra="auto-generated from name if blank">
                        <Input disabled={editing} placeholder="auto" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={10}>
                      <Form.Item label="Name" name="name" rules={[{ required: true }]}><Input /></Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item label="Barcode" name="barcode"><Input /></Form.Item>
                    </Col>
                    <Col xs={24}>
                      <Form.Item label="Description" name="description"><Input.TextArea rows={2} /></Form.Item>
                    </Col>

                    <Col xs={24}><Typography.Text strong>Classification</Typography.Text></Col>
                    <Col xs={24} md={6}>
                      <Form.Item label="Type" name="type" rules={[{ required: true }]}>
                        <Select options={[
                          { value: 'raw', label: 'Raw material' },
                          { value: 'finished', label: 'Finished good' },
                          { value: 'packaging', label: 'Packaging' },
                          { value: 'consumable', label: 'Consumable' },
                          { value: 'service', label: 'Service' },
                          { value: 'other', label: 'Other' },
                        ]} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={10}>
                      <Form.Item label="Category" name="category_id">
                        <CategorySmartDropdown
                          fallbackLabel={categoryLabel}
                          onCategorySelect={(c) => { if (c?.code && c?.name) setCategoryLabel(`${c.code} — ${c.name}`); }}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={4}>
                      <Form.Item label="Default UoM" name="unit_id" rules={[{ required: true }]}>
                        <UnitSmartDropdown
                          fallbackLabel={unitLabel}
                          allowClear={false}
                          onUnitSelect={(u) => { if (u?.symbol && u?.code) setUnitLabel(`${u.symbol} — ${u.code}`); }}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={12} md={4}>
                      <Form.Item label="Made in-house" name="is_company_made" valuePropName="checked"><Switch /></Form.Item>
                    </Col>

                    <Col xs={24}><Typography.Text strong>Tax</Typography.Text></Col>
                    <Col xs={24} md={6}><Form.Item label="HSN / SAC" name="hsn_code"><Input /></Form.Item></Col>
                    <Col xs={24} md={6}><Form.Item label="Tax rate %" name="tax_rate"><InputNumber min={0} max={100} step={0.5} style={{ width: '100%' }} /></Form.Item></Col>

                    <Col xs={24}><Typography.Text strong>Tracking</Typography.Text></Col>
                    <Col xs={12} md={4}><Form.Item label="Has batches" name="has_batches" valuePropName="checked"><Switch /></Form.Item></Col>
                    <Col xs={12} md={4}><Form.Item label="Has expiry" name="has_expiry" valuePropName="checked"><Switch /></Form.Item></Col>
                    <Col xs={12} md={4}><Form.Item label="Has serials" name="has_serials" valuePropName="checked"><Switch /></Form.Item></Col>
                    <Col xs={24} md={6}><Form.Item label="Shelf life (days)" name="shelf_life_days"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>

                    <Col xs={24}><Typography.Text strong>Flags</Typography.Text></Col>
                    <Col xs={12} md={4}><Form.Item label="Active" name="is_active" valuePropName="checked"><Switch /></Form.Item></Col>
                    <Col xs={12} md={4}><Form.Item label="Purchasable" name="is_purchasable" valuePropName="checked"><Switch /></Form.Item></Col>
                    <Col xs={12} md={4}><Form.Item label="Sellable" name="is_sellable" valuePropName="checked"><Switch /></Form.Item></Col>
                    <Col xs={12} md={4}><Form.Item label="Stockable" name="is_stockable" valuePropName="checked"><Switch /></Form.Item></Col>

                    <Col xs={24}><Form.Item label="Notes" name="notes"><Input.TextArea rows={2} /></Form.Item></Col>
                  </Row>
                </Form>
              ),
            },
            {
              key: 'pricing',
              label: 'Pricing & Costing',
              children: (
                <Form<CreateProductPayload> form={form} layout="vertical">
                  <Row gutter={16}>
                    <Col xs={24}><Typography.Text strong>Costing</Typography.Text></Col>
                    <Col xs={12} md={6}><Form.Item label="Standard cost" name="standard_cost"><InputNumber min={0} step={0.01} style={{ width: '100%' }} /></Form.Item></Col>
                    <Col xs={12} md={6}><Form.Item label="Last purchase cost" name="last_purchase_cost"><InputNumber min={0} step={0.01} style={{ width: '100%' }} /></Form.Item></Col>
                    <Col xs={12} md={6}><Form.Item label="Opening stock qty" name="opening_stock_qty"><InputNumber step={0.001} style={{ width: '100%' }} /></Form.Item></Col>
                    <Col xs={12} md={6}><Form.Item label="Opening stock value" name="opening_stock_value"><InputNumber step={0.01} style={{ width: '100%' }} /></Form.Item></Col>

                    <Col xs={24}><Typography.Text strong>Selling</Typography.Text></Col>
                    <Col xs={12} md={6}><Form.Item label="Standard price" name="standard_price"><InputNumber min={0} step={0.01} style={{ width: '100%' }} /></Form.Item></Col>
                    <Col xs={12} md={6}><Form.Item label="MRP" name="mrp"><InputNumber min={0} step={0.01} style={{ width: '100%' }} /></Form.Item></Col>
                    <Col xs={12} md={6}><Form.Item label="Currency" name="currency"><Input /></Form.Item></Col>
                  </Row>
                </Form>
              ),
            },
            {
              key: 'inventory',
              label: 'Inventory',
              children: (
                <Form<CreateProductPayload> form={form} layout="vertical">
                  <Row gutter={16}>
                    <Col xs={12} md={6}><Form.Item label="Reorder level" name="reorder_level"><InputNumber min={0} step={0.001} style={{ width: '100%' }} /></Form.Item></Col>
                    <Col xs={12} md={6}><Form.Item label="Reorder qty" name="reorder_qty"><InputNumber min={0} step={0.001} style={{ width: '100%' }} /></Form.Item></Col>
                    <Col xs={12} md={6}><Form.Item label="Min stock" name="min_stock"><InputNumber min={0} step={0.001} style={{ width: '100%' }} /></Form.Item></Col>
                    <Col xs={12} md={6}><Form.Item label="Max stock" name="max_stock"><InputNumber min={0} step={0.001} style={{ width: '100%' }} /></Form.Item></Col>
                    <Col xs={12} md={6}><Form.Item label="Lead time (days)" name="lead_time_days"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>

                    <Col xs={24}><Typography.Text strong>Dimensions</Typography.Text></Col>
                    <Col xs={12} md={4}><Form.Item label="Weight" name="weight"><InputNumber min={0} step={0.001} style={{ width: '100%' }} /></Form.Item></Col>
                    <Col xs={12} md={4}>
                      <Form.Item label="Weight UoM" name="weight_unit_id">
                        <Select allowClear options={units.filter((u) => u.type === 'weight').map((u) => ({ value: u.id, label: u.symbol }))} />
                      </Form.Item>
                    </Col>
                    <Col xs={12} md={4}><Form.Item label="Length" name="length"><InputNumber min={0} step={0.01} style={{ width: '100%' }} /></Form.Item></Col>
                    <Col xs={12} md={4}><Form.Item label="Width" name="width"><InputNumber min={0} step={0.01} style={{ width: '100%' }} /></Form.Item></Col>
                    <Col xs={12} md={4}><Form.Item label="Height" name="height"><InputNumber min={0} step={0.01} style={{ width: '100%' }} /></Form.Item></Col>
                  </Row>
                </Form>
              ),
            },
            {
              key: 'uom',
              label: 'UoM Conversions',
              disabled: !editing || !product,
              children: product ? (
                <UomConversionsTab productId={product.id} baseUnitSymbol={product.unit?.symbol} />
              ) : null,
            },
          ]}
        />
      </Space>
    </Card>
  );
}
