import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * On every route change: scroll window + main content area to top, then
 * auto-focus the first form input on the new page.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.querySelectorAll<HTMLElement>('.ant-layout-content, main').forEach((el) => { el.scrollTop = 0; });
    const id = window.setTimeout(() => {
      const first = document.querySelector<HTMLElement>(
        '.ant-card .ant-form input:not([disabled]):not([readonly]):not([type="hidden"]),' +
        ' .ant-card .ant-form .ant-select-selector input:not([disabled]),' +
        ' .ant-card .ant-form textarea:not([disabled])'
      );
      if (first && typeof first.focus === 'function') first.focus({ preventScroll: true });
    }, 80);
    return () => window.clearTimeout(id);
  }, [pathname]);

  return null;
}
