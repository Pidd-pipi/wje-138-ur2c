import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tabs,
  message,
  type TableProps,
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { dispatchApi } from '../api/dispatch';
import { driverApi } from '../api/driver';
import { vehicleApi } from '../api/vehicle';
import { ApiError } from '../utils/request';
import type { DispatchOrder, Driver, Vehicle } from '../types';
import { DispatchStatus, DriverStatus, VehicleStatus } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { Timeline } from '../components/common/Timeline';
import { EmptyState } from '../components/common/EmptyState';
import { PageShell } from './PageShell';

type CreateFormValues = {
  vehicleId: number;
  driverId: number;
  origin: string;
  destination: string;
  planDepartAt: Dayjs;
  cargo: string;
  weight: number;
  freight: number;
  note?: string;
};

const TAB_ITEMS = [
  DispatchStatus.Pending,
  DispatchStatus.Assigned,
  DispatchStatus.InProgress,
  DispatchStatus.Completed,
  DispatchStatus.Cancelled,
  'all',
];

export function DispatchCenter() {
  const [orders, setOrders] = useState<DispatchOrder[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [activeTab, setActiveTab] = useState<string>(DispatchStatus.Pending);
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<CreateFormValues>();

  const refresh = useCallback(async () => {
    const [orderList, vehicleList, driverList] = await Promise.all([
      dispatchApi.list().catch(() => [] as DispatchOrder[]),
      vehicleApi.list().catch(() => [] as Vehicle[]),
      driverApi.list().catch(() => [] as Driver[]),
    ]);
    setOrders(orderList);
    setVehicles(vehicleList);
    setDrivers(driverList);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // 调度中心只能选择 Available 的车辆；Maintenance / OnTrip / Retired 的车辆不会出现在下拉中
  const selectableVehicles = useMemo(
    () => vehicles.filter((vehicle) => vehicle.status === VehicleStatus.Available),
    [vehicles]
  );
  const selectableDrivers = useMemo(
    () => drivers.filter((driver) => driver.status === DriverStatus.Available),
    [drivers]
  );

  const filteredOrders = useMemo(() => {
    if (activeTab === 'all') return orders;
    return orders.filter((order) => order.status === activeTab);
  }, [activeTab, orders]);

  const vehicleLabel = useCallback((id?: number) => {
    const vehicle = vehicles.find((item) => item.id === id);
    return vehicle ? `${vehicle.plateNo} · ${vehicle.brandModel}` : `车辆#${id ?? '-'}`;
  }, [vehicles]);

  const driverLabel = useCallback((id?: number) => {
    const driver = drivers.find((item) => item.id === id);
    return driver ? driver.name : `司机#${id ?? '-'}`;
  }, [drivers]);

  const handleCreate = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      await dispatchApi.create({
        vehicleId: values.vehicleId,
        driverId: values.driverId,
        origin: values.origin,
        destination: values.destination,
        planDepartAt: values.planDepartAt.format('YYYY-MM-DD HH:mm'),
        cargo: values.cargo,
        weight: values.weight,
        freight: values.freight,
        note: values.note ?? '',
        status: DispatchStatus.Pending,
      });
      message.success('调度单已创建');
      setCreateOpen(false);
      form.resetFields();
      await refresh();
      setActiveTab(DispatchStatus.Pending);
    } catch (error) {
      if (error instanceof ApiError) message.error(error.message);
      else if (!(error as { errorFields?: unknown }).errorFields) message.error('创建调度单失败');
    } finally {
      setSubmitting(false);
    }
  };

  const countOf = (status: string) =>
    status === 'all' ? orders.length : orders.filter((order) => order.status === status).length;

  const columns: TableProps<DispatchOrder>['columns'] = [
    { title: '单号', dataIndex: 'orderNo' },
    { title: '车辆', render: (_, order) => (
      <Space direction="vertical" size={0}>
        <span>{vehicleLabel(order.vehicleId)}</span>
        {order.vehicleId ? <StatusBadge status={vehicles.find((v) => v.id === order.vehicleId)?.status ?? ''} /> : null}
      </Space>
    ) },
    { title: '司机', render: (_, order) => driverLabel(order.driverId) },
    { title: '路线', render: (_, order) => `${order.origin} → ${order.destination}` },
    { title: '计划出发', dataIndex: 'planDepartAt' },
    { title: '状态', render: (_, order) => <StatusBadge status={order.status} /> },
  ];

  return <PageShell title="调度中心">
    <div className="grid grid-2">
      <Card
        title="调度单"
        extra={<Button type="primary" onClick={() => setCreateOpen(true)}>创建调度单</Button>}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={TAB_ITEMS.map((status) => ({
            key: status,
            label: status === 'all' ? `全部（${countOf('all')}）` : `${status}（${countOf(status)}）`,
          }))}
        />
        {filteredOrders.length === 0 ? <EmptyState /> : (
          <Table rowKey="id" dataSource={filteredOrders} columns={columns} pagination={false} scroll={{ x: 900 }} />
        )}
      </Card>
      <Card title="运输时间线">
        <Timeline items={['创建调度单', '指派车辆与司机', '开始运输', '完成运输']} />
      </Card>
    </div>

    <Modal
      title="创建调度单"
      open={createOpen}
      onCancel={() => setCreateOpen(false)}
      onOk={handleCreate}
      confirmLoading={submitting}
      okText="创建"
      cancelText="取消"
      destroyOnClose
    >
      <Form form={form} layout="vertical" initialValues={{
        planDepartAt: dayjs(),
        weight: 0,
        freight: 0,
      }}>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="vehicleId" label="车辆" rules={[{ required: true, message: '请选择车辆' }]}>
              <Select
                placeholder={selectableVehicles.length ? '仅可选择可用（Available）车辆' : '当前没有可用车辆'}
                options={selectableVehicles.map((vehicle) => ({
                  value: vehicle.id,
                  label: `${vehicle.plateNo} · ${vehicle.brandModel}`,
                }))}
                notFoundContent="没有可用车辆（维保中 / 运输中 / 已报废的车辆不可选）"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="driverId" label="司机" rules={[{ required: true, message: '请选择司机' }]}>
              <Select
                placeholder="仅可选择可用司机"
                options={selectableDrivers.map((driver) => ({ value: driver.id, label: driver.name }))}
                notFoundContent="没有可用司机"
              />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="origin" label="出发地" rules={[{ required: true, message: '请填写出发地' }]}>
              <Input placeholder="如：上海青浦仓" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="destination" label="目的地" rules={[{ required: true, message: '请填写目的地' }]}>
              <Input placeholder="如：杭州萧山仓" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="planDepartAt" label="预计出发时间" rules={[{ required: true, message: '请选择出发时间' }]}>
              <DatePicker showTime style={{ width: '100%' }} allowClear={false} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="cargo" label="货物描述" rules={[{ required: true, message: '请填写货物描述' }]}>
              <Input placeholder="如：冷链食品" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="weight" label="重量（kg）">
              <InputNumber min={0} precision={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="freight" label="运费（元）">
              <InputNumber min={0} precision={2} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="note" label="备注">
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  </PageShell>;
}
