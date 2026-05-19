import { useEffect, useState } from 'react';
import { Button, Select, Space, Table, Tag, Typography, Upload, message } from 'antd';
import { DeleteOutlined, DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import { documentsApi } from '../api/documentsApi';
import type { DocumentCategory, DocumentRow } from '../types/documents.types';
import { confirmDelete } from '../../common/confirmDelete';

const CATEGORIES: DocumentCategory[] = ['kyc', 'coa', 'msds', 'photo', 'contract', 'invoice_pdf', 'other'];

interface Props {
  attachableType: string;
  attachableId: number;
  defaultCategory?: DocumentCategory;
}

export default function DocumentsPanel({ attachableType, attachableId, defaultCategory = 'other' }: Props) {
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<DocumentCategory>(defaultCategory);
  const [uploading, setUploading] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      const r = await documentsApi.list({ attachable_type: attachableType, attachable_id: attachableId, per_page: 50 });
      setDocs(r.data);
    } catch { message.error('Failed to load documents.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void fetch(); /* eslint-disable-next-line */ }, [attachableType, attachableId]);

  const onUpload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('attachable_type', attachableType);
      fd.append('attachable_id', String(attachableId));
      fd.append('category', category);
      await documentsApi.upload(fd);
      message.success('Uploaded.');
      await fetch();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Upload failed.');
    } finally { setUploading(false); }
    return false; // prevent antd's default upload
  };

  const onDelete = async (id: number) => {
    try { await documentsApi.remove(id); await fetch(); message.success('Deleted.'); }
    catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Delete failed.');
    }
  };

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Space>
        <Typography.Text strong>Documents</Typography.Text>
        <Select size="small" value={category} options={CATEGORIES.map((c) => ({ value: c, label: c }))} onChange={setCategory} style={{ width: 150 }} />
        <Upload beforeUpload={onUpload} showUploadList={false}>
          <Button size="small" icon={<UploadOutlined />} loading={uploading}>Upload</Button>
        </Upload>
      </Space>
      <Table<DocumentRow>
        rowKey="id"
        size="small"
        loading={loading}
        dataSource={docs}
        pagination={false}
        columns={[
          { title: 'File', dataIndex: 'original_filename' },
          { title: 'Category', dataIndex: 'category', width: 120, render: (c: DocumentCategory) => <Tag>{c}</Tag> },
          { title: 'Size', dataIndex: 'size_bytes', width: 110, align: 'right' as const, render: (n: number) => `${(n / 1024).toFixed(1)} KB` },
          { title: 'Uploaded', dataIndex: 'created_at', width: 170, render: (v?: string) => v ? new Date(v).toLocaleString() : '—' },
          { title: '', key: 'a', width: 110, render: (_: unknown, r) => (
            <Space>
              <Button size="small" icon={<DownloadOutlined />} href={documentsApi.downloadUrl(r.id)} target="_blank" />
              <Button danger size="small" icon={<DeleteOutlined />}
                onClick={() => confirmDelete({
                  title: `Delete "${r.original_filename}"?`,
                  onOk: () => onDelete(r.id),
                })} />
            </Space>
          )},
        ]}
      />
    </Space>
  );
}
