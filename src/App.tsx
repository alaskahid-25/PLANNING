import React, { useState, useMemo, useEffect } from 'react';
import {
  BOMItem,
  StoreStockItem,
  ProductionPlanItem,
  MaterialPriceItem,
  DataValidationIssue,
  AppSettings,
  PlanHistoryRecord,
  LoadedFileInfo,
} from './types';
import {
  runProductionPlanCalculations,
  verifySampleTestCase,
  CalculationResult,
} from './utils/calculationEngine';
import {
  DEMO_BOM_DATA,
  DEMO_STORE_STOCK,
  DEMO_PRODUCTION_PLAN,
  DEMO_MATERIAL_PRICES,
} from './utils/demoData';
import {
  loadSettings,
  saveSettings,
  loadPlanHistory,
  savePlanToHistory,
  deleteHistoryItem,
  clearAllHistory,
} from './utils/storage';
import {
  exportCompleteProductionWorkbook,
  exportCompleteProductionPlanningPdf,
} from './utils/exportUtils';

import { Sidebar, NavTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardView } from './components/dashboard/DashboardView';
import { FileUploadZone } from './components/upload/FileUploadZone';
import { ConsolidatedRequirementView } from './components/reports/ConsolidatedRequirementView';
import { SkuRequirementView } from './components/reports/SkuRequirementView';
import { ShortageReportView } from './components/reports/ShortageReportView';
import { ExcessStockView } from './components/reports/ExcessStockView';
import { ProcurementPlanView } from './components/reports/ProcurementPlanView';
import { MaterialCostingView } from './components/reports/MaterialCostingView';
import { ValidationReportView } from './components/reports/ValidationReportView';
import { StockAnalysisView } from './components/reports/StockAnalysisView';
import { PlanView } from './components/reports/PlanView';
import { AiAssistantView } from './components/ai/AiAssistantView';
import { PlanHistoryView } from './components/history/PlanHistoryView';
import { SettingsView } from './components/settings/SettingsView';
import { CustomSchedulePlannerView } from './components/planner/CustomSchedulePlannerView';
import { DataLoadVerificationModal } from './components/common/DataLoadVerificationModal';
import { EmptyDataState } from './components/common/EmptyDataState';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('upload');
  const [mobileOpen, setMobileOpen] = useState(false);

  // Core Data States (starts clean - no demo data auto-loaded)
  const [bomItems, setBomItems] = useState<BOMItem[]>([]);
  const [storeStockItems, setStoreStockItems] = useState<StoreStockItem[]>([]);
  const [productionPlanItems, setProductionPlanItems] = useState<ProductionPlanItem[]>([]);
  const [priceItems, setPriceItems] = useState<MaterialPriceItem[]>([]);

  // Persistent File Information State
  const [bomFileInfo, setBomFileInfo] = useState<LoadedFileInfo | null>(null);
  const [stockFileInfo, setStockFileInfo] = useState<LoadedFileInfo | null>(null);
  const [planFileInfo, setPlanFileInfo] = useState<LoadedFileInfo | null>(null);
  const [priceFileInfo, setPriceFileInfo] = useState<LoadedFileInfo | null>(null);

  // Strict Calculation & Verification Flags
  const [isCalculated, setIsCalculated] = useState<boolean>(false);
  const [isDemoLoaded, setIsDemoLoaded] = useState<boolean>(false);
  const [showCheckModal, setShowCheckModal] = useState<boolean>(false);

  // Settings & History
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [history, setHistory] = useState<PlanHistoryRecord[]>(() => loadPlanHistory());
  const [customValidationIssues, setCustomValidationIssues] = useState<DataValidationIssue[]>([]);

  // Calculation Engine: STRICTLY ZERO IF NOT CALCULATED OR DATA IS EMPTY
  const calcResult: CalculationResult = useMemo(() => {
    if (
      !isCalculated ||
      bomItems.length === 0 ||
      storeStockItems.length === 0 ||
      productionPlanItems.length === 0
    ) {
      return {
        consolidatedRequirements: [],
        skuRequirements: [],
        validationIssues: customValidationIssues,
        kpis: {
          totalSkusInPlan: 0,
          totalPlannedQty: 0,
          totalUniqueRmCount: 0,
          totalMaterialRequirementQty: 0,
          sufficientStockCount: 0,
          shortageCount: 0,
          excessStockCount: 0,
          missingFromStoreCount: 0,
          criticalProcurementCount: 0,
          estimatedMaterialCost: 0,
          estimatedProcurementValue: 0,
          longLeadTimeCount: 0,
          uncostedRmCount: 0,
          uncostedQty: 0,
          totalShortageQty: 0,
          currency: settings.defaultCurrency,
          stockSufficiencyPct: 0,
        },
        calculationTimestamp: '',
      };
    }

    const res = runProductionPlanCalculations(
      bomItems,
      storeStockItems,
      productionPlanItems,
      priceItems,
      settings
    );

    // Merge parse validation issues
    if (customValidationIssues.length > 0) {
      const mergedMap = new Map<string, DataValidationIssue>();
      [...customValidationIssues, ...res.validationIssues].forEach((iss) => {
        mergedMap.set(iss.id, iss);
      });
      res.validationIssues = Array.from(mergedMap.values());
    }

    return res;
  }, [isCalculated, bomItems, storeStockItems, productionPlanItems, priceItems, settings, customValidationIssues]);

  // Section 15 Test Status
  const testStatus = useMemo(() => {
    return verifySampleTestCase();
  }, []);

  // Save current calculation to history on deliberate calculate or plan changes
  const handleRecalculate = () => {
    if (
      !isCalculated ||
      bomItems.length === 0 ||
      storeStockItems.length === 0 ||
      productionPlanItems.length === 0
    ) {
      return;
    }

    const dates = productionPlanItems.map((p) => p.date).filter(Boolean);
    const minDate = dates.length ? dates.sort()[0] : '2026-11-15';
    const maxDate = dates.length ? dates.sort()[dates.length - 1] : '2026-11-30';

    const newHistoryRecord: PlanHistoryRecord = {
      id: `plan-run-${Date.now()}`,
      planName: `Cooking Oil Run #${history.length + 1} (${productionPlanItems.length} SKUs)`,
      createdAt: new Date().toISOString(),
      productionPeriod: `${minDate} to ${maxDate}`,
      skuCount: calcResult.kpis.totalSkusInPlan,
      totalPlannedQty: calcResult.kpis.totalPlannedQty,
      totalMaterialRequirement: calcResult.kpis.totalMaterialRequirementQty,
      totalShortage: calcResult.kpis.totalShortageQty,
      totalEstimatedCost: calcResult.kpis.estimatedMaterialCost,
      currency: settings.defaultCurrency,
      status:
        calcResult.kpis.shortageCount > 0
          ? 'CRITICAL_SHORTAGES'
          : calcResult.validationIssues.length > 0
          ? 'VALIDATED_WITH_WARNINGS'
          : 'COMPLETED',
      bomItemsCount: bomItems.length,
      storeStockCount: storeStockItems.length,
      dataSnapshot: {
        consolidatedRequirements: calcResult.consolidatedRequirements,
        skuRequirements: calcResult.skuRequirements,
        productionPlan: productionPlanItems,
      },
    };

    const updated = savePlanToHistory(newHistoryRecord);
    setHistory(updated);
  };

  // Pre-load demo data action
  const handleLoadDemoData = () => {
    setBomItems(DEMO_BOM_DATA);
    setStoreStockItems(DEMO_STORE_STOCK);
    setProductionPlanItems(DEMO_PRODUCTION_PLAN);
    setPriceItems(DEMO_MATERIAL_PRICES);
    setBomFileInfo({
      fileName: 'Combined_SKU_BOM_Master.xlsx',
      sheetNames: ['BOM Master'],
      activeSheet: 'BOM Master',
      count: DEMO_BOM_DATA.length,
      lastUpdated: '09 Nov 2026, 08:39 AM',
      fileSize: '48.2 KB',
    });
    setStockFileInfo({
      fileName: 'Store_Stock_ERP_Export.xlsx',
      sheetNames: ['Store Stock ERP'],
      activeSheet: 'Store Stock ERP',
      count: DEMO_STORE_STOCK.length,
      lastUpdated: '09 Nov 2026, 08:39 AM',
      fileSize: '112.5 KB',
    });
    setPlanFileInfo({
      fileName: 'Production_Plan_Schedule.xlsx',
      sheetNames: ['Production Plan'],
      activeSheet: 'Production Plan',
      count: DEMO_PRODUCTION_PLAN.length,
      lastUpdated: '09 Nov 2026, 08:39 AM',
      fileSize: '36.8 KB',
    });
    setPriceFileInfo({
      fileName: 'Standard_Material_Pricelist.xlsx',
      sheetNames: ['Price List'],
      activeSheet: 'Price List',
      count: DEMO_MATERIAL_PRICES.length,
      lastUpdated: '09 Nov 2026, 08:39 AM',
      fileSize: '24.1 KB',
    });
    setCustomValidationIssues([]);
    setIsDemoLoaded(true);
    setIsCalculated(true);
    setActiveTab('dashboard');
  };

  // Clear all loaded data completely
  const handleClearAllData = () => {
    setBomItems([]);
    setStoreStockItems([]);
    setProductionPlanItems([]);
    setPriceItems([]);
    setBomFileInfo(null);
    setStockFileInfo(null);
    setPlanFileInfo(null);
    setPriceFileInfo(null);
    setCustomValidationIssues([]);
    setIsDemoLoaded(false);
    setIsCalculated(false);
  };

  // Confirm and execute calculation when user clicks calculate
  const handleConfirmCalculate = () => {
    if (
      bomItems.length === 0 ||
      storeStockItems.length === 0 ||
      productionPlanItems.length === 0
    ) {
      setShowCheckModal(true);
      return;
    }
    setIsCalculated(true);
    setActiveTab('dashboard');
  };

  // Inline update rate from Material Costing view
  const handleUpdateRate = (rmCode: string, newRate: number, uom: string) => {
    setPriceItems((prev) => {
      const existingIdx = prev.findIndex((p) => p.rmCode === rmCode);
      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = {
          ...copy[existingIdx],
          ratePerUom: newRate,
        };
        return copy;
      } else {
        return [
          ...prev,
          {
            rmCode,
            materialDescription: rmCode,
            uom,
            ratePerUom: newRate,
            currency: settings.defaultCurrency,
          },
        ];
      }
    });
  };

  // Reload an archived plan
  const handleReloadPlan = (record: PlanHistoryRecord) => {
    if (record.dataSnapshot?.productionPlan) {
      setProductionPlanItems(record.dataSnapshot.productionPlan);
      setActiveTab('dashboard');
    }
  };

  const handleExportAll = () => {
    exportCompleteProductionWorkbook(
      calcResult.consolidatedRequirements,
      calcResult.skuRequirements,
      productionPlanItems,
      calcResult.validationIssues
    );
  };

  // Plan period formatted
  const planPeriodText = useMemo(() => {
    const dates = productionPlanItems.map((p) => p.date).filter(Boolean);
    if (!dates.length) return '';
    const sorted = [...dates].sort();
    return `${sorted[0]} → ${sorted[sorted.length - 1]}`;
  }, [productionPlanItems]);

  const stockBasisLabel = useMemo(() => {
    switch (settings.stockBasis) {
      case 'totalClosing':
        return 'Total Closing Stock';
      case 'totalQuantityWipClosing':
        return 'Total Quantity (WIP & Closing)';
      case 'opening':
        return 'Opening Stock';
      case 'readyStockForProduction':
      default:
        return 'Ready Stock For Production';
    }
  }, [settings.stockBasis]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Left Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        shortageCount={isCalculated ? calcResult.kpis.shortageCount : 0}
        criticalProcurementCount={isCalculated ? calcResult.kpis.criticalProcurementCount : 0}
        validationIssueCount={isCalculated ? calcResult.validationIssues.length : 0}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Top Header */}
        <Header
          onToggleMobile={() => setMobileOpen(!mobileOpen)}
          onLoadDemoData={handleLoadDemoData}
          onVerifyTestCase={() => setActiveTab('settings')}
          onExportAll={handleExportAll}
          onRecalculate={handleRecalculate}
          planPeriodText={planPeriodText}
          isDemoLoaded={isDemoLoaded}
          testCasePassed={testStatus.passed}
          isCalculated={isCalculated}
          onOpenCheckModal={() => setShowCheckModal(true)}
        />

        {/* View Content Port */}
        <main className="flex-1 p-3 sm:p-4 max-w-[1560px] w-full mx-auto">
          {activeTab === 'upload' && (
            <FileUploadZone
              bomItems={bomItems}
              setBomItems={(items) => {
                setBomItems(items);
                setIsDemoLoaded(false);
                setIsCalculated(false);
              }}
              storeStockItems={storeStockItems}
              setStoreStockItems={(items) => {
                setStoreStockItems(items);
                setIsDemoLoaded(false);
                setIsCalculated(false);
              }}
              productionPlanItems={productionPlanItems}
              setProductionPlanItems={(items) => {
                setProductionPlanItems(items);
                setIsDemoLoaded(false);
                setIsCalculated(false);
              }}
              priceItems={priceItems}
              setPriceItems={setPriceItems}
              bomFileInfo={bomFileInfo}
              setBomFileInfo={setBomFileInfo}
              stockFileInfo={stockFileInfo}
              setStockFileInfo={setStockFileInfo}
              planFileInfo={planFileInfo}
              setPlanFileInfo={setPlanFileInfo}
              priceFileInfo={priceFileInfo}
              setPriceFileInfo={setPriceFileInfo}
              isCalculated={isCalculated}
              onAddValidationIssues={(newIssues) => {
                setCustomValidationIssues((prev) => [...prev, ...newIssues]);
              }}
              onCalculate={handleConfirmCalculate}
              onClearAllData={handleClearAllData}
              onOpenCheckModal={() => setShowCheckModal(true)}
            />
          )}

          {activeTab === 'production-plan' && (
            <PlanView
              planItems={productionPlanItems}
              onUpdatePlan={(items) => {
                setProductionPlanItems(items);
                setIsDemoLoaded(false);
                setIsCalculated(false);
              }}
              onRecalculate={handleRecalculate}
            />
          )}

          {activeTab === 'custom-scheduler' && (
            <CustomSchedulePlannerView
              bomItems={bomItems}
              storeStockItems={storeStockItems}
              productionPlanItems={productionPlanItems}
              priceItems={priceItems}
              settings={settings}
              isCalculated={isCalculated}
              onGoToUpload={() => setActiveTab('upload')}
              onOpenCheckModal={() => setShowCheckModal(true)}
            />
          )}

          {/* Analytical views: strictly display EmptyDataState if data is cleared or not calculated */}
          {activeTab === 'dashboard' &&
            (!isCalculated || bomItems.length === 0 ? (
              <EmptyDataState
                title="No Dashboard Inventory Calculated"
                description="All data has been cleared or spreadsheets have not been loaded yet. In compliance with strict plant control rules, calculation executes only when valid production files are loaded."
                bomItems={bomItems}
                storeStockItems={storeStockItems}
                productionPlanItems={productionPlanItems}
                onOpenCheckModal={() => setShowCheckModal(true)}
                onGoToUpload={() => setActiveTab('upload')}
                onLoadDemoData={handleLoadDemoData}
              />
            ) : (
              <DashboardView
                calcResult={calcResult}
                onNavigate={(tab) => setActiveTab(tab)}
                stockBasis={stockBasisLabel}
              />
            ))}

          {activeTab === 'consolidated-rm' &&
            (!isCalculated || bomItems.length === 0 ? (
              <EmptyDataState
                title="No Consolidated RM Requirements"
                description="Data has been cleared. To compute aggregated raw and packaging material requirements, upload your files or load the demo dataset."
                bomItems={bomItems}
                storeStockItems={storeStockItems}
                productionPlanItems={productionPlanItems}
                onOpenCheckModal={() => setShowCheckModal(true)}
                onGoToUpload={() => setActiveTab('upload')}
                onLoadDemoData={handleLoadDemoData}
              />
            ) : (
              <ConsolidatedRequirementView
                items={calcResult.consolidatedRequirements}
                skuRequirements={calcResult.skuRequirements}
                stockBasis={stockBasisLabel}
              />
            ))}

          {activeTab === 'sku-requirements' &&
            (!isCalculated || bomItems.length === 0 ? (
              <EmptyDataState
                title="No SKU-Wise Requirements Calculated"
                description="Data has been cleared. SKU-level BOM calculations require loaded production schedules and BOM component norms."
                bomItems={bomItems}
                storeStockItems={storeStockItems}
                productionPlanItems={productionPlanItems}
                onOpenCheckModal={() => setShowCheckModal(true)}
                onGoToUpload={() => setActiveTab('upload')}
                onLoadDemoData={handleLoadDemoData}
              />
            ) : (
              <SkuRequirementView skuRequirements={calcResult.skuRequirements} />
            ))}

          {activeTab === 'stock-analysis' &&
            (!isCalculated || storeStockItems.length === 0 ? (
              <EmptyDataState
                title="No Store Stock Inventory Analysis"
                description="Store stock inventory data is not loaded or has been cleared. Upload Store Stock ERP export to analyze ready stock, WIP, and closing levels."
                bomItems={bomItems}
                storeStockItems={storeStockItems}
                productionPlanItems={productionPlanItems}
                onOpenCheckModal={() => setShowCheckModal(true)}
                onGoToUpload={() => setActiveTab('upload')}
                onLoadDemoData={handleLoadDemoData}
              />
            ) : (
              <StockAnalysisView
                storeStockItems={storeStockItems}
                consolidatedRequirements={calcResult.consolidatedRequirements}
                stockBasis={stockBasisLabel}
              />
            ))}

          {activeTab === 'shortage-analysis' &&
            (!isCalculated || bomItems.length === 0 ? (
              <EmptyDataState
                title="No Shortage Analysis Available"
                description="Data has been cleared. Calculation is stopped until new files are loaded."
                bomItems={bomItems}
                storeStockItems={storeStockItems}
                productionPlanItems={productionPlanItems}
                onOpenCheckModal={() => setShowCheckModal(true)}
                onGoToUpload={() => setActiveTab('upload')}
                onLoadDemoData={handleLoadDemoData}
              />
            ) : (
              <ShortageReportView items={calcResult.consolidatedRequirements} />
            ))}

          {activeTab === 'excess-stock' &&
            (!isCalculated || bomItems.length === 0 ? (
              <EmptyDataState
                title="No Excess Stock Data Available"
                description="Data has been cleared. Calculation is stopped until new files are loaded."
                bomItems={bomItems}
                storeStockItems={storeStockItems}
                productionPlanItems={productionPlanItems}
                onOpenCheckModal={() => setShowCheckModal(true)}
                onGoToUpload={() => setActiveTab('upload')}
                onLoadDemoData={handleLoadDemoData}
              />
            ) : (
              <ExcessStockView items={calcResult.consolidatedRequirements} />
            ))}

          {activeTab === 'procurement-plan' &&
            (!isCalculated || bomItems.length === 0 ? (
              <EmptyDataState
                title="No Procurement Orders Generated"
                description="Data has been cleared. Calculation is stopped until new files are loaded."
                bomItems={bomItems}
                storeStockItems={storeStockItems}
                productionPlanItems={productionPlanItems}
                onOpenCheckModal={() => setShowCheckModal(true)}
                onGoToUpload={() => setActiveTab('upload')}
                onLoadDemoData={handleLoadDemoData}
              />
            ) : (
              <ProcurementPlanView items={calcResult.consolidatedRequirements} />
            ))}

          {activeTab === 'material-costing' &&
            (!isCalculated || bomItems.length === 0 ? (
              <EmptyDataState
                title="No Material Costing Calculated"
                description="Data has been cleared. Calculation is stopped until new files are loaded."
                bomItems={bomItems}
                storeStockItems={storeStockItems}
                productionPlanItems={productionPlanItems}
                onOpenCheckModal={() => setShowCheckModal(true)}
                onGoToUpload={() => setActiveTab('upload')}
                onLoadDemoData={handleLoadDemoData}
              />
            ) : (
              <MaterialCostingView
                items={calcResult.consolidatedRequirements}
                skuRequirements={calcResult.skuRequirements}
                priceItems={priceItems}
                onUpdateRate={handleUpdateRate}
                currency={settings.defaultCurrency}
              />
            ))}

          {activeTab === 'ai-summary' &&
            (!isCalculated || bomItems.length === 0 ? (
              <EmptyDataState
                title="No Production Executive Summary"
                description="Data has been cleared. Calculation is stopped until new files are loaded."
                bomItems={bomItems}
                storeStockItems={storeStockItems}
                productionPlanItems={productionPlanItems}
                onOpenCheckModal={() => setShowCheckModal(true)}
                onGoToUpload={() => setActiveTab('upload')}
                onLoadDemoData={handleLoadDemoData}
              />
            ) : (
              <AiAssistantView
                calcResult={calcResult}
                stockBasis={stockBasisLabel}
              />
            ))}

          {activeTab === 'data-validation' && (
            <ValidationReportView issues={calcResult.validationIssues} />
          )}

          {activeTab === 'plan-history' && (
            <PlanHistoryView
              history={history}
              onReloadPlan={handleReloadPlan}
              onDeleteHistory={(id: string) => setHistory(deleteHistoryItem(id))}
              onClearHistory={() => {
                clearAllHistory();
                setHistory([]);
              }}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              settings={settings}
              onSaveSettings={(s) => {
                setSettings(s);
                saveSettings(s);
              }}
              onRecalculate={handleRecalculate}
            />
          )}
        </main>
      </div>

      {/* Global Data Load & Pre-Calculation Verification Modal */}
      <DataLoadVerificationModal
        isOpen={showCheckModal}
        onClose={() => setShowCheckModal(false)}
        bomItems={bomItems}
        storeStockItems={storeStockItems}
        productionPlanItems={productionPlanItems}
        priceItems={priceItems}
        bomFileInfo={bomFileInfo}
        stockFileInfo={stockFileInfo}
        planFileInfo={planFileInfo}
        priceFileInfo={priceFileInfo}
        onConfirmCalculate={handleConfirmCalculate}
        onGoToUpload={() => setActiveTab('upload')}
        onLoadDemoData={handleLoadDemoData}
      />
    </div>
  );
};

export default App;
