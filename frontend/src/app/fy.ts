import dayjs, { type Dayjs } from 'dayjs';

/**
 * Indian financial year helpers.
 *
 * In India, FY runs **1 April → 31 March**. For example, FY 2025-26 is
 * 1 April 2025 to 31 March 2026. Every default date range across the app
 * (Dashboard, Trial Balance, P&L, Balance Sheet, reports) should respect this.
 */

const FY_START_MONTH = 4; // April

/** Returns the start (Apr 1) of the FY that contains the given date (default: today). */
export function fyStart(d: Dayjs = dayjs()): Dayjs {
  return d.month() + 1 >= FY_START_MONTH
    ? d.month(FY_START_MONTH - 1).date(1).startOf('day')
    : d.subtract(1, 'year').month(FY_START_MONTH - 1).date(1).startOf('day');
}

/** Returns the end (Mar 31) of the FY that contains the given date. */
export function fyEnd(d: Dayjs = dayjs()): Dayjs {
  return fyStart(d).add(1, 'year').subtract(1, 'day').endOf('day');
}

/** Returns the start of the PREVIOUS FY relative to the given date. */
export function previousFyStart(d: Dayjs = dayjs()): Dayjs {
  return fyStart(d).subtract(1, 'year');
}

/** Returns the end of the PREVIOUS FY relative to the given date. */
export function previousFyEnd(d: Dayjs = dayjs()): Dayjs {
  return fyStart(d).subtract(1, 'day').endOf('day');
}

/** Formats an FY range as "FY 2025-26". */
export function formatFY(d: Dayjs = dayjs()): string {
  const start = fyStart(d);
  const startYear = start.year();
  const endYearShort = String(start.year() + 1).slice(-2);
  return `FY ${startYear}-${endYearShort}`;
}

/** Returns ISO date strings (YYYY-MM-DD) for the current FY. */
export function currentFYDates(): { from: string; to: string } {
  return {
    from: fyStart().format('YYYY-MM-DD'),
    to: fyEnd().format('YYYY-MM-DD'),
  };
}

/**
 * Common preset ranges for AntD `<DatePicker.RangePicker presets={...}>`.
 * Returns `[startDayjs, endDayjs]` tuples. Order: most-used first.
 */
export const DATE_PRESETS: Array<{ label: string; value: [Dayjs, Dayjs] }> = [
  { label: 'Today',             value: [dayjs().startOf('day'),  dayjs().endOf('day')] },
  { label: 'This week',         value: [dayjs().startOf('week'), dayjs().endOf('day')] },
  { label: 'This month',        value: [dayjs().startOf('month'),dayjs().endOf('day')] },
  { label: 'Last month',        value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
  { label: 'This quarter',      value: [dayjs().startOf('quarter'), dayjs().endOf('day')] },
  { label: `Current FY (${formatFY()})`,  value: [fyStart(), fyEnd()] },
  { label: `Previous FY (${formatFY(previousFyEnd())})`, value: [previousFyStart(), previousFyEnd()] },
  { label: 'Last 7 days',       value: [dayjs().subtract(7, 'day').startOf('day'), dayjs().endOf('day')] },
  { label: 'Last 30 days',      value: [dayjs().subtract(30, 'day').startOf('day'), dayjs().endOf('day')] },
  { label: 'Last 90 days',      value: [dayjs().subtract(90, 'day').startOf('day'), dayjs().endOf('day')] },
];

/** Same presets but split into `from`/`to` Dayjs for use with two separate DatePickers. */
export interface DatePresetEntry { label: string; from: Dayjs; to: Dayjs }
export const SPLIT_DATE_PRESETS: DatePresetEntry[] = DATE_PRESETS.map((p) => ({
  label: p.label, from: p.value[0], to: p.value[1],
}));
