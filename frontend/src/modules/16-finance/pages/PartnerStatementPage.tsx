import { useEffect, useState } from 'react';
import { Button, Card, DatePicker, Descriptions, Empty, Space, Statistic, Table, Tag, Typography, message } from 'antd';
import { ArrowLeftOutlined, PrinterOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs, { type Dayjs } from 'dayjs';
import { partnerStatementApi, type PartnerStatement, type PartnerStatementRow } from '../api/financeApi';
import DownloadPdfButton from '../../common/DownloadPdfButton';
import { fyEnd, fyStart, SPLIT_DATE_PRESETS } from '../../../app/fy';

const TYPE_COLOR: Record<string, string> = {
  invoice: 'blue',
  invoice_payment: 'green',
  export_invoice: 'cyan',
  irm: 'lime',
  purchase_invoice: 'orange',
  purchase_invoice_payment: 'red',
};

const TYPE_LABEL: Record<string, string> = {
  invoice: 'Invoice',
  invoice_payment: 'Receipt',
  export_invoice: 'Export Inv.',
  irm: 'IRM',
  purchase_invoice: 'Purchase Inv.',
  purchase_invoice_payment: 'Payment',
};

export default function PartnerStatementPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  // Default to current Indian FY (1 Apr → 31 Mar, capped at today)
  const [from, setFrom] = useState<Dayjs>(fyStart());
  const [to, setTo] = useState<Dayjs>(fyEnd().isAfter(dayjs()) ? dayjs() : fyEnd());
  const [data, setData] = useState<PartnerStatement | null>(null);
  const [loading, setLoading] = useState(false);

  const fetch = async () => {
    if (!id) return;
    setLoading(true);
    try {
      setData(await partnerStatementApi.get(Number(id), from.format('YYYY-MM-DD'), to.format('YYYY-MM-DD')));
    } catch { message.error('Failed to load statement.'); } finally { setLoading(false); }
  };

  useEffect(() => { void fetch(); /* eslint-disable-next-line */ }, [id]);

  const onPrint = () => window.print();

  return (
    <Card loading={loading}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>Back</Button>
            <Typography.Title level={4} style={{ margin: 0 }}>
              Statement {data?.partner ? `— ${data.partner.code} ${data.partner.name}` : ''}
            </Typography.Title>
            {data?.partner && <Tag color="geekblue">{data.partner.type}</Tag>}
          </Space>
          <Space>
            <DatePicker value={from} onChange={(v) => v && setFrom(v)} />
            <DatePicker value={to} onChange={(v) => v && setTo(v)} />
            <Button icon={<ReloadOutlined />} onClick={() => void fetch()}>Run</Button>
            <Button icon={<PrinterOutlined />} onClick={onPrint}>Print</Button>
            {id && (
              <DownloadPdfButton
                url={`/partners/${id}/statement/pdf?from=${from.format('YYYY-MM-DD')}&to=${to.format('YYYY-MM-DD')}`}
                filename={`statement-${data?.partner.code ?? id}.pdf`}
              />
            )}
          </Space>
        </Space>

        {data?.partner && (
          <Descriptions size="small" column={4} bordered>
            <Descriptions.Item label="Country">{data.partner.country ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Currency">{data.partner.currency ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Credit limit">{data.partner.credit_limit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Descriptions.Item>
            <Descriptions.Item label="Period">{data.period.from} → {data.period.to}</Descriptions.Item>
          </Descriptions>
        )}

        {data && (
          <Space size="large" wrap>
            <Statistic title="Opening balance" value={data.opening_balance} precision={2} valueStyle={{ color: data.opening_balance >= 0 ? '#3f8600' : '#cf1322' }} />
            <Statistic title="Total debit" value={data.totals.total_debit} precision={2} />
            <Statistic title="Total credit" value={data.totals.total_credit} precision={2} />
            <Statistic title="Closing balance" value={data.closing_balance} precision={2} valueStyle={{ fontWeight: 700, color: data.closing_balance >= 0 ? '#3f8600' : '#cf1322' }} />
          </Space>
        )}

        <Table<PartnerStatementRow>
          rowKey={(r) => `${r.type}-${r.ref_id}`}
          dataSource={data?.rows ?? []}
          pagination={false}
          size="small"
          locale={{ emptyText: <Empty description="No transactions in this period" /> }}
          columns={[
            { title: 'Date', dataIndex: 'date', width: 110 },
            {
              title: 'Type', dataIndex: 'type', width: 130,
              render: (t: string) => <Tag color={TYPE_COLOR[t] ?? 'default'}>{TYPE_LABEL[t] ?? t}</Tag>,
            },
            { title: 'Ref #', dataIndex: 'ref_code', width: 180 },
            { title: 'Narration', dataIndex: 'narration', ellipsis: true },
            { title: 'Debit', dataIndex: 'debit', align: 'right', width: 130,
              render: (v: number) => v > 0 ? <span style={{ color: '#cf1322' }}>{v.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span> : '—' },
            { title: 'Credit', dataIndex: 'credit', align: 'right', width: 130,
              render: (v: number) => v > 0 ? <span style={{ color: '#3f8600' }}>{v.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span> : '—' },
            { title: 'Balance', dataIndex: 'running_balance', align: 'right', width: 140,
              render: (v: number) => <strong>{v.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong> },
          ]}
          summary={() => data ? (
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={4}><strong>Totals (period)</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="right"><strong style={{ color: '#cf1322' }}>{data.totals.total_debit.toFixed(2)}</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={5} align="right"><strong style={{ color: '#3f8600' }}>{data.totals.total_credit.toFixed(2)}</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={6} align="right"><strong>{data.closing_balance.toFixed(2)}</strong></Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          ) : null}
        />

        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Debit increases the balance; credit decreases it. For buyers, a positive balance means they owe you; for suppliers, a negative balance means you owe them.
        </Typography.Text>
      </Space>
    </Card>
  );
}
