import { useState } from 'react';
import { message } from 'antd';
import { useMaintenanceStore } from '../stores/maintenanceStore';
import { ApiError } from '../utils/request';
import type {
  CompleteMaintenancePayload,
  MaintenanceRecord,
  ScheduleMaintenancePayload,
} from '../types';

/**
 * 维保状态流转：预约（Scheduled）→ 开始维修（InProgress）→ 完工（Completed）。
 * 后端会校验车辆是否正在运输 / 同日是否已安排维保，冲突原因经 ApiError.message 透传。
 */
export function useMaintenance() {
  const [loading, setLoading] = useState(false);
  const schedule = useMaintenanceStore((state) => state.schedule);
  const start = useMaintenanceStore((state) => state.start);
  const complete = useMaintenanceStore((state) => state.complete);

  const run = async (
    action: () => Promise<MaintenanceRecord>,
    successText: string
  ): Promise<MaintenanceRecord | undefined> => {
    setLoading(true);
    try {
      const record = await action();
      message.success(successText);
      return record;
    } catch (error) {
      const reason = error instanceof ApiError ? error.message : '操作失败，请稍后重试';
      message.error(reason);
      return undefined;
    } finally {
      setLoading(false);
    }
  };

  const handleSchedule = (payload: ScheduleMaintenancePayload) =>
    run(() => schedule(payload), '维保预约成功');

  const handleStart = (id: number) =>
    run(() => start(id), '已开始维修，车辆状态更新为 Maintenance');

  const handleComplete = (id: number, payload: CompleteMaintenancePayload) =>
    run(() => complete(id, payload), '维保已完工，车辆恢复 Available');

  return { loading, schedule: handleSchedule, start: handleStart, complete: handleComplete };
}
