interface Bar {
  label: string;
  value: number;
  /** Optional override color for this single bar. */
  color?: string;
}

interface Props {
  bars: Bar[];
  /** Default bar color. */
  color?: string;
  /** Currency / number formatter. Default: en-US thousands. */
  format?: (n: number) => string;
}

/**
 * Horizontal bar chart, pure CSS. Each bar's width is proportional to the max value
 * across the series. Used for AR/AP aging and stock-by-warehouse breakdowns.
 */
export default function MiniBars({ bars, color = '#1677ff', format = (n) => n.toLocaleString(undefined, { minimumFractionDigits: 2 }) }: Props) {
  if (bars.length === 0) return <div style={{ padding: 24, color: '#999', textAlign: 'center' }}>No data</div>;
  const max = Math.max(...bars.map((b) => b.value), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {bars.map((b) => {
        const pct = max > 0 ? (b.value / max) * 100 : 0;
        const c = b.color ?? color;
        return (
          <div key={b.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
              <span style={{ color: '#555' }}>{b.label}</span>
              <span style={{ color: '#222', fontWeight: 600 }}>{format(b.value)}</span>
            </div>
            <div style={{ height: 8, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                width: `${pct}%`,
                height: '100%',
                background: c,
                borderRadius: 4,
                transition: 'width 400ms ease-out',
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
