import { useEffect, useState } from 'react';
import { Button, Skeleton, Space, Typography } from 'antd';
import { ReloadOutlined, ClockCircleOutlined } from '@ant-design/icons';

interface Props {
  /** Number of rows to render (default 6). */
  rows?: number;
  /** Number of columns per row (default 5). */
  columns?: number;
  /** Show a fake header row above the rows (default true). */
  withHeader?: boolean;
  /** After this many ms, show a "server slow" notice with a Retry button. Default 2500. */
  slowThresholdMs?: number;
  /** Called when user clicks Retry on the slow notice. */
  onRetry?: () => void;
}

/**
 * Lightweight skeleton stand-in for an AntD Table while data is loading.
 * Renders a grid of shimmer blocks sized like real table cells.
 *
 * If the skeleton has been visible for `slowThresholdMs` (default 2.5 s), it
 * swaps for a friendly "Server is slow — Retry?" panel so the user knows
 * something is happening fast (under 3 s feels like the app cares; >4 s feels
 * frozen). Especially relevant on the single-threaded Windows dev server where
 * the first request after boot can take 5-20 s.
 */
export default function TableSkeleton({
  rows = 6, columns = 5, withHeader = true,
  slowThresholdMs = 2500, onRetry,
}: Props) {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSlow(true), slowThresholdMs);
    return () => clearTimeout(t);
  }, [slowThresholdMs]);

  if (slow) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <Space direction="vertical" size="middle">
          <ClockCircleOutlined style={{ fontSize: 36, color: '#faad14' }} />
          <Typography.Title level={5} style={{ margin: 0 }}>Server is taking longer than usual…</Typography.Title>
          <Typography.Text type="secondary" style={{ maxWidth: 420 }}>
            The local dev server (php artisan serve) is single-threaded on Windows. If many tabs are open
            or the prefetch is still warming up, the first request can queue. It will arrive — or you can retry now.
          </Typography.Text>
          {onRetry && (
            <Button type="primary" icon={<ReloadOutlined />} onClick={() => { setSlow(false); onRetry(); }}>
              Retry
            </Button>
          )}
        </Space>
      </div>
    );
  }

  const gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;

  return (
    <div style={{ width: '100%' }}>
      {withHeader && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns,
            gap: 12,
            padding: '12px 16px',
            background: '#fafafa',
            borderTop: '1px solid #f0f0f0',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton.Input key={i} active size="small" style={{ width: '80%', height: 14 }} />
          ))}
        </div>
      )}
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          style={{
            display: 'grid',
            gridTemplateColumns,
            gap: 12,
            padding: '14px 16px',
            borderBottom: '1px solid #f5f5f5',
          }}
        >
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton.Input
              key={c}
              active
              size="small"
              style={{
                width: c === 0 ? '60%' : c === columns - 1 ? '40%' : '90%',
                height: 16,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
