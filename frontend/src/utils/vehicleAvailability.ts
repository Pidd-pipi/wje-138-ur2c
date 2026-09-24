import { MaintenanceStatus, VehicleStatus } from '../types/enums';
import type { MaintenanceRecord, Vehicle } from '../types';

const VEHICLE_BLOCK_REASONS: Record<string, string> = {
  [VehicleStatus.Maintenance]: '车辆正在维修保养，暂不可预约',
  [VehicleStatus.OnTrip]: '车辆正在运输中，暂不可预约',
  [VehicleStatus.Retired]: '车辆已报废'
};

/** 预约维保时，车辆下拉中不可选项的原因（返回空串表示可选）。 */
export function vehicleBlockReason(
  vehicle: Vehicle,
  date: string,
  records: MaintenanceRecord[],
  excludeId?: number
): string {
  const statusReason = VEHICLE_BLOCK_REASONS[vehicle.status];
  if (statusReason) return statusReason;
  if (!date) return '';
  const conflict = records.find(
    (record) =>
      record.id !== excludeId &&
      record.vehicleId === vehicle.id &&
      record.date === date &&
      (record.status === MaintenanceStatus.Scheduled || record.status === MaintenanceStatus.InProgress)
  );
  return conflict ? `${date} 已安排「${conflict.vendor}」维保` : '';
}
