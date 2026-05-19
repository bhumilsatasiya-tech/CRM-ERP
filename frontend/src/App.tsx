import { Suspense, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { Button, Layout, Menu, Skeleton, Space, Typography } from 'antd';
import { prefetchByPath, startIdlePrefetch } from './app/prefetch';
import {
  ApartmentOutlined,
  AppstoreOutlined,
  AuditOutlined,
  BarsOutlined,
  ContactsOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  DollarOutlined,
  BankOutlined,
  ExperimentOutlined,
  GlobalOutlined,
  NodeIndexOutlined,
  PartitionOutlined,
  SwapOutlined,
  FieldNumberOutlined,
  FileDoneOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  FundOutlined,
  GoldOutlined,
  HistoryOutlined,
  InboxOutlined,
  LogoutOutlined,
  RetweetOutlined,
  RiseOutlined,
  SettingOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  SlidersOutlined,
  SnippetsOutlined,
  TagsOutlined,
  TeamOutlined,
  UserOutlined,
  AccountBookOutlined,
  BookOutlined,
  PercentageOutlined,
  IdcardOutlined,
  SolutionOutlined,
  PaperClipOutlined,
  CheckSquareOutlined,
  MailOutlined,
  BarChartOutlined,
  PieChartOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import {
  authPublicRoutes,
  authPrivateRoutes,
  RequireAuth,
  logoutThunk,
} from './modules/01-auth';
import ScrollToTop from './app/ScrollToTop';
import GlobalKeyboard from './app/GlobalKeyboard';
import ShortcutsCheatSheet from './app/ShortcutsCheatSheet';
import VoucherSwitcher from './app/VoucherSwitcher';
import CommandPalette from './app/CommandPalette';
import DayActionsDrawer from './app/DayActionsDrawer';
import RecentDocsButton from './app/RecentDocsButton';
import useLookupPrefetch from './app/useLookupPrefetch';
import { shortcutFor } from './app/shortcuts';
import QuickVoucherFab from './modules/16-finance/components/QuickVoucherFab';
import { gatewayPrivateRoutes } from './modules/common/gateways/routes';
import { CompanySwitcher, companiesPrivateRoutes } from './modules/02-companies';
import { settingsPrivateRoutes } from './modules/03-settings';
import { crmPrivateRoutes } from './modules/04-crm';
import { productsPrivateRoutes } from './modules/05-products';
import { inventoryPrivateRoutes } from './modules/06-inventory';
import { purchasePrivateRoutes } from './modules/07-purchase';
import { quotationPrivateRoutes } from './modules/08-quotation';
import { salesPrivateRoutes } from './modules/09-sales';
import { productionPrivateRoutes } from './modules/10-production';
import { trackingPrivateRoutes } from './modules/11-tracking';
import { formulaPrivateRoutes } from './modules/12-formula';
import { exportPrivateRoutes } from './modules/13-export';
import { irmPrivateRoutes } from './modules/14-irm';
import { interCompanyPrivateRoutes } from './modules/15-intercompany';
import { financePrivateRoutes } from './modules/16-finance';
import { loansPrivateRoutes } from './modules/17-loans';
import { hrPrivateRoutes } from './modules/18-hr';
import { documentsPrivateRoutes } from './modules/19-documents';
import { tasksPrivateRoutes } from './modules/20-tasks';
import { commsPrivateRoutes } from './modules/21-comms';
import { reportsPrivateRoutes } from './modules/22-reports';
import { dashboardPrivateRoutes } from './modules/23-dashboard';
import { exportIncentivesPrivateRoutes } from './modules/24-export-incentives';
import { projectsPrivateRoutes } from './modules/26-projects';
import { securityPrivateRoutes } from './modules/27-security';
import { useAppDispatch, useAppSelector } from './app/hooks';

/**
 * Sidebar Link that warms the target route's chunk on hover/focus. By the time the user
 * actually clicks, the JS chunk is in browser cache → no network round-trip → instant.
 * Falls back to a normal Link for paths not in the prefetch map.
 */
function NavLink({ to, children }: { to: string; children: ReactNode }) {
  const handle = () => prefetchByPath(to);
  return (
    <Link to={to} onMouseEnter={handle} onFocus={handle} onTouchStart={handle}>
      {children}
    </Link>
  );
}

/**
 * Lightweight skeleton shown while a lazy route chunk is loading. The sidebar + topbar
 * stay visible (this only fills the content area). Feels much faster than a full-screen spinner.
 */
function RouteFallback() {
  return (
    <div style={{ padding: 4 }}>
      <Skeleton active paragraph={{ rows: 2 }} title={{ width: '40%' }} />
      <div style={{ marginTop: 16 }}>
        <Skeleton.Button active style={{ marginRight: 8, width: 120 }} />
        <Skeleton.Button active style={{ marginRight: 8, width: 120 }} />
        <Skeleton.Button active style={{ width: 120 }} />
      </div>
      <div style={{ marginTop: 16 }}>
        <Skeleton active paragraph={{ rows: 6 }} />
      </div>
    </div>
  );
}

/**
 * Sidebar menu-item builder. Renders the icon, a NavLink label, and (if `shortcutId`
 * is given) a tiny shortcut badge on the right edge so users learn the keys without
 * having to open the cheat sheet.
 */
function sidebarItem(path: string, icon: React.ReactNode, label: string, shortcutId?: string) {
  const combo = shortcutId ? shortcutFor(shortcutId) : undefined;
  return {
    key: path,
    icon,
    label: (
      <NavLink to={path} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <span>{label}</span>
        {combo && (
          <span style={{
            fontSize: 9,
            fontFamily: 'ui-monospace, SF Mono, Menlo, Consolas, monospace',
            color: 'rgba(255,255,255,0.5)',
            background: 'rgba(255,255,255,0.08)',
            padding: '1px 5px',
            borderRadius: 3,
            marginLeft: 8,
          }}>
            {combo}
          </span>
        )}
      </NavLink>
    ),
  };
}

function AppShell() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  /** Width of the right-side VoucherSwitcher rail; broadcast by VoucherSwitcher itself. */
  const [railOffset, setRailOffset] = useState(0);
  useEffect(() => {
    const on = (e: Event) => setRailOffset((e as CustomEvent<number>).detail ?? 0);
    window.addEventListener('crm-erp:voucher-switcher-width', on);
    return () => window.removeEventListener('crm-erp:voucher-switcher-width', on);
  }, []);

  // Prefetch the most-likely-next page chunks on idle, so first click on each is instant.
  useEffect(() => { startIdlePrefetch(); }, []);

  // Pre-warm the in-memory lookup store (partners, products, accounts, units, categories)
  // so SmartDropdowns filter instantly with zero network on keystroke.
  useLookupPrefetch();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <ScrollToTop />
      <GlobalKeyboard />
      <Layout.Sider theme="dark" width={220} breakpoint="md" collapsible>
        <div style={{ color: '#fff', padding: 16, fontSize: 16, fontWeight: 600, letterSpacing: 0.5 }}>
          CRM + ERP
        </div>
        <Menu
          theme="dark"
          mode="inline"
          defaultSelectedKeys={[window.location.pathname]}
          items={[
            sidebarItem('/',                   <DashboardOutlined />,     'Dashboard',     'nav.dashboard'),
            sidebarItem('/gateway/crm',        <ContactsOutlined />,      'CRM',           'nav.crm'),
            sidebarItem('/gateway/products',   <AppstoreOutlined />,      'Products',      'nav.products'),
            sidebarItem('/gateway/inventory',  <DatabaseOutlined />,      'Inventory',     'nav.inventory'),
            sidebarItem('/gateway/purchase',   <ShoppingCartOutlined />,  'Purchase',      'nav.purchase'),
            sidebarItem('/gateway/sales',      <RiseOutlined />,          'Sales',         'nav.sales'),
            sidebarItem('/gateway/production', <ExperimentOutlined />,    'Production',    'nav.production'),
            sidebarItem('/projects',           <FundOutlined />,          'Project Costing'),
            sidebarItem('/gateway/export',     <GlobalOutlined />,        'Export & Bank', 'nav.export'),
            sidebarItem('/gateway/intercompany', <SwapOutlined />,        'Inter-Company'),
            sidebarItem('/gateway/finance',    <AccountBookOutlined />,   'Finance',       'nav.finance'),
            sidebarItem('/gateway/hr',         <IdcardOutlined />,        'HR & Payroll',  'nav.hr'),
            sidebarItem('/gateway/reports',    <BarChartOutlined />,      'Reports',       'nav.reports'),
            sidebarItem('/gateway/settings',   <SettingOutlined />,       'Settings',      'nav.settings'),
          ]}
        />
      </Layout.Sider>
      <Layout>
        <Layout.Header
          style={{
            background: '#fff', padding: '0 24px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}
        >
          <CompanySwitcher />
          <Space size="middle">
            {/* Linear/Notion-style command-bar trigger — looks like a search field, not a button */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => window.dispatchEvent(new CustomEvent('crm-erp:palette-open'))}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') window.dispatchEvent(new CustomEvent('crm-erp:palette-open')); }}
              title="Search anything (Ctrl+K)"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                height: 32,
                padding: '0 8px 0 12px',
                width: 260,
                background: '#fafafa',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                color: '#9ca3af',
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all 140ms ease',
                userSelect: 'none',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#fff';
                e.currentTarget.style.borderColor = '#1677ff';
                e.currentTarget.style.color = '#1677ff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#fafafa';
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.color = '#9ca3af';
              }}
            >
              <SearchOutlined style={{ fontSize: 14 }} />
              <span style={{ flex: 1 }}>Search anything…</span>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 2,
                padding: '2px 6px',
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: 4,
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontSize: 11,
                color: '#6b7280',
                lineHeight: 1,
              }}>
                <span style={{ fontSize: 12 }}>⌃</span>K
              </span>
            </div>
            <RecentDocsButton />
            <Typography.Text>{user?.name}</Typography.Text>
            <Button icon={<LogoutOutlined />} onClick={() => dispatch(logoutThunk())}>
              Sign out
            </Button>
          </Space>
        </Layout.Header>
        <Layout.Content style={{ padding: 24, paddingRight: 24 + railOffset, transition: 'padding-right 0.18s ease' }}>
          {/* Inner Suspense — so route-change chunk loads ONLY blank the page area,
              not the sidebar/topbar. Outer Suspense (in main.tsx) catches the
              first-paint lazy-load only. */}
          <Suspense fallback={<RouteFallback />}>
            <Outlet />
          </Suspense>
        </Layout.Content>
      </Layout>
      <VoucherSwitcher />
      <QuickVoucherFab />
      <ShortcutsCheatSheet />
      <CommandPalette />
      <DayActionsDrawer />
    </Layout>
  );
}

export default function App() {
  return (
    <Routes>
      {authPublicRoutes.map((r) => (
        <Route key={r.path} path={r.path} element={r.element} />
      ))}

      <Route element={<RequireAuth><AppShell /></RequireAuth>}>
        {authPrivateRoutes.map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}
        {companiesPrivateRoutes.map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}
        {settingsPrivateRoutes.map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}
        {crmPrivateRoutes.map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}
        {productsPrivateRoutes.map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}
        {inventoryPrivateRoutes.map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}
        {purchasePrivateRoutes.map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}
        {quotationPrivateRoutes.map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}
        {salesPrivateRoutes.map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}
        {productionPrivateRoutes.map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}
        {trackingPrivateRoutes.map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}
        {formulaPrivateRoutes.map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}
        {exportPrivateRoutes.map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}
        {irmPrivateRoutes.map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}
        {interCompanyPrivateRoutes.map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}
        {financePrivateRoutes.map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}
        {loansPrivateRoutes.map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}
        {hrPrivateRoutes.map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}
        {documentsPrivateRoutes.map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}
        {tasksPrivateRoutes.map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}
        {commsPrivateRoutes.map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}
        {reportsPrivateRoutes.map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}
        {dashboardPrivateRoutes.map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}
        {exportIncentivesPrivateRoutes.map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}
        {projectsPrivateRoutes.map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}
        {securityPrivateRoutes.map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}
        {gatewayPrivateRoutes.map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
