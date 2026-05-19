import { useEffect, useState } from 'react';
import { Alert, Button, Card, Form, Space, Tabs, Typography, message } from 'antd';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { partnerApi } from '../api/partnerApi';
import type { CreatePartnerPayload, Partner, PartnerType } from '../types/crm.types';
import PartnerGeneralTab from '../components/PartnerGeneralTab';
import ContactsTab from '../components/ContactsTab';
import AddressesTab from '../components/AddressesTab';
import BankAccountsTab from '../components/BankAccountsTab';

const ALLOWED_TYPES: PartnerType[] = ['client', 'supplier', 'logistic', 'vendor', 'manufacturer', 'importer', 'employee', 'other'];

const TYPE_LABEL: Record<PartnerType, string> = {
  client: 'Client (Buyer)',
  supplier: 'Supplier (Seller)',
  logistic: 'Logistic Company',
  vendor: 'Vendor (Service provider)',
  manufacturer: 'Manufacturer',
  importer: 'Importer',
  employee: 'Employee',
  other: 'Partner',
};

export default function PartnerFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form] = Form.useForm<CreatePartnerPayload>();

  const [partner, setPartner] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<string>('general');

  useEffect(() => {
    if (!editing || !id) return;
    setLoading(true);
    partnerApi.get(Number(id))
      .then((p) => { setPartner(p); form.setFieldsValue(p as unknown as CreatePartnerPayload); })
      .catch(() => message.error('Failed to load partner.'))
      .finally(() => setLoading(false));
  }, [editing, id, form]);

  // Pre-select type when arriving via ?type=client (etc.) on a NEW partner
  useEffect(() => {
    if (editing) return;
    const t = params.get('type');
    if (t && (ALLOWED_TYPES as string[]).includes(t)) {
      form.setFieldValue('type', t as PartnerType);
    }
  }, [editing, params, form]);

  // The type drives the page wording. Prefer the loaded record; fall back to ?type= (new); finally 'other'.
  const urlType = params.get('type') as PartnerType | null;
  const watchedType = Form.useWatch('type', form) as PartnerType | undefined;
  const activeType: PartnerType =
    partner?.type ?? watchedType ?? (urlType && (ALLOWED_TYPES as string[]).includes(urlType) ? urlType : 'other');
  const typeLabel = TYPE_LABEL[activeType];

  const onSaveGeneral = async () => {
    setSaving(true);
    try {
      const v = await form.validateFields();
      if (editing && partner) {
        const updated = await partnerApi.update(partner.id, v);
        setPartner(updated);
        message.success(`${typeLabel} updated.`);
      } else {
        const created = await partnerApi.create(v);
        message.success(`${typeLabel} created. You can now add contacts, addresses and banks.`);
        navigate(`/partners/${created.id}/edit`, { replace: true });
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
      const msg = err.response?.data?.message ?? 'Save failed.';
      message.error(msg);
    } finally { setSaving(false); }
  };

  return (
    <Card loading={loading}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space style={{ justifyContent: 'space-between', width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {editing
              ? `Edit ${typeLabel.toLowerCase()} — ${partner?.code ?? ''} ${partner?.name ?? ''}`
              : `New ${typeLabel.toLowerCase()}`}
          </Typography.Title>
          <Space>
            <Button onClick={() => navigate('/partners')}>Back to list</Button>
            <Button type="primary" loading={saving} onClick={onSaveGeneral}>
              {editing ? 'Save changes' : `Create ${typeLabel.toLowerCase()}`}
            </Button>
          </Space>
        </Space>

        {!editing && (
          <Alert
            type="info"
            showIcon
            message={`Save the ${typeLabel.toLowerCase()} first, then add contacts, addresses, and bank accounts on their tabs.`}
          />
        )}

        <Tabs
          activeKey={tab}
          onChange={setTab}
          items={[
            { key: 'general',   label: 'General',         children: <PartnerGeneralTab form={form} editing={editing} /> },
            { key: 'contacts',  label: 'Contacts',        disabled: !editing || !partner,  children: partner ? <ContactsTab     partnerId={partner.id} /> : null },
            { key: 'addresses', label: 'Addresses',       disabled: !editing || !partner,  children: partner ? <AddressesTab    partnerId={partner.id} /> : null },
            { key: 'banks',     label: 'Bank accounts',   disabled: !editing || !partner,  children: partner ? <BankAccountsTab partnerId={partner.id} /> : null },
          ]}
        />
      </Space>
    </Card>
  );
}
