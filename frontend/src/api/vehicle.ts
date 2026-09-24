import { request } from '../utils/request';
import { apiPaths } from '../constants/apiPaths';
import type { Vehicle } from '../types';

export const vehicleApi = {
  list: (params?: { status?: string }) => {
    const suffix = params?.status ? `?status=${encodeURIComponent(params.status)}` : '';
    return request<Vehicle[]>(`${apiPaths.vehicles}${suffix}`);
  }
};
