import type { AxiosError } from 'axios';

/**
 * Shared error helpers for axios responses across the app.
 *
 * Goal: every catch block can call `apiErrorMessage(e)` and get a single, human, actionable
 * string — instead of the dozens of `err.response?.data?.message ?? 'Failed.'` lines we
 * had everywhere. Also extracts field-by-field 422 validation errors as a list.
 */

interface ServerErrorBody {
  message?: string;
  errors?: Record<string, string[]>;
  /** Custom hint set by some controllers (e.g. "Set finance.default_ar_account_id first"). */
  hint?: string;
}

/** Extract the best human-readable message from any error, with status-code-specific fallback. */
export function apiErrorMessage(e: unknown): string {
  const err = e as AxiosError<ServerErrorBody>;

  // Network down / CORS / server unreachable — no response object at all
  if (err && !err.response && err.message) {
    if (err.code === 'ECONNABORTED') return 'Request timed out. The server took too long to respond.';
    if (err.message.toLowerCase().includes('network')) {
      return 'Cannot reach the server. Is Laravel running on :8000? Try `start-all.bat` or check the API window.';
    }
    return err.message;
  }

  const status = err?.response?.status;
  const body = err?.response?.data;

  // 422: prefer the first field-validation error (more specific than the top-level message)
  if (status === 422 && body?.errors) {
    const firstField = Object.keys(body.errors)[0];
    const firstMsg = body.errors[firstField]?.[0];
    if (firstMsg) return `${prettyField(firstField)}: ${firstMsg}`;
  }

  // Server-supplied message wins
  if (body?.message) return body.message;

  // Status-code fallback with action hint
  switch (status) {
    case 400: return 'Invalid request. Check the values you entered.';
    case 401: return 'Your session expired — sign in again.';
    case 403: return "Permission denied. Your role doesn't include this action.";
    case 404: return 'Not found. The record may have been deleted.';
    case 409: return 'Conflict — the record was modified by someone else. Reload and retry.';
    case 422: return 'Validation failed. Check the highlighted fields.';
    case 429: return 'Too many requests. Wait a moment and retry.';
    case 500: return 'Server error. Check `backend/storage/logs/laravel.log` for the stack trace.';
    case 503: return 'Service unavailable — feature not configured. Check .env / module setup.';
    default:  return status ? `Request failed (HTTP ${status}).` : 'Request failed.';
  }
}

/**
 * Returns an actionable next-step hint for known error patterns.
 * Used by the global toast for high-impact errors so the user knows how to recover.
 */
export function apiErrorHint(e: unknown): string | null {
  const err = e as AxiosError<ServerErrorBody>;
  const status = err?.response?.status;
  const body = err?.response?.data;

  // Server-set hint wins
  if (body?.hint) return body.hint;

  if (!err?.response) {
    return 'Open the Laravel terminal window. If it crashed, run `start-all.bat` to restart it.';
  }

  if (status === 403) return 'Ask an admin to grant the missing permission, or sign in with an account that has it.';
  if (status === 404) return 'Reload the list — the record may have been deleted in another tab.';
  if (status === 409) return 'Press F5 to reload, then re-apply your changes.';
  if (status === 500) {
    const msg = (body?.message ?? '').toLowerCase();
    if (msg.includes('default_') && msg.includes('account')) return 'Open Settings → Settings and fill the missing finance default account.';
    if (msg.includes('sequence')) return 'Open Settings → Sequence Management and create the missing sequence.';
    if (msg.includes('intercompany.partner_for_company')) return 'Open Settings → Settings and set the inter-company partner mapping for this pair.';
    return 'Tail `backend/storage/logs/laravel.log` to see the stack trace.';
  }
  return null;
}

/** All field-by-field validation errors from a 422 response — for inline form display. */
export function apiErrorFields(e: unknown): Array<{ field: string; messages: string[] }> {
  const err = e as AxiosError<ServerErrorBody>;
  const errors = err?.response?.data?.errors;
  if (!errors) return [];
  return Object.entries(errors).map(([field, messages]) => ({ field: prettyField(field), messages }));
}

/** Convert a Laravel dotted field path into a friendlier label. */
function prettyField(field: string): string {
  // "lines.0.product_id" → "Line 1 product"
  const m = field.match(/^lines\.(\d+)\.(.+)$/);
  if (m) {
    const idx = Number(m[1]) + 1;
    return `Line ${idx} ${m[2].replace(/_id$/, '').replace(/_/g, ' ')}`;
  }
  return field.replace(/_id$/, '').replace(/_/g, ' ').replace(/\./g, ' › ');
}
