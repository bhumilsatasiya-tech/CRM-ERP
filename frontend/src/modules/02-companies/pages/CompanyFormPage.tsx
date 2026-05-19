import { useEffect, useRef, useState } from 'react';
import { Button, Card, Col, DatePicker, Form, Input, Modal, Row, Select, Space, Switch, Typography, message } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs, { Dayjs } from 'dayjs';
import { companyApi } from '../api/companyApi';
import type { CompanyType, CreateCompanyPayload } from '../types/companies.types';

interface FormShape extends Omit<CreateCompanyPayload, 'fiscal_year_start'> {
  fiscal_year_start?: Dayjs | null;
}

export default function CompanyFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const [form] = Form.useForm<FormShape>();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const nameTouchedRef = useRef(false); // user has manually edited the Name field
  const legalNameTouchedRef = useRef(false);

  // Watch both fields. Mirror legal_name → name while name is still synced. Confirm before
  // overwriting an out-of-sync value.
  const onLegalNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    legalNameTouchedRef.current = true;
    const newLegal = e.target.value;
    const currentName = form.getFieldValue('name') as string | undefined;
    if (!nameTouchedRef.current || !currentName) {
      form.setFieldValue('name', newLegal);
    }
  };
  const onNameChange = (_e: React.ChangeEvent<HTMLInputElement>) => {
    nameTouchedRef.current = true;
  };
  const onNameBlur = () => {
    const name = form.getFieldValue('name') as string | undefined;
    const legal = form.getFieldValue('legal_name') as string | undefined;
    if (!editing && name && legal && name !== legal && legalNameTouchedRef.current) {
      Modal.confirm({
        title: 'Name and Legal name differ',
        content: `Name: "${name}"\nLegal name: "${legal}"\n\nDo you want to use the same value for both?`,
        okText: 'Use Name as Legal name',
        cancelText: 'Keep both',
        okType: 'primary',
        onOk: () => form.setFieldValue('legal_name', name),
      });
    }
  };

  useEffect(() => {
    if (!editing || !id) return;
    setLoading(true);
    companyApi
      .get(Number(id))
      .then((c) => {
        form.setFieldsValue({
          code: c.code,
          name: c.name,
          legal_name: c.legal_name ?? undefined,
          type: c.type,
          gst_no: c.gst_no ?? undefined,
          pan_no: c.pan_no ?? undefined,
          cin_no: c.cin_no ?? undefined,
          iec_no: c.iec_no ?? undefined,
          tan_no: c.tan_no ?? undefined,
          registration_no: c.registration_no ?? undefined,
          email: c.email ?? undefined,
          phone: c.phone ?? undefined,
          website: c.website ?? undefined,
          address_line1: c.address?.line1 ?? undefined,
          address_line2: c.address?.line2 ?? undefined,
          city: c.address?.city ?? undefined,
          state: c.address?.state ?? undefined,
          country: c.address?.country ?? 'India',
          postal_code: c.address?.postal_code ?? undefined,
          bill_to_line1: c.bill_to?.line1 ?? undefined,
          bill_to_line2: c.bill_to?.line2 ?? undefined,
          bill_to_city: c.bill_to?.city ?? undefined,
          bill_to_state: c.bill_to?.state ?? undefined,
          bill_to_country: c.bill_to?.country ?? undefined,
          bill_to_postal_code: c.bill_to?.postal_code ?? undefined,
          ship_to_line1: c.ship_to?.line1 ?? undefined,
          ship_to_line2: c.ship_to?.line2 ?? undefined,
          ship_to_city: c.ship_to?.city ?? undefined,
          ship_to_state: c.ship_to?.state ?? undefined,
          ship_to_country: c.ship_to?.country ?? undefined,
          ship_to_postal_code: c.ship_to?.postal_code ?? undefined,
          currency: c.currency ?? 'INR',
          fiscal_year_start: c.fiscal_year_start ? dayjs(c.fiscal_year_start) : null,
          is_active: c.is_active,
        });
      })
      .catch(() => message.error('Failed to load company.'))
      .finally(() => setLoading(false));
  }, [editing, id, form]);

  /** Copy the company's primary address into bill-to or ship-to fields. */
  const copyAddressTo = (prefix: 'bill_to' | 'ship_to') => {
    const v = form.getFieldsValue();
    form.setFieldsValue({
      [`${prefix}_line1`]: v.address_line1,
      [`${prefix}_line2`]: v.address_line2,
      [`${prefix}_city`]: v.city,
      [`${prefix}_state`]: v.state,
      [`${prefix}_country`]: v.country,
      [`${prefix}_postal_code`]: v.postal_code,
    });
  };

  const onFinish = async (values: FormShape) => {
    setSaving(true);
    try {
      const payload: CreateCompanyPayload = {
        ...values,
        type: values.type as CompanyType,
        fiscal_year_start: values.fiscal_year_start ? values.fiscal_year_start.format('YYYY-MM-DD') : undefined,
      };
      if (editing && id) {
        await companyApi.update(Number(id), payload);
        message.success('Company updated.');
      } else {
        await companyApi.create(payload);
        message.success('Company created.');
      }
      navigate('/companies');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card loading={loading}>
      <Typography.Title level={4} style={{ marginBottom: 16 }}>
        {editing ? 'Edit company' : 'New company'}
      </Typography.Title>

      <Form<FormShape>
        form={form}
        layout="vertical"
        initialValues={{ is_active: true, currency: 'INR', country: 'India', type: 'export' }}
        onFinish={onFinish}
      >
        <Row gutter={16}>
          <Col xs={24} md={6}>
            <Form.Item label="Code (optional)" name="code" rules={[{ max: 16 }, { pattern: /^[A-Za-z0-9_-]*$/, message: 'Letters, numbers, dashes only' }]} extra="auto-generated from name if blank">
              <Input placeholder="auto" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Legal name" name="legal_name" extra="Default Name will mirror this value">
              <Input onChange={onLegalNameChange} />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item label="Type" name="type" rules={[{ required: true }]}>
              <Select
                options={[
                  { value: 'export', label: 'Export' },
                  { value: 'supplying', label: 'Supplying' },
                  { value: 'trading', label: 'Trading' },
                  { value: 'other', label: 'Other' },
                ]}
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item label="Name" name="name" rules={[{ required: true }]}>
              <Input onChange={onNameChange} onBlur={onNameBlur} />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item label="Currency" name="currency"><Input /></Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item label="Fiscal year start" name="fiscal_year_start"><DatePicker style={{ width: '100%' }} /></Form.Item>
          </Col>

          <Col xs={24}><Typography.Text strong>Tax / regulatory</Typography.Text></Col>
          <Col xs={24} md={6}><Form.Item label="GST" name="gst_no"><Input /></Form.Item></Col>
          <Col xs={24} md={6}><Form.Item label="PAN" name="pan_no"><Input /></Form.Item></Col>
          <Col xs={24} md={6}><Form.Item label="CIN" name="cin_no"><Input /></Form.Item></Col>
          <Col xs={24} md={6}><Form.Item label="IEC" name="iec_no"><Input /></Form.Item></Col>
          <Col xs={24} md={6}><Form.Item label="TAN" name="tan_no" extra="Tax Deduction Account Number"><Input /></Form.Item></Col>
          <Col xs={24} md={12}><Form.Item label="Registration #" name="registration_no"><Input /></Form.Item></Col>

          <Col xs={24}><Typography.Text strong>Contact</Typography.Text></Col>
          <Col xs={24} md={8}><Form.Item label="Email" name="email" rules={[{ type: 'email' }]}><Input /></Form.Item></Col>
          <Col xs={24} md={8}><Form.Item label="Phone" name="phone"><Input /></Form.Item></Col>
          <Col xs={24} md={8}><Form.Item label="Website" name="website" rules={[{ type: 'url', message: 'Must be a valid URL' }]}><Input /></Form.Item></Col>

          <Col xs={24}><Typography.Text strong>Registered address</Typography.Text></Col>
          <Col xs={24} md={12}><Form.Item label="Address line 1" name="address_line1"><Input /></Form.Item></Col>
          <Col xs={24} md={12}><Form.Item label="Address line 2" name="address_line2"><Input /></Form.Item></Col>
          <Col xs={24} md={6}><Form.Item label="City" name="city"><Input /></Form.Item></Col>
          <Col xs={24} md={6}><Form.Item label="State" name="state"><Input /></Form.Item></Col>
          <Col xs={24} md={6}><Form.Item label="Country" name="country"><Input /></Form.Item></Col>
          <Col xs={24} md={6}><Form.Item label="Postal code" name="postal_code"><Input /></Form.Item></Col>

          <Col xs={24}>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Typography.Text strong>Bill-to address</Typography.Text>
              <Button size="small" onClick={() => copyAddressTo('bill_to')}>Copy from registered address</Button>
            </Space>
          </Col>
          <Col xs={24} md={12}><Form.Item label="Bill-to line 1" name="bill_to_line1"><Input /></Form.Item></Col>
          <Col xs={24} md={12}><Form.Item label="Bill-to line 2" name="bill_to_line2"><Input /></Form.Item></Col>
          <Col xs={24} md={6}><Form.Item label="City" name="bill_to_city"><Input /></Form.Item></Col>
          <Col xs={24} md={6}><Form.Item label="State" name="bill_to_state"><Input /></Form.Item></Col>
          <Col xs={24} md={6}><Form.Item label="Country" name="bill_to_country"><Input /></Form.Item></Col>
          <Col xs={24} md={6}><Form.Item label="Postal code" name="bill_to_postal_code"><Input /></Form.Item></Col>

          <Col xs={24}>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Typography.Text strong>Ship-to address</Typography.Text>
              <Button size="small" onClick={() => copyAddressTo('ship_to')}>Copy from registered address</Button>
            </Space>
          </Col>
          <Col xs={24} md={12}><Form.Item label="Ship-to line 1" name="ship_to_line1"><Input /></Form.Item></Col>
          <Col xs={24} md={12}><Form.Item label="Ship-to line 2" name="ship_to_line2"><Input /></Form.Item></Col>
          <Col xs={24} md={6}><Form.Item label="City" name="ship_to_city"><Input /></Form.Item></Col>
          <Col xs={24} md={6}><Form.Item label="State" name="ship_to_state"><Input /></Form.Item></Col>
          <Col xs={24} md={6}><Form.Item label="Country" name="ship_to_country"><Input /></Form.Item></Col>
          <Col xs={24} md={6}><Form.Item label="Postal code" name="ship_to_postal_code"><Input /></Form.Item></Col>

          <Col xs={12} md={6}>
            <Form.Item label="Active" name="is_active" valuePropName="checked"><Switch /></Form.Item>
          </Col>
        </Row>

        <Space>
          <Button onClick={() => navigate('/companies')}>Cancel</Button>
          <Button type="primary" htmlType="submit" loading={saving}>
            {editing ? 'Save changes' : 'Create company'}
          </Button>
        </Space>
      </Form>
    </Card>
  );
}
