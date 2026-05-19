import { useEffect, useState } from 'react';
import { Button, Card, Input, Select, Space, Statistic, Table, Tag, Typography, message } from 'antd';
import { ReloadOutlined, WarningOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { stockLedgerApi } from '../api/inventoryApi';
import { companyApi } from '../../02-companies/api/companyApi';
import { warehouseApi } from '../../02-companies/api/warehouseApi';
import type { CurrentStockRow } from '../types/inventory.types';

export default function CurrentStockPage() {
  const [rows, setRows] = useState<CurrentStockRow[]>([]);
  const [search, setSearch] = useState('');
  const [warehouseId, setWarehouseId] = useState<number | undefined>(undefined);
  const [warehouses, setWarehouses] = useState<{ id: number; code: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [valuation, setValuation] = useState<number | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [r, val] = await Promise.all([
        stockLedgerApi.current(warehouseId),
        stockLedgerApi.valuation().catch(() => null),
      ]);
      setRows(r);
      if (val) setValuation(val.total_value);
    } catch { message.error('Failed to load current stock.'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    // Fetch all warehouses across all the user's companies
    companyApi.myCompanies().then(async (cm) => {
      const all: { id: number; code: string; name: string }[] = [];
      for (const c of cm.data) {
        try {
          const r = await warehouseApi.list(c.id, { per_page: 200 });
          all.push(...r.data.map((w) => ({ id: w.id, code: w.code, name: `${c.code} · ${w.name}` })));
        } catch { /* ignore */ }
      }
      setWarehouses(all);
    }).catch(() => undefined);
  }, []);
  // ↑ The list above is informational; current-stock query uses active company anyway.

  useEffect(() => { void fetchData(); /* eslint-disable-next-line */ }, [warehouseId]);

  const filtered = rows.filter((r) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return r.product_code.toLowerCase().includes(s)
        || r.product_name.toLowerCase().includes(s)
        || r.warehouse_code.toLowerCase().includes(s)
        || r.warehouse_name.toLowerCase().includes(s);
  });

  const columns: ColumnsType<CurrentStockRow> = [
    { title: 'Product code', dataIndex: 'product_code', key: 'product_code', width: 140, render: (c: string) => <Tag>{c}</Tag> },
    { title: 'Product', dataIndex: 'product_name', key: 'product_name' },
    { title: 'Warehouse', key: 'warehouse',
      render: (_, row) => <Space><Tag>{row.warehouse_code}</Tag>{row.warehouse_name}</Space> },
    { title: 'Qty', dataIndex: 'qty', key: 'qty', align: 'right' as const, width: 130,
      render: (v: number, row) => (
        <Space>
          <strong>{v.toLocaleString(undefined, { maximumFractionDigits: 4 })}</strong>
          <Typography.Text type="secondary">{row.unit ?? ''}</Typography.Text>
        </Space>
      ),
    },
    { title: 'Value', dataIndex: 'value', key: 'value', align: 'right' as const, width: 130,
      render: (v: number) => v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
    { title: 'Batches', key: 'batches', width: 90,
      render: (_, row) => row.batches.filter((b) => b.batch_no).length || '—' },
  ];

  return (
    <Card>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>Current stock</Typography.Title>
          <Space wrap>
            <Statistic title="Total stock value" value={valuation ?? 0} precision={2} prefix="₹" valueStyle={{ fontSize: 16 }} />
            <Input.Search placeholder="Search product or warehouse" allowClear onSearch={(v) => setSearch(v)} style={{ width: 280 }} />
            <Select
              placeholder="Warehouse" allowClear style={{ width: 220 }}
              value={warehouseId} onChange={(v) => setWarehouseId(v)}
              options={warehouses.map((w) => ({ value: w.id, label: `${w.code} — ${w.name}` }))}
            />
            <Button icon={<ReloadOutlined />} onClick={() => void fetchData()}>Refresh</Button>
          </Space>
        </Space>

        <Table<CurrentStockRow>
          rowKey={(r) => `${r.product_id}:${r.warehouse_id}`}
          dataSource={filtered}
          columns={columns}
          loading={loading}
          pagination={{ pageSize: 50 }}
          size="middle"
          expandable={{
            expandedRowRender: (row) => (
              <Space direction="vertical" size={4}>
                <Typography.Text type="secondary">Batches:</Typography.Text>
                {row.batches.length === 0 ? <Typography.Text type="secondary">No batches tracked.</Typography.Text> : (
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    {row.batches.map((b, i) => (
                      <li key={i}>
                        <Tag>{b.batch_no ?? '(no batch)'}</Tag>
                        {b.expiry_date && <Tag color="red"><WarningOutlined /> exp {b.expiry_date}</Tag>}
                        <strong>{b.qty.toLocaleString(undefined, { maximumFractionDigits: 4 })}</strong>
                      </li>
                    ))}
                  </ul>
                )}
              </Space>
            ),
            rowExpandable: (row) => row.batches.length > 0,
          }}
        />
      </Space>
    </Card>
  );
}
