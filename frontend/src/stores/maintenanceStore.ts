import { create } from 'zustand';
import { maintenanceApi } from '../api/maintenance';
import type { CompleteMaintenancePayload, MaintenanceRecord, ScheduleMaintenancePayload } from '../types';

type MaintenanceState = {
  records: MaintenanceRecord[];
  loading: boolean;
  fetchRecords: (activeOnly?: boolean) => Promise<void>;
  scheduleRecord: (payload: ScheduleMaintenancePayload) => Promise<MaintenanceRecord>;
  startRecord: (id: number) => Promise<MaintenanceRecord>;
  completeRecord: (id: number, payload: CompleteMaintenancePayload) => Promise<MaintenanceRecord>;
  upsertRecord: (record: MaintenanceRecord) => void;
};

export const useMaintenanceStore = create<MaintenanceState>((set, get) => ({
  records: [],
  loading: false,
  fetchRecords: async (activeOnly = false) => {
    set({ loading: true });
    try {
      const records = await maintenanceApi.list(activeOnly);
      set({ records });
    } finally {
      set({ loading: false });
    }
  },
  upsertRecord: (record) => {
    const exists = get().records.some((item) => item.id === record.id);
    set(({ records }) => ({
      records: exists ? records.map((item) => (item.id === record.id ? record : item)) : [record, ...records]
    }));
  },
  scheduleRecord: async (payload) => {
    const record = await maintenanceApi.schedule(payload);
    get().upsertRecord(record);
    return record;
  },
  startRecord: async (id) => {
    const record = await maintenanceApi.start(id);
    get().upsertRecord(record);
    return record;
  },
  completeRecord: async (id, payload) => {
    const record = await maintenanceApi.complete(id, payload);
    get().upsertRecord(record);
    return record;
  }
}));
