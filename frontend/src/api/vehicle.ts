import { request } from '../utils/request';
import { apiPaths } from '../constants/apiPaths';
export const vehicleApi = {
  list: <T>(availableOnly = false) => request<T[]>(`${apiPaths.vehicles}${availableOnly ? '?available=true' : ''}`)
};
