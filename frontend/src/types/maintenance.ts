import { MaintenanceStatus, MaintenanceType } from './enums';

export type MaintenanceRecord = {
  id: number;
  vehicleId: number;
  vehiclePlateNo: string;
  vehicleStatus: string;
  maintenanceType: MaintenanceType;
  type: MaintenanceType;
  items: string[];
  cost: number;
  estimatedCost: number;
  actualMileage: number | null;
  vendor: string;
  date: string;
  nextMileage: number;
  nextDate: string | null;
  status: MaintenanceStatus;
  startedAt: string | null;
  completedAt: string | null;
};

export type ScheduleMaintenancePayload = {
  vehicleId: number;
  maintenanceType: MaintenanceType;
  items?: string[];
  estimatedCost?: number;
  vendor: string;
  date: string;
  nextMileage?: number;
  nextDate?: string | null;
};

export type CompleteMaintenancePayload = {
  actualMileage: number;
  finalCost: number;
};
