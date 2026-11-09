import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  BOMItem,
  StoreStockItem,
  ProductionPlanItem,
  MaterialPriceItem,
  AppSettings,
} from '../../types';
import {
  CalendarRange,
  Calendar,
  Filter,
  Search,
  Download,
  AlertTriangle,
  CheckCircle2,
  Layers,
  ArrowRight,
  Boxes,
  Clock,
  Info,
  X,
  TrendingDown,
  Warehouse,
  ChevronRight,
  ChevronDown,
  Sparkles,
  ListFilter,
  CheckSquare,
  Square,
  DollarSign,
  BarChart3,
  Table as TableIcon,
  GitCommit,
  Check,
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface CustomSchedulePlannerViewProps {
  bomItems: BOMItem[];
  storeStockItems: StoreStockItem[];
  productionPlanItems: ProductionPlanItem[];
  priceItems: MaterialPriceItem[];
  settings: AppSettings;
  isCalculated: boolean;
  onGoToUpload: () => void;
  onOpenCheckModal: () => void;
}

export interface ContributingSkuDetail {
  sku: string;
  skuName: string;
  date: string;
  plannedQty: number;
  productionUnit: string;
  norm: number;
  requiredQty: number;
}

export interface CustomMaterialSimulationItem {
  sNo: number;
  rmCode: string;
  rmDesc: string;
  uom: string;
  currentStoreStock: number;
  priorDaysConsumed: number;
  priorDaysContributingSkus: ContributingSkuDetail[];
  priorDeficit: number;
  effectiveOpeningStockForWindow: number;
  windowGrossRequirement: number;
  windowContributingSkus: ContributingSkuDetail[];
  windowNetShortage: number;
  windowClosingBalance: number;
  stockStatus: 'SUFFICIENT' | 'SHORTAGE' | 'DEPLETED_BY_PRIOR' | 'NOT_IN_STORE';
  rate?: number;
  currency?: string;
  shortageCost?: number;
  isSharedWithPriorDays: boolean;
}

// Robust date comparison helper supporting DD-MM-YYYY, YYYY-MM-DD, or ISO strings
function parseDateForCompare(dStr: string): number {
  if (!dStr) return 0;
  const str = dStr.trim();
  const ymd = str.match(/^(\d{4})[-/\.](\d{1,2})[-/\.](\d{1,2})$/);
  if (ymd) {
    return new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3])).getTime();
  }
  const dmy = str.match(/^(\d{1,2})[-/\.](\d{1,2})[-/\.](\d{4})$/);
  if (dmy) {
    return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1])).getTime();
  }
  const t = new Date(str).getTime();
  return isNaN(t) ? 0 : t;
}

function compareDates(a: string, b: string): number {
  return parseDateForCompare(a) - parseDateForCompare(b);
}

function formatDisplayDate(dStr: string): string {
  if (!dStr) return '-';
  const str = dStr.trim();
  const ymd = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymd) {
    return `${ymd[3]}-${ymd[2]}-${ymd[1]}`;
  }
  return str;
}

export const CustomSchedulePlannerView: React.FC<CustomSchedulePlannerViewProps> = ({
  bomItems,
  storeStockItems,
  productionPlanItems,
  priceItems,
  settings,
  isCalculated,
  onGoToUpload,
  onOpenCheckModal,
}) => {
  // 1. Extract all unique production dates from plan
  const allPlanDates = useMemo(() => {
    const datesSet = new Set<string>();
    productionPlanItems.forEach((p) => {
      if (p.date && p.date.trim()) {
        datesSet.add(p.date.trim());
      }
    });
    return Array.from(datesSet).sort(compareDates);
  }, [productionPlanItems]);

  // 2. Extract unique SKUs in plan
  const allPlanSkus = useMemo(() => {
    const map = new Map<string, { sku: string; skuName: string; totalQty: number; dates: Set<string> }>();
    productionPlanItems.forEach((p) => {
      if (!p.sku) return;
      const existing = map.get(p.sku);
      if (existing) {
        existing.totalQty += p.plannedQuantity;
        if (p.date) existing.dates.add(p.date);
        if (p.skuName && !existing.skuName) existing.skuName = p.skuName;
      } else {
        map.set(p.sku, {
          sku: p.sku,
          skuName: p.skuName || p.sku,
          totalQty: p.plannedQuantity,
          dates: new Set(p.date ? [p.date] : []),
        });
      }
    });
    return Array.from(map.values()).map((v) => ({
      ...v,
      dates: Array.from(v.dates).sort(compareDates),
    }));
  }, [productionPlanItems]);

  // Date Selection States (defaults to full range or 2nd date if multiple exist)
  const [startDate, setStartDate] = useState<string>(() => {
    if (allPlanDates.length >= 2) return allPlanDates[1]; // e.g. 10th Nov if 9th, 10th, 11th exist
    return allPlanDates[0] || '';
  });

  const [endDate, setEndDate] = useState<string>(() => {
    if (allPlanDates.length >= 1) return allPlanDates[allPlanDates.length - 1];
    return '';
  });

  // Selected SKUs Filter (default: all SKUs selected)
  const [selectedSkus, setSelectedSkus] = useState<Set<string>>(() => {
    return new Set(allPlanSkus.map((s) => s.sku));
  });

  // Toggles, Filters, and Modern View Modes
  const [deductAllPriorDays, setDeductAllPriorDays] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedMaterialForTrace, setSelectedMaterialForTrace] = useState<CustomMaterialSimulationItem | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'waterfall'>('table');
  const [skuSearchQuery, setSkuSearchQuery] = useState<string>('');
  const [isSkuDropdownOpen, setIsSkuDropdownOpen] = useState<boolean>(false);
  const [traceTab, setTraceTab] = useState<'flow' | 'prior' | 'window'>('flow');

  const skuDropdownRef = useRef<HTMLDivElement>(null);

  // Close SKU popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (skuDropdownRef.current && !skuDropdownRef.current.contains(event.target as Node)) {
        setIsSkuDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync dates when new production plan loads
  useEffect(() => {
    if (allPlanDates.length > 0) {
      if (!startDate || !allPlanDates.includes(startDate)) {
        if (allPlanDates.length >= 2) {
          setStartDate(allPlanDates[1]);
        } else {
          setStartDate(allPlanDates[0]);
        }
      }
      if (!endDate || !allPlanDates.includes(endDate)) {
        setEndDate(allPlanDates[allPlanDates.length - 1]);
      }
    }
  }, [allPlanDates]);

  // Sync selected SKUs when new SKUs load
  useEffect(() => {
    if (allPlanSkus.length > 0) {
      setSelectedSkus(new Set(allPlanSkus.map((s) => s.sku)));
    }
  }, [allPlanSkus]);

  // Prior dates identified
  const priorDates = useMemo(() => {
    if (!startDate) return [];
    return allPlanDates.filter((d) => compareDates(d, startDate) < 0);
  }, [allPlanDates, startDate]);

  // Selected window dates identified
  const windowDates = useMemo(() => {
    if (!startDate || !endDate) return [];
    return allPlanDates.filter(
      (d) => compareDates(d, startDate) >= 0 && compareDates(d, endDate) <= 0
    );
  }, [allPlanDates, startDate, endDate]);

  // Stock lookup map
  const stockMap = useMemo(() => {
    const map = new Map<string, StoreStockItem>();
    storeStockItems.forEach((s) => {
      if (s.itemcode) {
        map.set(s.itemcode.trim().toUpperCase(), s);
      }
    });
    return map;
  }, [storeStockItems]);

  // Price lookup map
  const priceMap = useMemo(() => {
    const map = new Map<string, MaterialPriceItem>();
    priceItems.forEach((p) => {
      if (p.rmCode) {
        map.set(p.rmCode.trim().toUpperCase(), p);
      }
    });
    return map;
  }, [priceItems]);

  // BOM lookup map: SKU -> BOMItem[]
  const bomBySku = useMemo(() => {
    const map = new Map<string, BOMItem[]>();
    bomItems.forEach((b) => {
      const skuKey = b.sku.trim().toUpperCase();
      const list = map.get(skuKey) || [];
      list.push(b);
      map.set(skuKey, list);
    });
    return map;
  }, [bomItems]);

  // Selected Stock Basis Value Helper
  const getStockValue = (stock: StoreStockItem | undefined): number => {
    if (!stock) return 0;
    switch (settings.stockBasis) {
      case 'totalClosing':
        return stock.totalClosing || 0;
      case 'totalQuantityWipClosing':
        return stock.totalQuantityWipClosing || 0;
      case 'opening':
        return stock.opening || 0;
      case 'readyStockForProduction':
      default:
        return stock.readyStockForProduction || 0;
    }
  };

  // ========================================================================
  // TIME-PHASED ALLOCATION SIMULATION CALCULATION ENGINE
  // ========================================================================
  const simulationResults = useMemo(() => {
    if (bomItems.length === 0 || productionPlanItems.length === 0) {
      return [];
    }

    // Step A: Calculate Prior Day Commitments (< startDate)
    const priorRmMap = new Map<
      string,
      {
        rmCode: string;
        rmDesc: string;
        uom: string;
        consumed: number;
        skus: ContributingSkuDetail[];
      }
    >();

    productionPlanItems.forEach((planItem) => {
      if (!planItem.date) return;
      const isPrior = compareDates(planItem.date, startDate) < 0;
      if (!isPrior) return;

      if (!deductAllPriorDays && !selectedSkus.has(planItem.sku)) return;

      const bomList = bomBySku.get(planItem.sku.trim().toUpperCase()) || [];
      bomList.forEach((bom) => {
        const rmKey = bom.rm.trim().toUpperCase();
        const required = planItem.plannedQuantity * bom.norms;
        const existing = priorRmMap.get(rmKey);
        const skuDetail: ContributingSkuDetail = {
          sku: planItem.sku,
          skuName: planItem.skuName || bom.skuName || planItem.sku,
          date: planItem.date,
          plannedQty: planItem.plannedQuantity,
          productionUnit: planItem.productionUnit || 'BOXES',
          norm: bom.norms,
          requiredQty: required,
        };

        if (existing) {
          existing.consumed += required;
          existing.skus.push(skuDetail);
        } else {
          priorRmMap.set(rmKey, {
            rmCode: bom.rm,
            rmDesc: bom.rmDesc,
            uom: bom.uom,
            consumed: required,
            skus: [skuDetail],
          });
        }
      });
    });

    // Step B: Calculate Selected Window Requirements (startDate <= date <= endDate for selected SKUs)
    const windowRmMap = new Map<
      string,
      {
        rmCode: string;
        rmDesc: string;
        uom: string;
        required: number;
        skus: ContributingSkuDetail[];
      }
    >();

    productionPlanItems.forEach((planItem) => {
      if (!planItem.date) return;
      const inWindow =
        compareDates(planItem.date, startDate) >= 0 &&
        compareDates(planItem.date, endDate) <= 0;
      if (!inWindow) return;

      if (!selectedSkus.has(planItem.sku)) return;

      const bomList = bomBySku.get(planItem.sku.trim().toUpperCase()) || [];
      bomList.forEach((bom) => {
        const rmKey = bom.rm.trim().toUpperCase();
        const required = planItem.plannedQuantity * bom.norms;
        const existing = windowRmMap.get(rmKey);
        const skuDetail: ContributingSkuDetail = {
          sku: planItem.sku,
          skuName: planItem.skuName || bom.skuName || planItem.sku,
          date: planItem.date,
          plannedQty: planItem.plannedQuantity,
          productionUnit: planItem.productionUnit || 'BOXES',
          norm: bom.norms,
          requiredQty: required,
        };

        if (existing) {
          existing.required += required;
          existing.skus.push(skuDetail);
        } else {
          windowRmMap.set(rmKey, {
            rmCode: bom.rm,
            rmDesc: bom.rmDesc,
            uom: bom.uom,
            required: required,
            skus: [skuDetail],
          });
        }
      });
    });

    // Step C: Consolidate
    const allRelevantRmKeys = Array.from(windowRmMap.keys());

    const items: CustomMaterialSimulationItem[] = allRelevantRmKeys.map((rmKey, index) => {
      const windowData = windowRmMap.get(rmKey)!;
      const priorData = priorRmMap.get(rmKey);

      const rmCode = windowData.rmCode;
      const stockEntry = stockMap.get(rmKey);
      const currentStoreStock = getStockValue(stockEntry);

      const priorDaysConsumed = priorData ? priorData.consumed : 0;
      const priorDaysContributingSkus = priorData ? priorData.skus : [];

      const priorDeficit = Math.max(0, priorDaysConsumed - currentStoreStock);
      const effectiveOpeningStockForWindow = Math.max(0, currentStoreStock - priorDaysConsumed);

      const windowGrossRequirement = windowData.required;
      const windowContributingSkus = windowData.skus;

      const windowNetShortage = Math.max(0, windowGrossRequirement - effectiveOpeningStockForWindow);
      const windowClosingBalance = Math.max(0, effectiveOpeningStockForWindow - windowGrossRequirement);

      let stockStatus: 'SUFFICIENT' | 'SHORTAGE' | 'DEPLETED_BY_PRIOR' | 'NOT_IN_STORE';
      if (!stockEntry && currentStoreStock === 0) {
        stockStatus = 'NOT_IN_STORE';
      } else if (effectiveOpeningStockForWindow === 0 && priorDaysConsumed > 0 && windowGrossRequirement > 0) {
        stockStatus = 'DEPLETED_BY_PRIOR';
      } else if (windowNetShortage > 0) {
        stockStatus = 'SHORTAGE';
      } else {
        stockStatus = 'SUFFICIENT';
      }

      const priceItem = priceMap.get(rmKey);
      const rate = priceItem?.ratePerUom;
      const currency = priceItem?.currency || settings.defaultCurrency;
      const shortageCost = rate ? windowNetShortage * rate : undefined;

      return {
        sNo: index + 1,
        rmCode: rmCode,
        rmDesc: windowData.rmDesc || stockEntry?.description || rmCode,
        uom: windowData.uom || stockEntry?.uom || 'NOS',
        currentStoreStock,
        priorDaysConsumed,
        priorDaysContributingSkus,
        priorDeficit,
        effectiveOpeningStockForWindow,
        windowGrossRequirement,
        windowContributingSkus,
        windowNetShortage,
        windowClosingBalance,
        stockStatus,
        rate,
        currency,
        shortageCost,
        isSharedWithPriorDays: priorDaysConsumed > 0,
      };
    });

    items.sort((a, b) => {
      const order = { DEPLETED_BY_PRIOR: 1, SHORTAGE: 2, NOT_IN_STORE: 3, SUFFICIENT: 4 };
      if (order[a.stockStatus] !== order[b.stockStatus]) {
        return order[a.stockStatus] - order[b.stockStatus];
      }
      return a.rmCode.localeCompare(b.rmCode);
    });

    return items.map((item, idx) => ({ ...item, sNo: idx + 1 }));
  }, [
    bomItems,
    productionPlanItems,
    startDate,
    endDate,
    selectedSkus,
    deductAllPriorDays,
    bomBySku,
    stockMap,
    priceMap,
    settings,
  ]);

  // Filtered Items for Display
  const filteredItems = useMemo(() => {
    return simulationResults.filter((item) => {
      const matchSearch =
        item.rmCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.rmDesc.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'SHORTAGE' && (item.stockStatus === 'SHORTAGE' || item.stockStatus === 'DEPLETED_BY_PRIOR')) ||
        (statusFilter === 'DEPLETED_BY_PRIOR' && item.stockStatus === 'DEPLETED_BY_PRIOR') ||
        (statusFilter === 'PRIOR_SHARED' && item.isSharedWithPriorDays) ||
        item.stockStatus === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [simulationResults, searchTerm, statusFilter]);

  // Overall KPI Metrics
  const kpis = useMemo(() => {
    const totalMaterials = simulationResults.length;
    const shortagesCount = simulationResults.filter(
      (i) => i.stockStatus === 'SHORTAGE' || i.stockStatus === 'DEPLETED_BY_PRIOR'
    ).length;
    const depletedByPriorCount = simulationResults.filter(
      (i) => i.stockStatus === 'DEPLETED_BY_PRIOR'
    ).length;
    const sharedWithPriorCount = simulationResults.filter((i) => i.isSharedWithPriorDays).length;
    const totalWindowShortageQty = simulationResults.reduce((acc, i) => acc + i.windowNetShortage, 0);
    const totalShortageCost = simulationResults.reduce((acc, i) => acc + (i.shortageCost || 0), 0);
    const totalPriorConsumed = simulationResults.reduce((acc, i) => acc + i.priorDaysConsumed, 0);

    const windowUnits = productionPlanItems
      .filter(
        (p) =>
          p.date &&
          compareDates(p.date, startDate) >= 0 &&
          compareDates(p.date, endDate) <= 0 &&
          selectedSkus.has(p.sku)
      )
      .reduce((acc, p) => acc + p.plannedQuantity, 0);

    return {
      totalMaterials,
      shortagesCount,
      depletedByPriorCount,
      sharedWithPriorCount,
      totalWindowShortageQty,
      totalShortageCost,
      totalPriorConsumed,
      windowUnits,
      selectedSkuCount: selectedSkus.size,
    };
  }, [simulationResults, productionPlanItems, startDate, endDate, selectedSkus]);

  // Excel Export Handler
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    const exportData = simulationResults.map((item) => ({
      'S.No': item.sNo,
      'RM Code': item.rmCode,
      'RM Description': item.rmDesc,
      'UOM': item.uom,
      'Current Store Stock (ERP)': item.currentStoreStock,
      'Prior Days Consumption (< Start Date)': item.priorDaysConsumed,
      'Prior Day Contributing SKUs': item.priorDaysContributingSkus
        .map((s) => `${s.date}: ${s.sku} (${s.requiredQty} ${item.uom})`)
        .join('; '),
      'Available Opening Stock for Window': item.effectiveOpeningStockForWindow,
      'Selected Window Requirement': item.windowGrossRequirement,
      'Window Contributing SKUs': item.windowContributingSkus
        .map((s) => `${s.date}: ${s.sku} (${s.requiredQty} ${item.uom})`)
        .join('; '),
      'Window Net Shortage': item.windowNetShortage,
      'Window Closing Balance': item.windowClosingBalance,
      'Status': item.stockStatus,
      'Rate per UOM': item.rate || '',
      'Shortage Cost': item.shortageCost || '',
    }));

    const ws1 = XLSX.utils.json_to_sheet(exportData);
    ws1['!cols'] = [
      { wch: 6 },
      { wch: 14 },
      { wch: 38 },
      { wch: 8 },
      { wch: 18 },
      { wch: 22 },
      { wch: 35 },
      { wch: 22 },
      { wch: 20 },
      { wch: 35 },
      { wch: 16 },
      { wch: 16 },
      { wch: 18 },
      { wch: 12 },
      { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(wb, ws1, 'Custom Schedule Allocation');

    const lineageRows: any[] = [];
    simulationResults.forEach((rm) => {
      rm.priorDaysContributingSkus.forEach((p) => {
        lineageRows.push({
          'RM Code': rm.rmCode,
          'RM Description': rm.rmDesc,
          'UOM': rm.uom,
          'Phase': 'Prior to Window (< Start Date)',
          'Date': p.date,
          'SKU Code': p.sku,
          'SKU Description': p.skuName,
          'Planned Finished Qty': p.plannedQty,
          'BOM Norm': p.norm,
          'Material Quantity': p.requiredQty,
        });
      });
      rm.windowContributingSkus.forEach((w) => {
        lineageRows.push({
          'RM Code': rm.rmCode,
          'RM Description': rm.rmDesc,
          'UOM': rm.uom,
          'Phase': 'Selected Window (From - To)',
          'Date': w.date,
          'SKU Code': w.sku,
          'SKU Description': w.skuName,
          'Planned Finished Qty': w.plannedQty,
          'BOM Norm': w.norm,
          'Material Quantity': w.requiredQty,
        });
      });
    });

    if (lineageRows.length > 0) {
      const ws2 = XLSX.utils.json_to_sheet(lineageRows);
      XLSX.utils.book_append_sheet(wb, ws2, 'SKU Consumption Lineage');
    }

    const startFmt = formatDisplayDate(startDate);
    const endFmt = formatDisplayDate(endDate);
    XLSX.writeFile(wb, `Custom_Schedule_Plan_${startFmt}_to_${endFmt}.xlsx`);
  };

  const handleSelectQuickDates = (preset: 'all' | 'next2' | 'firstDay') => {
    if (allPlanDates.length === 0) return;
    if (preset === 'all') {
      setStartDate(allPlanDates[0]);
      setEndDate(allPlanDates[allPlanDates.length - 1]);
    } else if (preset === 'next2') {
      if (allPlanDates.length >= 2) {
        setStartDate(allPlanDates[1]);
        setEndDate(allPlanDates[Math.min(2, allPlanDates.length - 1)]);
      }
    } else if (preset === 'firstDay') {
      setStartDate(allPlanDates[0]);
      setEndDate(allPlanDates[0]);
    }
  };

  const handleToggleSku = (sku: string) => {
    setSelectedSkus((prev) => {
      const next = new Set(prev);
      if (next.has(sku)) {
        next.delete(sku);
      } else {
        next.add(sku);
      }
      return next;
    });
  };

  const handleSelectAllSkus = () => {
    setSelectedSkus(new Set(allPlanSkus.map((s) => s.sku)));
  };

  const handleDeselectAllSkus = () => {
    setSelectedSkus(new Set());
  };

  // Empty state handling
  if (!isCalculated || bomItems.length === 0 || productionPlanItems.length === 0) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-xl p-8 text-center max-w-xl mx-auto my-8 shadow-xs">
        <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center mx-auto mb-3 text-amber-600 border border-amber-500/20">
          <CalendarRange className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-1.5">
          Custom Date & SKU Planner
        </h3>
        <p className="text-xs text-slate-500 mb-5 leading-relaxed">
          Upload plant schedule files or run calculation to simulate material requirements and prior-day store stock allocations.
        </p>
        <div className="flex items-center justify-center gap-2.5">
          <button
            onClick={onGoToUpload}
            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow-xs transition-colors"
          >
            Upload Schedule Files
          </button>
          <button
            onClick={onOpenCheckModal}
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors border border-slate-200"
          >
            Check Loaded Data
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      {/* ==================================================================== */}
      {/* 1. COMPACT UNIFIED COMMAND BAR                                       */}
      {/* ==================================================================== */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs">
        {/* Top Header Row: Title + Status + Action Tools */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-slate-900 text-amber-400 rounded-lg shrink-0">
              <CalendarRange className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900 tracking-tight">
                  Custom Date & SKU Planner
                </span>
                <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60 font-mono">
                  TIME-PHASED MRP
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Simulate requirements & shortages with automatic prior-day store stock deduction.
              </p>
            </div>
          </div>

          {/* Quick Presets & Export Actions */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/80 text-xs">
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  viewMode === 'table'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TableIcon className="w-3 h-3" />
                <span>Grid View</span>
              </button>
              <button
                onClick={() => setViewMode('waterfall')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  viewMode === 'waterfall'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <GitCommit className="w-3 h-3 text-amber-600" />
                <span>Stock Flow</span>
              </button>
            </div>

            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors shrink-0"
              title="Download full customized schedule plan as Excel workbook"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export .xlsx</span>
            </button>
          </div>
        </div>

        {/* Bottom Interactive Filter Row: Compact Single-Row Controls */}
        <div className="pt-2.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* Date Window Inputs */}
            <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
              <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="text-[11px] font-semibold text-slate-500 mr-1">Window:</span>
              <select
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
              >
                {allPlanDates.map((date) => (
                  <option key={date} value={date}>
                    {formatDisplayDate(date)}
                  </option>
                ))}
              </select>
              <span className="text-slate-400 font-bold">→</span>
              <select
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
              >
                {allPlanDates.map((date) => (
                  <option key={date} value={date}>
                    {formatDisplayDate(date)}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Range Presets */}
            <div className="flex items-center gap-1 text-[11px]">
              <button
                type="button"
                onClick={() => handleSelectQuickDates('all')}
                className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
              >
                All Dates
              </button>
              {allPlanDates.length >= 2 && (
                <button
                  type="button"
                  onClick={() => handleSelectQuickDates('next2')}
                  className="px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-semibold transition-colors"
                >
                  {formatDisplayDate(allPlanDates[1])} → {formatDisplayDate(allPlanDates[allPlanDates.length - 1])}
                </button>
              )}
            </div>

            {/* Compact SKU Popover Trigger */}
            <div className="relative" ref={skuDropdownRef}>
              <button
                type="button"
                onClick={() => setIsSkuDropdownOpen(!isSkuDropdownOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-semibold text-xs transition-colors"
              >
                <Boxes className="w-3.5 h-3.5 text-amber-600" />
                <span>
                  SKUs ({selectedSkus.size}/{allPlanSkus.length})
                </span>
                <ChevronDown className="w-3 h-3 text-slate-500" />
              </button>

              {/* SKU Popover Dropdown */}
              {isSkuDropdownOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-40 p-3 space-y-2.5">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-900">
                      Finished Goods Selection
                    </span>
                    <div className="flex items-center gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={handleSelectAllSkus}
                        className="text-amber-700 hover:underline font-semibold"
                      >
                        All
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={handleDeselectAllSkus}
                        className="text-slate-500 hover:underline font-semibold"
                      >
                        None
                      </button>
                    </div>
                  </div>

                  {/* Search inside Popover */}
                  <div className="relative">
                    <Search className="w-3 h-3 absolute left-2 top-2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search SKU code or name..."
                      value={skuSearchQuery}
                      onChange={(e) => setSkuSearchQuery(e.target.value)}
                      className="w-full pl-7 pr-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  {/* Scrollable Checkbox List */}
                  <div className="max-h-48 overflow-y-auto space-y-1 divide-y divide-slate-100 pr-1">
                    {allPlanSkus
                      .filter((s) => {
                        const q = skuSearchQuery.toLowerCase();
                        return s.sku.toLowerCase().includes(q) || s.skuName.toLowerCase().includes(q);
                      })
                      .map((skuItem) => {
                        const isChecked = selectedSkus.has(skuItem.sku);
                        return (
                          <label
                            key={skuItem.sku}
                            className={`flex items-center justify-between p-1.5 rounded cursor-pointer transition-colors text-xs ${
                              isChecked ? 'bg-amber-50/50 text-slate-900' : 'text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleSku(skuItem.sku)}
                                className="w-3.5 h-3.5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                              />
                              <div className="truncate">
                                <div className="font-mono font-bold text-[11px] text-amber-950">
                                  {skuItem.sku}
                                </div>
                                <div className="text-[10px] text-slate-500 truncate max-w-44">
                                  {skuItem.skuName}
                                </div>
                              </div>
                            </div>
                            <span className="text-[10px] font-mono font-semibold text-slate-500 tabular-nums ml-2">
                              {skuItem.totalQty.toLocaleString()} u
                            </span>
                          </label>
                        );
                      })}
                  </div>

                  <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">
                      {selectedSkus.size} SKUs active
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsSkuDropdownOpen(false)}
                      className="px-2.5 py-0.5 bg-slate-900 text-white rounded text-[11px] font-semibold"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Deduct Prior Days Checkbox Toggle */}
            <label className="flex items-center gap-1.5 cursor-pointer ml-1 select-none text-[11px] text-slate-700">
              <input
                type="checkbox"
                checked={deductAllPriorDays}
                onChange={(e) => setDeductAllPriorDays(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
              />
              <span className="font-medium">
                Deduct prior runs (&lt; {formatDisplayDate(startDate)}) from Store Stock
              </span>
            </label>
          </div>

          {/* Prior Day Notification Pill */}
          {priorDates.length > 0 && (
            <div className="flex items-center gap-1.5 text-[11px] text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/80">
              <Clock className="w-3 h-3 text-amber-600 shrink-0" />
              <span>
                <strong>{priorDates.map(formatDisplayDate).join(', ')}</strong> runs deducted first
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. COMPACT TELEMETRY HUD (6 STATS IN 1 ROW)                          */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
        {/* Window Window */}
        <div className="bg-white border border-slate-200/80 rounded-lg p-2.5 shadow-2xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Window
          </div>
          <div className="text-xs font-bold text-slate-900 mt-0.5 truncate">
            {formatDisplayDate(startDate)} → {formatDisplayDate(endDate)}
          </div>
          <div className="text-[10px] text-amber-700 font-medium">
            {windowDates.length} Days · {kpis.selectedSkuCount} SKUs
          </div>
        </div>

        {/* Finished Units */}
        <div className="bg-white border border-slate-200/80 rounded-lg p-2.5 shadow-2xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Finished Units
          </div>
          <div className="text-base font-black text-slate-900 mt-0.5 tabular-nums font-mono">
            {kpis.windowUnits.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500">Scheduled Production</div>
        </div>

        {/* Prior Days Stock Committed */}
        <div className="bg-white border border-amber-200/80 rounded-lg p-2.5 shadow-2xs bg-amber-50/20">
          <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider flex items-center justify-between">
            <span>Prior Stock Used</span>
            <Clock className="w-3 h-3 text-amber-600" />
          </div>
          <div className="text-base font-black text-amber-950 mt-0.5 tabular-nums font-mono">
            {kpis.totalPriorConsumed.toLocaleString(undefined, { maximumFractionDigits: 1 })}
          </div>
          <div className="text-[10px] text-amber-700">
            {kpis.sharedWithPriorCount} RM Shared w/ Prior
          </div>
        </div>

        {/* Window RM Count */}
        <div className="bg-white border border-slate-200/80 rounded-lg p-2.5 shadow-2xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Window RM Count
          </div>
          <div className="text-base font-black text-slate-900 mt-0.5 tabular-nums font-mono">
            {kpis.totalMaterials}
          </div>
          <div className="text-[10px] text-slate-500">Components in Scope</div>
        </div>

        {/* Shortages Count */}
        <div
          className={`border rounded-lg p-2.5 shadow-2xs ${
            kpis.shortagesCount > 0
              ? 'bg-rose-50/60 border-rose-200 text-rose-950'
              : 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
          }`}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider flex items-center justify-between">
            <span>Window Deficit</span>
            {kpis.shortagesCount > 0 ? (
              <AlertTriangle className="w-3 h-3 text-rose-600" />
            ) : (
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            )}
          </div>
          <div className="text-base font-black mt-0.5 tabular-nums font-mono">
            {kpis.shortagesCount}{' '}
            <span className="text-[11px] font-normal">
              {kpis.shortagesCount === 1 ? 'material' : 'materials'}
            </span>
          </div>
          <div className="text-[10px] font-medium">
            {kpis.depletedByPriorCount > 0
              ? `${kpis.depletedByPriorCount} Depleted by Prior Runs`
              : 'Inventory Balance OK'}
          </div>
        </div>

        {/* Est. Deficit Value */}
        <div className="bg-white border border-slate-200/80 rounded-lg p-2.5 shadow-2xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Est. Deficit Value
          </div>
          <div className="text-base font-black text-slate-900 mt-0.5 tabular-nums font-mono">
            {settings.defaultCurrency} {kpis.totalShortageCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[10px] text-slate-500">Shortage Procurement</div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 3. TABLE / WATERFALL CONTAINER                                       */}
      {/* ==================================================================== */}
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden">
        {/* Table Filter Toolbar */}
        <div className="px-3 py-2 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/40">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900">
              {viewMode === 'table' ? 'Material Allocation Grid' : 'Stock Flow Waterfall Pipeline'}
            </span>
            <span className="text-[11px] text-slate-500">
              ({filteredItems.length} items)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="w-3 h-3 absolute left-2 top-2 text-slate-400" />
              <input
                type="text"
                placeholder="Search RM Code / desc..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-7 pr-2.5 py-1 text-xs bg-white border border-slate-200 rounded-md text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 w-44"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-md px-2 py-1 text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="ALL">All Status</option>
              <option value="SHORTAGE">All Deficits</option>
              <option value="DEPLETED_BY_PRIOR">Depleted by Prior Days</option>
              <option value="PRIOR_SHARED">Shared with Prior</option>
              <option value="SUFFICIENT">Sufficient Only</option>
            </select>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* VIEW MODE A: HIGH-DENSITY COMPACT DATA GRID                        */}
        {/* ------------------------------------------------------------------ */}
        {viewMode === 'table' ? (
          <div className="overflow-x-auto max-h-[620px]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur-xs border-b border-slate-200 text-slate-600 font-bold text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="py-2 px-2.5 w-10 text-center">#</th>
                  <th className="py-2 px-3">Raw Material Code & Description</th>
                  <th className="py-2 px-2 w-14 text-center">UOM</th>
                  <th className="py-2 px-3 text-right">Store Stock (ERP)</th>
                  <th className="py-2 px-3 text-right bg-amber-50/60 text-amber-900 border-l border-amber-200/50">
                    Prior Consumed
                    <div className="text-[8px] font-normal text-amber-700">
                      &lt; {formatDisplayDate(startDate)}
                    </div>
                  </th>
                  <th className="py-2 px-3 text-right bg-blue-50/60 text-blue-900 border-l border-blue-200/50 font-black">
                    Available for Window
                    <div className="text-[8px] font-normal text-blue-700">
                      (Store - Prior)
                    </div>
                  </th>
                  <th className="py-2 px-3 text-right font-bold">
                    Window Req
                    <div className="text-[8px] font-normal text-slate-500">
                      {formatDisplayDate(startDate)} → {formatDisplayDate(endDate)}
                    </div>
                  </th>
                  <th className="py-2 px-3 text-right font-black border-l border-slate-200">
                    Net Position
                  </th>
                  <th className="py-2 px-3 text-center">Status</th>
                  <th className="py-2 px-2.5 text-center w-20">Trace</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400 text-xs">
                      No material requirements found for the selected dates and SKUs.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const hasShortage = item.windowNetShortage > 0;
                    const isDepleted = item.stockStatus === 'DEPLETED_BY_PRIOR';

                    return (
                      <tr
                        key={item.rmCode}
                        className={`hover:bg-slate-50/80 transition-colors text-xs ${
                          isDepleted
                            ? 'bg-rose-50/20'
                            : hasShortage
                            ? 'bg-amber-50/15'
                            : ''
                        }`}
                      >
                        {/* # */}
                        <td className="py-2 px-2.5 text-center text-slate-400 font-mono text-[10px]">
                          {item.sNo}
                        </td>

                        {/* Code & Desc */}
                        <td className="py-2 px-3">
                          <div className="font-mono font-bold text-slate-900 text-[11px]">
                            {item.rmCode}
                          </div>
                          <div className="text-slate-500 text-[10px] truncate max-w-xs font-medium">
                            {item.rmDesc}
                          </div>
                        </td>

                        {/* UOM */}
                        <td className="py-2 px-2 text-center font-bold text-slate-600 text-[10px]">
                          {item.uom}
                        </td>

                        {/* Store Stock */}
                        <td className="py-2 px-3 text-right font-mono font-semibold text-slate-800 tabular-nums">
                          {item.currentStoreStock.toLocaleString(undefined, {
                            maximumFractionDigits: 1,
                          })}
                        </td>

                        {/* Prior Days Consumed */}
                        <td className="py-2 px-3 text-right border-l border-amber-200/40 bg-amber-50/20">
                          {item.priorDaysConsumed > 0 ? (
                            <div>
                              <div className="font-mono font-bold text-amber-950 tabular-nums">
                                {item.priorDaysConsumed.toLocaleString(undefined, {
                                  maximumFractionDigits: 1,
                                })}
                              </div>
                              <div className="text-[9px] text-amber-700 font-medium">
                                {item.priorDaysContributingSkus.length} prior batch(es)
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-300 font-mono">-</span>
                          )}
                        </td>

                        {/* Available Opening Stock */}
                        <td className="py-2 px-3 text-right border-l border-blue-200/40 bg-blue-50/20">
                          <div
                            className={`font-mono font-black tabular-nums ${
                              item.effectiveOpeningStockForWindow === 0 && item.priorDaysConsumed > 0
                                ? 'text-rose-600'
                                : 'text-blue-950'
                            }`}
                          >
                            {item.effectiveOpeningStockForWindow.toLocaleString(undefined, {
                              maximumFractionDigits: 1,
                            })}
                          </div>
                          {item.priorDeficit > 0 && (
                            <div className="text-[8px] text-rose-600 font-bold">
                              Prior deficit: {item.priorDeficit.toLocaleString()}
                            </div>
                          )}
                        </td>

                        {/* Window Requirement */}
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                          {item.windowGrossRequirement.toLocaleString(undefined, {
                            maximumFractionDigits: 1,
                          })}
                        </td>

                        {/* Net Position */}
                        <td className="py-2 px-3 text-right border-l border-slate-200 font-mono tabular-nums">
                          {hasShortage ? (
                            <div>
                              <div className="font-black text-rose-600">
                                -{item.windowNetShortage.toLocaleString(undefined, {
                                  maximumFractionDigits: 1,
                                })}
                              </div>
                              <div className="text-[8px] text-rose-700 font-bold uppercase">
                                Deficit
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="font-black text-emerald-700">
                                +{item.windowClosingBalance.toLocaleString(undefined, {
                                  maximumFractionDigits: 1,
                                })}
                              </div>
                              <div className="text-[8px] text-emerald-700 font-medium uppercase">
                                Surplus
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          {item.stockStatus === 'DEPLETED_BY_PRIOR' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                              Depleted by Prior
                            </span>
                          )}
                          {item.stockStatus === 'SHORTAGE' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                              Deficit
                            </span>
                          )}
                          {item.stockStatus === 'SUFFICIENT' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Sufficient
                            </span>
                          )}
                          {item.stockStatus === 'NOT_IN_STORE' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                              Not in Store
                            </span>
                          )}
                        </td>

                        {/* Trace Action */}
                        <td className="py-2 px-2.5 text-center">
                          <button
                            onClick={() => {
                              setSelectedMaterialForTrace(item);
                              setTraceTab('flow');
                            }}
                            className="px-2 py-0.5 rounded bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-950 font-bold text-[10px] transition-colors border border-slate-200"
                          >
                            Trace
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* ------------------------------------------------------------------ */
          /* VIEW MODE B: VISUAL STOCK FLOW WATERFALL                           */
          /* ------------------------------------------------------------------ */
          <div className="p-4 space-y-4 max-h-[620px] overflow-y-auto">
            <div className="text-xs text-slate-500 flex items-center justify-between pb-2 border-b border-slate-100">
              <span>
                Visual representation of how Store Inventory is consumed across prior dates and the chosen window.
              </span>
              <span className="font-semibold text-slate-700">
                Sorted by priority (Shortages first)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredItems.map((item) => {
                const totalDemand = item.priorDaysConsumed + item.windowGrossRequirement;
                const priorPct = item.currentStoreStock > 0
                  ? Math.min(100, Math.round((item.priorDaysConsumed / item.currentStoreStock) * 100))
                  : 0;
                const windowPct = item.currentStoreStock > 0
                  ? Math.min(100 - priorPct, Math.round((item.windowGrossRequirement / item.currentStoreStock) * 100))
                  : 0;
                const isShort = item.windowNetShortage > 0;

                return (
                  <div
                    key={item.rmCode}
                    className={`border rounded-xl p-3.5 space-y-2.5 transition-all ${
                      item.stockStatus === 'DEPLETED_BY_PRIOR'
                        ? 'bg-rose-50/30 border-rose-200'
                        : isShort
                        ? 'bg-amber-50/20 border-amber-200'
                        : 'bg-white border-slate-200/90'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-slate-900">
                            {item.rmCode}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500">
                            ({item.uom})
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600 font-medium truncate max-w-xs mt-0.5">
                          {item.rmDesc}
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedMaterialForTrace(item);
                          setTraceTab('flow');
                        }}
                        className="px-2 py-1 rounded bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-950 font-bold text-[10px] transition-colors border border-slate-200 shrink-0"
                      >
                        Lineage Trace
                      </button>
                    </div>

                    {/* Progress Bar of Stock Allocation */}
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-mono mb-1 text-slate-600">
                        <span>ERP Store Stock: <strong>{item.currentStoreStock.toLocaleString()} {item.uom}</strong></span>
                        <span className={isShort ? 'text-rose-600 font-bold' : 'text-emerald-700 font-bold'}>
                          {isShort ? `Shortage: -${item.windowNetShortage.toLocaleString()}` : `Surplus: +${item.windowClosingBalance.toLocaleString()}`}
                        </span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden flex">
                        {/* Prior Used */}
                        <div
                          style={{ width: `${priorPct}%` }}
                          className="bg-amber-500 h-full"
                          title={`Prior days consumed: ${item.priorDaysConsumed.toLocaleString()} ${item.uom}`}
                        />
                        {/* Window Used */}
                        <div
                          style={{ width: `${windowPct}%` }}
                          className="bg-blue-600 h-full"
                          title={`Window consumed from stock: ${Math.min(item.effectiveOpeningStockForWindow, item.windowGrossRequirement).toLocaleString()} ${item.uom}`}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[9px] text-slate-500 mt-1">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                          Prior Days: {item.priorDaysConsumed.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-blue-600 inline-block"></span>
                          Window Req: {item.windowGrossRequirement.toLocaleString()}
                        </span>
                        <span className="font-semibold text-slate-700">
                          Available: {item.effectiveOpeningStockForWindow.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Quick Step Summary */}
                    <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-100 text-center text-[10px]">
                      <div className="bg-slate-50 p-1.5 rounded">
                        <div className="text-[9px] text-slate-400">Store Stock</div>
                        <div className="font-mono font-bold text-slate-900 tabular-nums">
                          {item.currentStoreStock.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </div>
                      </div>
                      <div className="bg-amber-50/60 p-1.5 rounded text-amber-950">
                        <div className="text-[9px] text-amber-700">Available For Window</div>
                        <div className="font-mono font-bold tabular-nums">
                          {item.effectiveOpeningStockForWindow.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </div>
                      </div>
                      <div className={`p-1.5 rounded font-mono font-bold tabular-nums ${
                        isShort ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-800'
                      }`}>
                        <div className="text-[9px] uppercase font-normal">
                          {isShort ? 'Net Deficit' : 'Surplus'}
                        </div>
                        <div>
                          {isShort ? `-${item.windowNetShortage.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : `+${item.windowClosingBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* 4. MODERN SLIDE-OVER TRACE DRAWER                                    */}
      {/* ==================================================================== */}
      {selectedMaterialForTrace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col">
            {/* Header */}
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                    {selectedMaterialForTrace.rmCode}
                  </span>
                  <h3 className="text-sm font-bold text-white">
                    Stock Allocation Lineage
                  </h3>
                </div>
                <div className="text-[11px] text-slate-400 truncate max-w-md mt-0.5">
                  {selectedMaterialForTrace.rmDesc} ({selectedMaterialForTrace.uom})
                </div>
              </div>
              <button
                onClick={() => setSelectedMaterialForTrace(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sub-Tabs: Flow vs Prior vs Window */}
            <div className="flex items-center px-5 pt-3 border-b border-slate-200 bg-slate-50/50 gap-2 text-xs">
              <button
                onClick={() => setTraceTab('flow')}
                className={`pb-2.5 px-2 font-semibold transition-all border-b-2 text-xs ${
                  traceTab === 'flow'
                    ? 'border-amber-500 text-slate-900 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Reconciliation Flow
              </button>
              <button
                onClick={() => setTraceTab('prior')}
                className={`pb-2.5 px-2 font-semibold transition-all border-b-2 text-xs ${
                  traceTab === 'prior'
                    ? 'border-amber-500 text-slate-900 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Prior Day SKUs ({selectedMaterialForTrace.priorDaysContributingSkus.length})
              </button>
              <button
                onClick={() => setTraceTab('window')}
                className={`pb-2.5 px-2 font-semibold transition-all border-b-2 text-xs ${
                  traceTab === 'window'
                    ? 'border-amber-500 text-slate-900 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Selected Window SKUs ({selectedMaterialForTrace.windowContributingSkus.length})
              </button>
            </div>

            {/* Tab Body */}
            <div className="p-5 overflow-y-auto space-y-3.5 flex-1 text-xs">
              {traceTab === 'flow' && (
                <div className="space-y-3">
                  {/* Step 1: Store Stock */}
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase">
                        1. Initial ERP Store Stock
                      </div>
                      <div className="text-[11px] text-slate-600">
                        Basis: {settings.stockBasis}
                      </div>
                    </div>
                    <div className="font-mono text-base font-black text-slate-900 tabular-nums">
                      {selectedMaterialForTrace.currentStoreStock.toLocaleString(undefined, { maximumFractionDigits: 1 })}{' '}
                      <span className="text-xs font-normal text-slate-500">{selectedMaterialForTrace.uom}</span>
                    </div>
                  </div>

                  {/* Step 2: Prior Days Deductions */}
                  <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] font-bold text-amber-900 uppercase flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>2. Prior Days Consumption (&lt; {formatDisplayDate(startDate)})</span>
                      </div>
                      <div className="font-mono text-sm font-bold text-amber-950 tabular-nums">
                        -{selectedMaterialForTrace.priorDaysConsumed.toLocaleString(undefined, { maximumFractionDigits: 1 })}{' '}
                        <span className="text-xs font-normal">{selectedMaterialForTrace.uom}</span>
                      </div>
                    </div>
                    <div className="text-[10px] text-amber-800">
                      Consumed by {selectedMaterialForTrace.priorDaysContributingSkus.length} batch(es) before start date.
                    </div>
                  </div>

                  {/* Step 3: Available for Window */}
                  <div className="flex items-center justify-between p-3 bg-blue-50/70 rounded-xl border border-blue-200">
                    <div>
                      <div className="text-[10px] font-bold text-blue-900 uppercase">
                        3. Available Stock Entering Window
                      </div>
                      <div className="text-[10px] text-blue-700">
                        Store Stock - Prior Days Consumption (Min 0)
                      </div>
                    </div>
                    <div className="font-mono text-base font-black text-blue-950 tabular-nums">
                      {selectedMaterialForTrace.effectiveOpeningStockForWindow.toLocaleString(undefined, { maximumFractionDigits: 1 })}{' '}
                      <span className="text-xs font-normal text-blue-700">{selectedMaterialForTrace.uom}</span>
                    </div>
                  </div>

                  {/* Step 4: Window Requirements */}
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <div className="text-[10px] font-bold text-slate-600 uppercase">
                        4. Selected Window Gross Requirement
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {formatDisplayDate(startDate)} to {formatDisplayDate(endDate)} for selected SKUs
                      </div>
                    </div>
                    <div className="font-mono text-base font-black text-slate-900 tabular-nums">
                      {selectedMaterialForTrace.windowGrossRequirement.toLocaleString(undefined, { maximumFractionDigits: 1 })}{' '}
                      <span className="text-xs font-normal text-slate-500">{selectedMaterialForTrace.uom}</span>
                    </div>
                  </div>

                  {/* Step 5: Final Result */}
                  <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
                    selectedMaterialForTrace.windowNetShortage > 0
                      ? 'bg-rose-50 border-rose-300 text-rose-950'
                      : 'bg-emerald-50 border-emerald-300 text-emerald-950'
                  }`}>
                    <div>
                      <div className="text-[10px] font-bold uppercase">
                        5. Final Position for Selected Window
                      </div>
                      <div className="text-[11px] font-medium mt-0.5">
                        {selectedMaterialForTrace.windowNetShortage > 0
                          ? 'Net Shortage: Procurement or plant transfer required'
                          : 'Sufficient: Stock covers scheduled batches with surplus'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-lg font-black tabular-nums">
                        {selectedMaterialForTrace.windowNetShortage > 0
                          ? `-${selectedMaterialForTrace.windowNetShortage.toLocaleString(undefined, { maximumFractionDigits: 1 })}`
                          : `+${selectedMaterialForTrace.windowClosingBalance.toLocaleString(undefined, { maximumFractionDigits: 1 })}`}{' '}
                        <span className="text-xs">{selectedMaterialForTrace.uom}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {traceTab === 'prior' && (
                <div className="space-y-2">
                  {selectedMaterialForTrace.priorDaysContributingSkus.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      No prior day batches consumed this material.
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-700 font-bold text-[10px] uppercase">
                          <tr>
                            <th className="py-2 px-3">Date</th>
                            <th className="py-2 px-3">SKU Code & Description</th>
                            <th className="py-2 px-2 text-right">Plan Qty</th>
                            <th className="py-2 px-2 text-right">Norm</th>
                            <th className="py-2 px-3 text-right">Consumed</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedMaterialForTrace.priorDaysContributingSkus.map((sku, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="py-2 px-3 font-mono font-bold text-slate-700">
                                {formatDisplayDate(sku.date)}
                              </td>
                              <td className="py-2 px-3">
                                <span className="font-mono font-bold text-amber-950 mr-1.5">
                                  {sku.sku}
                                </span>
                                <span className="text-slate-600 truncate max-w-44 inline-block align-bottom">
                                  {sku.skuName}
                                </span>
                              </td>
                              <td className="py-2 px-2 text-right font-mono tabular-nums">
                                {sku.plannedQty.toLocaleString()}
                              </td>
                              <td className="py-2 px-2 text-right font-mono tabular-nums text-slate-500">
                                {sku.norm}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-amber-950 tabular-nums">
                                {sku.requiredQty.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {traceTab === 'window' && (
                <div className="space-y-2">
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-bold text-[10px] uppercase">
                        <tr>
                          <th className="py-2 px-3">Date</th>
                          <th className="py-2 px-3">SKU Code & Description</th>
                          <th className="py-2 px-2 text-right">Plan Qty</th>
                          <th className="py-2 px-2 text-right">Norm</th>
                          <th className="py-2 px-3 text-right">Required</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedMaterialForTrace.windowContributingSkus.map((sku, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-mono font-bold text-slate-700">
                              {formatDisplayDate(sku.date)}
                            </td>
                            <td className="py-2 px-3">
                              <span className="font-mono font-bold text-slate-900 mr-1.5">
                                {sku.sku}
                              </span>
                              <span className="text-slate-600 truncate max-w-44 inline-block align-bottom">
                                {sku.skuName}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-right font-mono tabular-nums">
                              {sku.plannedQty.toLocaleString()}
                            </td>
                            <td className="py-2 px-2 text-right font-mono tabular-nums text-slate-500">
                              {sku.norm}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                              {sku.requiredQty.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
              <button
                onClick={() => setSelectedMaterialForTrace(null)}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors"
              >
                Close Trace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
