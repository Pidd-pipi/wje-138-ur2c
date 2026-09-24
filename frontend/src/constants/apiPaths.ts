export const apiPaths = {
  vehicles: '/api/vehicles/',
  drivers: '/api/drivers/',
  dispatch: '/api/dispatch-orders/',
  maintenance: '/api/maintenance-records/',
  maintenanceStart: (id: number) => `/api/maintenance-records/${id}/start/`,
  maintenanceComplete: (id: number) => `/api/maintenance-records/${id}/complete/`,
  fuel: '/api/fuel-records/'
} as const;
