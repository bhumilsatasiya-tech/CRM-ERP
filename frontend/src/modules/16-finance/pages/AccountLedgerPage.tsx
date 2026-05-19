import { useEffect, useState } from 'react';
import { Button, Card, DatePicker, Empty, Select, Space, Statistic, Table, Typography, message } from 'antd';
import { ArrowLeftOutlined, PrinterOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs, { type Dayjs } from 'dayjs';
import { accountApi, reportApi } from '../api/financeApi';
import type { Account, LedgerRow } from '../types/finance.types';
import DownloadPdfButton from '../../common/DownloadPdfButton';
import { fyEnd, fyStart, SPLIT_DATE_PRESETS } from '../../../app/fy';

export default function AccountLedgerPage() {
  const { accountId } = useParams();
  const navigate = useNavigate();
  // Default to current Indian FY (1 Apr → 31 Mar, capped at today)
  const [from, setFrom] = useState<Dayjs>(fyStart());
  const [to, setTo] = useState<Dayjs>(fyEnd().isAfter(dayjs()) ? dayjs() : fyEnd());
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedId, setSelectedId] = useState<number | undefined>(accountId ? Number(accountId) : undefined);
  const [opening, setOpening] = useState(0);
  const [closing, setClosing] = useState(0);
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    accountApi.list({ per_page: 500 }).then((r) => setAccounts(r.data.filter((a) => !a.is_group))).catch(() => undefined);
  }, []);

  const fetch = async (id?: number) => {
    const aid = id ?? selectedId;
    if (!aid) return;
    setLoading(true);
    try {
      const r = await reportApi.ledger(aid, from.format('YYYY-MM-DD'), to.format('YYYY-MM-DD'));
      setOpening(r.opening); setClosing(r.closing); setRows(r.rows);
    } catch { message.error('Failed to load ledger.'); } finally { setLoading(false); }
  };

  useEffect(() => { if (selectedId) void fetch(selectedId); /* eslint-disable-next-line */ }, [selectedId]);

  const selected = accounts.find((a) => a.id === selectedId);

  return (
    <Card loading={loading}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/finance/ledgers')}>Back</Button>
            <Typography.Title level={4} style={{ margin: 0 }}>
              Account Ledger {selected ? `— ${selected.code} ${selected.name}` : ''}
            </Typography.Title>
          </Space>
          <Space wrap>
            <Select
              showSearch placeholder="Pick account..." style={{ width: 320 }}
              value={selectedId}
              filterOption={(q, opt) => String(opt?.label ?? '').toLowerCase().includes(q.toLowerCase())}
              options={accounts.map((a) => ({ value: a.id, label: `${a.code} — ${a.name}` }))}
              onChange={(v) => { setSelectedId(Number(v)); navigate(`/finance/ledger/${v}`, { replace: true }); }}
            />
            <DatePicker value={from} onChange={(v) => v && setFrom(v)} />
            <DatePicker value={to} onChange={(v) => v && setTo(v)} />
            <Button icon={<ReloadOutlined />} onClick={() => void fetch()}>Run</Button>
            <Button icon={<PrinterOutlined />} onClick={() => window.print()}>Print</Button>
            {selectedId && (
              <DownloadPdfButton
                url={`/finance/ledger/${selectedId}/pdf?from=${from.format('YYYY-MM-DD')}&to=${to.format('YYYY-MM-DD')}`}
                filename={`ledger-${selected?.code ?? selectedId}.pdf`}
              />
            )}
          </Space>
        </Space>

        {selectedId ? (
          <>
            <Space size="large" wrap>
              <Statistic title="Opening" value={opening} precision={2} valueStyle={{ color: opening >= 0 ? '#3f8600' : '#cf1322' }} />
              <Statistic title="Closing" value={closing} precision={2} valueStyle={{ fontWeight: 700, color: closing >= 0 ? '#3f8600' : '#cf1322' }} />
            </Space>

            <Table<LedgerRow>
              rowKey={(r) => `${r.entry_id}-${r.entry_code}-${r.debit}-${r.credit}`}
              dataSource={rows}
              pagination={false}
              size="small"
              locale={{ emptyText: <Empty description="No movements in this period" /> }}
              columns={[
                { title: 'Date', dataIndex: 'entry_date', width: 110 },
                { title: 'JE #', dataIndex: 'entry_code', width: 150 },
                { title: 'Ref #', dataIndex: 'reference_no', width: 150 },
                { title: 'Narration', dataIndex: 'narration', ellipsis: true },
                { title: 'Debit', dataIndex: 'debit', align: 'right', width: 130,
                  render: (v: number) => v > 0 ? <span style={{ color: '#cf1322' }}>{v.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span> : '—' },
                { title: 'Credit', dataIndex: 'credit', align: 'right', width: 130,
                  render: (v: number) => v > 0 ? <span style={{ color: '#3f8600' }}>{v.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span> : '—' },
                { title: 'Balance', dataIndex: 'balance', align: 'right', width: 140,
                  render: (v: number) => <strong>{v.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong> },
              ]}
            />
          </>
        ) : (
          <Empty description="Pick an account from the dropdown above to view its ledger" />
        )}
      </Space>
    </Card>
  );
}
