import { useEffect, useMemo, useState } from 'react';
import { Alert, DatePicker, Form, Input, InputNumber, Modal, Select } from 'antd';
import dayjs from 'dayjs';
import { MaintenanceType, type MaintenanceRecord, type ScheduleMaintenancePayload, type Vehicle } from '../../types';
import { vehicleBlockReason } from '../../utils/vehicleAvailability';

const MAINTENANCE_TYPES = [
  { value: MaintenanceType.Routine, label: '常规保养' },
  { value: MaintenanceType.Repair, label: '故障维修' },
  { value: MaintenanceType.Emergency, label: '紧急抢修' },
  { value: MaintenanceType.Inspection, label: '年检检查' }
];

type ScheduleModalProps = {
  open: boolean;
  vehicles: Vehicle[];
  records: MaintenanceRecord[];
  submitting: boolean;
  error: string | null;
  onSubmit: (payload: ScheduleMaintenancePayload) => void;
  onClose: () => void;
};

export function ScheduleModal({ open, vehicles, records, submitting, error, onSubmit, onClose }: ScheduleModalProps) {
  const [form] = Form.useForm();
  const [date, setDate] = useState('');
  const [nextDate, setNextDate] = useState('');

  useEffect(() => {
    if (!open) {
      form.resetFields();
      setDate('');
      setNextDate('');
    }
  }, [open, form]);

  const vehicleOptions = useMemo(
    () =>
      vehicles.map((vehicle) => {
        const reason = vehicleBlockReason(vehicle, date, records);
        return {
          value: vehicle.id,
          disabled: Boolean(reason),
          label: reason
            ? `${vehicle.plateNo}（${vehicle.brandModel}）— ${reason}`
            : `${vehicle.plateNo}（${vehicle.brandModel}）`
        };
      }),
    [vehicles, records, date]
  );

  const resetAndClose = () => {
    form.resetFields();
    setDate('');
    setNextDate('');
    onClose();
  };

  const handleOk = async () => {
    const values = await form.validateFields();
    if (!date) return;
    onSubmit({
      vehicleId: values.vehicleId,
      maintenanceType: values.maintenanceType,
      items: (values.items as string).split(/[、,\n]/).map((item) => item.trim()).filter(Boolean),
      cost: values.cost,
      vendor: values.vendor,
      date,
      nextMileage: values.nextMileage ?? null,
      nextDate: nextDate || null
    });
  };

  return (
    <Modal
      title="预约维保"
      open={open}
      onOk={handleOk}
      confirmLoading={submitting}
      onCancel={resetAndClose}
      okText="提交预约"
      cancelText="取消"
      destroyOnClose
    >
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 12 }} />}
      <Form form={form} layout="vertical" initialValues={{ maintenanceType: MaintenanceType.Routine }}>
        <Form.Item name="vehicleId" label="车辆" rules={[{ required: true, message: '请选择维保车辆' }]}>
          <Select options={vehicleOptions} placeholder="请选择车辆（不可选车辆已标注原因）" />
        </Form.Item>
        <Form.Item label="预约日期" required>
          <DatePicker
            style={{ width: '100%' }}
            format="YYYY-MM-DD"
            value={date ? dayjs(date) : null}
            onChange={(value) => setDate(value ? value.format('YYYY-MM-DD') : '')}
          />
          {!date && <div style={{ color: '#ff4d4f', fontSize: 12, marginTop: 4 }}>请选择预约日期</div>}
        </Form.Item>
        <Form.Item name="maintenanceType" label="维修类型" rules={[{ required: true }]}>
          <Select options={MAINTENANCE_TYPES} />
        </Form.Item>
        <Form.Item name="items" label="维修项目" rules={[{ required: true, message: '请填写维修项目' }]}>
          <Input.TextArea rows={2} placeholder="多个项目用顿号或换行分隔，如：机油、轮胎检查" />
        </Form.Item>
        <Form.Item name="vendor" label="维修厂" rules={[{ required: true, message: '请填写维修厂' }]}>
          <Input placeholder="如：青浦维保站" />
        </Form.Item>
        <Form.Item name="cost" label="预估费用（元）" rules={[{ required: true, message: '请填写预估费用' }]}>
          <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="0.00" />
        </Form.Item>
        <Form.Item name="nextMileage" label="下次保养里程（km）">
          <InputNumber min={0} precision={0} style={{ width: '100%' }} placeholder="可选" />
        </Form.Item>
        <Form.Item label="下次保养日期">
          <DatePicker
            style={{ width: '100%' }}
            format="YYYY-MM-DD"
            value={nextDate ? dayjs(nextDate) : null}
            onChange={(value) => setNextDate(value ? value.format('YYYY-MM-DD') : '')}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}

type CompleteModalProps = {
  open: boolean;
  record: MaintenanceRecord | null;
  vehicleMileage: number;
  submitting: boolean;
  error: string | null;
  onSubmit: (payload: { actualMileage: number | null; finalCost: number | null }) => void;
  onClose: () => void;
};

export function CompleteModal({ open, record, vehicleMileage, submitting, error, onSubmit, onClose }: CompleteModalProps) {
  const [form] = Form.useForm();
  return (
    <Modal
      title="完工收尾"
      open={open}
      confirmLoading={submitting}
      onOk={async () => {
        const values = await form.validateFields();
        onSubmit({
          actualMileage: values.actualMileage ?? null,
          finalCost: values.finalCost ?? null
        });
      }}
      onCancel={onClose}
      okText="确认完工"
      cancelText="取消"
      destroyOnClose
      afterOpenChange={(visible) => {
        if (visible && record) {
          form.setFieldsValue({ actualMileage: vehicleMileage || undefined, finalCost: record.cost || undefined });
        }
        if (!visible) form.resetFields();
      }}
    >
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 12 }} />}
      <p style={{ color: '#716b5f' }}>完工后车辆将恢复为 Available，实际里程与最终费用会保存在这条维保记录中。</p>
      <Form form={form} layout="vertical" preserve={false}>
        <Form.Item name="actualMileage" label="实际里程（km）" rules={[{ required: true, message: '请填写完工时的实际里程' }]}>
          <InputNumber min={0} precision={0} style={{ width: '100%' }} placeholder={`当前累计里程 ${vehicleMileage.toLocaleString()} km`} />
        </Form.Item>
        <Form.Item name="finalCost" label="最终费用（元）" rules={[{ required: true, message: '请填写最终费用' }]}>
          <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder={`预估费用 ${record?.cost ?? 0} 元`} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
