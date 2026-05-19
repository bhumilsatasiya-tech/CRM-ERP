import { useEffect, useMemo, useState } from 'react';
import { Button, Card, DatePicker, Space, Table, Typography, message } from 'antd';
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs, { type Dayjs } from 'dayjs';
import { REPORT_DEFS, reportsApi } from '../api/reportsApi';
import DownloadPdfButton from '../../common/DownloadPdfButton';
import { fyEnd, fyStart, SPLIT_DATE_PRESETS } from '../../../app/fy';

interface ReportData {
  rows?: Array<Record<string, unknown>>;
  totals?: Record<string, unknown>;
  income?: Array<Record<string, unknown>>;
  expense?: Array<Record<string, unknown>>;
  assets?: Array<Record<string, unknown>>;
  liabilities?: Array<Record<string, unknown>>;
  equity?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

function toCsv(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return '';
  const cols = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(','), ...rows.map((r) => cols.map((c) => escape(r[c])).join(','))].join('\n');
}

function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function ReportViewerPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const def = code ? REPORT_DEFS[code] : null;
  // Default to current Indian FY (1 Apr → 31 Mar, capped at today)
  const [from, setFrom] = useState<Dayjs>(fyStart());
  const [to, setTo] = useState<Dayjs>(fyEnd().isAfter(dayjs()) ? dayjs() : fyEnd());
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetch = async () => {
    if (!def || !code) return;
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (def.rangeMode === 'fromTo') { params.from = from.format('YYYY-MM-DD'); params.to = to.format('YYYY-MM-DD'); }
      else if (def.rangeMode === 'asOf') { params.as_of = to.format('YYYY-MM-DD'); }
      const r = await reportsApi[def.api](params);
      setData(r as ReportData);
    } catch { message.error('Failed.'); } finally { setLoading(false); }
  };
  useEffect(() => { void fetch(); /* eslint-disable-next-line */ }, [code]);

  const pdfUrl = useMemo(() => {
    if (!code || !def) return '';
    const qs = new URLSearchParams();
    if (def.rangeMode === 'fromTo') { qs.set('from', from.format('YYYY-MM-DD')); qs.set('to', to.format('YYYY-MM-DD')); }
    else if (def.rangeMode === 'asOf') { qs.set('as_of', to.format('YYYY-MM-DD')); }
    return `/reports/${code}/pdf?${qs.toString()}`;
  }, [code, def, from, to]);

  if (!def || !code) return <Card><Typography.Text>Unknown report.</Typography.Text></Card>;

  const rows = (data?.rows ?? []) as Array<Record<string, unknown>>;
  const cols = rows[0] ? Object.keys(rows[0]).map((k) => ({
    title: k.replace(/_/g, ' '), dataIndex: k,
    align: typeof rows[0][k] === 'number' ? ('right' as const) : undefined,
    render: typeof rows[0][k] === 'number' ? (v: number) => Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 }) : undefined,
  })) : [];

  return (
    <Card>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space style={{ justifyContent: 'space-between', width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>{def.title}</Typography.Title>
          <Space>
            {def.rangeMode === 'fromTo' && (
              <>
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
              </>
            )}
            {def.rangeMode === 'asOf' && <DatePicker value={to} onChange={(v) => v && setTo(v)} />}
            <Button icon={<ReloadOutlined />} onClick={() => void fetch()}>Run</Button>
            <Button icon={<DownloadOutlined />} disabled={rows.length === 0} onClick={() => downloadCsv(`${code}.csv`, toCsv(rows))}>CSV</Button>
            <DownloadPdfButton url={pdfUrl} filename={`report-${code}.pdf`} />
            <Button onClick={() => navigate('/reports')}>Back</Button>
          </Space>
        </Space>
        {data?.totals && (
          <Space wrap>
            {Object.entries(data.totals).map(([k, v]) => (
              <Typography.Text key={k}>{k}: <strong>{typeof v === 'number' ? v.toFixed(2) : String(v)}</strong></Typography.Text>
            ))}
          </Space>
        )}
        <Table rowKey={(r) => JSON.stringify(r).slice(0, 80)} dataSource={rows} columns={cols} loading={loading} pagination={false} size="small" scroll={{ x: 'max-content' }} />
        {(data?.income || data?.expense || data?.assets) && (
          <pre style={{ background: '#fafafa', padding: 12, fontSize: 12, overflow: 'auto' }}>{JSON.stringify({ income: data.income, expense: data.expense, assets: data.assets, liabilities: data.liabilities, equity: data.equity }, null, 2)}</pre>
        )}
      </Space>
    </Card>
  );
}
