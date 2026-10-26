import {create} from 'zustand';
import type {ScoringResult} from '../engine/types';
import {loadLastResult, runScoring, saveResult} from '../engine/scoring';
import {isShiftOn, startShift, stopShift} from '../native/ShiftService';

interface AppState {
  result: ScoringResult | null;
  refreshing: boolean;
  shiftOn: boolean;
  init(): Promise<void>;
  refresh(): Promise<void>;
  toggleShift(): Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  result: null,
  refreshing: false,
  shiftOn: false,

  async init() {
    const [cached, shiftOn] = await Promise.all([loadLastResult(), isShiftOn()]);
    set({result: cached, shiftOn});
    if (!cached) {
      await get().refresh();
    }
  },

  async refresh() {
    set({refreshing: true});
    try {
      const result = await runScoring();
      await saveResult(result);
      set({result});
    } catch (e) {
      console.warn('refresh failed', e);
    } finally {
      set({refreshing: false});
    }
  },

  async toggleShift() {
    const on = get().shiftOn;
    if (on) {
      await stopShift();
      set({shiftOn: false});
    } else {
      await startShift();
      set({shiftOn: true});
    }
  },
}));
