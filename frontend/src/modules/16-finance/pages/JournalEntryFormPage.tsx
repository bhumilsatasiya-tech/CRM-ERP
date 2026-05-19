import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, DatePicker, Form, Input, InputNumber, Row, Select, Space, Table, Tag, Typography, message } from 'antd';
import { confirmDelete } from '../../common/confirmDelete';
import DocumentNumberField from '../../common/DocumentNumberField';
import { CheckOutlined, CloseOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs, { type Dayjs } from 'dayjs';
import { accountApi, journalApi } from '../api/financeApi';
import type { Account, JournalEntry, JournalStatus } from '../types/finance.types';

interface HeaderShape {
  code?: string;
  entry_date: Dayjs;
  narration?: string;
  reference_no?: string;
}

interface LineRow {
  key: string;
  account_id?: number;
  debit: number;
  credit: number;
  narration?: string;
}

export default function JournalEntryFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const [form] = Form.useForm<HeaderShape>();
  const [je, setJe] = useState<JournalEntry | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [lines, setLines] = useState<LineRow[]>([]);
  const [loading, setLoading] = useState(false); const [saving, setSaving] = useState(false);

  useEffect(() => {
    accountApi.list({ per_page: 500 }).then((r) => setAccounts(r.data.filter((a) => !a.is_group))).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!editing || !id) return;
    setLoading(true);
    journalApi.get(Number(id)).then((x) => {
      setJe(x);
      form.setFieldsValue({
        code: x.code,
        entry_date: dayjs(x.entry_date),
        narration: x.narration ?? undefined,
        reference_no: x.reference_no ?? undefined,
      });
      setLines((x.lines ?? []).map((l, i) => ({
        key: `e-${l.id ?? i}`,
        account_id: l.account_id,
        debit: Number(l.debit), credit: Number(l.credit),
        narration: l.narration ?? undefined,
      })));
    }).catch(() => message.error('Failed to load.')).finally(() => setLoading(false));
  }, [editing, id, form]);

  const totals = lines.reduce((acc, l) => ({ d: acc.d + (l.debit || 0), c: acc.c + (l.credit || 0) }), { d: 0, c: 0 });
  const balanced = Math.abs(totals.d - totals.c) < 0.01 && totals.d > 0;

  const updateLine = (k: string, p: Partial<LineRow>) => setLines((rows) => rows.map((r) => r.key === k ? { ...r, ...p } : r));
  const removeLine = (k: string) => setLines((rows) => rows.filter((r) => r.key !== k));
  const addLine = () => setLines((rows) => [...rows, { key: `n-${Date.now()}-${Math.random()}`, debit: 0, credit: 0 }]);

  const onSave = async () => {
    setSaving(true);
    try {
      const v = await form.validateFields();
      const payload = {
        code: v.code,
        entry_date: v.entry_date.format('YYYY-MM-DD'),
        narration: v.narration, reference_no: v.reference_no,
        lines: lines.filter((l) => l.account_id && (l.debit > 0 || l.credit > 0)).map((l) => ({
          account_id: l.account_id!, debit: l.debit, credit: l.credit, narration: l.narration,
        })),
      };
      if (payload.lines.length < 2) { message.error('Add at least 2 lines.'); return; }
      if (editing && je) { await journalApi.update(je.id, payload); message.success('Saved.'); }
      else {
        const created = await journalApi.create(payload);
        message.success('Journal entry created.');
        navigate(`/journal-entries/${created.id}`, { replace: true });
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Save failed.');
    } finally { setSaving(false); }
  };

  const onPost = async () => { if (!je) return; try { setJe(await journalApi.post(je.id)); message.success('Posted.'); } catch (e: unknown) { const err = e as { response?: { data?: { message?: string } } }; message.error(err.response?.data?.message ?? 'Post failed.'); } };
  const onCancel = async () => { if (!je) return; try { setJe(await journalApi.cancel(je.id, 'Cancelled by user')); message.success('Cancelled.'); } catch (e: unknown) { const err = e as { response?: { data?: { message?: string } } }; message.error(err.response?.data?.message ?? 'Cancel failed.'); } };

  const status: JournalStatus | undefined = je?.status;
  const readOnly = !!status && status !== 'draft';

  return (
    <Card loading={loading}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space style={{ justifyContent: 'space-between', width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>{editing ? `Journal entry ${je?.code ?? ''}` : 'New journal entry'} {status && <Tag style={{ marginLeft: 8 }}>{status}</Tag>}</Typography.Title>
          <Space>
            <Button onClick={() => navigate('/journal-entries')}>Back</Button>
            {!readOnly && <Button type="primary" loading={saving} onClick={onSave}>{editing ? 'Save' : 'Create'}</Button>}
            {status === 'draft' && je && <Button type="primary" icon={<CheckOutlined />} disabled={!balanced}
              onClick={() => confirmDelete({ title: 'Post this journal entry?', content: 'Locks the entry and updates account balances.', okText: 'Yes, post', danger: false, onOk: onPost })}>Post</Button>}
            {status === 'posted' && je && <Button danger icon={<CloseOutlined />}
              onClick={() => confirmDelete({ title: 'Cancel this journal entry?', content: 'Account balances will be reversed.', okText: 'Yes, cancel', onOk: onCancel })}>Cancel</Button>}
          </Space>
        </Space>
        {!balanced && <Alert type="warning" showIcon message={`Not balanced: debit ${totals.d.toFixed(2)} vs credit ${totals.c.toFixed(2)}.`} />}
        {balanced && status === 'draft' && <Alert type="success" showIcon message={`Balanced: ${totals.d.toFixed(2)} = ${totals.c.toFixed(2)}.`} />}

        <Form form={form} layout="vertical" initialValues={{ entry_date: dayjs() }}>
          <Row gutter={16}>
            <Col xs={12} md={4}>
              <Form.Item label="JE #" name="code" extra="auto from sequence — edit to override">
                <DocumentNumberField docType="journal_entry" editing={editing} disabled={readOnly} />
              </Form.Item>
            </Col>
            <Col xs={12} md={4}><Form.Item label="Entry date" name="entry_date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} disabled={readOnly} /></Form.Item></Col>
            <Col xs={12} md={4}><Form.Item label="Reference no." name="reference_no"><Input disabled={readOnly} /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item label="Narration" name="narration"><Input disabled={readOnly} /></Form.Item></Col>
          </Row>
        </Form>

        <Typography.Text strong>Lines</Typography.Text>
        <Table
          rowKey="key"
          dataSource={lines}
          size="small"
          pagination={false}
          columns={[
            { title: 'Account', key: 'a', render: (_: unknown, r: LineRow) => (
              <Select
                showSearch style={{ width: 320 }} placeholder="Pick account..."
                disabled={readOnly} value={r.account_id}
                filterOption={(q, opt) => String(opt?.label ?? '').toLowerCase().includes(q.toLowerCase())}
                options={accounts.map((a) => ({ value: a.id, label: `${a.code} — ${a.name}` }))}
                onChange={(v) => updateLine(r.key, { account_id: Number(v) })}
              />
            )},
            { title: 'Debit', key: 'd', width: 130, render: (_: unknown, r: LineRow) => (
              <InputNumber disabled={readOnly} min={0} step={0.01} value={r.debit} onChange={(v) => updateLine(r.key, { debit: Number(v ?? 0) })} style={{ width: '100%' }} />
            )},
            { title: 'Credit', key: 'c', width: 130, render: (_: unknown, r: LineRow) => (
              <InputNumber disabled={readOnly} min={0} step={0.01} value={r.credit} onChange={(v) => updateLine(r.key, { credit: Number(v ?? 0) })} style={{ width: '100%' }} />
            )},
            { title: 'Narration', key: 'n', render: (_: unknown, r: LineRow) => (
              <Input disabled={readOnly} value={r.narration} onChange={(e) => updateLine(r.key, { narration: e.target.value })} />
            )},
            { title: '', key: 'rm', width: 50, render: (_: unknown, r: LineRow) => readOnly ? null : (
              <Button size="small" danger icon={<DeleteOutlined />} onClick={() => removeLine(r.key)} />
            )},
          ]}
          summary={() => (
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0}><strong>Totals</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="right"><strong>{totals.d.toFixed(2)}</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right"><strong>{totals.c.toFixed(2)}</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={3} colSpan={2} />
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />
        {!readOnly && <Button icon={<PlusOutlined />} onClick={addLine}>Add line</Button>}
      </Space>
    </Card>
  );
}
