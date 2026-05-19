import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Form, Input, Modal, Row, Select, Space, Switch, Table, Tag, Tooltip, Typography, message } from 'antd';
import { confirmDelete } from '../../common/confirmDelete';
import { CheckCircleOutlined, DeleteOutlined, EditOutlined, EyeOutlined, ReloadOutlined, SaveOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { documentTemplateApi, type DocumentTemplate, type UpdateTemplatePayload } from '../api/templatesApi';
import { companyApi } from '../../02-companies/api/companyApi';
import type { Company } from '../../02-companies/types/companies.types';

const DOC_TYPES: Array<{ value: string; label: string }> = [
  { value: 'invoice',         label: 'Tax Invoice (Domestic)' },
  { value: 'quotation',       label: 'Quotation' },
  { value: 'sales_order',     label: 'Proforma Invoice (SO)' },
  { value: 'purchase_order',  label: 'Purchase Order' },
  { value: 'export_invoice',  label: 'Export Invoice' },
  { value: 'tax_invoice',     label: 'Tax Invoice (Export INR)' },
];

const docTypeLabel = (key: string) => DOC_TYPES.find((d) => d.value === key)?.label ?? key;

export default function DocumentTemplatesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyFilter, setCompanyFilter] = useState<number | undefined>();
  const [docTypeFilter, setDocTypeFilter] = useState<string | undefined>();
  const [rows, setRows] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  const [editing, setEditing] = useState<DocumentTemplate | null>(null);
  const [editForm] = Form.useForm<UpdateTemplatePayload>();
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const r = await documentTemplateApi.list({ company_id: companyFilter, doc_type: docTypeFilter });
      setRows(r);
    } catch { message.error('Failed to load templates.'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    companyApi.myCompanies().then((r) => setCompanies(r.data)).catch(() => undefined);
  }, []);
  useEffect(() => { void fetchData(); /* eslint-disable-next-line */ }, [companyFilter, docTypeFilter]);

  const openEditor = async (t: DocumentTemplate) => {
    setEditing(t);
    editForm.setFieldsValue({
      name: t.name, html: t.html, css: t.css ?? '',
      paper_size: t.paper_size, orientation: t.orientation,
      is_default: t.is_default, is_active: t.is_active,
    });
    await refreshPreview(t.id);
  };

  const refreshPreview = async (id: number) => {
    setPreviewLoading(true);
    try {
      const r = await documentTemplateApi.preview(id);
      setPreviewHtml(r.html);
    } catch { setPreviewHtml('<p style="padding:24px;color:#c00">Preview failed — check template syntax.</p>'); }
    finally { setPreviewLoading(false); }
  };

  const onSave = async () => {
    if (!editing) return;
    try {
      const v = await editForm.validateFields();
      const updated = await documentTemplateApi.update(editing.id, v);
      message.success('Saved.');
      setEditing(updated);
      await refreshPreview(updated.id);
      void fetchData();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Save failed.');
    }
  };

  const onMakeDefault = async (t: DocumentTemplate) => {
    try { await documentTemplateApi.makeDefault(t.id); message.success(`"${t.name}" is now the default for ${docTypeLabel(t.doc_type)}.`); void fetchData(); }
    catch { message.error('Failed to make default.'); }
  };

  const onDelete = async (t: DocumentTemplate) => {
    try { await documentTemplateApi.remove(t.id); message.success('Deleted.'); void fetchData(); }
    catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Delete failed.');
    }
  };

  const cols: ColumnsType<DocumentTemplate> = [
    {
      title: 'Company', dataIndex: 'company_id', width: 140,
      render: (id: number) => companies.find((c) => c.id === id)?.code ?? id,
    },
    { title: 'Doc type', dataIndex: 'doc_type', width: 220, render: (v: string) => <Tag color="blue">{docTypeLabel(v)}</Tag> },
    { title: 'Name', dataIndex: 'name' },
    {
      title: 'Default', dataIndex: 'is_default', width: 90,
      render: (v: boolean, row) => v
        ? <Tag color="green" icon={<CheckCircleOutlined />}>Default</Tag>
        : <Button size="small" onClick={() => void onMakeDefault(row)}>Make default</Button>,
    },
    { title: 'Active', dataIndex: 'is_active', width: 80, render: (v: boolean) => <Switch checked={v} disabled /> },
    { title: 'Paper', dataIndex: 'paper_size', width: 90, render: (v: string, r) => `${v.toUpperCase()} • ${r.orientation}` },
    {
      title: 'Actions', key: 'a', width: 130,
      render: (_, row) => (
        <Space>
          <Tooltip title="Edit & preview">
            <Button size="small" icon={<EditOutlined />} onClick={() => void openEditor(row)} />
          </Tooltip>
          <Button danger size="small" icon={<DeleteOutlined />}
            onClick={() => confirmDelete({
              title: `Delete template "${row.name}"?`,
              content: 'PDF downloads for this doc type will fail until you create another template.',
              onOk: () => onDelete(row),
            })} />
        </Space>
      ),
    },
  ];

  const previewSrcDoc = useMemo(() => previewHtml, [previewHtml]);

  return (
    <Card>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space style={{ justifyContent: 'space-between', width: '100%' }} wrap>
          <Typography.Title level={4} style={{ margin: 0 }}>Document Templates (PDF)</Typography.Title>
          <Space>
            <Select
              placeholder="Filter by company" allowClear style={{ width: 220 }}
              value={companyFilter} onChange={setCompanyFilter}
              options={companies.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))}
            />
            <Select
              placeholder="Filter by doc type" allowClear style={{ width: 220 }}
              value={docTypeFilter} onChange={setDocTypeFilter}
              options={DOC_TYPES}
            />
            <Button icon={<ReloadOutlined />} onClick={() => void fetchData()}>Refresh</Button>
          </Space>
        </Space>

        <Alert
          type="info" showIcon
          message="These templates are used by the 'Download PDF' button on each form. Edit the HTML/CSS to customize what gets printed. The preview pane shows mock data — saving applies your changes to the next real PDF."
        />

        <Table<DocumentTemplate> rowKey="id" dataSource={rows} columns={cols} loading={loading} pagination={false} size="middle" />
      </Space>

      <Modal
        open={!!editing}
        title={editing ? `Edit template — ${editing.name} (${docTypeLabel(editing.doc_type)})` : ''}
        onCancel={() => setEditing(null)}
        footer={null}
        width="95%"
        style={{ top: 12 }}
        bodyStyle={{ padding: 0 }}
        destroyOnClose
      >
        {editing && (
          <Row gutter={0} style={{ height: 'calc(100vh - 120px)' }}>
            <Col span={12} style={{ borderRight: '1px solid #eee', padding: 16, overflow: 'auto' }}>
              <Form<UpdateTemplatePayload> form={editForm} layout="vertical">
                <Row gutter={12}>
                  <Col span={12}><Form.Item label="Name" name="name" rules={[{ required: true }]}><Input /></Form.Item></Col>
                  <Col span={6}><Form.Item label="Paper" name="paper_size"><Select options={[{value:'a4',label:'A4'},{value:'letter',label:'Letter'},{value:'legal',label:'Legal'}]} /></Form.Item></Col>
                  <Col span={6}><Form.Item label="Orientation" name="orientation"><Select options={[{value:'portrait',label:'Portrait'},{value:'landscape',label:'Landscape'}]} /></Form.Item></Col>
                  <Col span={8}><Form.Item label="Default" name="is_default" valuePropName="checked" extra="Used by Download PDF for this doc type"><Switch /></Form.Item></Col>
                  <Col span={8}><Form.Item label="Active" name="is_active" valuePropName="checked"><Switch /></Form.Item></Col>
                </Row>

                <Typography.Text strong>HTML body</Typography.Text>
                <Typography.Paragraph type="secondary" style={{ fontSize: 12, margin: '4px 0 8px' }}>
                  Placeholders: <code>{'{{partner.name}}'}</code> <code>{'{{doc.code}}'}</code> <code>{'{{doc.total | money:2}}'}</code> <code>{'{{doc.date | date:d M Y}}'}</code> — loops: <code>{'{{#items}}…{{/items}}'}</code>. Triple braces (<code>{'{{{ }}}'}</code>) skip HTML escaping.
                </Typography.Paragraph>
                <Form.Item name="html" rules={[{ required: true }]} style={{ marginBottom: 12 }}>
                  <Input.TextArea autoSize={{ minRows: 18, maxRows: 30 }} style={{ fontFamily: 'Consolas, monospace', fontSize: 12 }} />
                </Form.Item>

                <Typography.Text strong>CSS</Typography.Text>
                <Form.Item name="css" style={{ marginBottom: 12 }}>
                  <Input.TextArea autoSize={{ minRows: 8, maxRows: 16 }} style={{ fontFamily: 'Consolas, monospace', fontSize: 12 }} />
                </Form.Item>

                <Space>
                  <Button type="primary" icon={<SaveOutlined />} onClick={onSave}>Save & re-preview</Button>
                  <Button icon={<EyeOutlined />} onClick={() => void refreshPreview(editing.id)} loading={previewLoading}>Refresh preview</Button>
                  <Button onClick={() => setEditing(null)}>Close</Button>
                </Space>
              </Form>
            </Col>
            <Col span={12} style={{ background: '#f5f5f5', padding: 12, height: '100%' }}>
              <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
                Live preview <Typography.Text type="secondary">(mock data — saved templates render real records)</Typography.Text>
              </Typography.Text>
              <iframe
                title="template-preview"
                sandbox="allow-same-origin"
                srcDoc={previewSrcDoc}
                style={{ width: '100%', height: 'calc(100% - 32px)', border: '1px solid #ddd', background: '#fff' }}
              />
            </Col>
          </Row>
        )}
      </Modal>
    </Card>
  );
}
