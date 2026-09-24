import { request } from '../utils/request';
import { apiPaths } from '../constants/apiPaths';
import type {
  CompleteMaintenancePayload,
  MaintenanceRecord,
  ScheduleMaintenancePayload,
} from '../types';

export const maintenanceApi = {
  list: (params?: { status?: string; vehicleId?: number }) => {
    const search = new URLSearchParams();
    if (params?.status) search.set('status', params.status);
    if (params?.vehicleId) search.set('vehicleId', String(params.vehicleId));
    const suffix = search.toString() ? `?${search.toString()}` : '';
    return request<MaintenanceRecord[]>(`${apiPaths.maintenance}${suffix}`);
  },
  schedule: (payload: ScheduleMaintenancePayload) =>
    request<MaintenanceRecord>(apiPaths.maintenance, {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  start: (id: number) =>
    request<MaintenanceRecord>(apiPaths.maintenanceStart(id), { method: 'POST' }),
  complete: (id: number, payload: CompleteMaintenancePayload) =>
    request<MaintenanceRecord>(apiPaths.maintenanceComplete(id), {
      method: 'POST',
      body: JSON.stringify(payload)
    })
};
