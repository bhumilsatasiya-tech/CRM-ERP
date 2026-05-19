import { Card, Col, Empty, Row, Space, Tag, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { shortcutFor } from '../../app/shortcuts';

export interface GatewayTile {
  /** Display title on the tile. */
  title: string;
  /** Short one-liner shown under the title. */
  description?: string;
  /** Icon node (e.g. `<FileTextOutlined />`). */
  icon: React.ReactNode;
  /** Route to navigate to on click. Either `route` or `onClick` must be set. */
  route?: string;
  /** Custom click handler — used for tiles that open drawers/modals. */
  onClick?: () => void;
  /** Brand accent color for the left stripe + icon. */
  color: string;
  /** Optional shortcut id from `shortcuts.ts` — its combo is shown as a badge. */
  shortcutId?: string;
  /** Tag rendered on the tile (e.g. "New", "Live"). */
  badge?: string;
  /** When true, tile is dimmed + non-clickable. */
  disabled?: boolean;
}

export interface GatewaySection {
  /** Section heading shown above the tile grid. */
  title: string;
  tiles: GatewayTile[];
}

interface Props {
  /** Page title. */
  title: string;
  /** Optional subtitle shown under the title. */
  subtitle?: string;
  /** Grouped tiles. */
  sections: GatewaySection[];
}

/**
 * Tally-style "Gateway" page — a single panel listing every action available
 * within one module, grouped into sections, each tile showing its keyboard
 * shortcut on the right edge.
 *
 * Used as the landing page for every top-level sidebar item:
 *   /gateway/sales, /gateway/purchase, /gateway/finance, ...
 */
export default function ModuleGateway({ title, subtitle, sections }: Props) {
  const navigate = useNavigate();

  const onTileClick = (t: GatewayTile) => {
    if (t.disabled) return;
    if (t.onClick) { t.onClick(); return; }
    if (t.route) navigate(t.route);
  };

  return (
    <div>
      <Space direction="vertical" size="small" style={{ width: '100%', marginBottom: 18 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>{title}</Typography.Title>
        {subtitle && <Typography.Text type="secondary">{subtitle}</Typography.Text>}
      </Space>

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {sections.length === 0 && <Empty />}
        {sections.map((sec) => (
          <div key={sec.title}>
            <Typography.Text strong style={{ fontSize: 12, color: '#8c8c8c', textTransform: 'uppercase', letterSpacing: 0.6 }}>
              {sec.title}
            </Typography.Text>
            <Row gutter={[14, 14]} style={{ marginTop: 8 }}>
              {sec.tiles.map((t) => {
                const combo = t.shortcutId ? shortcutFor(t.shortcutId) : undefined;
                return (
                  <Col key={t.title} xs={24} sm={12} md={8} xl={6}>
                    <Card
                      hoverable={!t.disabled}
                      onClick={() => onTileClick(t)}
                      bodyStyle={{ padding: 14 }}
                      style={{
                        cursor: t.disabled ? 'not-allowed' : 'pointer',
                        opacity: t.disabled ? 0.55 : 1,
                        borderLeft: `4px solid ${t.color}`,
                        height: '100%',
                        transition: 'transform 0.12s ease, box-shadow 0.12s ease',
                      }}
                      className="gateway-tile"
                    >
                      <Space align="start" size="middle" style={{ width: '100%', justifyContent: 'space-between' }}>
                        <Space align="start" size="middle">
                          <div style={{ fontSize: 24, color: t.color, marginTop: 2 }}>{t.icon}</div>
                          <Space direction="vertical" size={2}>
                            <Space size="small">
                              <Typography.Text strong style={{ fontSize: 14 }}>{t.title}</Typography.Text>
                              {t.badge && <Tag color="purple" style={{ marginLeft: 4 }}>{t.badge}</Tag>}
                            </Space>
                            {t.description && (
                              <Typography.Text type="secondary" style={{ fontSize: 12, lineHeight: 1.4 }}>
                                {t.description}
                              </Typography.Text>
                            )}
                          </Space>
                        </Space>
                        {combo && (
                          <Tag style={{
                            fontFamily: 'ui-monospace, SF Mono, Menlo, Consolas, monospace',
                            fontSize: 10,
                            color: '#595959',
                            background: '#f5f5f5',
                            border: '1px solid #e6e6e6',
                            margin: 0,
                          }}>
                            {combo}
                          </Tag>
                        )}
                      </Space>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          </div>
        ))}
      </Space>
    </div>
  );
}
