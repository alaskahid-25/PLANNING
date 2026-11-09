import { AppSettings, PlanHistoryRecord } from '../types';

const SETTINGS_KEY = 'SPP_SETTINGS_V1';
const HISTORY_KEY = 'SPP_HISTORY_V1';

export const DEFAULT_SETTINGS: AppSettings = {
  stockBasis: 'readyStockForProduction',
  includeGpPending: false,
  defaultProductionUnit: 'BOXES',
  unitConversionFactors: {
    BOXES: 1,
    BOX: 1,
    CASES: 1,
    TINS: 1,
    JARS: 1,
    BOTTLES: 1,
    POUCHES: 1,
    KGS: 1,
    LITRES: 1,
  },
  defaultCurrency: 'INR',
  decimalPrecision: 2,
  criticalLeadTimeThresholdDays: 14,
};

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (err) {
    console.error('Error loading settings from localStorage', err);
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Error saving settings to localStorage', err);
  }
}

export function loadPlanHistory(): PlanHistoryRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error loading history from localStorage', err);
  }
  return [];
}

export function savePlanToHistory(record: PlanHistoryRecord): PlanHistoryRecord[] {
  try {
    const current = loadPlanHistory();
    // Prepend new run
    const updated = [record, ...current.filter((r) => r.id !== record.id)].slice(0, 30);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Error saving plan to history', err);
    return [];
  }
}

export function deleteHistoryItem(id: string): PlanHistoryRecord[] {
  try {
    const current = loadPlanHistory();
    const updated = current.filter((r) => r.id !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Error deleting history item', err);
    return [];
  }
}

export function clearAllHistory(): void {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch (err) {
    console.error('Error clearing history', err);
  }
}
