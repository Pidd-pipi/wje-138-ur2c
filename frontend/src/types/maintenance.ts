import { MaintenanceStatus, MaintenanceType } from './enums';
export type MaintenanceRecord = {
  id: number;
  vehicleId: number;
  type: MaintenanceType;
  items: string[];
  cost: number;
  actualMileage: number | null;
  finalCost: number | null;
  vendor: string;
  date: string;
  nextMileage: number;
  nextDate: string | null;
  status: MaintenanceStatus;
};
export type ScheduleMaintenancePayload = {
  vehicleId: number;
  maintenanceType: MaintenanceType;
  items: string[];
  cost: number;
  vendor: string;
  date: string;
  nextMileage?: number | null;
  nextDate?: string | null;
};
export type CompleteMaintenancePayload = {
  actualMileage?: number | null;
  finalCost?: number | null;
};
