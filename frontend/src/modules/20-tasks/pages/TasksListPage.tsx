import { useEffect, useState } from 'react';
import { Button, Card, Col, Input, Row, Select, Space, Tag, Typography, message } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { tasksApi } from '../api/tasksApi';
import type { Task, TaskPriority, TaskStatus } from '../types/tasks.types';

const PRIORITY_COLORS: Record<TaskPriority, string> = { low: 'default', med: 'blue', high: 'red' };

const STATUSES: TaskStatus[] = ['open', 'in_progress', 'done'];

export default function TasksListPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState<TaskPriority | undefined>(undefined);

  const fetch = async () => {
    setLoading(true);
    try {
      const r = await tasksApi.list({ search: search || undefined, priority, per_page: 200 });
      setData(r.data);
    } catch { message.error('Failed.'); } finally { setLoading(false); }
  };
  useEffect(() => { void fetch(); /* eslint-disable-next-line */ }, [priority]);

  const buckets: Record<TaskStatus, Task[]> = { open: [], in_progress: [], done: [], cancelled: [] };
  data.forEach((t) => { buckets[t.status]?.push(t); });

  const onComplete = async (t: Task) => { try { await tasksApi.complete(t.id); await fetch(); } catch { message.error('Failed.'); } };
  const onReopen   = async (t: Task) => { try { await tasksApi.reopen(t.id); await fetch(); } catch { message.error('Failed.'); } };

  return (
    <Card>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>Tasks</Typography.Title>
          <Space>
            <Input.Search placeholder="Search title" allowClear onSearch={(v) => { setSearch(v); void fetch(); }} style={{ width: 240 }} />
            <Select placeholder="Priority" allowClear style={{ width: 130 }} value={priority} onChange={setPriority}
              options={(['low', 'med', 'high'] as TaskPriority[]).map((p) => ({ value: p, label: p }))} />
            <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void fetch()}>Refresh</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/tasks/new')}>New task</Button>
          </Space>
        </Space>
        <Row gutter={16}>
          {STATUSES.map((s) => (
            <Col xs={24} md={8} key={s}>
              <Card size="small" title={<span>{s.replace('_', ' ').toUpperCase()} <Tag>{buckets[s].length}</Tag></span>}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  {buckets[s].map((t) => (
                    <Card key={t.id} size="small" style={{ borderLeft: `3px solid ${PRIORITY_COLORS[t.priority] === 'default' ? '#ccc' : PRIORITY_COLORS[t.priority]}` }}
                      onClick={() => navigate(`/tasks/${t.id}`)} hoverable>
                      <Space direction="vertical" size={2} style={{ width: '100%' }}>
                        <Typography.Text strong>{t.title}</Typography.Text>
                        <Space size={4} wrap>
                          <Tag color={PRIORITY_COLORS[t.priority]}>{t.priority}</Tag>
                          {t.due_date && <Tag color={dayjs(t.due_date).isBefore(dayjs()) && s !== 'done' ? 'red' : undefined}>{dayjs(t.due_date).format('YYYY-MM-DD')}</Tag>}
                          {t.assignee && <Tag>{t.assignee.name}</Tag>}
                        </Space>
                        <Space onClick={(e) => e.stopPropagation()}>
                          {s === 'open' && <Button size="small" onClick={() => void onComplete(t)}>Done</Button>}
                          {s === 'done' && <Button size="small" onClick={() => void onReopen(t)}>Reopen</Button>}
                        </Space>
                      </Space>
                    </Card>
                  ))}
                  {buckets[s].length === 0 && <Typography.Text type="secondary">— none —</Typography.Text>}
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      </Space>
    </Card>
  );
}
