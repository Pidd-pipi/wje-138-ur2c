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
  Tag,
  type TableProps,
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { vehicleApi } from '../api/vehicle';
import { useMaintenance } from '../hooks/useMaintenance';
import { useMaintenanceStore } from '../stores/maintenanceStore';
import type {
  CompleteMaintenancePayload,
  MaintenanceRecord,
  ScheduleMaintenancePayload,
  Vehicle,
} from '../types';
import { MaintenanceStatus, MaintenanceType, VehicleStatus } from '../types';
import { CalendarCell } from '../components/common/CalendarCell';
import { EmptyState } from '../components/common/EmptyState';
import { StatusBadge } from '../components/common/StatusBadge';
import { PageShell } from './PageShell';

const MAINTENANCE_TYPE_LABELS: Record<MaintenanceType, string> = {
  [MaintenanceType.Routine]: '常规保养',
  [MaintenanceType.Repair]: '故障维修',
  [MaintenanceType.Emergency]: '紧急维修',
  [MaintenanceType.Inspection]: '年检',
};

const VEHICLE_STATUS_LABELS: Record<string, string> = {
  [VehicleStatus.Available]: '可用',
  [VehicleStatus.OnTrip]: '运输中',
  [VehicleStatus.Maintenance]: '维保中',
  [VehicleStatus.Retired]: '已报废',
};

type ScheduleFormValues = {
  vehicleId: number;
  maintenanceType: MaintenanceType;
  date: Dayjs;
  vendor: string;
  estimatedCost?: number;
  items?: string[];
  nextMileage?: number;
  nextDate?: Dayjs | null;
};

type CompleteFormValues = {
  actualMileage: number;
  finalCost: number;
};

export function MaintenanceManage() {
  const records = useMaintenanceStore((state) => state.records);
  const fetchRecords = useMaintenanceStore((state) => state.fetchRecords);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [activeTab, setActiveTab] = useState<string>(MaintenanceStatus.Scheduled);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [completing, setCompleting] = useState<MaintenanceRecord | null>(null);
  const [scheduleForm] = Form.useForm<ScheduleFormValues>();
  const [completeForm] = Form.useForm<CompleteFormValues>();

  const refresh = useCallback(async () => {
    await Promise.all([
      fetchRecords().catch(() => undefined),
      vehicleApi.list().then(setVehicles).catch(() => setVehicles([])),
    ]);
  }, [fetchRecords]);

  useEffect(() => { refresh(); }, [refresh]);

  const { loading, schedule, start, complete } = useMaintenance();

  const vehicleName = useCallback((id: number) => {
    const vehicle = vehicles.find((item) => item.id === id);
    return vehicle ? `${vehicle.plateNo} · ${vehicle.brandModel}` : `车辆#${id}`;
  }, [vehicles]);

  const filteredRecords = useMemo(() => {
    if (activeTab === 'all') return records;
    return records.filter((record) => record.status === activeTab);
  }, [activeTab, records]);

  // 待处理任务按日期升序，便于日历提示
  const upcoming = useMemo(() => records
    .filter((record) => record.status === MaintenanceStatus.Scheduled)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6), [records]);

  const openComplete = (record: MaintenanceRecord) => {
    setCompleting(record);
    const vehicle = vehicles.find((item) => item.id === record.vehicleId);
    completeForm.setFieldsValue({
      actualMileage: vehicle?.mileage ?? 0,
      finalCost: record.estimatedCost ?? record.cost ?? 0,
    });
  };

  const handleSchedule = async () => {
    const values = await scheduleForm.validateFields();
    const payload: ScheduleMaintenancePayload = {
      vehicleId: values.vehicleId,
      maintenanceType: values.maintenanceType,
      date: values.date.format('YYYY-MM-DD'),
      vendor: values.vendor,
      estimatedCost: values.estimatedCost ?? 0,
      items: values.items ?? [],
      nextMileage: values.nextMileage ?? 0,
      nextDate: values.nextDate ? values.nextDate.format('YYYY-MM-DD') : null,
    };
    const record = await schedule(payload);
    if (record) {
      setScheduleOpen(false);
      scheduleForm.resetFields();
    }
  };

  const handleStart = async (record: MaintenanceRecord) => {
    const updated = await start(record.id);
    if (updated) setActiveTab(MaintenanceStatus.InProgress);
  };

  const handleComplete = async () => {
    if (!completing) return;
    const values = await completeForm.validateFields();
    const payload: CompleteMaintenancePayload = {
      actualMileage: values.actualMileage,
      finalCost: values.finalCost,
    };
    const updated = await complete(completing.id, payload);
    if (updated) {
      setCompleting(null);
      completeForm.resetFields();
      setActiveTab(MaintenanceStatus.Completed);
    }
  };

  const columns: TableProps<MaintenanceRecord>['columns'] = [
    { title: '车辆', render: (_, record) => (
      <Space direction="vertical" size={0}>
        <strong>{record.vehiclePlateNo || vehicleName(record.vehicleId)}</strong>
        <Tag>{VEHICLE_STATUS_LABELS[record.vehicleStatus] ?? record.vehicleStatus}</Tag>
      </Space>
    ) },
    { title: '类型', render: (_, record) => MAINTENANCE_TYPE_LABELS[record.maintenanceType] ?? record.maintenanceType },
    { title: '维修日期', dataIndex: 'date' },
    { title: '维修厂', dataIndex: 'vendor' },
    { title: '维修项目', render: (_, record) => record.items.join('、') || '—' },
    { title: '预估费用', render: (_, record) => `¥${(record.estimatedCost ?? 0).toLocaleString()}` },
    { title: '最终费用', render: (_, record) =>
      record.status === MaintenanceStatus.Completed ? `¥${record.cost.toLocaleString()}` : '—' },
    { title: '实际里程', render: (_, record) =>
      record.actualMileage != null ? `${record.actualMileage.toLocaleString()} km` : '—' },
    { title: '状态', render: (_, record) => <StatusBadge status={record.status} /> },
    { title: '操作', key: 'action', render: (_, record) => {
      if (record.status === MaintenanceStatus.Scheduled) {
        return <Button type="primary" size="small" loading={loading} onClick={() => handleStart(record)}>开始维修</Button>;
      }
      if (record.status === MaintenanceStatus.InProgress) {
        return <Button type="primary" size="small" loading={loading} onClick={() => openComplete(record)}>登记完工</Button>;
      }
      return <Tag color="default">已归档</Tag>;
    } },
  ];

  const vehicleOptions = vehicles.map((vehicle) => ({
    value: vehicle.id,
    label: `${vehicle.plateNo} · ${vehicle.brandModel}`,
    disabled: vehicle.status !== VehicleStatus.Available,
    reason: vehicle.status !== VehicleStatus.Available
      ? `（${VEHICLE_STATUS_LABELS[vehicle.status] ?? vehicle.status}，不可预约）`
      : '',
  }));

  return <PageShell title="维保管理">
    <Card title="待处理维保日历" size="small" style={{ marginBottom: 16 }}>
      {upcoming.length === 0 ? <EmptyState /> : (
        <Row gutter={[12, 12]}>
          {upcoming.map((record) => <Col key={record.id} xs={24} sm={12} md={8} lg={4}>
            <CalendarCell date={record.date} title={`${record.vehiclePlateNo} · ${record.vendor}`} />
          </Col>)}
        </Row>
      )}
    </Card>

    <Card
      title="维保任务"
      extra={<Button type="primary" onClick={() => setScheduleOpen(true)}>预约维保</Button>}
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          { key: MaintenanceStatus.Scheduled, label: `待处理（${records.filter((r) => r.status === MaintenanceStatus.Scheduled).length}）` },
          { key: MaintenanceStatus.InProgress, label: `进行中（${records.filter((r) => r.status === MaintenanceStatus.InProgress).length}）` },
          { key: MaintenanceStatus.Completed, label: `已完工（${records.filter((r) => r.status === MaintenanceStatus.Completed).length}）` },
          { key: 'all', label: '全部' },
        ]}
      />
      {filteredRecords.length === 0 ? <EmptyState /> : (
        <Table
          rowKey="id"
          dataSource={filteredRecords}
          columns={columns}
          pagination={false}
          scroll={{ x: 1080 }}
        />
      )}
    </Card>

    <Modal
      title="预约维保"
      open={scheduleOpen}
      onCancel={() => setScheduleOpen(false)}
      onOk={handleSchedule}
      confirmLoading={loading}
      okText="提交预约"
      cancelText="取消"
      destroyOnClose
    >
      <Form form={scheduleForm} layout="vertical" initialValues={{
        maintenanceType: MaintenanceType.Routine,
        date: dayjs(),
        items: [],
      }}>
        <Form.Item
          name="vehicleId"
          label="车辆"
          rules={[{ required: true, message: '请选择车辆' }]}
          tooltip="运输中、维保中或已报废的车辆不可预约，具体原因可在提交后的提示中查看"
        >
          <Select
            placeholder="请选择车辆（仅可用车辆可预约）"
            options={vehicleOptions}
            optionRender={(option) => (
              <span>{option.label}<span style={{ color: '#999' }}>{(option.data as { reason?: string }).reason ?? ''}</span></span>
            )}
          />
        </Form.Item>
        <Form.Item name="maintenanceType" label="维修类型" rules={[{ required: true }]}>
          <Select options={Object.entries(MAINTENANCE_TYPE_LABELS).map(([value, label]) => ({ value, label }))} />
        </Form.Item>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="date" label="维修日期" rules={[{ required: true, message: '请选择维修日期' }]}>
              <DatePicker style={{ width: '100%' }} allowClear={false} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="vendor" label="维修厂" rules={[{ required: true, message: '请填写维修厂' }]}>
              <Input placeholder="如：青浦维保站" />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="items" label="维修项目">
          <Select mode="tags" placeholder="输入项目后回车，如：机油、刹车片" tokenSeparators={[',', '，']} />
        </Form.Item>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="estimatedCost" label="预估费用（元）">
              <InputNumber min={0} precision={2} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="nextMileage" label="下次保养里程（km）">
              <InputNumber min={0} precision={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="nextDate" label="下次保养日期">
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
      </Form>
    </Modal>

    <Modal
      title={completing ? `登记完工 - ${completing.vehiclePlateNo}` : '登记完工'}
      open={completing !== null}
      onCancel={() => setCompleting(null)}
      onOk={handleComplete}
      confirmLoading={loading}
      okText="确认完工"
      cancelText="取消"
      destroyOnClose
    >
      <Form form={completeForm} layout="vertical">
        <Form.Item
          name="actualMileage"
          label="实际里程（km）"
          rules={[{ required: true, message: '请填写完工时的实际里程' }]}
        >
          <InputNumber min={0} precision={0} style={{ width: '100%' }} placeholder="完工时车辆表显里程" />
        </Form.Item>
        <Form.Item
          name="finalCost"
          label="最终费用（元）"
          rules={[{ required: true, message: '请填写最终费用' }]}
        >
          <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="本次维保实际产生的费用" />
        </Form.Item>
      </Form>
    </Modal>
  </PageShell>;
}
