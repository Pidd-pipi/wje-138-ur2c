import { create } from 'zustand';
import { maintenanceApi } from '../api/maintenance';
import type {
  CompleteMaintenancePayload,
  MaintenanceRecord,
  ScheduleMaintenancePayload,
} from '../types';

type MaintenanceState = {
  records: MaintenanceRecord[];
  loading: boolean;
  setRecords: (records: MaintenanceRecord[]) => void;
  fetchRecords: () => Promise<void>;
  schedule: (payload: ScheduleMaintenancePayload) => Promise<MaintenanceRecord>;
  start: (id: number) => Promise<MaintenanceRecord>;
  complete: (id: number, payload: CompleteMaintenancePayload) => Promise<MaintenanceRecord>;
};

const replaceRecord = (records: MaintenanceRecord[], updated: MaintenanceRecord) => {
  const exists = records.some((record) => record.id === updated.id);
  return exists
    ? records.map((record) => (record.id === updated.id ? updated : record))
    : [updated, ...records];
};

export const useMaintenanceStore = create<MaintenanceState>((set) => ({
  records: [],
  loading: false,
  setRecords: (records) => set({ records }),
  fetchRecords: async () => {
    set({ loading: true });
    try {
      const records = await maintenanceApi.list();
      set({ records });
    } finally {
      set({ loading: false });
    }
  },
  schedule: async (payload) => {
    const record = await maintenanceApi.schedule(payload);
    set((state) => ({ records: [record, ...state.records] }));
    return record;
  },
  start: async (id) => {
    const record = await maintenanceApi.start(id);
    set((state) => ({ records: replaceRecord(state.records, record) }));
    return record;
  },
  complete: async (id, payload) => {
    const record = await maintenanceApi.complete(id, payload);
    set((state) => ({ records: replaceRecord(state.records, record) }));
    return record;
  },
}));
