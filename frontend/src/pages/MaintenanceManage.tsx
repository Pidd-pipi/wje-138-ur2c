import { useEffect, useMemo, useState } from 'react';
import { Button, Card, message, Popconfirm, Space, Statistic, Table, Tabs, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { vehicleApi } from '../api/vehicle';
import { useMaintenance } from '../hooks/useMaintenance';
import { useMaintenanceStore } from '../stores/maintenanceStore';
import { MaintenanceStatus } from '../types/enums';
import type { MaintenanceRecord, Vehicle } from '../types';
import { CalendarCell } from '../components/common/CalendarCell';
import { EmptyState } from '../components/common/EmptyState';
import { StatusBadge } from '../components/common/StatusBadge';
import { CompleteModal, ScheduleModal } from '../components/maintenance/MaintenanceModals';
import { PageShell } from './PageShell';

const MAINTENANCE_TYPE_LABEL: Record<string, string> = {
  Routine: '常规保养',
  Repair: '故障维修',
  Emergency: '紧急抢修',
  Inspection: '年检检查'
};

type TabKey = 'Scheduled' | 'InProgress' | 'Completed' | 'Active' | 'All';

export function MaintenanceManage() {
  const { records, loading, fetchRecords, scheduleRecord, startRecord, completeRecord } = useMaintenanceStore();
  const { canStart, canComplete } = useMaintenance();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('Scheduled');
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [completing, setCompleting] = useState<MaintenanceRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    fetchRecords().catch(() => messageApi.error('维保记录加载失败'));
    vehicleApi.list<Vehicle>().then(setVehicles).catch(() => setVehicles([]));
  }, [fetchRecords, messageApi]);

  const vehicleMap = useMemo(() => new Map(vehicles.map((vehicle) => [vehicle.id, vehicle])), [vehicles]);
  const plateOf = (vehicleId: number) => vehicleMap.get(vehicleId)?.plateNo ?? `车辆#${vehicleId}`;

  const filteredRecords = useMemo(() => {
    if (activeTab === 'All') return records;
    if (activeTab === 'Active') {
      return records.filter((r) => r.status === MaintenanceStatus.Scheduled || r.status === MaintenanceStatus.InProgress);
    }
    return records.filter((r) => r.status === activeTab);
  }, [records, activeTab]);

  const upcoming = useMemo(
    () =>
      records
        .filter((r) => r.status === MaintenanceStatus.Scheduled)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 6),
    [records]
  );
  const totalCost = useMemo(
    () => records.filter((r) => r.status === MaintenanceStatus.Completed).reduce((sum, r) => sum + (r.finalCost ?? r.cost ?? 0), 0),
    [records]
  );

  const handleSchedule = async (payload: Parameters<typeof scheduleRecord>[0]) => {
    setSubmitting(true);
    setModalError(null);
    try {
      await scheduleRecord(payload);
      messageApi.success('维保预约成功');
      setScheduleOpen(false);
      setActiveTab('Scheduled');
    } catch (err) {
      setModalError(err instanceof Error ? err.message : '预约失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStart = async (record: MaintenanceRecord) => {
    try {
      await startRecord(record.id);
      messageApi.success(`${plateOf(record.vehicleId)} 已进入维修，车辆状态更新为 Maintenance`);
      const fresh = await vehicleApi.list<Vehicle>();
      setVehicles(fresh);
      setActiveTab('InProgress');
    } catch (err) {
      messageApi.error(err instanceof Error ? err.message : '开始维修失败');
    }
  };

  const handleComplete = async (payload: { actualMileage: number | null; finalCost: number | null }) => {
    if (!completing) return;
    setSubmitting(true);
    setModalError(null);
    try {
      await completeRecord(completing.id, payload);
      messageApi.success('维保已完工，车辆恢复为 Available');
      setCompleting(null);
      const fresh = await vehicleApi.list<Vehicle>();
      setVehicles(fresh);
      setActiveTab('Completed');
    } catch (err) {
      setModalError(err instanceof Error ? err.message : '完工操作失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnsType<MaintenanceRecord> = [
    { title: '车辆', render: (_, r) => <span>{plateOf(r.vehicleId)} <Tag>{vehicleMap.get(r.vehicleId)?.type ?? '—'}</Tag></span> },
    { title: '类型', dataIndex: 'type', render: (value: string) => MAINTENANCE_TYPE_LABEL[value] ?? value },
    { title: '预约日期', dataIndex: 'date' },
    { title: '维修厂', dataIndex: 'vendor' },
    { title: '维修项目', render: (_, r) => r.items.join('、') },
    {
      title: '预估费用',
      dataIndex: 'cost',
      render: (cost: number) => `¥ ${cost.toLocaleString()}`
    },
    {
      title: '实际里程',
      dataIndex: 'actualMileage',
      render: (value: number | null) => (value == null ? '—' : `${value.toLocaleString()} km`)
    },
    {
      title: '最终费用',
      dataIndex: 'finalCost',
      render: (value: number | null) => (value == null ? '—' : `¥ ${value.toLocaleString()}`)
    },
    { title: '状态', render: (_, r) => <StatusBadge status={r.status} /> },
    {
      title: '操作',
      key: 'action',
      render: (_, r) => (
        <Space>
          {canStart(r) && (
            <Popconfirm
              title="开始维修"
              description="开始后车辆状态将变为 Maintenance，调度中心将无法选择该车辆"
              okText="开始"
              cancelText="取消"
              onConfirm={() => handleStart(r)}
            >
              <Button type="primary" size="small">开始维修</Button>
            </Popconfirm>
          )}
          {canComplete(r) && (
            <Button type="primary" size="small" onClick={() => { setModalError(null); setCompleting(r); }}>完工收尾</Button>
          )}
          {r.status === MaintenanceStatus.Completed && <span style={{ color: '#9a9385' }}>已归档</span>}
        </Space>
      )
    }
  ];

  const tabCount = (status: MaintenanceStatus) => records.filter((r) => r.status === status).length;

  return (
    <PageShell title="维保管理">
      {contextHolder}
      <Space style={{ marginBottom: 16 }} size="large">
        <Statistic title="待处理" value={tabCount(MaintenanceStatus.Scheduled)} />
        <Statistic title="进行中" value={tabCount(MaintenanceStatus.InProgress)} />
        <Statistic title="已完工费用合计" value={totalCost} precision={0} prefix="¥" />
        <Button type="primary" onClick={() => { setModalError(null); setScheduleOpen(true); }}>预约维保</Button>
      </Space>

      <Card title="维保日历（已预约）" style={{ marginBottom: 16 }}>
        {upcoming.length === 0
          ? <EmptyState />
          : <div className="grid grid-3">
              {upcoming.map((record) => (
                <CalendarCell key={record.id} date={record.date} title={`${plateOf(record.vehicleId)} · ${record.vendor}`} />
              ))}
            </div>}
      </Card>

      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as TabKey)}
          items={[
            { key: 'Scheduled', label: `待处理（${tabCount(MaintenanceStatus.Scheduled)}）` },
            { key: 'InProgress', label: `进行中（${tabCount(MaintenanceStatus.InProgress)}）` },
            { key: 'Active', label: '待处理 + 进行中' },
            { key: 'Completed', label: `已完工（${tabCount(MaintenanceStatus.Completed)}）` },
            { key: 'All', label: '全部' }
          ]}
        />
        <Table
          rowKey="id"
          loading={loading}
          dataSource={filteredRecords}
          columns={columns}
          pagination={false}
          locale={{ emptyText: <EmptyState /> }}
        />
      </Card>

      <ScheduleModal
        open={scheduleOpen}
        vehicles={vehicles}
        records={records}
        submitting={submitting}
        error={modalError}
        onSubmit={handleSchedule}
        onClose={() => setScheduleOpen(false)}
      />
      <CompleteModal
        open={completing !== null}
        record={completing}
        vehicleMileage={completing ? vehicleMap.get(completing.vehicleId)?.mileage ?? 0 : 0}
        submitting={submitting}
        error={modalError}
        onSubmit={handleComplete}
        onClose={() => setCompleting(null)}
      />
    </PageShell>
  );
}
