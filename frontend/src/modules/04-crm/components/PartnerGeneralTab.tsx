import { useEffect } from 'react';
import { Col, Form, Input, InputNumber, Row, Select, Switch, Tooltip, Typography } from 'antd';
import type { CreatePartnerPayload } from '../types/crm.types';

interface Props {
  form: import('antd/es/form/Form').FormInstance<CreatePartnerPayload>;
  editing?: boolean;
}

// ISO 3166-1 alpha-2 — common trade partners. Extend as needed.
const COUNTRY_OPTIONS = [
  { value: 'IN', label: 'India' },
  { value: 'US', label: 'United States' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'AE', label: 'United Arab Emirates' },
  { value: 'SG', label: 'Singapore' },
  { value: 'AU', label: 'Australia' },
  { value: 'CA', label: 'Canada' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
  { value: 'NL', label: 'Netherlands' },
  { value: 'IT', label: 'Italy' },
  { value: 'ES', label: 'Spain' },
  { value: 'JP', label: 'Japan' },
  { value: 'CN', label: 'China' },
  { value: 'HK', label: 'Hong Kong' },
  { value: 'KR', label: 'South Korea' },
  { value: 'BD', label: 'Bangladesh' },
  { value: 'LK', label: 'Sri Lanka' },
  { value: 'NP', label: 'Nepal' },
  { value: 'BR', label: 'Brazil' },
  { value: 'MX', label: 'Mexico' },
  { value: 'ZA', label: 'South Africa' },
  { value: 'KE', label: 'Kenya' },
  { value: 'NG', label: 'Nigeria' },
  { value: 'EG', label: 'Egypt' },
  { value: 'SA', label: 'Saudi Arabia' },
  { value: 'QA', label: 'Qatar' },
  { value: 'KW', label: 'Kuwait' },
  { value: 'OM', label: 'Oman' },
  { value: 'TH', label: 'Thailand' },
  { value: 'MY', label: 'Malaysia' },
  { value: 'ID', label: 'Indonesia' },
  { value: 'PH', label: 'Philippines' },
  { value: 'VN', label: 'Vietnam' },
  { value: 'XX', label: 'Other / Unknown' },
];

export default function PartnerGeneralTab({ form, editing }: Props) {
  const country = (Form.useWatch('country', form) as string | undefined) ?? 'IN';
  const isOverseas = country !== 'IN';

  // Whenever country flips overseas, force tax_treatment to 'overseas'.
  // When country flips back to IN, restore a sensible default if currently 'overseas'.
  useEffect(() => {
    if (isOverseas) {
      if (form.getFieldValue('tax_treatment') !== 'overseas') {
        form.setFieldValue('tax_treatment', 'overseas');
      }
    } else {
      if (form.getFieldValue('tax_treatment') === 'overseas') {
        form.setFieldValue('tax_treatment', 'unregistered');
      }
    }
  }, [isOverseas, form]);

  return (
    <Form<CreatePartnerPayload>
      form={form}
      layout="vertical"
      initialValues={{
        is_company: true, type: 'client', country: 'IN', tax_treatment: 'unregistered',
        segment: 'b2b', currency: 'INR', credit_limit: 0, credit_days: 0,
        opening_balance: 0, opening_balance_type: 'debit',
        default_payment_terms_days: 0, is_active: true, is_blacklisted: false,
      }}
    >
      <Typography.Text strong>Identity</Typography.Text>
      <Row gutter={16}>
        <Col xs={24} md={6}>
          <Form.Item label="Code (optional)" name="code"
            rules={[{ max: 32 }, { pattern: /^[A-Za-z0-9_-]*$/, message: 'Letters, numbers, dash only' }]}
            extra="auto-generated from name if blank"
          >
            <Input placeholder="auto" disabled={editing} />
          </Form.Item>
        </Col>
        <Col xs={24} md={10}>
          <Form.Item label="Name" name="name" rules={[{ required: true }]}><Input /></Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item label="Legal name" name="legal_name"><Input /></Form.Item>
        </Col>
        <Col xs={24} md={6}>
          <Form.Item label="Type" name="type" rules={[{ required: true }]}>
            <Select options={[
              { value: 'client', label: 'Client' },
              { value: 'supplier', label: 'Supplier' },
              { value: 'logistic', label: 'Logistic Company' },
              { value: 'manufacturer', label: 'Manufacturer' },
              { value: 'employee', label: 'Employee (vendor)' },
              { value: 'other', label: 'Other' },
            ]} />
          </Form.Item>
        </Col>
        <Col xs={24} md={6}>
          <Form.Item label="Segment" name="segment">
            <Select options={[
              { value: 'b2b', label: 'B2B' },
              { value: 'b2c', label: 'B2C' },
              { value: 'distributor', label: 'Distributor' },
              { value: 'oem', label: 'OEM' },
              { value: 'other', label: 'Other' },
            ]} />
          </Form.Item>
        </Col>
        <Col xs={24} md={6}>
          <Form.Item label="Industry" name="industry"><Input placeholder="e.g. Pharma" /></Form.Item>
        </Col>
        <Col xs={12} md={6}>
          <Form.Item label="Is a company" name="is_company" valuePropName="checked"><Switch /></Form.Item>
        </Col>

        <Col xs={24}><Typography.Text strong>Contact</Typography.Text></Col>
        <Col xs={24} md={8}><Form.Item label="Email" name="email" rules={[{ type: 'email' }]}><Input /></Form.Item></Col>
        <Col xs={24} md={8}><Form.Item label="Phone" name="phone"><Input /></Form.Item></Col>
        <Col xs={24} md={8}><Form.Item label="Mobile" name="mobile"><Input /></Form.Item></Col>
        <Col xs={24} md={12}><Form.Item label="Website" name="website" rules={[{ type: 'url', message: 'Must be a valid URL' }]}><Input /></Form.Item></Col>

        <Col xs={24}><Typography.Text strong>Tax</Typography.Text></Col>
        <Col xs={24} md={6}>
          <Form.Item
            label="Country"
            name="country"
            rules={[{ required: true, message: 'Country is required' }]}
            extra={isOverseas ? 'Overseas — tax treatment is locked to Overseas (export/zero-rated).' : 'India — pick the GST treatment below.'}
          >
            <Select
              showSearch
              placeholder="Select country"
              options={COUNTRY_OPTIONS}
              optionFilterProp="label"
              filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase()) || (option?.value ?? '').toLowerCase().includes(input.toLowerCase())}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={6}><Form.Item label={isOverseas ? 'GST (N/A — overseas)' : 'GST'} name="gst_no"><Input disabled={isOverseas} /></Form.Item></Col>
        <Col xs={24} md={6}><Form.Item label={isOverseas ? 'PAN (N/A — overseas)' : 'PAN'} name="pan_no"><Input disabled={isOverseas} /></Form.Item></Col>
        <Col xs={24} md={6}>
          <Form.Item
            label="VAT"
            name="vat_no"
            extra={isOverseas ? 'EU / UK / Gulf VAT number' : 'Optional — for overseas trade'}
          >
            <Input />
          </Form.Item>
        </Col>
        <Col xs={24} md={6}>
          <Form.Item
            label={isOverseas ? 'CIN (N/A — overseas)' : 'CIN'}
            name="cin_no"
            extra={isOverseas ? '' : 'Corporate Identification Number'}
          >
            <Input disabled={isOverseas} />
          </Form.Item>
        </Col>
        <Col xs={24} md={6}>
          <Tooltip title={isOverseas ? 'Tax treatment is forced to Overseas because the country is not India.' : ''}>
            <Form.Item label="Tax treatment" name="tax_treatment">
              <Select
                disabled={isOverseas}
                options={[
                  { value: 'registered', label: 'Registered' },
                  { value: 'unregistered', label: 'Unregistered' },
                  { value: 'composition', label: 'Composition' },
                  { value: 'sez', label: 'SEZ' },
                  { value: 'overseas', label: 'Overseas' },
                ]}
              />
            </Form.Item>
          </Tooltip>
        </Col>

        <Col xs={24}><Typography.Text strong>Finance</Typography.Text></Col>
        <Col xs={12} md={4}>
          <Form.Item label="Currency" name="currency"><Input /></Form.Item>
        </Col>
        <Col xs={12} md={5}>
          <Form.Item label="Credit limit" name="credit_limit"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
        </Col>
        <Col xs={12} md={4}>
          <Form.Item label="Credit days" name="credit_days"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
        </Col>
        <Col xs={12} md={4}>
          <Form.Item label="Payment terms (days)" name="default_payment_terms_days"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
        </Col>
        <Col xs={12} md={4}>
          <Form.Item label="Opening balance" name="opening_balance"><InputNumber style={{ width: '100%' }} /></Form.Item>
        </Col>
        <Col xs={12} md={3}>
          <Form.Item label="Bal. type" name="opening_balance_type">
            <Select options={[{ value: 'debit', label: 'Debit' }, { value: 'credit', label: 'Credit' }]} />
          </Form.Item>
        </Col>

        <Col xs={24}><Typography.Text strong>Flags</Typography.Text></Col>
        <Col xs={12} md={4}>
          <Form.Item label="Active" name="is_active" valuePropName="checked"><Switch /></Form.Item>
        </Col>
        <Col xs={12} md={4}>
          <Form.Item label="Blacklisted" name="is_blacklisted" valuePropName="checked"><Switch /></Form.Item>
        </Col>
        <Col xs={24} md={16}>
          <Form.Item label="Blacklist reason" name="blacklist_reason"><Input /></Form.Item>
        </Col>

        <Col xs={24}>
          <Form.Item label="Notes" name="notes"><Input.TextArea rows={3} /></Form.Item>
        </Col>
      </Row>
    </Form>
  );
}
