import { useEffect, useState } from 'react';
import { Button, Card, DatePicker, Space, Table, Tag, Typography, message } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import { reportApi } from '../api/financeApi';
import type { AccountType, TrialBalanceRow } from '../types/finance.types';
import { fyEnd, fyStart, SPLIT_DATE_PRESETS } from '../../../app/fy';

const TYPE_COLORS: Record<AccountType, string> = { asset: 'green', liability: 'red', equity: 'purple', income: 'blue', expense: 'orange' };

export default function TrialBalancePage() {
  // Default to current Indian FY (1 Apr → 31 Mar)
  const [from, setFrom] = useState<Dayjs>(fyStart());
  const [to, setTo] = useState<Dayjs>(fyEnd().isAfter(dayjs()) ? dayjs() : fyEnd());
  const [rows, setRows] = useState<TrialBalanceRow[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      const r = await reportApi.trialBalance(from.format('YYYY-MM-DD'), to.format('YYYY-MM-DD'));
      setRows(r.rows);
    } catch { message.error('Failed.'); } finally { setLoading(false); }
  };
  useEffect(() => { void fetch(); /* eslint-disable-next-line */ }, []);

  const totals = rows.reduce((acc, r) => ({
    debit: acc.debit + r.debit, credit: acc.credit + r.credit,
    closingDr: acc.closingDr + Math.max(0, r.closing), closingCr: acc.closingCr + Math.max(0, -r.closing),
  }), { debit: 0, credit: 0, closingDr: 0, closingCr: 0 });

  return (
    <Card>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>Trial balance</Typography.Title>
          <Space>
            <select
              style={{ height: 32, padding: '0 10px', border: '1px solid #d9d9d9', borderRadius: 4, background: '#fff' }}
              onChange={(e) => {
                const p = SPLIT_DATE_PRESETS.find((x) => x.label === e.target.value);
                if (p) { setFrom(p.from); setTo(p.to); }
              }}
              defaultValue=""
            >
              <option value="" disabled>Quick range…</option>
              {SPLIT_DATE_PRESETS.map((p) => <option key={p.label} value={p.label}>{p.label}</option>)}
            </select>
            <DatePicker value={from} onChange={(v) => v && setFrom(v)} />
            <DatePicker value={to} onChange={(v) => v && setTo(v)} />
            <Button icon={<ReloadOutlined />} onClick={() => void fetch()}>Refresh</Button>
          </Space>
        </Space>
        <Table<TrialBalanceRow>
          rowKey="account_id"
          dataSource={rows}
          loading={loading}
          pagination={false}
          size="small"
          columns={[
            { title: 'Code', dataIndex: 'code', width: 100 },
            { title: 'Account', dataIndex: 'name' },
            { title: 'Type', dataIndex: 'type', width: 110, render: (t: AccountType) => <Tag color={TYPE_COLORS[t]}>{t}</Tag> },
            { title: 'Opening', dataIndex: 'opening', align: 'right' as const, width: 130, render: (v: number) => Number(v).toFixed(2) },
            { title: 'Debit', dataIndex: 'debit', align: 'right' as const, width: 130, render: (v: number) => Number(v).toFixed(2) },
            { title: 'Credit', dataIndex: 'credit', align: 'right' as const, width: 130, render: (v: number) => Number(v).toFixed(2) },
            { title: 'Closing', dataIndex: 'closing', align: 'right' as const, width: 130, render: (v: number) => <strong>{Number(v).toFixed(2)}</strong> },
          ]}
          summary={() => (
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={3}><strong>Totals</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={3} />
                <Table.Summary.Cell index={4} align="right"><strong>{totals.debit.toFixed(2)}</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={5} align="right"><strong>{totals.credit.toFixed(2)}</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={6} />
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />
      </Space>
    </Card>
  );
}
