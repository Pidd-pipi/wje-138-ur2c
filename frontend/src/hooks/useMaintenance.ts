import { MaintenanceStatus, type MaintenanceRecord } from '../types';

export function useMaintenance() {
  const canStart = (record: MaintenanceRecord) => record.status === MaintenanceStatus.Scheduled;
  const canComplete = (record: MaintenanceRecord) => record.status === MaintenanceStatus.InProgress;
  const isActive = (record: MaintenanceRecord) =>
    record.status === MaintenanceStatus.Scheduled || record.status === MaintenanceStatus.InProgress;
  return { canStart, canComplete, isActive };
}
