import {
  BOMItem,
  StoreStockItem,
  ProductionPlanItem,
  MaterialPriceItem,
  SkuMaterialRequirement,
  ConsolidatedMaterialRequirement,
  DataValidationIssue,
  AppSettings,
  StockStatus,
  ProcurementPriority,
} from '../types';

export interface CalculationResult {
  consolidatedRequirements: ConsolidatedMaterialRequirement[];
  skuRequirements: SkuMaterialRequirement[];
  validationIssues: DataValidationIssue[];
  kpis: {
    totalSkusInPlan: number;
    totalPlannedQty: number;
    totalUniqueRmCount: number;
    totalMaterialRequirementQty: number;
    sufficientStockCount: number;
    shortageCount: number;
    excessStockCount: number;
    missingFromStoreCount: number;
    criticalProcurementCount: number;
    estimatedMaterialCost: number;
    estimatedProcurementValue: number;
    longLeadTimeCount: number;
    uncostedRmCount: number;
    uncostedQty: number;
    totalShortageQty: number;
    currency: string;
    stockSufficiencyPct: number;
  };
  calculationTimestamp: string;
}

export function runProductionPlanCalculations(
  bomItems: BOMItem[],
  storeStockItems: StoreStockItem[],
  productionPlanItems: ProductionPlanItem[],
  priceItems: MaterialPriceItem[],
  settings: AppSettings
): CalculationResult {
  const validationIssues: DataValidationIssue[] = [];
  const timestamp = new Date().toISOString();

  // 1. Group BOM items by SKU code (using exact text key)
  const bomBySku = new Map<string, BOMItem[]>();
  const bomRmKeys = new Set<string>();

  bomItems.forEach((b) => {
    const skuKey = b.sku.trim();
    if (!bomBySku.has(skuKey)) {
      bomBySku.set(skuKey, []);
    }
    bomBySku.get(skuKey)!.push(b);
    bomRmKeys.add(`${b.rm.trim()}:::${b.uom.trim().toUpperCase()}`);
  });

  // 2. Index Store Stock by Itemcode (exact string matching)
  const stockByItemcode = new Map<string, StoreStockItem>();
  storeStockItems.forEach((s) => {
    const code = s.itemcode.trim();
    if (!stockByItemcode.has(code)) {
      stockByItemcode.set(code, s);
    }
  });

  // 3. Index Material Prices by RM Code + UOM (or RM Code fallback)
  const priceMap = new Map<string, MaterialPriceItem>();
  priceItems.forEach((p) => {
    const keyWithUom = `${p.rmCode.trim()}:::${p.uom.trim().toUpperCase()}`;
    priceMap.set(keyWithUom, p);
    priceMap.set(p.rmCode.trim(), p);
  });

  // 4. Calculate SKU-wise Material Requirements
  const skuRequirements: SkuMaterialRequirement[] = [];
  const plannedSkusEncountered = new Set<string>();

  productionPlanItems.forEach((planItem, planIdx) => {
    const skuCode = planItem.sku.trim();
    plannedSkusEncountered.add(skuCode);
    const boms = bomBySku.get(skuCode);

    if (!boms || boms.length === 0) {
      validationIssues.push({
        id: `plan-unmatched-sku-${planIdx}-${skuCode}`,
        fileName: 'Production Plan',
        sheetName: 'Plan',
        rowNumber: planItem.rowNumber || planIdx + 1,
        columnName: 'SKU',
        issueDescription: `Production SKU "${skuCode}" was not found in the Combined BOM Master.`,
        suggestedCorrection: 'Add this SKU and its component norms to the Combined SKU + BOM Master file.',
        severity: 'ERROR',
      });
      return;
    }

    // Check unit conversion multiplier if configured
    const unit = planItem.productionUnit || settings.defaultProductionUnit;
    const multiplier = settings.unitConversionFactors[unit] ?? (planItem.multiplier ?? 1);
    const effectivePlanQty = planItem.plannedQuantity * multiplier;

    boms.forEach((bom) => {
      // Decimal safe multiplication
      const requiredQty = effectivePlanQty * bom.norms;

      skuRequirements.push({
        sku: bom.sku,
        skuName: bom.skuName || planItem.skuName || bom.sku,
        plannedQuantity: planItem.plannedQuantity,
        productionUnit: unit,
        rmCode: bom.rm.trim(),
        rmDesc: bom.rmDesc || bom.rm,
        uom: bom.uom.trim().toUpperCase(),
        norms: bom.norms,
        requiredQuantity: requiredQty,
        productionDate: planItem.date,
      });
    });
  });

  // 5. Consolidate materials across all SKUs by RM Code + UOM
  interface ConsolidateAccumulator {
    rmCode: string;
    rmDesc: string;
    uom: string;
    totalRequiredQuantity: number;
    earliestRequiredDate?: string;
  }

  const consolidatedMap = new Map<string, ConsolidateAccumulator>();
  const rmUomTracking = new Map<string, Set<string>>();

  skuRequirements.forEach((req) => {
    const key = `${req.rmCode}:::${req.uom}`;

    // Track UOM consistency
    if (!rmUomTracking.has(req.rmCode)) {
      rmUomTracking.set(req.rmCode, new Set());
    }
    rmUomTracking.get(req.rmCode)!.add(req.uom);

    if (!consolidatedMap.has(key)) {
      consolidatedMap.set(key, {
        rmCode: req.rmCode,
        rmDesc: req.rmDesc,
        uom: req.uom,
        totalRequiredQuantity: 0,
        earliestRequiredDate: req.productionDate,
      });
    }

    const acc = consolidatedMap.get(key)!;
    acc.totalRequiredQuantity += req.requiredQuantity;

    // Determine earliest production date
    if (req.productionDate && (!acc.earliestRequiredDate || req.productionDate < acc.earliestRequiredDate)) {
      acc.earliestRequiredDate = req.productionDate;
    }
  });

  // Flag inconsistent UOMs for same RM code
  rmUomTracking.forEach((uoms, rmCode) => {
    if (uoms.size > 1) {
      validationIssues.push({
        id: `rm-inconsistent-uom-${rmCode}`,
        fileName: 'Combined BOM Master',
        sheetName: 'BOM',
        rowNumber: 0,
        columnName: 'Uom',
        issueDescription: `Material code "${rmCode}" is configured with multiple conflicting UOMs: [${Array.from(uoms).join(', ')}]. Requirements cannot be combined across different units.`,
        suggestedCorrection: 'Normalize BOM norms to a consistent UOM (e.g., all KGS or all NOS) in the BOM Master.',
        severity: 'ERROR',
      });
    }
  });

  // 6. Match with Store Stock and calculate Net Position, Shortages, Excess, and Procurement Recommendations
  const consolidatedRequirements: ConsolidatedMaterialRequirement[] = [];
  let sNoCounter = 1;

  consolidatedMap.forEach((consItem) => {
    const stockItem = stockByItemcode.get(consItem.rmCode);
    const isMissingFromStore = !stockItem;

    if (isMissingFromStore) {
      validationIssues.push({
        id: `unmatched-store-rm-${consItem.rmCode}`,
        fileName: 'Store Stock',
        sheetName: 'Stock',
        rowNumber: 0,
        columnName: 'Itemcode',
        issueDescription: `BOM Material "${consItem.rmCode}" (${consItem.rmDesc}) was not found in Store Stock ERP export.`,
        suggestedCorrection: 'Ensure item is present in Store Stock inventory export with exact Itemcode.',
        severity: 'WARNING',
      });
    }

    // Available Stock calculation according to configured basis
    let baseStock = 0;
    let stockBasisLabel = 'Ready Stock For Production';

    if (stockItem) {
      switch (settings.stockBasis) {
        case 'totalClosing':
          baseStock = stockItem.totalClosing;
          stockBasisLabel = 'Total Closing';
          break;
        case 'totalQuantityWipClosing':
          baseStock = stockItem.totalQuantityWipClosing;
          stockBasisLabel = 'Total Quantity (WIP & Closing)';
          break;
        case 'opening':
          baseStock = stockItem.opening;
          stockBasisLabel = 'Opening Stock';
          break;
        case 'readyStockForProduction':
        default:
          baseStock = stockItem.readyStockForProduction;
          stockBasisLabel = 'Ready Stock For Production';
          break;
      }

      if (settings.includeGpPending && stockItem.gpPending > 0) {
        baseStock += stockItem.gpPending;
        stockBasisLabel += ' + GP Pending';
      }
    }

    const availableStock = baseStock;
    const requiredQty = consItem.totalRequiredQuantity;

    // Net Position = Available - Required
    const netPosition = availableStock - requiredQty;
    // Shortage = Max(Required - Available, 0)
    const shortage = isMissingFromStore ? requiredQty : Math.max(requiredQty - availableStock, 0);
    // Excess = Max(Available - Required, 0)
    const excess = isMissingFromStore ? 0 : Math.max(availableStock - requiredQty, 0);

    // Stock Status
    let stockStatus: StockStatus = 'SUFFICIENT';
    if (isMissingFromStore) {
      stockStatus = 'NOT_IN_STORE';
    } else if (shortage > 0) {
      stockStatus = 'SHORTAGE';
    } else if (excess > 0 && requiredQty > 0) {
      stockStatus = 'EXCESS';
    } else {
      stockStatus = 'SUFFICIENT';
    }

    // Lead times & inventory controls
    const totalLeadTime = stockItem?.totalLeadTime || stockItem?.leadtime || 7;
    const moq = stockItem?.moq || 0;
    const reorderLevel = stockItem?.reorderLevel || 0;
    const reorderQty = stockItem?.reorderQty || 0;
    const minStock = stockItem?.minStock || 0;
    const maxStock = stockItem?.maxStock || 0;

    // Procurement recommendation calculation
    let suggestedPurchaseQty = 0;
    let roundingOrMoqAdjustment = '';
    let actionRequired = 'No immediate action required';

    if (shortage > 0) {
      let rawNeed = shortage;
      // If stock after plan (availableStock - requiredQty) falls below minStock, add minStock replenishment
      const bufferDeficit = minStock > 0 ? minStock : (reorderLevel > 0 ? reorderLevel * 0.5 : 0);
      rawNeed += bufferDeficit;

      if (moq > 0) {
        if (rawNeed <= moq) {
          suggestedPurchaseQty = moq;
          roundingOrMoqAdjustment = `Rounded up to MOQ: ${moq.toLocaleString()} ${consItem.uom}`;
        } else {
          // Multiple of MOQ
          suggestedPurchaseQty = Math.ceil(rawNeed / moq) * moq;
          roundingOrMoqAdjustment = `Rounded to nearest MOQ batch: ${suggestedPurchaseQty.toLocaleString()} ${consItem.uom}`;
        }
      } else if (reorderQty > 0 && rawNeed <= reorderQty) {
        suggestedPurchaseQty = reorderQty;
        roundingOrMoqAdjustment = `Matched standard reorder qty: ${reorderQty.toLocaleString()} ${consItem.uom}`;
      } else {
        suggestedPurchaseQty = Math.ceil(rawNeed * 100) / 100;
      }

      actionRequired = `Release PO immediately for ${suggestedPurchaseQty.toLocaleString()} ${consItem.uom} to prevent production stoppage.`;
    } else if (availableStock <= reorderLevel && reorderLevel > 0) {
      // Proactive replenishment
      suggestedPurchaseQty = reorderQty > 0 ? reorderQty : (moq > 0 ? moq : (reorderLevel - availableStock));
      actionRequired = `Stock is at/below Re-order Level (${reorderLevel} ${consItem.uom}). Initiate standard replenishment order.`;
      roundingOrMoqAdjustment = 'Re-order level trigger';
    }

    // Max Stock guardrail
    if (maxStock > 0 && (availableStock + suggestedPurchaseQty) > maxStock) {
      roundingOrMoqAdjustment += ` (Warning: Proposed total ${(availableStock + suggestedPurchaseQty).toLocaleString()} exceeds Max Stock limit of ${maxStock.toLocaleString()})`;
    }

    // Priority
    let procurementPriority: ProcurementPriority = 'NO_ACTION';
    if (shortage > 0) {
      if (totalLeadTime >= settings.criticalLeadTimeThresholdDays || isMissingFromStore) {
        procurementPriority = 'CRITICAL';
      } else if (totalLeadTime >= 10) {
        procurementPriority = 'HIGH';
      } else {
        procurementPriority = 'MEDIUM';
      }
    } else if (availableStock <= reorderLevel && reorderLevel > 0) {
      procurementPriority = 'LOW';
    } else {
      procurementPriority = 'NO_ACTION';
    }

    // Latest Procurement Release Date = Required Production Date - Total Lead Time (Days)
    let latestProcurementReleaseDate: string | undefined = undefined;
    let leadTimeRisk = 'Normal';

    if (consItem.earliestRequiredDate) {
      try {
        const prodDate = new Date(consItem.earliestRequiredDate);
        if (!isNaN(prodDate.getTime())) {
          const releaseDate = new Date(prodDate.getTime() - totalLeadTime * 24 * 60 * 60 * 1000);
          latestProcurementReleaseDate = releaseDate.toISOString().split('T')[0];

          const today = new Date().toISOString().split('T')[0];
          if (latestProcurementReleaseDate < today && shortage > 0) {
            leadTimeRisk = `PO Overdue! (Required release: ${latestProcurementReleaseDate}, Today: ${today})`;
          } else if (shortage > 0) {
            leadTimeRisk = `PO must be released by ${latestProcurementReleaseDate} (${totalLeadTime} days lead time)`;
          }
        }
      } catch {
        leadTimeRisk = `Total Lead Time: ${totalLeadTime} Days`;
      }
    } else {
      leadTimeRisk = shortage > 0 ? `Total Lead Time: ${totalLeadTime} Days (Release immediately)` : 'Stock Sufficient';
    }

    // Costing
    const priceRecord = priceMap.get(`${consItem.rmCode}:::${consItem.uom}`) || priceMap.get(consItem.rmCode);
    const hasRate = Boolean(priceRecord && priceRecord.ratePerUom > 0);
    const rate = hasRate ? priceRecord!.ratePerUom : undefined;
    const currency = priceRecord?.currency || settings.defaultCurrency;
    const totalCost = hasRate ? requiredQty * rate! : undefined;

    // Check UOM mismatch between BOM and Store
    const isUomMismatched = Boolean(stockItem && stockItem.uom && stockItem.uom !== consItem.uom);
    if (isUomMismatched) {
      validationIssues.push({
        id: `uom-mismatch-${consItem.rmCode}`,
        fileName: 'Store Stock',
        sheetName: 'Stock',
        rowNumber: stockItem?.rowNumber || 0,
        columnName: 'UOM',
        issueDescription: `UOM mismatch for RM "${consItem.rmCode}": BOM specifies "${consItem.uom}" but Store Stock has "${stockItem?.uom}".`,
        suggestedCorrection: 'Standardize UOM between BOM and Store Stock ERP records.',
        severity: 'WARNING',
      });
    }

    consolidatedRequirements.push({
      sNo: sNoCounter++,
      rmCode: consItem.rmCode,
      rmDesc: stockItem?.description || consItem.rmDesc,
      uom: consItem.uom,
      totalRequiredQuantity: requiredQty,
      availableStock,
      stockBasisUsed: stockBasisLabel,
      wip: stockItem?.wip || 0,
      totalClosing: stockItem?.totalClosing || 0,
      openingStock: stockItem?.opening || 0,
      receipts: stockItem?.receipts || 0,
      qcIssues: stockItem?.qcIssues || 0,
      loadingIssues: stockItem?.loadingIssue || 0,
      packingIssues: stockItem?.packingIssues || 0,
      holdRejectQty: stockItem?.holdRejectQc || 0,
      gpPending: stockItem?.gpPending || 0,
      netPosition,
      shortage,
      excess,
      stockStatus,
      procurementPriority,
      minStock,
      maxStock,
      reorderLevel,
      moq,
      reorderQty,
      neededQty: stockItem?.neededQty || 0,
      totalLeadTime,
      suggestedPurchaseQty,
      actionRequired,
      roundingOrMoqAdjustment,
      rate,
      currency,
      totalCost,
      hasRate,
      isMissingFromStore,
      isUomMismatched,
      storeUom: stockItem?.uom,
      earliestRequiredDate: consItem.earliestRequiredDate,
      latestProcurementReleaseDate,
      leadTimeRisk,
    });
  });

  // 7. Calculate Dashboard KPIs
  let totalMaterialRequirementQty = 0;
  let sufficientStockCount = 0;
  let shortageCount = 0;
  let excessStockCount = 0;
  let missingFromStoreCount = 0;
  let criticalProcurementCount = 0;
  let estimatedMaterialCost = 0;
  let estimatedProcurementValue = 0;
  let longLeadTimeCount = 0;
  let uncostedRmCount = 0;
  let uncostedQty = 0;
  let totalShortageQty = 0;

  consolidatedRequirements.forEach((item) => {
    totalMaterialRequirementQty += item.totalRequiredQuantity;
    if (item.shortage > 0) {
      shortageCount++;
      totalShortageQty += item.shortage;
    }
    if (item.excess > 0) {
      excessStockCount++;
    }
    if (item.shortage === 0 && !item.isMissingFromStore) {
      sufficientStockCount++;
    }
    if (item.isMissingFromStore) {
      missingFromStoreCount++;
    }
    if (item.procurementPriority === 'CRITICAL' || item.procurementPriority === 'HIGH') {
      criticalProcurementCount++;
    }
    if ((item.totalLeadTime || 0) >= settings.criticalLeadTimeThresholdDays) {
      longLeadTimeCount++;
    }

    if (item.hasRate && item.totalCost !== undefined) {
      estimatedMaterialCost += item.totalCost;
      if (item.suggestedPurchaseQty > 0) {
        estimatedProcurementValue += item.suggestedPurchaseQty * (item.rate || 0);
      }
    } else {
      uncostedRmCount++;
      uncostedQty += item.totalRequiredQuantity;
    }
  });

  const totalUniqueRmCount = consolidatedRequirements.length;
  const stockSufficiencyPct =
    totalUniqueRmCount > 0
      ? Math.round((sufficientStockCount / totalUniqueRmCount) * 100)
      : 100;

  const totalPlannedQty = productionPlanItems.reduce((acc, p) => acc + p.plannedQuantity, 0);

  return {
    consolidatedRequirements,
    skuRequirements,
    validationIssues,
    kpis: {
      totalSkusInPlan: plannedSkusEncountered.size,
      totalPlannedQty,
      totalUniqueRmCount,
      totalMaterialRequirementQty,
      sufficientStockCount,
      shortageCount,
      excessStockCount,
      missingFromStoreCount,
      criticalProcurementCount,
      estimatedMaterialCost,
      estimatedProcurementValue,
      longLeadTimeCount,
      uncostedRmCount,
      uncostedQty,
      totalShortageQty,
      currency: settings.defaultCurrency,
      stockSufficiencyPct,
    },
    calculationTimestamp: timestamp,
  };
}

// ----------------------------------------------------
// VERIFICATION TEST FOR SECTION 15 OF SPECIFICATION
// ----------------------------------------------------
export function verifySampleTestCase(): {
  passed: boolean;
  details: {
    sku1Req: number;
    sku2Req: number;
    consolidatedReq: number;
    availableStock: number;
    shortage: number;
    excess: number;
  };
} {
  const samplePlan: ProductionPlanItem[] = [
    { id: '1', date: '2026-11-15', sku: '7.A.001607', plannedQuantity: 10000, productionUnit: 'BOX' },
    { id: '2', date: '2026-11-15', sku: '7.A.001329', plannedQuantity: 5000, productionUnit: 'BOX' },
  ];

  const sampleBOM: BOMItem[] = [
    {
      sku: '7.A.001607',
      skuName: 'RAJNI GOLD REFINED PALMOLEIN OIL BOX',
      rm: '1.N.009083',
      rmDesc: 'FILM ROLL RAJNI GOLD',
      uom: 'KGS',
      norms: 0.06,
    },
    {
      sku: '7.A.001329',
      skuName: 'RAJNI GOLD REFINED PALMOLEIN OIL',
      rm: '1.N.009083',
      rmDesc: 'FILM ROLL RAJNI GOLD',
      uom: 'KGS',
      norms: 0.09,
    },
  ];

  const sampleStock: StoreStockItem[] = [
    {
      itemcode: '1.N.009083',
      description: 'FILM ROLL RAJNI GOLD',
      uom: 'KGS',
      opening: 800,
      receipts: 0,
      gpPending: 0,
      holdRejectQc: 0,
      others: 0,
      qcIssues: 0,
      loadingIssue: 0,
      packingIssues: 0,
      readyStockForProduction: 800,
      totalClosing: 800,
      wip: 0,
      totalQuantityWipClosing: 800,
      leadtime: 14,
      totalLeadTime: 14,
    },
  ];

  const defaultSettings: AppSettings = {
    stockBasis: 'readyStockForProduction',
    includeGpPending: false,
    defaultProductionUnit: 'BOX',
    unitConversionFactors: { BOX: 1 },
    defaultCurrency: 'INR',
    decimalPrecision: 2,
    criticalLeadTimeThresholdDays: 14,
  };

  const result = runProductionPlanCalculations(sampleBOM, sampleStock, samplePlan, [], defaultSettings);
  const rmItem = result.consolidatedRequirements.find((r) => r.rmCode === '1.N.009083');

  const sku1Req = result.skuRequirements.find((s) => s.sku === '7.A.001607')?.requiredQuantity || 0;
  const sku2Req = result.skuRequirements.find((s) => s.sku === '7.A.001329')?.requiredQuantity || 0;
  const consolidatedReq = rmItem?.totalRequiredQuantity || 0;
  const availableStock = rmItem?.availableStock || 0;
  const shortage = rmItem?.shortage || 0;
  const excess = rmItem?.excess || 0;

  const passed =
    sku1Req === 600 &&
    sku2Req === 450 &&
    consolidatedReq === 1050 &&
    availableStock === 800 &&
    shortage === 250 &&
    excess === 0;

  return {
    passed,
    details: {
      sku1Req,
      sku2Req,
      consolidatedReq,
      availableStock,
      shortage,
      excess,
    },
  };
}
