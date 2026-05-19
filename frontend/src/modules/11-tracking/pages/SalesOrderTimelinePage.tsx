import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Descriptions, Progress, Row, Space, Statistic, Table, Tag, Typography, message } from 'antd';
import { ArrowLeftOutlined, ReloadOutlined } from '@ant-design/icons';
import { Link, useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { trackingApi } from '../api/trackingApi';
import TimelineEntry from '../components/TimelineEntry';
import type { TrackingTimeline } from '../types/tracking.types';

export default function SalesOrderTimelinePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<TrackingTimeline | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try { setData(await trackingApi.getSalesOrder(Number(id))); }
    catch { message.error('Failed to load.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [id]);

  if (loading || !data) {
    return <Card loading={loading}><Typography.Text>{!loading ? 'Not found.' : ''}</Typography.Text></Card>;
  }

  const { sales_order: so, quotation, production, invoices, payments_total, stock_movements, progress, timeline } = data;

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Space style={{ justifyContent: 'space-between', width: '100%' }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/tracking')}>Back</Button>
          <Typography.Title level={4} style={{ margin: 0 }}>
            <Link to={`/sales-orders/${so.id}`}>{so.code}</Link>
            <Tag style={{ marginLeft: 8 }}>{so.status}</Tag>
          </Typography.Title>
        </Space>
        <Button icon={<ReloadOutlined />} onClick={() => void load()}>Refresh</Button>
      </Space>

      <Card>
        <Descriptions size="small" column={3}>
          <Descriptions.Item label="Client">{so.partner ? `${so.partner.code} — ${so.partner.name}` : '—'}</Descriptions.Item>
          <Descriptions.Item label="Order date">{so.order_date}</Descriptions.Item>
          <Descriptions.Item label="Expected delivery">{so.expected_delivery_date ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Warehouse">{so.warehouse ? `${so.warehouse.code} — ${so.warehouse.name}` : '—'}</Descriptions.Item>
          <Descriptions.Item label="Currency">{so.currency}</Descriptions.Item>
          <Descriptions.Item label="Total">{so.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Row gutter={16}>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="Produced" value={progress.produced_qty} precision={3} suffix={`/ ${progress.ordered_qty.toFixed(3)}`} />
            <Progress percent={progress.produced_pct} status={progress.produced_pct >= 100 ? 'success' : 'active'} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="Invoiced" value={progress.invoiced_amount} precision={2} suffix={`/ ${progress.total?.toFixed(2) ?? so.total.toFixed(2)}`} />
            <Progress percent={progress.invoiced_pct} status={progress.invoiced_pct >= 100 ? 'success' : 'active'} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="Paid" value={progress.paid_amount} precision={2} suffix={`/ ${progress.total?.toFixed(2) ?? so.total.toFixed(2)}`} />
            <Progress percent={progress.paid_pct} status={progress.paid_pct >= 100 ? 'success' : 'active'} />
          </Card>
        </Col>
      </Row>

      {quotation && (
        <Card title="Quotation">
          <Space>
            <Tag color="cyan">{quotation.status}</Tag>
            <Link to={`/quotations/${quotation.id}`}>{quotation.code}</Link>
            <Typography.Text>{quotation.quotation_date}</Typography.Text>
            <Typography.Text strong>{quotation.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Typography.Text>
          </Space>
        </Card>
      )}

      <Card title={`Production batches (${production.batches.length})`} extra={
        <Space>
          <Typography.Text>Planned <strong>{production.total_planned.toFixed(3)}</strong></Typography.Text>
          <Typography.Text>Produced <strong>{production.total_produced.toFixed(3)}</strong></Typography.Text>
          {production.total_failed > 0 && <Typography.Text type="danger">Scrap <strong>{production.total_failed.toFixed(3)}</strong></Typography.Text>}
        </Space>
      }>
        {production.batches.length === 0 ? <Alert type="info" message="No production batches linked to this SO yet." showIcon /> : (
          <Table
            rowKey="id"
            dataSource={production.batches}
            size="small"
            pagination={false}
            columns={[
              { title: 'Code', dataIndex: 'code', width: 160, render: (c: string, r) => <Link to={`/production-batches/${r.id}`}>{c}</Link> },
              { title: 'Status', dataIndex: 'status', width: 120, render: (s: string) => <Tag>{s}</Tag> },
              { title: 'Target', key: 'tp', render: (_: unknown, r) => r.target_product ? `${r.target_product.code} — ${r.target_product.name}` : '—' },
              { title: 'Planned', dataIndex: 'qty_planned', width: 110, align: 'right' as const, render: (v: number) => v.toFixed(3) },
              { title: 'Produced', dataIndex: 'qty_produced', width: 110, align: 'right' as const, render: (v: number) => v.toFixed(3) },
              { title: 'Failed', dataIndex: 'qty_failed', width: 100, align: 'right' as const, render: (v: number) => v.toFixed(3) },
              { title: 'Completed', dataIndex: 'completed_at', width: 170, render: (v: string | null) => v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '—' },
            ]}
          />
        )}
      </Card>

      <Card title={`Invoices (${invoices.length})`} extra={
        <Typography.Text>Payments total <strong>{payments_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></Typography.Text>
      }>
        {invoices.length === 0 ? <Alert type="info" message="No invoices on this SO yet." showIcon /> : (
          <Table
            rowKey="id"
            dataSource={invoices}
            size="small"
            pagination={false}
            columns={[
              { title: 'Code', dataIndex: 'code', width: 160, render: (c: string, r) => <Link to={`/invoices/${r.id}`}>{c}</Link> },
              { title: 'Date', dataIndex: 'invoice_date', width: 110 },
              { title: 'Status', dataIndex: 'status', width: 130, render: (s: string) => <Tag>{s}</Tag> },
              { title: 'Total', dataIndex: 'total', align: 'right' as const, width: 120, render: (v: number) => v.toLocaleString(undefined, { minimumFractionDigits: 2 }) },
              { title: 'Paid', dataIndex: 'paid_amount', align: 'right' as const, width: 120, render: (v: number) => v.toLocaleString(undefined, { minimumFractionDigits: 2 }) },
              { title: 'Balance', dataIndex: 'balance', align: 'right' as const, width: 120, render: (v: number) => v.toLocaleString(undefined, { minimumFractionDigits: 2 }) },
              { title: 'Payments', dataIndex: 'payments_count', width: 90, align: 'right' as const },
            ]}
          />
        )}
      </Card>

      <Card title={`Stock movements (${stock_movements.length})`}>
        {stock_movements.length === 0 ? <Alert type="info" message="No stock movements recorded for this SO yet." showIcon /> : (
          <Table
            rowKey="ledger_id"
            dataSource={stock_movements}
            size="small"
            pagination={false}
            columns={[
              { title: 'Posted', dataIndex: 'posted_at', width: 170, render: (v: string | null) => v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '—' },
              { title: 'Type', dataIndex: 'movement_type', width: 100, render: (v: string, r) => <Tag color={v === 'in' ? 'green' : v === 'out' ? 'red' : 'default'}>{r.is_reversal ? `~${v}` : v}</Tag> },
              { title: 'Product', key: 'p', render: (_: unknown, r) => r.product ? `${r.product.code} — ${r.product.name}` : '—' },
              { title: 'Warehouse', key: 'w', width: 160, render: (_: unknown, r) => r.warehouse ? `${r.warehouse.code}` : '—' },
              { title: 'Qty', dataIndex: 'qty', align: 'right' as const, width: 110, render: (v: number) => v.toFixed(3) },
              { title: 'Batch', dataIndex: 'batch_no', width: 130 },
              { title: 'Ref', dataIndex: 'reference_no', width: 160 },
            ]}
          />
        )}
      </Card>

      <Card title={`Timeline (${timeline.length} events)`}>
        {timeline.length === 0 ? <Typography.Text type="secondary">No events yet.</Typography.Text> : (
          <div>{timeline.map((e, i) => <TimelineEntry key={i} event={e} />)}</div>
        )}
      </Card>
    </Space>
  );
}
