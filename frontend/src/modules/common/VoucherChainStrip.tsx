import { useNavigate } from 'react-router-dom';
import { Tag, Tooltip } from 'antd';
import {
  FileTextOutlined, ShoppingCartOutlined, FileDoneOutlined, DollarOutlined,
  ExperimentOutlined, GlobalOutlined, BankOutlined, InboxOutlined, BookOutlined,
  RightOutlined, FileSearchOutlined,
} from '@ant-design/icons';

export type ChainNodeType =
  | 'quotation' | 'sales-order' | 'invoice' | 'payment'
  | 'purchase-order' | 'grn' | 'purchase-invoice'
  | 'production-batch' | 'export-invoice' | 'packing-list' | 'tax-invoice'
  | 'shipping-bill' | 'irm' | 'lodgement' | 'journal-entry'
  | 'inter-company-invoice';

export interface ChainNode {
  type: ChainNodeType;
  id?: number;
  code?: string | null;
  status?: string | null;
  /** Show this node as the "current" doc — highlights with primary color, no link. */
  current?: boolean;
  /** Optional override for the route — defaults derived from type+id. */
  route?: string;
  /** Optional badge text shown next to the code (e.g. "x3" for multiple). */
  badge?: string;
}

interface Props {
  /** Ordered list of nodes from upstream → current → downstream. */
  chain: ChainNode[];
  /** Optional title shown on the left edge. Defaults to nothing. */
  title?: string;
}

/**
 * Horizontal voucher-chain breadcrumb shown at the top of every doc form.
 *
 * Renders nodes as connected pills with arrows between them. Click any node →
 * instantly navigate to that doc. The "current" node is highlighted but not
 * clickable. Each node shows: type icon + code + status tag.
 *
 * Why this beats Tally/Zoho: Tally's "trace voucher" opens a modal; ours is
 * always visible, single-click navigation, and shows the entire commercial flow
 * upstream and downstream from the current doc.
 *
 * Empty chain (single node = only the current doc) → renders nothing to avoid
 * visual clutter for orphaned documents.
 */
export default function VoucherChainStrip({ chain, title }: Props) {
  const navigate = useNavigate();
  if (chain.length <= 1) return null;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      padding: '8px 12px',
      background: 'linear-gradient(to right, #f0f5ff, #f9fbff, #f0f5ff)',
      borderRadius: 6,
      border: '1px solid #e6f0ff',
      marginBottom: 12,
      flexWrap: 'wrap',
      fontSize: 12,
    }}>
      {title && (
        <>
          <span style={{ color: '#8c8c8c', fontWeight: 500, marginRight: 4 }}>
            <FileSearchOutlined /> {title}
          </span>
        </>
      )}
      {chain.map((node, idx) => (
        <span key={`${node.type}-${node.id ?? idx}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <ChainNodePill node={node} onClick={() => {
            if (!node.current && node.id) navigate(node.route ?? defaultRoute(node));
          }} />
          {idx < chain.length - 1 && (
            <RightOutlined style={{ color: '#bfbfbf', fontSize: 10, margin: '0 2px' }} />
          )}
        </span>
      ))}
    </div>
  );
}

function ChainNodePill({ node, onClick }: { node: ChainNode; onClick: () => void }) {
  const meta = TYPE_META[node.type];
  const isClickable = !node.current && !!node.id;
  return (
    <Tooltip title={node.current ? 'This document' : `Open ${meta.label} ${node.code ?? ''}`}>
      <span
        onClick={isClickable ? onClick : undefined}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          borderRadius: 14,
          cursor: isClickable ? 'pointer' : 'default',
          background: node.current ? meta.color : '#fff',
          color: node.current ? '#fff' : meta.color,
          border: `1px solid ${meta.color}`,
          fontWeight: node.current ? 600 : 500,
          fontSize: 12,
          transition: 'all 120ms ease',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={(e) => {
          if (isClickable) {
            e.currentTarget.style.background = meta.color;
            e.currentTarget.style.color = '#fff';
          }
        }}
        onMouseLeave={(e) => {
          if (isClickable) {
            e.currentTarget.style.background = '#fff';
            e.currentTarget.style.color = meta.color;
          }
        }}
      >
        <span style={{ display: 'inline-flex' }}>{meta.icon}</span>
        <span>{meta.label}</span>
        {node.code && <span style={{ fontFamily: 'monospace', opacity: 0.85 }}>{node.code}</span>}
        {node.badge && (
          <Tag style={{
            margin: 0, padding: '0 4px', fontSize: 10, lineHeight: '16px',
            background: 'rgba(255,255,255,0.25)', color: 'inherit', borderColor: 'transparent',
          }}>{node.badge}</Tag>
        )}
        {node.status && !node.current && (
          <span style={{ fontSize: 10, opacity: 0.7 }}>· {node.status}</span>
        )}
      </span>
    </Tooltip>
  );
}

const TYPE_META: Record<ChainNodeType, { label: string; color: string; icon: JSX.Element }> = {
  'quotation':              { label: 'Quote',    color: '#722ed1', icon: <FileTextOutlined /> },
  'sales-order':            { label: 'SO',       color: '#1677ff', icon: <FileDoneOutlined /> },
  'invoice':                { label: 'Invoice',  color: '#1677ff', icon: <FileTextOutlined /> },
  'payment':                { label: 'Payment',  color: '#52c41a', icon: <DollarOutlined /> },
  'purchase-order':         { label: 'PO',       color: '#fa8c16', icon: <ShoppingCartOutlined /> },
  'grn':                    { label: 'GRN',      color: '#fa8c16', icon: <InboxOutlined /> },
  'purchase-invoice':       { label: 'PI',       color: '#fa8c16', icon: <FileTextOutlined /> },
  'production-batch':       { label: 'Batch',    color: '#13c2c2', icon: <ExperimentOutlined /> },
  'export-invoice':         { label: 'EI',       color: '#eb2f96', icon: <GlobalOutlined /> },
  'packing-list':           { label: 'PL',       color: '#eb2f96', icon: <InboxOutlined /> },
  'tax-invoice':            { label: 'TI',       color: '#eb2f96', icon: <FileTextOutlined /> },
  'shipping-bill':          { label: 'SB',       color: '#eb2f96', icon: <GlobalOutlined /> },
  'irm':                    { label: 'IRM',      color: '#13c2c2', icon: <BankOutlined /> },
  'lodgement':              { label: 'Lodge',    color: '#13c2c2', icon: <BankOutlined /> },
  'journal-entry':          { label: 'JE',       color: '#595959', icon: <BookOutlined /> },
  'inter-company-invoice':  { label: 'ICI',      color: '#722ed1', icon: <GlobalOutlined /> },
};

function defaultRoute(node: ChainNode): string {
  const id = node.id;
  switch (node.type) {
    case 'quotation':              return `/quotations/${id}/edit`;
    case 'sales-order':            return `/sales-orders/${id}/edit`;
    case 'invoice':                return `/invoices/${id}/edit`;
    case 'purchase-order':         return `/purchase-orders/${id}/edit`;
    case 'grn':                    return `/grns/${id}/edit`;
    case 'purchase-invoice':       return `/purchase-invoices/${id}/edit`;
    case 'production-batch':       return `/production-batches/${id}/edit`;
    case 'export-invoice':         return `/export-invoices/${id}/edit`;
    case 'packing-list':           return `/packing-lists/${id}/edit`;
    case 'tax-invoice':            return `/tax-invoices/${id}/edit`;
    case 'shipping-bill':          return `/shipping-bills/${id}/edit`;
    case 'irm':                    return `/irms/${id}`;
    case 'lodgement':              return `/export-lodgement/${id}`;
    case 'journal-entry':          return `/journal-entries/${id}/edit`;
    case 'inter-company-invoice':  return `/inter-company-invoices/${id}/edit`;
    case 'payment':                return `/invoices/${id}/edit`;
  }
}
