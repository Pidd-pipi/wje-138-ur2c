import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Form, Input, InputNumber, Modal, Select, Table, Tabs, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { dispatchApi } from '../api/dispatch';
import { driverApi } from '../api/driver';
import { vehicleApi } from '../api/vehicle';
import { DispatchStatus } from '../types/enums';
import type { DispatchOrder, Driver, Vehicle } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { Timeline } from '../components/common/Timeline';
import { EmptyState } from '../components/common/EmptyState';
import { PageShell } from './PageShell';

type TabKey = DispatchStatus | 'All';

export function DispatchCenter() {
  const [orders, setOrders] = useState<DispatchOrder[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('All');
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  const loadOrders = () => dispatchApi.list().then(setOrders).catch(() => setOrders([]));
  const loadVehicles = () => vehicleApi.list<Vehicle>().then(setVehicles).catch(() => setVehicles([]));

  useEffect(() => {
    loadOrders();
    // 调度中心只能选择 Available 车辆（Maintenance/OnTrip/Retired 由后端过滤）
    vehicleApi.list<Vehicle>(true).then(setVehicles).catch(() => setVehicles([]));
    driverApi.list<Driver>().then(setDrivers).catch(() => setDrivers([]));
  }, []);

  const vehicleMap = useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles]);
  const driverMap = useMemo(() => new Map(drivers.map((d) => [d.id, d])), [drivers]);

  const shownOrders = useMemo(
    () => (activeTab === 'All' ? orders : orders.filter((order) => order.status === activeTab)),
    [orders, activeTab]
  );

  const handleCreate = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    setCreateError(null);
    try {
      await dispatchApi.create({
        vehicleId: values.vehicleId,
        driverId: values.driverId,
        origin: values.origin,
        destination: values.destination,
        planDepartAt: values.planDepartAt || undefined,
        cargo: values.cargo,
        weight: values.weight ?? 0,
        freight: values.freight ?? 0,
        note: values.note
      });
      messageApi.success('调度单创建成功');
      setCreateOpen(false);
      form.resetFields();
      loadOrders();
      loadVehicles();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : '创建失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnsType<DispatchOrder> = [
    { title: '单号', dataIndex: 'orderNo' },
    { title: '车辆', render: (_, r) => vehicleMap.get(r.vehicleId)?.plateNo ?? `车辆#${r.vehicleId}` },
    { title: '司机', render: (_, r) => driverMap.get(r.driverId)?.name ?? `司机#${r.driverId}` },
    { title: '路线', render: (_, r) => `${r.origin} → ${r.destination}` },
    { title: '货物', dataIndex: 'cargo' },
    { title: '状态', render: (_, r) => <StatusBadge status={r.status} /> }
  ];

  const statusTabs: { key: TabKey; label: string }[] = [
    { key: 'All', label: '全部' },
    { key: DispatchStatus.Pending, label: '待指派' },
    { key: DispatchStatus.Assigned, label: '已指派' },
    { key: DispatchStatus.InProgress, label: '进行中' },
    { key: DispatchStatus.Completed, label: '已完成' },
    { key: DispatchStatus.Cancelled, label: '已取消' }
  ];

  return <PageShell title="调度中心">
    {contextHolder}
    <div className="grid grid-2">
      <Card
        title="调度单"
        extra={<Button type="primary" onClick={() => { setCreateError(null); setCreateOpen(true); }}>创建调度单</Button>}
      >
        <Tabs activeKey={activeTab} onChange={(key) => setActiveTab(key as TabKey)} items={statusTabs} />
        <Table rowKey="id" dataSource={shownOrders} columns={columns} pagination={false} locale={{ emptyText: <EmptyState /> }} />
      </Card>
      <Card title="运输时间线"><Timeline items={['创建调度单', '指派车辆与司机', '开始运输', '完成运输']} /></Card>
    </div>

    <Modal
      title="创建调度单"
      open={createOpen}
      confirmLoading={submitting}
      onOk={handleCreate}
      onCancel={() => setCreateOpen(false)}
      okText="创建"
      cancelText="取消"
      destroyOnClose
    >
      {createError && <Alert type="error" showIcon message={createError} style={{ marginBottom: 12 }} />}
      <Form form={form} layout="vertical">
        <Form.Item name="vehicleId" label="车辆（仅展示 Available 车辆，维保中车辆不可见）" rules={[{ required: true, message: '请选择车辆' }]}>
          <Select
            placeholder={vehicles.length === 0 ? '暂无可调度车辆' : '请选择车辆'}
            options={vehicles.map((v) => ({ value: v.id, label: `${v.plateNo}（${v.brandModel}）` }))}
          />
        </Form.Item>
        <Form.Item name="driverId" label="司机" rules={[{ required: true, message: '请选择司机' }]}>
          <Select options={drivers.map((d) => ({ value: d.id, label: `${d.name}（${d.licenseType}）` }))} placeholder="请选择司机" />
        </Form.Item>
        <Form.Item name="origin" label="出发地" rules={[{ required: true, message: '请填写出发地' }]}><Input /></Form.Item>
        <Form.Item name="destination" label="目的地" rules={[{ required: true, message: '请填写目的地' }]}><Input /></Form.Item>
        <Form.Item name="planDepartAt" label="预计出发时间"><Input placeholder="如：2026-09-25 09:00" /></Form.Item>
        <Form.Item name="cargo" label="货物描述"><Input /></Form.Item>
        <Form.Item name="weight" label="重量（kg）"><InputNumber min={0} precision={0} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="freight" label="运费（元）"><InputNumber min={0} precision={2} style={{ width: '100%' }} /></Form.Item>
      </Form>
    </Modal>
  </PageShell>;
}
