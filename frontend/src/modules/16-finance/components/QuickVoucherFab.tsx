import { useEffect, useState } from 'react';
import { Button, Tooltip } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useAppSelector } from '../../../app/hooks';
import QuickVoucherDrawer from './QuickVoucherDrawer';

/**
 * Floating Action Button pinned to the bottom-right of every authenticated page.
 * Opens the Quick Voucher Drawer for fast entry of receipts/payments without
 * having to navigate away from the current page.
 *
 * Hidden when the user isn't logged in (so it doesn't appear on /login).
 *
 * Also listens for the global `crm-erp:open-voucher` event so keyboard shortcuts
 * (Ctrl+Shift+R / +P / +B / +E / +T, plus Alt+N) and gateway tiles can open it.
 */
export default function QuickVoucherFab() {
  const isAuthenticated = useAppSelector((s) => Boolean(s.auth.user));
  const [open, setOpen] = useState(false);
  const [initialTab, setInitialTab] = useState<string | undefined>(undefined);
  /** Width of the right-side VoucherSwitcher rail (0 when it's not visible). */
  const [railOffset, setRailOffset] = useState(0);

  useEffect(() => {
    const onEvt = (e: Event) => {
      const detail = (e as CustomEvent<string | null>).detail;
      setInitialTab(detail ?? undefined);
      setOpen(true);
    };
    const onRail = (e: Event) => {
      const w = (e as CustomEvent<number>).detail ?? 0;
      setRailOffset(w);
    };
    window.addEventListener('crm-erp:open-voucher', onEvt);
    window.addEventListener('crm-erp:voucher-switcher-width', onRail);
    return () => {
      window.removeEventListener('crm-erp:open-voucher', onEvt);
      window.removeEventListener('crm-erp:voucher-switcher-width', onRail);
    };
  }, []);

  if (!isAuthenticated) return null;

  return (
    <>
      <Tooltip title="Quick voucher entry (Receipt / Payment / Expense)" placement="left">
        <Button
          type="primary"
          shape="circle"
          icon={<PlusOutlined />}
          size="large"
          onClick={() => setOpen(true)}
          style={{
            position: 'fixed',
            right: 24 + railOffset,
            bottom: 24,
            width: 56,
            height: 56,
            fontSize: 24,
            boxShadow: '0 6px 16px rgba(22, 119, 255, 0.4)',
            zIndex: 1000,
            transition: 'right 0.18s ease',
          }}
        />
      </Tooltip>
      <QuickVoucherDrawer open={open} initialTab={initialTab} onClose={() => setOpen(false)} />
    </>
  );
}
