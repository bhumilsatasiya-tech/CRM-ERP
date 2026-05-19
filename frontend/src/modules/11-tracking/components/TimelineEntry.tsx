import { Tag, Typography } from 'antd';
import { Link } from 'react-router-dom';
import {
  CheckCircleOutlined, CloseCircleOutlined, DollarCircleOutlined,
  ExperimentOutlined, FileAddOutlined, FileDoneOutlined,
  FileTextOutlined, PlayCircleOutlined, SnippetsOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { TimelineEvent, TimelineKind } from '../types/tracking.types';

const ICONS: Record<TimelineKind, React.ReactNode> = {
  quotation_created:  <SnippetsOutlined />,
  quotation_approved: <CheckCircleOutlined />,
  so_created:         <FileTextOutlined />,
  so_approved:        <CheckCircleOutlined />,
  batch_started:      <PlayCircleOutlined />,
  batch_completed:    <ExperimentOutlined />,
  batch_cancelled:    <CloseCircleOutlined />,
  invoice_created:    <FileAddOutlined />,
  invoice_posted:     <FileDoneOutlined />,
  invoice_cancelled:  <CloseCircleOutlined />,
  payment_received:   <DollarCircleOutlined />,
};

const COLORS: Record<TimelineKind, string> = {
  quotation_created:  'default',
  quotation_approved: 'cyan',
  so_created:         'blue',
  so_approved:        'cyan',
  batch_started:      'gold',
  batch_completed:    'green',
  batch_cancelled:    'red',
  invoice_created:    'blue',
  invoice_posted:     'green',
  invoice_cancelled:  'red',
  payment_received:   'green',
};

function refToLink(refType: string, refId: number, refCode: string): React.ReactNode {
  switch (refType) {
    case 'quotation':         return <Link to={`/quotations/${refId}`}>{refCode}</Link>;
    case 'sales_order':       return <Link to={`/sales-orders/${refId}`}>{refCode}</Link>;
    case 'production_batch':  return <Link to={`/production-batches/${refId}`}>{refCode}</Link>;
    case 'invoice':           return <Link to={`/invoices/${refId}`}>{refCode}</Link>;
    case 'invoice_payment':   return <span>{refCode}</span>;
    default:                  return <span>{refCode}</span>;
  }
}

interface Props { event: TimelineEvent }

export default function TimelineEntry({ event }: Props) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '8px 0' }}>
      <div style={{ width: 28, fontSize: 18, color: '#1677ff' }}>{ICONS[event.kind] ?? <FileTextOutlined />}</div>
      <div style={{ flex: 1 }}>
        <div>
          <Tag color={COLORS[event.kind] ?? 'default'} style={{ marginRight: 8 }}>{event.kind.replace(/_/g, ' ')}</Tag>
          <Typography.Text>{event.label}</Typography.Text>
          {' — '}
          {refToLink(event.ref_type, event.ref_id, event.ref_code)}
          {event.amount != null && (
            <Typography.Text strong style={{ marginLeft: 8 }}>
              {event.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </Typography.Text>
          )}
        </div>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {event.at ? dayjs(event.at).format('YYYY-MM-DD HH:mm') : '—'}
        </Typography.Text>
      </div>
    </div>
  );
}
