import { useEffect, useRef, useState } from 'react';
import { Button, Input, Space, Tooltip, Typography } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { sequenceApi } from '../03-settings/api/settingsApi';
import { useAppSelector } from '../../app/hooks';

interface Props {
  /** AntD Form.Item-injected value (or directly controlled). */
  value?: string;
  /** AntD Form.Item-injected onChange (or directly controlled). */
  onChange?: (value: string | undefined) => void;
  /** Sequence doc_type key (e.g. 'invoice', 'quotation', 'sales_order', 'purchase_order'). */
  docType: string;
  /** When true (edit mode), don't fetch a preview — show the persisted code as-is. */
  editing?: boolean;
  disabled?: boolean;
  placeholder?: string;
  style?: React.CSSProperties;
}

/**
 * Shared input for the document number on Quotation/SO/Invoice/PO/PI/GRN/EI forms.
 *
 * Behavior:
 *  - On a NEW doc, fetches `GET /sequences/preview?doc_type=...` and prefills the value.
 *  - User can edit the value to override the auto-pick (backfill, manual numbering).
 *  - The "↻" button re-fetches the preview (in case settings changed in another tab).
 *  - On EXISTING doc (editing=true), the value comes from the loaded record. The field is
 *    still editable for renames; backend uniqueness rules apply.
 *  - When the user keeps the auto preview unchanged, backend re-generates from sequence
 *    on save (preview is non-binding).
 */
export default function DocumentNumberField({
  value, onChange, docType, editing = false, disabled = false, placeholder, style,
}: Props) {
  const activeCompanyId = useAppSelector((s) => s.companies.activeCompanyId);
  const [loading, setLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState(true); // value === fetched preview
  const fetchedFor = useRef<string>('');

  const fetchPreview = async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    try {
      const r = await sequenceApi.previewByDocType(docType, activeCompanyId);
      const next = r.next_preview ?? '';
      if (next) {
        onChange?.(next);
        setPreviewMode(true);
      }
    } catch {
      /* If sequence isn't configured, leave field empty so backend will fail loudly on save. */
    } finally {
      setLoading(false);
    }
  };

  // Auto-preview ONCE on mount for new docs, after we know the active company.
  useEffect(() => {
    if (editing) return;
    if (!activeCompanyId) return;
    const key = `${docType}:${activeCompanyId}`;
    if (fetchedFor.current === key) return;
    if (value && value.trim() !== '') return; // caller already supplied
    fetchedFor.current = key;
    void fetchPreview();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, activeCompanyId, docType]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPreviewMode(false);
    onChange?.(e.target.value || undefined);
  };

  return (
    <Space.Compact style={{ width: '100%', ...style }}>
      <Input
        value={value ?? ''}
        onChange={handleChange}
        placeholder={placeholder ?? 'auto'}
        disabled={disabled}
        suffix={
          !editing && previewMode && value
            ? <Typography.Text type="secondary" style={{ fontSize: 11 }}>auto</Typography.Text>
            : undefined
        }
      />
      {!editing && (
        <Tooltip title="Reload next number from Sequence Management">
          <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void fetchPreview()} disabled={disabled} />
        </Tooltip>
      )}
    </Space.Compact>
  );
}
