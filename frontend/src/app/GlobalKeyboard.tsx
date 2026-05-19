import { useEffect } from 'react';
import { Modal } from 'antd';
import { useNavigate } from 'react-router-dom';
import { matchCombo, MODULE_SHORTCUTS, VOUCHER_SHORTCUTS } from './shortcuts';

/**
 * Global keyboard hook (mounted once at App level).
 *
 * Built-in helpers:
 *  - Ctrl+S / Cmd+S → click the visible primary "Save" / "Create" / "Update" button.
 *  - Esc            → blur input, else click "Back", else confirm save-and-exit.
 *
 * Module navigation:
 *  - Alt+letter     → navigate to a module gateway (registered in shortcuts.ts).
 *
 * Voucher shortcuts:
 *  - Ctrl+Shift+letter → open the Quick Voucher Drawer to a specific tab.
 *    (Dispatches `crm-erp:open-voucher` event with the tab id as detail.)
 *  - Alt+N             → open the Quick Voucher Drawer (no specific tab).
 *
 * The `?` shortcut for the cheat sheet is handled by `ShortcutsCheatSheet.tsx`.
 */
export default function GlobalKeyboard() {
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector('.ant-modal-mask:not(.ant-modal-mask-hidden), .ant-popover-open')) return;

      const ae = document.activeElement as HTMLElement | null;
      const isTyping = ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable);

      // Ctrl+K / Cmd+K → open Command Palette. Works even while typing.
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('crm-erp:palette-open'));
        return;
      }

      // Module navigation (Alt+letter) — works even while typing (Alt rarely conflicts)
      for (const s of MODULE_SHORTCUTS) {
        if (matchCombo(s.combo, e)) {
          e.preventDefault();
          if (s.route) navigate(s.route);
          return;
        }
      }

      // Voucher shortcuts (Ctrl+Shift+letter) — opens the Quick Voucher Drawer
      for (const s of VOUCHER_SHORTCUTS) {
        if (matchCombo(s.combo, e)) {
          e.preventDefault();
          const tabId = s.id.replace(/^voucher\./, '');
          window.dispatchEvent(new CustomEvent('crm-erp:open-voucher', { detail: tabId }));
          return;
        }
      }

      // Alt+N → open Quick Voucher Drawer (no specific tab)
      if (matchCombo('Alt+N', e)) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('crm-erp:open-voucher', { detail: null }));
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        if (isTyping) ae?.blur();
        const btn = findActionButton(['save', 'create', 'save changes', 'update']);
        if (btn) { e.preventDefault(); btn.click(); }
        return;
      }

      if (e.key === 'Escape') {
        if (isTyping) { ae?.blur(); return; }
        const back = findActionButton(['back', 'back to list']);
        if (back) { e.preventDefault(); back.click(); return; }
        if (document.querySelector('.ant-form')) {
          e.preventDefault();
          Modal.confirm({
            title: 'Do you want to save changes?',
            okText: 'Yes — save & exit',
            okType: 'primary',
            cancelText: 'No — discard & exit',
            closable: true,
            onOk: () => { findActionButton(['save', 'create', 'save changes'])?.click(); },
            onCancel: (close) => { if (typeof close === 'function') window.history.back(); },
          });
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  return null;
}

function findActionButton(labels: string[]): HTMLButtonElement | null {
  const wanted = labels.map((s) => s.toLowerCase());
  const cards = Array.from(document.querySelectorAll<HTMLElement>('.ant-card')).reverse();
  for (const card of cards) {
    const buttons = Array.from(card.querySelectorAll<HTMLButtonElement>('button.ant-btn:not([disabled])'));
    for (const b of buttons) {
      const text = (b.innerText || '').trim().toLowerCase();
      for (const w of wanted) if (text === w || text.startsWith(w)) return b;
    }
  }
  const all = Array.from(document.querySelectorAll<HTMLButtonElement>('button.ant-btn:not([disabled])'));
  for (const b of all) {
    const text = (b.innerText || '').trim().toLowerCase();
    for (const w of wanted) if (text === w || text.startsWith(w)) return b;
  }
  return null;
}
