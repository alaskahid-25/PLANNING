import React from 'react';
import {
  CheckCircle2,
  AlertCircle,
  X,
  FileSpreadsheet,
  Layers,
  Boxes,
  Database,
  ArrowRight,
  Clock,
  Sparkles,
  Upload,
  Calendar,
  DollarSign,
} from 'lucide-react';
import { BOMItem, StoreStockItem, ProductionPlanItem, MaterialPriceItem, LoadedFileInfo } from '../../types';

interface DataLoadVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  bomItems: BOMItem[];
  storeStockItems: StoreStockItem[];
  productionPlanItems: ProductionPlanItem[];
  priceItems: MaterialPriceItem[];
  bomFileInfo: LoadedFileInfo | null;
  stockFileInfo: LoadedFileInfo | null;
  planFileInfo: LoadedFileInfo | null;
  priceFileInfo: LoadedFileInfo | null;
  onConfirmCalculate: () => void;
  onGoToUpload: () => void;
  onLoadDemoData: () => void;
}

export const DataLoadVerificationModal: React.FC<DataLoadVerificationModalProps> = ({
  isOpen,
  onClose,
  bomItems,
  storeStockItems,
  productionPlanItems,
  priceItems,
  bomFileInfo,
  stockFileInfo,
  planFileInfo,
  priceFileInfo,
  onConfirmCalculate,
  onGoToUpload,
  onLoadDemoData,
}) => {
  if (!isOpen) return null;

  const isBomLoaded = bomItems.length > 0;
  const isStockLoaded = storeStockItems.length > 0;
  const isPlanLoaded = productionPlanItems.length > 0;
  const isPriceLoaded = priceItems.length > 0;

  const isAllMandatoryReady = isBomLoaded && isStockLoaded && isPlanLoaded;

  const uniqueSkusInBom = new Set(bomItems.map((b) => b.sku.trim())).size;
  const uniqueSkusInPlan = new Set(productionPlanItems.map((p) => p.sku.trim())).size;
  const planDates = Array.from(new Set(productionPlanItems.map((p) => p.date).filter(Boolean)));

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500 text-slate-950 rounded-lg">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Data Ingestion & Verification Check</h3>
              <p className="text-xs text-slate-400">
                Confirming spreadsheet ingestion before executing inventory calculations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Status Grid */}
        <div className="p-6 space-y-4">
          {/* Overall Readiness Pill */}
          <div
            className={`p-3.5 rounded-lg border flex items-center justify-between text-xs font-medium ${
              isAllMandatoryReady
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-2">
              {isAllMandatoryReady ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>
                {isAllMandatoryReady
                  ? 'All 3 Mandatory Datasets Verified · Ready for Material Requirement Calculation'
                  : 'Calculation Blocked · One or more required production spreadsheets are missing'}
              </span>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                isAllMandatoryReady ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'
              }`}
            >
              {isAllMandatoryReady ? 'Verified Ready' : 'Data Missing'}
            </span>
          </div>

          {/* Cards Checklist */}
          <div className="space-y-3">
            {/* File 1: BOM Master */}
            <div
              className={`p-3.5 rounded-lg border transition-all ${
                isBomLoaded ? 'bg-white border-slate-200' : 'bg-slate-50 border-dashed border-rose-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                      isBomLoaded ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {isBomLoaded ? '✓' : '1'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        Combined SKU + BOM Master
                      </span>
                      <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-semibold uppercase">
                        Mandatory
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {isBomLoaded
                        ? `${bomItems.length} BOM component rows · ${uniqueSkusInBom} Finished Goods SKUs`
                        : 'No BOM data loaded. Please upload the Combined BOM Master.'}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      isBomLoaded
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-100 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {isBomLoaded ? 'Loaded' : 'Not Loaded'}
                  </span>
                  {isBomLoaded && bomFileInfo?.lastUpdated && (
                    <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                      {bomFileInfo.lastUpdated}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* File 2: Store Stock ERP */}
            <div
              className={`p-3.5 rounded-lg border transition-all ${
                isStockLoaded ? 'bg-white border-slate-200' : 'bg-slate-50 border-dashed border-rose-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                      isStockLoaded ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {isStockLoaded ? '✓' : '2'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">Store Stock (ERP Export)</span>
                      <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-semibold uppercase">
                        Mandatory
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {isStockLoaded
                        ? `${storeStockItems.length} Store inventory items (Ready Stock, WIP, Closing)`
                        : 'No Store Stock loaded. Please upload your Store Stock ERP spreadsheet.'}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      isStockLoaded
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-100 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {isStockLoaded ? 'Loaded' : 'Not Loaded'}
                  </span>
                  {isStockLoaded && stockFileInfo?.lastUpdated && (
                    <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                      {stockFileInfo.lastUpdated}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* File 3: Production Plan Schedule */}
            <div
              className={`p-3.5 rounded-lg border transition-all ${
                isPlanLoaded ? 'bg-white border-slate-200' : 'bg-slate-50 border-dashed border-rose-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                      isPlanLoaded ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {isPlanLoaded ? '✓' : '3'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">Production Plan Schedule</span>
                      <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-semibold uppercase">
                        Mandatory
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {isPlanLoaded
                        ? `${productionPlanItems.length} Planned batch items · ${uniqueSkusInPlan} SKUs (${
                            planDates.length > 0 ? `${planDates.length} scheduled dates` : 'Single plan'
                          })`
                        : 'No Production Plan loaded. Upload either standard rows or multi-date schedule matrix.'}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      isPlanLoaded
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-100 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {isPlanLoaded ? 'Loaded' : 'Not Loaded'}
                  </span>
                  {isPlanLoaded && planFileInfo?.lastUpdated && (
                    <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                      {planFileInfo.lastUpdated}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* File 4: Optional Material Price List */}
            <div className="p-3.5 rounded-lg border bg-white border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs">
                    4
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">Material Price List</span>
                      <span className="text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded font-semibold uppercase">
                        Optional
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {isPriceLoaded
                        ? `${priceItems.length} Raw material unit rates loaded for purchase costing`
                        : 'Optional. Not loaded · Default costing or zero rates used if omitted.'}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      isPriceLoaded
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {isPriceLoaded ? 'Loaded' : 'Optional'}
                  </span>
                  {isPriceLoaded && priceFileInfo?.lastUpdated && (
                    <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                      {priceFileInfo.lastUpdated}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">

            <button
              onClick={() => {
                onGoToUpload();
                onClose();
              }}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Go to File Upload</span>
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-3.5 py-2 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-200/60 transition-colors"
            >
              Cancel
            </button>

            <button
              onClick={() => {
                if (isAllMandatoryReady) {
                  onConfirmCalculate();
                  onClose();
                } else {
                  alert(
                    'Cannot calculate inventory requirements: Please ensure BOM Master, Store Stock ERP, and Production Plan are all loaded.'
                  );
                }
              }}
              disabled={!isAllMandatoryReady}
              className={`flex items-center justify-center gap-2 px-5 py-2 rounded-md text-xs font-semibold shadow-sm transition-all ${
                isAllMandatoryReady
                  ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 cursor-pointer'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <span>Confirm & Calculate Inventory</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
