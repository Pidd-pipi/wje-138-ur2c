import { request } from '../utils/request';
import { apiPaths } from '../constants/apiPaths';
import type { CompleteMaintenancePayload, MaintenanceRecord, ScheduleMaintenancePayload } from '../types';
export const maintenanceApi = {
  list: (activeOnly = false) =>
    request<MaintenanceRecord[]>(`${apiPaths.maintenance}${activeOnly ? '?active=true' : ''}`),
  schedule: (payload: ScheduleMaintenancePayload) =>
    request<MaintenanceRecord>(apiPaths.maintenance, { method: 'POST', body: JSON.stringify(payload) }),
  start: (id: number) =>
    request<MaintenanceRecord>(`${apiPaths.maintenance}${id}/start/`, { method: 'POST' }),
  complete: (id: number, payload: CompleteMaintenancePayload) =>
    request<MaintenanceRecord>(`${apiPaths.maintenance}${id}/complete/`, { method: 'POST', body: JSON.stringify(payload) })
};
