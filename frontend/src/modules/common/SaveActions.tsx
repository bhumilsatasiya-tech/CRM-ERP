import { useState } from 'react';
import { Button, Dropdown, message } from 'antd';
import { DownOutlined, PrinterOutlined, ThunderboltOutlined, MailOutlined, WhatsAppOutlined, SaveOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../01-auth/api/axiosInstance';

interface SaveResult {
  id: number;
  code?: string | null;
}

interface Props {
  /** Document type used to build /:doc/new for "Save & New" and PDF URL for "Save & Print". */
  docType: 'invoice' | 'quotation' | 'sales-order' | 'purchase-order' | 'export-invoice' | 'tax-invoice'
         | 'shipping-bill' | 'packing-list' | 'purchase-invoice' | 'grn' | 'journal-entry' | 'loan'
         | 'production-batch' | 'inter-company-invoice' | 'irm' | 'partner' | 'product';
  /** True when on the edit (existing record) form. */
  editing: boolean;
  /** The save function. MUST return the created/updated record with at least { id }. */
  doSave: () => Promise<SaveResult | null>;
  /** Existing record id (for "& Print" / "& Send" — needs an id). */
  entityId?: number | null;
  /** Existing record code (for filename + email/WA subject). */
  entityCode?: string | null;
  /** Toggle disabled state from outside. */
  disabled?: boolean;
  /** Override the primary button label. */
  primaryLabel?: string;
}

/**
 * Universal save bar: primary "Save / Create" + dropdown "Save & New" / "Save & Print"
 * / "Save & Email" / "Save & WhatsApp". The dropdown items appear regardless of `editing`
 * because power users do "Save & New" on existing records all the time too.
 *
 * Design rules:
 *   - Primary button always runs `doSave()` and stays on the page (or navigates to /:doc/:id/edit
 *     on create — same as before).
 *   - "Save & New" runs doSave() then navigates to /:doc/new.
 *   - "Save & Print" runs doSave() then triggers PDF download (uses the same /pdf endpoint
 *     as DownloadPdfButton).
 *   - "Save & Email" / "Save & WhatsApp" emit a global event the relevant Comms modal can listen on.
 */
export default function SaveActions({
  docType, editing, doSave, entityId, entityCode, disabled, primaryLabel,
}: Props) {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  /** Wrap doSave with consistent loading + error handling. Returns the saved record or null. */
  const runSave = async (): Promise<SaveResult | null> => {
    setSaving(true);
    try {
      const r = await doSave();
      return r;
    } finally {
      setSaving(false);
    }
  };

  const handlePrimary = async () => {
    const saved = await runSave();
    if (!saved) return;
    if (!editing) navigate(`/${pluralPath(docType)}/${saved.id}/edit`, { replace: true });
  };

  const handleSaveAndNew = async () => {
    const saved = await runSave();
    if (!saved) return;
    // Force remount via timestamp param so SmartDropdowns / line editor reset cleanly.
    navigate(`/${pluralPath(docType)}/new?_t=${Date.now()}`);
  };

  const handleSaveAndPrint = async () => {
    const saved = await runSave();
    if (!saved) return;
    // Need backend round-trip for the PDF; do it now.
    try {
      const r = await apiClient.get(`/${pluralPath(docType)}/${saved.id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${docType}-${saved.code ?? saved.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      message.warning('Saved, but PDF download failed.');
    }
  };

  const handleSaveAndSend = async (channel: 'email' | 'whatsapp') => {
    const saved = await runSave();
    if (!saved) return;
    window.dispatchEvent(new CustomEvent('crm-erp:send-doc', {
      detail: { docType, id: saved.id, code: saved.code, channel },
    }));
    message.info(`Saved. ${channel === 'email' ? 'Email' : 'WhatsApp'} dialog opening…`);
  };

  const menuItems = [
    { key: 'new',      icon: <ThunderboltOutlined />, label: 'Save & New',     onClick: handleSaveAndNew },
    { key: 'print',    icon: <PrinterOutlined />,    label: 'Save & Print',   onClick: handleSaveAndPrint, disabled: !PRINTABLE.includes(docType) },
    { type: 'divider' as const },
    { key: 'email',    icon: <MailOutlined />,       label: 'Save & Email',    onClick: () => handleSaveAndSend('email'),    disabled: !entityId && !editing },
    { key: 'whatsapp', icon: <WhatsAppOutlined />,   label: 'Save & WhatsApp', onClick: () => handleSaveAndSend('whatsapp'), disabled: !entityId && !editing },
  ];

  return (
    <Dropdown.Button
      type="primary"
      loading={saving}
      disabled={disabled}
      onClick={handlePrimary}
      icon={<DownOutlined />}
      menu={{ items: menuItems }}
    >
      <SaveOutlined /> {primaryLabel ?? (editing ? 'Save' : 'Create')}
    </Dropdown.Button>
  );
}

/** Map our docType to the URL prefix (most are just plural). */
function pluralPath(docType: Props['docType']): string {
  switch (docType) {
    case 'invoice':                return 'invoices';
    case 'quotation':              return 'quotations';
    case 'sales-order':            return 'sales-orders';
    case 'purchase-order':         return 'purchase-orders';
    case 'export-invoice':         return 'export-invoices';
    case 'tax-invoice':            return 'tax-invoices';
    case 'shipping-bill':          return 'shipping-bills';
    case 'packing-list':           return 'packing-lists';
    case 'purchase-invoice':       return 'purchase-invoices';
    case 'grn':                    return 'grns';
    case 'journal-entry':          return 'journal-entries';
    case 'loan':                   return 'loans';
    case 'production-batch':       return 'production-batches';
    case 'inter-company-invoice':  return 'inter-company-invoices';
    case 'irm':                    return 'irms';
    case 'partner':                return 'partners';
    case 'product':                return 'products';
  }
}

/** Doc types that have a PDF endpoint. Keeps "Save & Print" hidden where not applicable. */
const PRINTABLE: Props['docType'][] = [
  'invoice', 'quotation', 'sales-order', 'purchase-order',
  'export-invoice', 'tax-invoice',
];
