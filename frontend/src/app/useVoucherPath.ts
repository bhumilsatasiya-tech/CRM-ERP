import { useLocation } from 'react-router-dom';
import { VOUCHER_ACTIVE_PATHS } from './voucherCatalog';

/**
 * Returns `true` when the current URL matches any voucher path — used to decide
 * whether the right-side `VoucherSwitcher` rail should render. Match is by
 * prefix: `/invoices`, `/invoices/new`, `/invoices/42`, `/invoices/42/edit`
 * all return true.
 */
export function useVoucherPath(): boolean {
  const { pathname } = useLocation();
  return VOUCHER_ACTIVE_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

/** Returns the active voucher path (or undefined) — used to highlight the rail item. */
export function useActiveVoucherMatch(): string | undefined {
  const { pathname } = useLocation();
  return VOUCHER_ACTIVE_PATHS.find((p) => pathname === p || pathname.startsWith(p + '/'));
}
