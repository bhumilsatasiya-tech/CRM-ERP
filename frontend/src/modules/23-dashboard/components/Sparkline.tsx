import { useMemo } from 'react';

interface Props {
  values: number[];
  color?: string;
  fillColor?: string;
  width?: number;
  height?: number;
  /** If true, paints a soft gradient under the line. */
  filled?: boolean;
}

/**
 * Minimal inline SVG sparkline — no chart library needed.
 * Renders an area + polyline. Auto-scales to fit values.
 */
export default function Sparkline({
  values,
  color = '#1677ff',
  fillColor,
  width = 280,
  height = 60,
  filled = true,
}: Props) {
  const { points, areaPath, max } = useMemo(() => {
    if (values.length === 0) return { points: '', areaPath: '', max: 0 };
    const max = Math.max(...values, 1);
    const stepX = values.length > 1 ? width / (values.length - 1) : 0;
    const coords = values.map((v, i) => {
      const x = i * stepX;
      const y = height - (v / max) * (height - 4) - 2;
      return [x, y] as const;
    });
    const points = coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    const first = coords[0];
    const last = coords[coords.length - 1];
    const areaPath = `M${first[0]},${height} L${points.split(' ').join(' L')} L${last[0]},${height} Z`;
    return { points, areaPath, max };
  }, [values, width, height]);

  if (values.length === 0) return <div style={{ width, height, opacity: 0.3 }} />;

  const gradId = `spark-grad-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }} aria-label={`Trend, max ${max}`}>
      {filled && (
        <>
          <defs>
            <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={fillColor ?? color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={fillColor ?? color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#${gradId})`} />
        </>
      )}
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
