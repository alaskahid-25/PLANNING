export interface BOMItem {
  sku: string;
  skuName: string;
  rm: string;
  rmDesc: string;
  uom: string;
  norms: number;
  sheetName?: string;
  rowNumber?: number;
}

export interface StoreStockItem {
  sNo?: string | number;
  lastIssueDate?: string;
  itemcode: string;
  description: string;
  uom: string;
  opening: number;
  receipts: number;
  gpPending: number;
  holdRejectQc: number;
  others: number;
  qcIssues: number;
  loadingIssue: number;
  packingIssues: number;
  readyStockForProduction: number;
  totalClosing: number;
  wip: number;
  totalQuantityWipClosing: number;
  remarks?: string;
  minStock?: number;
  maxStock?: number;
  reorderQty?: number;
  moq?: number;
  reorderLevel?: number;
  orderNoOrder?: string;
  neededQty?: number;
  leadtime?: number;
  maxPurchaseProcessingTime?: number;
  totalLeadTime?: number;
  avgWt?: number;
  lotNumbers?: string;
  dateOfManufacture?: string;
  dateOfExpiry?: string;
  remarksQc?: string;
  rowNumber?: number;
}

export interface ProductionPlanItem {
  id: string;
  date: string;
  sku: string;
  skuName?: string;
  plannedQuantity: number;
  productionUnit?: string;
  multiplier?: number;
  rowNumber?: number;
}

export interface MaterialPriceItem {
  rmCode: string;
  materialDescription: string;
  uom: string;
  ratePerUom: number;
  currency: string;
  effectiveDate?: string;
}

export interface SkuMaterialRequirement {
  sku: string;
  skuName: string;
  plannedQuantity: number;
  productionUnit: string;
  rmCode: string;
  rmDesc: string;
  uom: string;
  norms: number;
  requiredQuantity: number;
  productionDate?: string;
}

export type StockStatus = 'SUFFICIENT' | 'SHORTAGE' | 'EXCESS' | 'NOT_IN_STORE';
export type ProcurementPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NO_ACTION';

export interface ConsolidatedMaterialRequirement {
  sNo: number;
  rmCode: string;
  rmDesc: string;
  uom: string;
  totalRequiredQuantity: number;
  availableStock: number;
  stockBasisUsed: string;
  wip: number;
  totalClosing: number;
  openingStock: number;
  receipts: number;
  qcIssues: number;
  loadingIssues: number;
  packingIssues: number;
  holdRejectQty: number;
  gpPending: number;
  netPosition: number;
  shortage: number;
  excess: number;
  stockStatus: StockStatus;
  procurementPriority: ProcurementPriority;
  minStock?: number;
  maxStock?: number;
  reorderLevel?: number;
  moq?: number;
  reorderQty?: number;
  neededQty?: number;
  totalLeadTime?: number;
  suggestedPurchaseQty: number;
  actionRequired: string;
  roundingOrMoqAdjustment?: string;
  rate?: number;
  currency?: string;
  totalCost?: number;
  hasRate: boolean;
  isMissingFromStore: boolean;
  isUomMismatched: boolean;
  storeUom?: string;
  earliestRequiredDate?: string;
  latestProcurementReleaseDate?: string;
  leadTimeRisk: string;
}

export interface DataValidationIssue {
  id: string;
  fileName: string;
  sheetName: string;
  rowNumber: number;
  columnName: string;
  issueDescription: string;
  suggestedCorrection: string;
  severity: 'ERROR' | 'WARNING' | 'INFO';
}

export interface AppSettings {
  stockBasis: 'readyStockForProduction' | 'totalClosing' | 'totalQuantityWipClosing' | 'opening';
  includeGpPending: boolean;
  defaultProductionUnit: string;
  unitConversionFactors: Record<string, number>;
  defaultCurrency: string;
  decimalPrecision: number;
  criticalLeadTimeThresholdDays: number;
}

export interface PlanHistoryRecord {
  id: string;
  planName: string;
  createdAt: string;
  productionPeriod: string;
  skuCount: number;
  totalPlannedQty: number;
  totalMaterialRequirement: number;
  totalShortage: number;
  totalEstimatedCost: number;
  currency: string;
  status: 'COMPLETED' | 'VALIDATED_WITH_WARNINGS' | 'CRITICAL_SHORTAGES';
  bomItemsCount: number;
  storeStockCount: number;
  dataSnapshot?: {
    consolidatedRequirements: ConsolidatedMaterialRequirement[];
    skuRequirements: SkuMaterialRequirement[];
    productionPlan: ProductionPlanItem[];
  };
}

export interface ColumnMappingConfig {
  fileType: 'BOM' | 'STOCK' | 'PLAN' | 'PRICES';
  sheetName: string;
  availableHeaders: string[];
  mappings: Record<string, string>; // internalKey -> userColumnHeader
}

export interface LoadedFileInfo {
  fileName: string;
  sheetNames: string[];
  activeSheet: string;
  count: number;
  lastUpdated: string;
  fileSize?: string;
  rawWorkbook?: any;
  headers?: string[];
  rows?: Record<string, any>[];
  columnMapping?: Record<string, string>;
  isMatrix?: boolean;
  dateColumns?: string[];
}
