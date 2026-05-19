import { useEffect } from 'react';
import { Select, Tag, Tooltip, message } from 'antd';
import { ApartmentOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { fetchMyCompaniesThunk, setActiveCompanyThunk } from '../store/companiesSlice';

export default function CompanySwitcher() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { list, activeCompanyId, status } = useAppSelector((s) => s.companies);

  useEffect(() => {
    if (status === 'idle') void dispatch(fetchMyCompaniesThunk());
  }, [status, dispatch]);

  if (status === 'ready' && list.length === 0) {
    return <Tag color="warning">No companies assigned</Tag>;
  }

  const onChange = async (value: number) => {
    const r = await dispatch(setActiveCompanyThunk(value));
    if (r.meta.requestStatus === 'fulfilled') {
      message.success('Switched.');
      // No full-page reload. The axios interceptor reads X-Company-Id from localStorage on
      // every request, so subsequent fetches use the new company. Bouncing to the dashboard
      // makes any in-flight stale data go away. The lookup cache listens for this event
      // and flushes — partner/product lookups would otherwise return rows from the prior company.
      window.dispatchEvent(new CustomEvent('crm-erp:company-switched', { detail: { companyId: value } }));
      navigate('/dashboard', { replace: true });
    } else {
      message.error('Could not switch company.');
    }
  };

  const active = list.find((c) => c.id === activeCompanyId);
  const tagColor = active?.type === 'export' ? 'blue' : active?.type === 'supplying' ? 'purple' : 'default';

  return (
    <Tooltip title="Active company">
      <Select
        size="middle"
        value={activeCompanyId ?? undefined}
        onChange={onChange}
        loading={status === 'loading'}
        style={{ minWidth: 240 }}
        suffixIcon={<ApartmentOutlined />}
        options={list.map((c) => ({
          value: c.id,
          label: (
            <span>
              <strong>{c.name}</strong>{' '}
              <Tag color={c.type === 'export' ? 'blue' : c.type === 'supplying' ? 'purple' : 'default'} style={{ marginInlineStart: 6 }}>
                {c.type}
              </Tag>
            </span>
          ),
        }))}
      />
      {active && (
        <Tag style={{ marginLeft: 8 }} color={tagColor}>
          {active.code}
        </Tag>
      )}
    </Tooltip>
  );
}
