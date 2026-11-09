import React from 'react';
import {
  Database,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { BOMItem, StoreStockItem, ProductionPlanItem } from '../../types';

interface EmptyDataStateProps {
  title?: string;
  description?: string;
  bomItems: BOMItem[];
  storeStockItems: StoreStockItem[];
  productionPlanItems: ProductionPlanItem[];
  onOpenCheckModal: () => void;
  onGoToUpload: () => void;
  onLoadDemoData: () => void;
}

export const EmptyDataState: React.FC<EmptyDataStateProps> = ({
  title = 'No Production Inventory Data Calculated',
  description = 'Data has been cleared or spreadsheets have not been loaded yet. In compliance with strict plant control rules, no material requirements or inventory metrics are calculated when data is empty.',
  bomItems,
  storeStockItems,
  productionPlanItems,
  onOpenCheckModal,
  onGoToUpload,
  onLoadDemoData,
}) => {
  const isBomReady = bomItems.length > 0;
  const isStockReady = storeStockItems.length > 0;
  const isPlanReady = productionPlanItems.length > 0;
  const isAllReady = isBomReady && isStockReady && isPlanReady;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-8 sm:p-12 text-center max-w-3xl mx-auto shadow-sm my-6">
      <div className="w-16 h-16 bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-500 shadow-inner">
        <Database className="w-8 h-8 text-slate-700" />
      </div>

      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold mb-3">
        <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
        <span>Strict Plant Calculation Rule · No Stale Data</span>
      </div>

      <h2 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h2>
      <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto mt-2 leading-relaxed">
        {description}
      </p>

      {/* Spreadsheet Status Matrix */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
        <div
          className={`p-3.5 rounded-lg border ${
            isBomReady ? 'bg-emerald-50/60 border-emerald-200' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-slate-400">File 1</span>
            {isBomReady ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-slate-300" />
            )}
          </div>
          <div className="text-xs font-bold text-slate-800 mt-1">BOM Master</div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {isBomReady ? `${bomItems.length} components loaded` : 'Not loaded · Empty'}
          </div>
        </div>

        <div
          className={`p-3.5 rounded-lg border ${
            isStockReady ? 'bg-emerald-50/60 border-emerald-200' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-slate-400">File 2</span>
            {isStockReady ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-slate-300" />
            )}
          </div>
          <div className="text-xs font-bold text-slate-800 mt-1">Store Stock ERP</div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {isStockReady ? `${storeStockItems.length} items loaded` : 'Not loaded · Empty'}
          </div>
        </div>

        <div
          className={`p-3.5 rounded-lg border ${
            isPlanReady ? 'bg-emerald-50/60 border-emerald-200' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-slate-400">File 3</span>
            {isPlanReady ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-slate-300" />
            )}
          </div>
          <div className="text-xs font-bold text-slate-800 mt-1">Production Plan</div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {isPlanReady ? `${productionPlanItems.length} batches scheduled` : 'Not loaded · Empty'}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
        {isAllReady ? (
          <button
            onClick={onOpenCheckModal}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-md text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors shadow-sm cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Check Data Loaded & Calculate Inventory</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={onGoToUpload}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-md text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-sm cursor-pointer"
          >
            <Upload className="w-4 h-4 text-slate-300" />
            <span>Go to Excel Upload Zone</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
