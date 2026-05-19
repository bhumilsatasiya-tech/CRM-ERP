import { useEffect, useState } from 'react';
import { Button, Card, Input, Select, Space, Table, Tag, Typography, message } from 'antd';
import { EditOutlined, EyeOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { formulaApi } from '../api/formulaApi';
import type { Formula, FormulaStatus } from '../types/formula.types';

const COLORS: Record<FormulaStatus, string> = { draft: 'default', active: 'green', inactive: 'red' };

export default function FormulasListPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<Formula[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<FormulaStatus | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  const fetch = async () => {
    setLoading(true);
    try {
      const r = await formulaApi.list({ search: search || undefined, status, page, per_page: perPage });
      setData(r.data); setTotal(r.meta.total);
    } catch { message.error('Failed.'); } finally { setLoading(false); }
  };
  useEffect(() => { void fetch(); /* eslint-disable-next-line */ }, [page, perPage, status]);

  const cols: ColumnsType<Formula> = [
    { title: 'Code', dataIndex: 'code', key: 'code', width: 200, render: (c: string, r) => <Link to={`/formulas/${r.id}`}><Tag>{c}</Tag></Link> },
    { title: 'Target product', key: 'tp', render: (_, r) => r.target_product ? `${r.target_product.code} — ${r.target_product.name}` : '—' },
    { title: 'Yield', key: 'oq', width: 110, align: 'right' as const, render: (_, r) => `${Number(r.output_qty).toFixed(3)}${r.output_uom?.symbol ? ` ${r.output_uom.symbol}` : ''}` },
    { title: 'Version', dataIndex: 'version', key: 'v', width: 80, align: 'right' as const },
    { title: 'Components', dataIndex: 'components_count', key: 'c', width: 110, align: 'right' as const },
    { title: 'Status', dataIndex: 'status', key: 's', width: 110, render: (s: FormulaStatus) => <Tag color={COLORS[s]}>{s}</Tag> },
    { title: 'Actions', key: 'a', width: 120, render: (_, r) => (
      <Space>
        <Button icon={<EyeOutlined />} size="small" onClick={() => navigate(`/formulas/${r.id}`)} />
        {r.status === 'draft' && <Button icon={<EditOutlined />} size="small" onClick={() => navigate(`/formulas/${r.id}/edit`)} />}
      </Space>
    )},
  ];

  const pagination: TablePaginationConfig = { current: page, pageSize: perPage, total, showSizeChanger: true, onChange: (p, ps) => { setPage(p); setPerPage(ps); } };

  return (
    <Card>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>Formulas (BOM)</Typography.Title>
          <Space>
            <Input.Search placeholder="Search code" allowClear onSearch={(v) => { setSearch(v); setPage(1); void fetch(); }} style={{ width: 220 }} />
            <Select placeholder="Status" allowClear style={{ width: 160 }} value={status} onChange={(v) => { setStatus(v); setPage(1); }}
              options={(Object.keys(COLORS) as FormulaStatus[]).map((s) => ({ value: s, label: s }))} />
            <Button icon={<ReloadOutlined />} onClick={() => void fetch()}>Refresh</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/formulas/new')}>New formula</Button>
          </Space>
        </Space>
        <Table<Formula> rowKey="id" dataSource={data} columns={cols} loading={loading} pagination={pagination} size="middle" />
      </Space>
    </Card>
  );
}
