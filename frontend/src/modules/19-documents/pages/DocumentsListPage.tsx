import { useEffect, useState } from 'react';
import { Button, Card, Input, Select, Space, Table, Tag, Typography, message } from 'antd';
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { documentsApi } from '../api/documentsApi';
import type { DocumentCategory, DocumentRow } from '../types/documents.types';

export default function DocumentsListPage() {
  const [data, setData] = useState<DocumentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<DocumentCategory | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  const fetch = async () => {
    setLoading(true);
    try {
      const r = await documentsApi.list({ search: search || undefined, category, page, per_page: perPage });
      setData(r.data); setTotal(r.meta.total);
    } catch { message.error('Failed.'); } finally { setLoading(false); }
  };
  useEffect(() => { void fetch(); /* eslint-disable-next-line */ }, [page, perPage, category]);

  const cols: ColumnsType<DocumentRow> = [
    { title: 'File', dataIndex: 'original_filename' },
    { title: 'Category', dataIndex: 'category', width: 120, render: (c: DocumentCategory) => <Tag>{c}</Tag> },
    { title: 'Attached to', key: 'a', render: (_, r) => `${r.attachable_type.split('\\').pop()} #${r.attachable_id}` },
    { title: 'Size', dataIndex: 'size_bytes', width: 110, align: 'right' as const, render: (n: number) => `${(n / 1024).toFixed(1)} KB` },
    { title: 'Uploaded', dataIndex: 'created_at', width: 170, render: (v?: string) => v ? new Date(v).toLocaleString() : '—' },
    { title: '', key: 'd', width: 60, render: (_, r) => <Button size="small" icon={<DownloadOutlined />} href={documentsApi.downloadUrl(r.id)} target="_blank" /> },
  ];

  const pagination: TablePaginationConfig = { current: page, pageSize: perPage, total, showSizeChanger: true, onChange: (p, ps) => { setPage(p); setPerPage(ps); } };

  return (
    <Card>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>Documents</Typography.Title>
          <Space>
            <Input.Search placeholder="Search filename" allowClear onSearch={(v) => { setSearch(v); setPage(1); void fetch(); }} style={{ width: 240 }} />
            <Select placeholder="Category" allowClear style={{ width: 160 }} value={category} onChange={(v) => { setCategory(v); setPage(1); }}
              options={(['kyc', 'coa', 'msds', 'photo', 'contract', 'invoice_pdf', 'other'] as DocumentCategory[]).map((c) => ({ value: c, label: c }))} />
            <Button icon={<ReloadOutlined />} onClick={() => void fetch()}>Refresh</Button>
          </Space>
        </Space>
        <Table<DocumentRow> rowKey="id" dataSource={data} columns={cols} loading={loading} pagination={pagination} size="middle" />
      </Space>
    </Card>
  );
}
