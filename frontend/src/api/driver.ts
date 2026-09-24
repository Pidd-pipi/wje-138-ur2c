import { request } from '../utils/request';
import { apiPaths } from '../constants/apiPaths';
import type { Driver } from '../types';

export const driverApi = {
  list: (params?: { status?: string }) => {
    const suffix = params?.status ? `?status=${encodeURIComponent(params.status)}` : '';
    return request<Driver[]>(`${apiPaths.drivers}${suffix}`);
  }
};
