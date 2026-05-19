import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, DatePicker, Form, Input, Row, Select, Space, Tag, Typography, message } from 'antd';
import { confirmDelete } from '../../common/confirmDelete';
import { CloudUploadOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs, { type Dayjs } from 'dayjs';
import { tasksApi } from '../api/tasksApi';
import { userApi } from '../../01-auth/api/userApi';
import type { Task, TaskPriority, TaskStatus } from '../types/tasks.types';

interface HeaderShape {
  title: string;
  description?: string;
  due_date?: Dayjs;
  assignee_id?: number;
  priority: TaskPriority;
  related_type?: string;
  related_id?: number;
  reminder_at?: Dayjs;
  reminder_channel?: 'email' | 'in_app';
}

export default function TaskFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const [form] = Form.useForm<HeaderShape>();
  const [task, setTask] = useState<Task | null>(null);
  const [users, setUsers] = useState<Array<{ value: number; label: string }>>([]);
  const [loading, setLoading] = useState(false); const [saving, setSaving] = useState(false);

  useEffect(() => {
    userApi.list({ per_page: 200 }).then((r) => setUsers(r.data.map((u) => ({ value: u.id, label: u.name })))).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!editing || !id) return;
    setLoading(true);
    tasksApi.get(Number(id)).then((x) => {
      setTask(x);
      form.setFieldsValue({
        title: x.title, description: x.description ?? undefined,
        due_date: x.due_date ? dayjs(x.due_date) : undefined,
        assignee_id: x.assignee_id ?? undefined,
        priority: x.priority,
        related_type: x.related_type ?? undefined,
        related_id: x.related_id ?? undefined,
      });
    }).catch(() => message.error('Failed.')).finally(() => setLoading(false));
  }, [editing, id, form]);

  const onSave = async () => {
    setSaving(true);
    try {
      const v = await form.validateFields();
      const payload = {
        ...v,
        due_date: v.due_date?.toISOString(),
        reminder_at: v.reminder_at?.toISOString(),
      };
      if (editing && task) { setTask(await tasksApi.update(task.id, payload)); message.success('Saved.'); }
      else {
        const created = await tasksApi.create(payload);
        message.success('Task created.');
        navigate(`/tasks/${created.id}`, { replace: true });
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Save failed.');
    } finally { setSaving(false); }
  };

  const onSync = async () => { if (!task) return; try { const r = await tasksApi.syncToGoogle(task.id); if (r.message) message.warning(r.message); else message.success(`Synced — event ${r.google_event_id}.`); } catch (e: unknown) { const err = e as { response?: { data?: { message?: string } } }; message.warning(err.response?.data?.message ?? 'Google Calendar not configured.'); } };

  const status: TaskStatus | undefined = task?.status;

  return (
    <Card loading={loading}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space style={{ justifyContent: 'space-between', width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>{editing ? 'Task' : 'New task'} {status && <Tag>{status}</Tag>}</Typography.Title>
          <Space>
            <Button onClick={() => navigate('/tasks')}>Back</Button>
            <Button type="primary" loading={saving} onClick={onSave}>{editing ? 'Save' : 'Create'}</Button>
            {task && <Button icon={<CloudUploadOutlined />} onClick={onSync}>Sync to Google</Button>}
            {task && <Button danger icon={<DeleteOutlined />}
              onClick={() => confirmDelete({
                title: `Delete task "${task.title}"?`,
                onOk: async () => { await tasksApi.remove(task.id); navigate('/tasks'); },
              })}>Delete</Button>}
          </Space>
        </Space>
        {task?.google_event_id && <Alert type="success" showIcon message={`Synced to Google Calendar (event ${task.google_event_id}).`} />}

        <Form form={form} layout="vertical" initialValues={{ priority: 'med', reminder_channel: 'in_app' }}>
          <Row gutter={16}>
            <Col xs={24} md={16}><Form.Item label="Title" name="title" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col xs={12} md={4}><Form.Item label="Priority" name="priority"><Select options={[{ value: 'low', label: 'Low' }, { value: 'med', label: 'Medium' }, { value: 'high', label: 'High' }]} /></Form.Item></Col>
            <Col xs={12} md={4}><Form.Item label="Due date" name="due_date"><DatePicker showTime style={{ width: '100%' }} /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item label="Assignee" name="assignee_id"><Select allowClear options={users} /></Form.Item></Col>
            <Col xs={12} md={6}><Form.Item label="Related type" name="related_type"><Input placeholder="e.g. Modules\\Sales\\Models\\SalesOrder" /></Form.Item></Col>
            <Col xs={12} md={6}><Form.Item label="Related id" name="related_id"><Input type="number" /></Form.Item></Col>
            <Col xs={24}><Form.Item label="Description" name="description"><Input.TextArea rows={4} /></Form.Item></Col>
            {!editing && <>
              <Col xs={12} md={4}><Form.Item label="Reminder at" name="reminder_at"><DatePicker showTime style={{ width: '100%' }} /></Form.Item></Col>
              <Col xs={12} md={3}><Form.Item label="Channel" name="reminder_channel"><Select options={[{ value: 'in_app', label: 'In-app' }, { value: 'email', label: 'Email' }]} /></Form.Item></Col>
            </>}
          </Row>
        </Form>
      </Space>
    </Card>
  );
}
