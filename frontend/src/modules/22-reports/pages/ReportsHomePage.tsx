import { Card, Col, Row, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { REPORT_DEFS } from '../api/reportsApi';

export default function ReportsHomePage() {
  const codes = Object.keys(REPORT_DEFS);
  return (
    <Card>
      <Typography.Title level={4} style={{ margin: 0 }}>Reports</Typography.Title>
      <Typography.Paragraph type="secondary">Select a report to view.</Typography.Paragraph>
      <Row gutter={[16, 16]} style={{ marginTop: 12 }}>
        {codes.map((c) => (
          <Col xs={24} sm={12} md={8} key={c}>
            <Link to={`/reports/${c}`}>
              <Card hoverable>
                <Typography.Title level={5} style={{ margin: 0 }}>{REPORT_DEFS[c].title}</Typography.Title>
                <Typography.Text type="secondary">/reports/{c}</Typography.Text>
              </Card>
            </Link>
          </Col>
        ))}
      </Row>
    </Card>
  );
}
