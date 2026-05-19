import { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Checkbox, Input, Progress, Select, Space, Tag, Tooltip, Typography, message } from 'antd';
import { CalendarOutlined, ClockCircleOutlined, FireOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import { tasksApi } from '../../20-tasks/api/tasksApi';
import type { Task, TaskPriority } from '../../20-tasks/types/tasks.types';
import { useAppSelector } from '../../../app/hooks';

interface PaginatedTasks {
  data: Task[];
}

const PRIORITY_COLOR: Record<TaskPriority, string> = { low: 'default', med: 'blue', high: 'red' };
const PRIORITY_LABEL: Record<TaskPriority, string> = { low: 'Low', med: 'Med', high: 'High' };

/**
 * Mandatory daily-tasks widget on the Dashboard. Shows the current user's:
 *   - OVERDUE tasks (red, top of list)
 *   - DUE TODAY tasks (orange)
 *   - DONE TODAY counter (progress ring)
 *
 * Quick-add input creates a task in one keystroke (Enter to save) — defaults
 * `due_date = today`, `assignee = current user`. Inline checkbox marks done.
 *
 * Filters by `assignee_id = current user` so each person sees only their own
 * day. Toggle "Show all my team" reveals every task across the company.
 */
export default function TodayTasksPanel() {
  const me = useAppSelector((s) => s.auth.user);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [doneToday, setDoneToday] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<TaskPriority>('med');
  const [scope, setScope] = useState<'mine' | 'all'>('mine');

  const today = dayjs().format('YYYY-MM-DD');

  const fetchTasks = async () => {
    if (!me) return;
    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        due_date_to: today,
        status_in: 'open,in_progress',
        per_page: 100,
        has_due_date: 1,
      };
      if (scope === 'mine') params.assignee_id = me.id;
      const r: PaginatedTasks = await tasksApi.list(params);
      setTasks(r.data);

      // Done today (separate query — completed_at >= today, status = done)
      const doneR: PaginatedTasks = await tasksApi.list({
        status: 'done',
        due_date_from: today,
        due_date_to: today,
        per_page: 50,
        ...(scope === 'mine' ? { assignee_id: me.id } : {}),
      });
      setDoneToday(doneR.data);
    } catch { message.error('Failed to load today\'s tasks.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void fetchTasks(); /* eslint-disable-next-line */ }, [scope, me?.id]);

  const overdue = useMemo(() => tasks.filter((t) => t.due_date && t.due_date < today), [tasks, today]);
  const dueToday = useMemo(() => tasks.filter((t) => t.due_date === today), [tasks, today]);

  const totalForDay = overdue.length + dueToday.length + doneToday.length;
  const completionPct = totalForDay > 0 ? Math.round((doneToday.length / totalForDay) * 100) : 0;

  const onQuickAdd = async () => {
    const title = newTitle.trim();
    if (!title || !me) return;
    try {
      await tasksApi.create({
        title,
        due_date: today,
        assignee_id: me.id,
        priority: newPriority,
      });
      setNewTitle('');
      message.success('Added to today.');
      void fetchTasks();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message ?? 'Could not add task.');
    }
  };

  const onComplete = async (t: Task) => {
    try {
      await tasksApi.complete(t.id);
      void fetchTasks();
    } catch { message.error('Could not mark complete.'); }
  };

  const onReopen = async (t: Task) => {
    try {
      await tasksApi.reopen(t.id);
      void fetchTasks();
    } catch { message.error('Could not reopen.'); }
  };

  const renderRow = (t: Task, kind: 'overdue' | 'today' | 'done') => {
    const priColor = PRIORITY_COLOR[t.priority];
    const priLabel = PRIORITY_LABEL[t.priority];
    const dueLabel = kind === 'overdue'
      ? <Tooltip title={t.due_date}><Tag color="red" icon={<ClockCircleOutlined />} style={{ marginLeft: 6 }}>Overdue · {dayjs(today).diff(dayjs(t.due_date), 'day')}d</Tag></Tooltip>
      : kind === 'today'
        ? <Tag color="orange" style={{ marginLeft: 6 }}>Due today</Tag>
        : <Tag color="green" style={{ marginLeft: 6 }}>Done</Tag>;

    return (
      <div key={t.id}
        style={{
          display: 'flex', alignItems: 'center',
          padding: '8px 12px',
          borderRadius: 6,
          background: kind === 'overdue' ? '#fff1f0' : kind === 'today' ? '#fff7e6' : '#f6ffed',
          marginBottom: 6,
          border: `1px solid ${kind === 'overdue' ? '#ffccc7' : kind === 'today' ? '#ffd591' : '#b7eb8f'}`,
        }}
      >
        <Checkbox
          checked={kind === 'done'}
          onChange={() => kind === 'done' ? onReopen(t) : onComplete(t)}
          style={{ marginRight: 10 }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: 500,
            textDecoration: kind === 'done' ? 'line-through' : 'none',
            color: kind === 'done' ? '#999' : '#222',
          }}>
            <Link to={`/tasks/${t.id}`} style={{ color: 'inherit' }}>{t.title}</Link>
            {t.priority !== 'med' && <Tag color={priColor} style={{ marginLeft: 6 }}>{priLabel}</Tag>}
            {dueLabel}
          </div>
          {t.assignee && scope === 'all' && (
            <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
              {t.assignee.name}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #fffbe6 0%, #fff1f0 100%)',
      border: '2px solid #ffd591',
      borderRadius: 10,
      padding: '12px 16px',
      boxShadow: '0 2px 10px rgba(250, 173, 20, 0.12)',
    }}>
      {/* Header — compact horizontal */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <FireOutlined style={{ fontSize: 22, color: '#fa541c' }} />
          <div>
            <Typography.Title level={5} style={{ margin: 0, color: '#fa541c' }}>
              Today's focus — {dayjs().format('dddd, DD MMM YYYY')}
            </Typography.Title>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Mandatory daily checklist. Tick items as you complete them.
            </Typography.Text>
          </div>
        </div>

        <Space wrap>
          <Tooltip title={scope === 'mine' ? 'Showing only your tasks' : 'Showing every team member\'s tasks'}>
            <Select
              value={scope}
              onChange={setScope}
              size="small"
              style={{ width: 160 }}
              options={[
                { value: 'mine', label: 'My tasks only' },
                { value: 'all',  label: 'All team tasks' },
              ]}
            />
          </Tooltip>
          <Tooltip title="Refresh">
            <Button size="small" icon={<ReloadOutlined />} onClick={() => void fetchTasks()} loading={loading} />
          </Tooltip>
        </Space>
      </div>

      {/* Progress strip — same row as the quick-add input for a true horizontal layout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 220px', minWidth: 220 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
            <span><strong>{doneToday.length}</strong> of {totalForDay} done today</span>
            <span style={{ color: completionPct === 100 ? '#52c41a' : completionPct >= 50 ? '#faad14' : '#fa541c' }}>{completionPct}%</span>
          </div>
          <Progress
            percent={completionPct}
            size="small"
            strokeColor={completionPct === 100 ? '#52c41a' : completionPct >= 50 ? '#faad14' : '#fa541c'}
            showInfo={false}
          />
        </div>
        <Space size={8}>
          <Badge count={overdue.length} showZero={false} color="#cf1322"><Tag color="red" icon={<ClockCircleOutlined />}>Overdue {overdue.length}</Tag></Badge>
          <Badge count={dueToday.length} showZero={false} color="#fa8c16"><Tag color="orange" icon={<CalendarOutlined />}>Due today {dueToday.length}</Tag></Badge>
          <Tag color="green">Done {doneToday.length}</Tag>
        </Space>
      </div>

      {/* Quick-add */}
      <Space.Compact style={{ display: 'flex', marginBottom: 10 }}>
        <Input
          placeholder="What are you doing today? Press Enter to add."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onPressEnter={() => void onQuickAdd()}
          disabled={!me}
          allowClear
        />
        <Select
          value={newPriority}
          onChange={setNewPriority}
          options={[{ value: 'low', label: 'Low' }, { value: 'med', label: 'Med' }, { value: 'high', label: 'High' }]}
          style={{ width: 80 }}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => void onQuickAdd()} disabled={!newTitle.trim() || !me}>Add</Button>
      </Space.Compact>

      {/* Lists */}
      {totalForDay === 0 ? (
        <Alert
          type={completionPct === 100 ? 'success' : 'info'}
          showIcon
          message={completionPct === 100 ? 'Day cleared. Nothing pending.' : 'Nothing scheduled for today yet — add a task above to start your day.'}
          style={{ background: 'rgba(255,255,255,0.7)' }}
        />
      ) : (
        <>
          {overdue.map((t) => renderRow(t, 'overdue'))}
          {dueToday.map((t) => renderRow(t, 'today'))}
          {doneToday.length > 0 && (
            <>
              {doneToday.length <= 3
                ? doneToday.map((t) => renderRow(t, 'done'))
                : (
                  <details style={{ marginTop: 8 }}>
                    <summary style={{ cursor: 'pointer', fontSize: 12, color: '#52c41a' }}>
                      {doneToday.length} completed today (click to expand)
                    </summary>
                    <div style={{ marginTop: 8 }}>{doneToday.map((t) => renderRow(t, 'done'))}</div>
                  </details>
                )}
            </>
          )}
        </>
      )}

      {(overdue.length > 0 || dueToday.length > 0 || doneToday.length > 0) && (
        <div style={{ marginTop: 10, fontSize: 11, color: '#888', textAlign: 'right' }}>
          <Link to="/tasks" style={{ color: '#fa541c' }}>Open full task list →</Link>
        </div>
      )}
    </div>
  );
}
