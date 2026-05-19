import { useState } from 'react';
import { Button, Tooltip, message } from 'antd';
import { FilePdfOutlined } from '@ant-design/icons';
import { apiClient } from '../01-auth/api/axiosInstance';

interface Props {
  /** API path that returns the PDF blob, e.g. `/invoices/42/pdf`. */
  url: string;
  /** Suggested filename if the response doesn't carry a Content-Disposition. */
  filename: string;
  /** Override label (default "Download PDF"). */
  label?: string;
  size?: 'small' | 'middle' | 'large';
  type?: 'default' | 'primary' | 'dashed' | 'link' | 'text';
  disabled?: boolean;
}

/**
 * Reusable button that hits a backend `/pdf` endpoint and saves the response as a file.
 * Uses Axios responseType=blob so the auth token + X-Company-Id headers are still sent
 * (a plain <a href> would lose them).
 */
export default function DownloadPdfButton({ url, filename, label = 'Download PDF', size = 'middle', type = 'default', disabled = false }: Props) {
  const [loading, setLoading] = useState(false);

  const onClick = async () => {
    setLoading(true);
    try {
      const r = await apiClient.get<Blob>(url, { responseType: 'blob' });
      const blob = new Blob([r.data], { type: 'application/pdf' });
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch (e: unknown) {
      const err = e as { response?: { data?: unknown } };
      // The error body is a Blob (because responseType=blob). Try to read it as text for the message.
      if (err.response?.data instanceof Blob) {
        try {
          const text = await (err.response.data as Blob).text();
          const json = JSON.parse(text) as { message?: string };
          message.error(json.message ?? 'PDF generation failed.');
        } catch { message.error('PDF generation failed.'); }
      } else {
        message.error('PDF generation failed.');
      }
    } finally { setLoading(false); }
  };

  return (
    <Tooltip title="Generate PDF using the active template (edit in Settings → Document Templates)">
      <Button icon={<FilePdfOutlined />} size={size} type={type} loading={loading} disabled={disabled} onClick={onClick}>
        {label}
      </Button>
    </Tooltip>
  );
}
