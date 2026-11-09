import React, { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Download,
  Settings2,
  Table,
  ArrowRight,
  Info,
  RefreshCw,
  Clock,
  Calendar,
  Sparkles,
  Layers,
  FileText,
  Trash2,
} from 'lucide-react';
import {
  readExcelFile,
  getSheetData,
  autoDetectBOMColumns,
  parseBOMRows,
  autoDetectStockColumns,
  parseStockRows,
  autoDetectPlanColumns,
  parsePlanRows,
  autoDetectPriceColumns,
  parsePriceRows,
} from '../../utils/excelParser';
import {
  BOMItem,
  StoreStockItem,
  ProductionPlanItem,
  MaterialPriceItem,
  DataValidationIssue,
  LoadedFileInfo,
} from '../../types';
import {
  downloadSampleExcel,
  downloadNextFewDaysPlanMatrixExcel,
  DEMO_NEXT_FEW_DAYS_PLAN,
} from '../../utils/demoData';

interface FileUploadZoneProps {
  bomItems: BOMItem[];
  setBomItems: (items: BOMItem[]) => void;
  storeStockItems: StoreStockItem[];
  setStoreStockItems: (items: StoreStockItem[]) => void;
  productionPlanItems: ProductionPlanItem[];
  setProductionPlanItems: (items: ProductionPlanItem[]) => void;
  priceItems: MaterialPriceItem[];
  setPriceItems: (items: MaterialPriceItem[]) => void;
  bomFileInfo: LoadedFileInfo | null;
  setBomFileInfo: React.Dispatch<React.SetStateAction<LoadedFileInfo | null>>;
  stockFileInfo: LoadedFileInfo | null;
  setStockFileInfo: React.Dispatch<React.SetStateAction<LoadedFileInfo | null>>;
  planFileInfo: LoadedFileInfo | null;
  setPlanFileInfo: React.Dispatch<React.SetStateAction<LoadedFileInfo | null>>;
  priceFileInfo: LoadedFileInfo | null;
  setPriceFileInfo: React.Dispatch<React.SetStateAction<LoadedFileInfo | null>>;
  isCalculated: boolean;
  onAddValidationIssues: (issues: DataValidationIssue[]) => void;
  onCalculate: () => void;
  onClearAllData?: () => void;
  onOpenCheckModal: () => void;
}

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  bomItems,
  setBomItems,
  storeStockItems,
  setStoreStockItems,
  productionPlanItems,
  setProductionPlanItems,
  priceItems,
  setPriceItems,
  bomFileInfo,
  setBomFileInfo,
  stockFileInfo,
  setStockFileInfo,
  planFileInfo,
  setPlanFileInfo,
  priceFileInfo,
  setPriceFileInfo,
  isCalculated,
  onAddValidationIssues,
  onCalculate,
  onClearAllData,
  onOpenCheckModal,
}) => {
  const [loadingType, setLoadingType] = useState<string | null>(null);
  const [mappingModal, setMappingModal] = useState<{
    type: 'BOM' | 'STOCK' | 'PLAN' | 'PRICES';
    info: LoadedFileInfo;
  } | null>(null);

  const bomInputRef = useRef<HTMLInputElement>(null);
  const stockInputRef = useRef<HTMLInputElement>(null);
  const planInputRef = useRef<HTMLInputElement>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getNowFormatted = (): string => {
    const now = new Date();
    return now.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  // 1. Process BOM File
  const handleBOMFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoadingType('BOM');

    try {
      const { fileName, sheetNames, workbook } = await readExcelFile(file);
      const activeSheet = sheetNames[0];
      const { headers, rows } = getSheetData(workbook, activeSheet);
      const mapping = autoDetectBOMColumns(headers);

      const { items, issues } = parseBOMRows(rows, mapping, fileName, activeSheet);
      setBomItems(items);
      onAddValidationIssues(issues);

      setBomFileInfo({
        fileName,
        sheetNames,
        activeSheet,
        count: items.length,
        lastUpdated: getNowFormatted(),
        fileSize: formatFileSize(file.size),
        rawWorkbook: workbook,
        headers,
        rows,
        columnMapping: mapping,
      });
    } catch (err: any) {
      alert(`Error reading BOM Excel file: ${err.message}`);
    } finally {
      setLoadingType(null);
      if (e.target) e.target.value = '';
    }
  };

  // 2. Process Store Stock File
  const handleStockFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoadingType('STOCK');

    try {
      const { fileName, sheetNames, workbook } = await readExcelFile(file);
      const activeSheet = sheetNames[0];
      const { headers, rows } = getSheetData(workbook, activeSheet);
      const mapping = autoDetectStockColumns(headers);

      const { items, issues } = parseStockRows(rows, mapping, fileName, activeSheet);
      setStoreStockItems(items);
      onAddValidationIssues(issues);

      setStockFileInfo({
        fileName,
        sheetNames,
        activeSheet,
        count: items.length,
        lastUpdated: getNowFormatted(),
        fileSize: formatFileSize(file.size),
        rawWorkbook: workbook,
        headers,
        rows,
        columnMapping: mapping,
      });
    } catch (err: any) {
      alert(`Error reading Store Stock Excel file: ${err.message}`);
    } finally {
      setLoadingType(null);
      if (e.target) e.target.value = '';
    }
  };

  // 3. Process Production Plan File (Supports standard row & horizontal date matrix)
  const handlePlanFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoadingType('PLAN');

    try {
      const { fileName, sheetNames, workbook } = await readExcelFile(file);
      const activeSheet = sheetNames[0];
      const { headers, rows } = getSheetData(workbook, activeSheet);
      const { mapping, isMatrixFormat, dateColumns } = autoDetectPlanColumns(headers);

      const { items, issues, isMatrix } = parsePlanRows(
        rows,
        mapping,
        fileName,
        activeSheet,
        'BOXES',
        isMatrixFormat ? dateColumns : []
      );

      setProductionPlanItems(items);
      onAddValidationIssues(issues);

      setPlanFileInfo({
        fileName,
        sheetNames,
        activeSheet,
        count: items.length,
        lastUpdated: getNowFormatted(),
        fileSize: formatFileSize(file.size),
        rawWorkbook: workbook,
        headers,
        rows,
        columnMapping: mapping,
        isMatrix,
        dateColumns,
      });
    } catch (err: any) {
      alert(`Error reading Production Plan Excel file: ${err.message}`);
    } finally {
      setLoadingType(null);
      if (e.target) e.target.value = '';
    }
  };

  // 4. Optional Price List File
  const handlePriceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoadingType('PRICE');

    try {
      const { fileName, sheetNames, workbook } = await readExcelFile(file);
      const activeSheet = sheetNames[0];
      const { headers, rows } = getSheetData(workbook, activeSheet);
      const mapping = autoDetectPriceColumns(headers);

      const items = parsePriceRows(rows, mapping);
      setPriceItems(items);

      setPriceFileInfo({
        fileName,
        sheetNames,
        activeSheet,
        count: items.length,
        lastUpdated: getNowFormatted(),
        fileSize: formatFileSize(file.size),
        rawWorkbook: workbook,
        headers,
        rows,
        columnMapping: mapping,
      });
    } catch (err: any) {
      alert(`Error reading Price List Excel file: ${err.message}`);
    } finally {
      setLoadingType(null);
      if (e.target) e.target.value = '';
    }
  };

  // Change sheet for multi-sheet workbooks
  const handleChangeSheet = (type: 'BOM' | 'STOCK' | 'PLAN', newSheet: string) => {
    if (type === 'BOM' && bomFileInfo) {
      const { headers, rows } = getSheetData(bomFileInfo.rawWorkbook, newSheet);
      const mapping = autoDetectBOMColumns(headers);
      const { items, issues } = parseBOMRows(rows, mapping, bomFileInfo.fileName, newSheet);
      setBomItems(items);
      onAddValidationIssues(issues);
      setBomFileInfo({
        ...bomFileInfo,
        activeSheet: newSheet,
        headers,
        rows,
        count: items.length,
        lastUpdated: getNowFormatted(),
        columnMapping: mapping,
      });
    } else if (type === 'STOCK' && stockFileInfo) {
      const { headers, rows } = getSheetData(stockFileInfo.rawWorkbook, newSheet);
      const mapping = autoDetectStockColumns(headers);
      const { items, issues } = parseStockRows(rows, mapping, stockFileInfo.fileName, newSheet);
      setStoreStockItems(items);
      onAddValidationIssues(issues);
      setStockFileInfo({
        ...stockFileInfo,
        activeSheet: newSheet,
        headers,
        rows,
        count: items.length,
        lastUpdated: getNowFormatted(),
        columnMapping: mapping,
      });
    } else if (type === 'PLAN' && planFileInfo) {
      const { headers, rows } = getSheetData(planFileInfo.rawWorkbook, newSheet);
      const { mapping, isMatrixFormat, dateColumns } = autoDetectPlanColumns(headers);
      const { items, issues, isMatrix } = parsePlanRows(
        rows,
        mapping,
        planFileInfo.fileName,
        newSheet,
        'BOXES',
        isMatrixFormat ? dateColumns : []
      );
      setProductionPlanItems(items);
      onAddValidationIssues(issues);
      setPlanFileInfo({
        ...planFileInfo,
        activeSheet: newSheet,
        headers,
        rows,
        count: items.length,
        lastUpdated: getNowFormatted(),
        columnMapping: mapping,
        isMatrix,
        dateColumns,
      });
    }
  };

  // Re-parse with updated column mappings
  const handleSaveMapping = (updatedMapping: Record<string, string>) => {
    if (!mappingModal) return;
    const { type, info } = mappingModal;

    if (type === 'BOM' && info.rows) {
      const { items, issues } = parseBOMRows(info.rows, updatedMapping, info.fileName, info.activeSheet);
      setBomItems(items);
      onAddValidationIssues(issues);
      setBomFileInfo({ ...info, count: items.length, columnMapping: updatedMapping, lastUpdated: getNowFormatted() });
    } else if (type === 'STOCK' && info.rows) {
      const { items, issues } = parseStockRows(info.rows, updatedMapping, info.fileName, info.activeSheet);
      setStoreStockItems(items);
      onAddValidationIssues(issues);
      setStockFileInfo({ ...info, count: items.length, columnMapping: updatedMapping, lastUpdated: getNowFormatted() });
    } else if (type === 'PLAN' && info.rows) {
      const { items, issues, isMatrix } = parsePlanRows(
        info.rows,
        updatedMapping,
        info.fileName,
        info.activeSheet,
        'BOXES',
        info.dateColumns || []
      );
      setProductionPlanItems(items);
      onAddValidationIssues(issues);
      setPlanFileInfo({ ...info, count: items.length, columnMapping: updatedMapping, isMatrix, lastUpdated: getNowFormatted() });
    }
    setMappingModal(null);
  };

  // Clear all uploaded data with confirmation
  const handleClearAllData = () => {
    const hasData =
      bomItems.length > 0 ||
      storeStockItems.length > 0 ||
      productionPlanItems.length > 0 ||
      priceItems.length > 0 ||
      bomFileInfo !== null ||
      stockFileInfo !== null ||
      planFileInfo !== null ||
      priceFileInfo !== null;

    if (!hasData) {
      alert('Upload area is already empty. No data to clear.');
      return;
    }

    const confirmed = window.confirm(
      'Are you sure you want to clear all data?\n\nThis will remove all loaded BOM Master items, Store Stock records, Production Plan schedules, and Material Prices.'
    );
    if (!confirmed) return;

    setBomItems([]);
    setStoreStockItems([]);
    setProductionPlanItems([]);
    setPriceItems([]);
    setBomFileInfo(null);
    setStockFileInfo(null);
    setPlanFileInfo(null);
    setPriceFileInfo(null);

    if (bomInputRef.current) bomInputRef.current.value = '';
    if (stockInputRef.current) stockInputRef.current.value = '';
    if (planInputRef.current) planInputRef.current.value = '';
    if (priceInputRef.current) priceInputRef.current.value = '';

    if (onClearAllData) {
      onClearAllData();
    }
  };

  // Helper action to load the 3-day matrix plan if requested
  const handleLoadNextDaysPlan = () => {
    setProductionPlanItems(DEMO_NEXT_FEW_DAYS_PLAN);
    setPlanFileInfo({
      fileName: 'Next_Few_Days_Production_Plan_Matrix.xlsx',
      sheetNames: ['Next Few Days Plan'],
      activeSheet: 'Next Few Days Plan',
      count: DEMO_NEXT_FEW_DAYS_PLAN.length,
      lastUpdated: getNowFormatted(),
      fileSize: '32.4 KB',
      isMatrix: true,
      dateColumns: ['09-11-2026', '10-11-2026', '11-11-2026'],
    });
  };

  const isAllFilesReady = bomItems.length > 0 && storeStockItems.length > 0 && productionPlanItems.length > 0;

  return (
    <div className="space-y-6">
      {/* Overview Intro Banner with Global Sync Timestamp */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Excel Master & Transaction File Ingestion
              </h2>
              <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded">
                Real-Time File Sync Active
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Upload your company's core spreadsheets: Combined SKU + BOM Master, Store Stock ERP export, and Production Plan.
              The parser automatically detects headers, supports multi-sheet workbooks, and tracks exact modification timestamps.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Clear Data Option */}
            <button
              onClick={handleClearAllData}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-md text-xs font-semibold bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 hover:border-rose-300 transition-colors shadow-2xs cursor-pointer"
              title="Clear and reset all uploaded spreadsheet data"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Clear Data</span>
            </button>

            {/* Check Data Loaded & Calculate Button */}
            <button
              onClick={() => {
                onOpenCheckModal();
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-xs font-semibold transition-all shadow-sm cursor-pointer ${
                isAllFilesReady
                  ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
              title="Check whether data is really loaded before calculating"
            >
              <FileSpreadsheet className="w-4 h-4 text-amber-400" />
              <span>{isAllFilesReady ? 'Check Data Loaded & Calculate' : 'Check Data Load Status'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Global Sync Status Bar with Last Updated Times */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <Clock className={`w-3.5 h-3.5 ${bomFileInfo && bomItems.length > 0 ? 'text-amber-500' : 'text-slate-300'} shrink-0`} />
            <div className="truncate">
              <span className="text-slate-400 block text-[10px]">BOM MASTER UPDATED</span>
              <span className={`font-semibold font-mono text-[11px] ${bomFileInfo && bomItems.length > 0 ? 'text-slate-800' : 'text-slate-400'}`}>
                {bomFileInfo && bomItems.length > 0 ? bomFileInfo.lastUpdated : 'Not loaded'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-600">
            <Clock className={`w-3.5 h-3.5 ${stockFileInfo && storeStockItems.length > 0 ? 'text-amber-500' : 'text-slate-300'} shrink-0`} />
            <div className="truncate">
              <span className="text-slate-400 block text-[10px]">STORE STOCK UPDATED</span>
              <span className={`font-semibold font-mono text-[11px] ${stockFileInfo && storeStockItems.length > 0 ? 'text-slate-800' : 'text-slate-400'}`}>
                {stockFileInfo && storeStockItems.length > 0 ? stockFileInfo.lastUpdated : 'Not loaded'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-600">
            <Clock className={`w-3.5 h-3.5 ${planFileInfo && productionPlanItems.length > 0 ? 'text-amber-500' : 'text-slate-300'} shrink-0`} />
            <div className="truncate">
              <span className="text-slate-400 block text-[10px]">PROD PLAN UPDATED</span>
              <span className={`font-semibold font-mono text-[11px] ${planFileInfo && productionPlanItems.length > 0 ? 'text-slate-800' : 'text-slate-400'}`}>
                {planFileInfo && productionPlanItems.length > 0 ? planFileInfo.lastUpdated : 'Not loaded'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-600">
            <Clock className={`w-3.5 h-3.5 ${priceFileInfo && priceItems.length > 0 ? 'text-amber-500' : 'text-slate-300'} shrink-0`} />
            <div className="truncate">
              <span className="text-slate-400 block text-[10px]">PRICE LIST UPDATED</span>
              <span className={`font-semibold font-mono text-[11px] ${priceFileInfo && priceItems.length > 0 ? 'text-slate-800' : 'text-slate-400'}`}>
                {priceFileInfo && priceItems.length > 0 ? priceFileInfo.lastUpdated : 'Not loaded'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of 3 Primary Upload Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* FILE 1: COMBINED SKU + BOM MASTER */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between shadow-sm hover:border-slate-300 transition-colors">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded uppercase tracking-wider">
                File 1 · Mandatory
              </span>
              <button
                onClick={() => downloadSampleExcel('BOM')}
                className="text-[11px] font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1"
                title="Download standard BOM Master template"
              >
                <Download className="w-3 h-3" />
                <span>Template</span>
              </button>
            </div>

            <h3 className="text-sm font-bold text-slate-900 mt-3">Combined SKU Master + BOM Master</h3>
            <p className="text-xs text-slate-500 mt-1">
              Maintained in 1 Excel file. Exactly 6 columns: SKU, SKU name, RM, RM dec, Uom, Norms.
            </p>

            {/* Hidden Input */}
            <input
              type="file"
              ref={bomInputRef}
              onChange={handleBOMFile}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />

            {/* Upload Box */}
            <div
              onClick={() => bomInputRef.current?.click()}
              className="mt-4 border-2 border-dashed border-slate-200 hover:border-amber-400 rounded-lg p-5 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-amber-50/20"
            >
              <FileSpreadsheet className="w-8 h-8 text-amber-600 mx-auto mb-2" />
              <div className="text-xs font-semibold text-slate-800">
                {loadingType === 'BOM' ? 'Parsing BOM Master...' : 'Click to upload BOM Master (.xlsx)'}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Supports multi-sheet & text codes</div>
            </div>

            {/* Status with Date and Time of Last Updated */}
            {bomFileInfo && bomItems.length > 0 && (
              <div className="mt-4 p-3 bg-emerald-50/70 border border-emerald-200 rounded-md space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{bomItems.length} BOM components loaded</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setMappingModal({ type: 'BOM', info: bomFileInfo })}
                      className="text-[11px] text-emerald-700 hover:underline flex items-center gap-0.5 font-medium"
                    >
                      <Settings2 className="w-3 h-3" />
                      <span>Map Cols</span>
                    </button>
                    <button
                      onClick={() => {
                        setBomItems([]);
                        setBomFileInfo(null);
                        if (bomInputRef.current) bomInputRef.current.value = '';
                      }}
                      className="text-[11px] text-rose-600 hover:text-rose-800 hover:underline flex items-center gap-0.5 font-medium cursor-pointer"
                      title="Clear BOM Master file"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Clear</span>
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-emerald-200/60 text-[11px] text-emerald-950 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-700 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>Last Updated:</span>
                    </span>
                    <span className="font-mono font-semibold text-emerald-900">{bomFileInfo.lastUpdated}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-emerald-700">
                    <span>File: {bomFileInfo.fileName}</span>
                    <span>{bomFileInfo.fileSize || 'Active'}</span>
                  </div>
                </div>

                {bomFileInfo.sheetNames.length > 1 && (
                  <div className="mt-2 text-[11px] text-slate-600 flex items-center gap-2 pt-1 border-t border-emerald-200/60">
                    <span>Active Sheet:</span>
                    <select
                      value={bomFileInfo.activeSheet}
                      onChange={(e) => handleChangeSheet('BOM', e.target.value)}
                      className="text-xs bg-white border border-slate-300 rounded px-1.5 py-0.5 font-medium"
                    >
                      {bomFileInfo.sheetNames.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-4 text-[11px] text-slate-400 border-t border-slate-100 pt-3">
            BOM RM code matches Store Stock Itemcode. Preserves leading zeros & dots.
          </div>
        </div>

        {/* FILE 2: STORE STOCK */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between shadow-sm hover:border-slate-300 transition-colors">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded uppercase tracking-wider">
                File 2 · Mandatory
              </span>
              <button
                onClick={() => downloadSampleExcel('STOCK')}
                className="text-[11px] font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1"
                title="Download Store Stock ERP export template"
              >
                <Download className="w-3 h-3" />
                <span>Template</span>
              </button>
            </div>

            <h3 className="text-sm font-bold text-slate-900 mt-3">Store Stock (ERP Export)</h3>
            <p className="text-xs text-slate-500 mt-1">
              Supports ERP columns: Itemcode, Ready Stock For Production, WIP, Closing, MOQ, Lead times.
            </p>

            <input
              type="file"
              ref={stockInputRef}
              onChange={handleStockFile}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />

            <div
              onClick={() => stockInputRef.current?.click()}
              className="mt-4 border-2 border-dashed border-slate-200 hover:border-amber-400 rounded-lg p-5 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-amber-50/20"
            >
              <FileSpreadsheet className="w-8 h-8 text-amber-600 mx-auto mb-2" />
              <div className="text-xs font-semibold text-slate-800">
                {loadingType === 'STOCK' ? 'Parsing Store Stock...' : 'Click to upload Store Stock (.xlsx)'}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">ERP format with full inventory controls</div>
            </div>

            {/* Status with Date and Time of Last Updated */}
            {stockFileInfo && storeStockItems.length > 0 && (
              <div className="mt-4 p-3 bg-emerald-50/70 border border-emerald-200 rounded-md space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{storeStockItems.length} Store inventory records</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setMappingModal({ type: 'STOCK', info: stockFileInfo })}
                      className="text-[11px] text-emerald-700 hover:underline flex items-center gap-0.5 font-medium"
                    >
                      <Settings2 className="w-3 h-3" />
                      <span>Map Cols</span>
                    </button>
                    <button
                      onClick={() => {
                        setStoreStockItems([]);
                        setStockFileInfo(null);
                        if (stockInputRef.current) stockInputRef.current.value = '';
                      }}
                      className="text-[11px] text-rose-600 hover:text-rose-800 hover:underline flex items-center gap-0.5 font-medium cursor-pointer"
                      title="Clear Store Stock file"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Clear</span>
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-emerald-200/60 text-[11px] text-emerald-950 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-700 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>Last Updated:</span>
                    </span>
                    <span className="font-mono font-semibold text-emerald-900">{stockFileInfo.lastUpdated}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-emerald-700">
                    <span>File: {stockFileInfo.fileName}</span>
                    <span>{stockFileInfo.fileSize || 'Active'}</span>
                  </div>
                </div>

                {stockFileInfo.sheetNames.length > 1 && (
                  <div className="mt-2 text-[11px] text-slate-600 flex items-center gap-2 pt-1 border-t border-emerald-200/60">
                    <span>Active Sheet:</span>
                    <select
                      value={stockFileInfo.activeSheet}
                      onChange={(e) => handleChangeSheet('STOCK', e.target.value)}
                      className="text-xs bg-white border border-slate-300 rounded px-1.5 py-0.5 font-medium"
                    >
                      {stockFileInfo.sheetNames.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-4 text-[11px] text-slate-400 border-t border-slate-100 pt-3">
            Default stock basis: Ready Stock For Production. WIP is tracked separately.
          </div>
        </div>

        {/* FILE 3: PRODUCTION PLAN */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between shadow-sm hover:border-slate-300 transition-colors">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded uppercase tracking-wider">
                File 3 · Mandatory
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadSampleExcel('PLAN')}
                  className="text-[11px] font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1"
                  title="Download standard single-date Production Plan template"
                >
                  <Download className="w-3 h-3" />
                  <span>Standard</span>
                </button>
                <button
                  onClick={downloadNextFewDaysPlanMatrixExcel}
                  className="text-[11px] font-medium text-amber-700 hover:text-amber-900 flex items-center gap-1"
                  title="Download horizontal multi-date schedule matrix template (.xlsx)"
                >
                  <Download className="w-3 h-3" />
                  <span>Matrix Template</span>
                </button>
              </div>
            </div>

            <h3 className="text-sm font-bold text-slate-900 mt-3">Production Plan</h3>
            <p className="text-xs text-slate-500 mt-1">
              Supports both <strong className="text-slate-800">Horizontal Date Matrix</strong> & Standard Row-wise format.
            </p>

            <input
              type="file"
              ref={planInputRef}
              onChange={handlePlanFile}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />

            <div
              onClick={() => planInputRef.current?.click()}
              className="mt-4 border-2 border-dashed border-slate-200 hover:border-amber-400 rounded-lg p-5 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-amber-50/20"
            >
              <FileSpreadsheet className="w-8 h-8 text-amber-600 mx-auto mb-2" />
              <div className="text-xs font-semibold text-slate-800">
                {loadingType === 'PLAN' ? 'Parsing Production Plan...' : 'Click to upload Plan (.xlsx)'}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Auto-detects Schedule Matrix or Tabular Rows</div>
            </div>

            {/* Status with Date and Time of Last Updated */}
            {planFileInfo && productionPlanItems.length > 0 && (
              <div className="mt-4 p-3 bg-emerald-50/70 border border-emerald-200 rounded-md space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{productionPlanItems.length} Planned batch items</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setMappingModal({ type: 'PLAN', info: planFileInfo })}
                      className="text-[11px] text-emerald-700 hover:underline flex items-center gap-0.5 font-medium"
                    >
                      <Settings2 className="w-3 h-3" />
                      <span>Map Cols</span>
                    </button>
                    <button
                      onClick={() => {
                        setProductionPlanItems([]);
                        setPlanFileInfo(null);
                        if (planInputRef.current) planInputRef.current.value = '';
                      }}
                      className="text-[11px] text-rose-600 hover:text-rose-800 hover:underline flex items-center gap-0.5 font-medium cursor-pointer"
                      title="Clear Production Plan file"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Clear</span>
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-emerald-200/60 text-[11px] text-emerald-950 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-700 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>Last Updated:</span>
                    </span>
                    <span className="font-mono font-semibold text-emerald-900">{planFileInfo.lastUpdated}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-emerald-700">
                    <span>File: {planFileInfo.fileName}</span>
                    <span>{planFileInfo.fileSize || 'Active'}</span>
                  </div>
                  {planFileInfo.isMatrix && (
                    <div className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                      Multi-Date Matrix Format Active ({planFileInfo.dateColumns?.join(', ')})
                    </div>
                  )}
                </div>

                {planFileInfo.sheetNames.length > 1 && (
                  <div className="mt-2 text-[11px] text-slate-600 flex items-center gap-2 pt-1 border-t border-emerald-200/60">
                    <span>Active Sheet:</span>
                    <select
                      value={planFileInfo.activeSheet}
                      onChange={(e) => handleChangeSheet('PLAN', e.target.value)}
                      className="text-xs bg-white border border-slate-300 rounded px-1.5 py-0.5 font-medium"
                    >
                      {planFileInfo.sheetNames.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-4 text-[11px] text-slate-400 border-t border-slate-100 pt-3">
            Calculates RM requirements per SKU and consolidates across all dates.
          </div>
        </div>
      </div>

      {/* FILE 4: OPTIONAL MATERIAL PRICE LIST */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded uppercase">
                Optional
              </span>
              <h4 className="text-sm font-bold text-slate-900">Material Price List / Costing Master</h4>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Upload standard procurement prices (RM Code, Rate per UOM, Currency). Last updated:{' '}
              <strong className="text-slate-800 font-mono">{priceFileInfo?.lastUpdated || 'Not loaded'}</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={priceInputRef}
              onChange={handlePriceFile}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />
            <button
              onClick={() => priceInputRef.current?.click()}
              className="px-3 py-1.5 rounded text-xs font-medium border border-slate-300 hover:bg-slate-50 text-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{priceItems.length > 0 ? `Update Price List (${priceItems.length} items)` : 'Upload Price List (.xlsx)'}</span>
            </button>
            {priceFileInfo && priceItems.length > 0 && (
              <button
                onClick={() => {
                  setPriceItems([]);
                  setPriceFileInfo(null);
                  if (priceInputRef.current) priceInputRef.current.value = '';
                }}
                className="px-2.5 py-1.5 rounded text-xs font-medium border border-rose-200 text-rose-700 hover:bg-rose-50 transition-colors flex items-center gap-1 cursor-pointer"
                title="Clear Price List"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* COLUMN MAPPING MODAL */}
      {mappingModal && (
        <ColumnMappingModal
          type={mappingModal.type}
          info={mappingModal.info}
          onClose={() => setMappingModal(null)}
          onSave={handleSaveMapping}
        />
      )}
    </div>
  );
};

// ----------------------------------------------------
// COLUMN MAPPING MODAL COMPONENT
// ----------------------------------------------------
interface ColumnMappingModalProps {
  type: 'BOM' | 'STOCK' | 'PLAN' | 'PRICES';
  info: LoadedFileInfo;
  onClose: () => void;
  onSave: (mapping: Record<string, string>) => void;
}

const ColumnMappingModal: React.FC<ColumnMappingModalProps> = ({
  type,
  info,
  onClose,
  onSave,
}) => {
  const [currentMapping, setCurrentMapping] = useState<Record<string, string>>(
    info.columnMapping || {}
  );

  const availableHeaders = info.headers || [];

  const requiredFields: { key: string; label: string; desc: string }[] =
    type === 'BOM'
      ? [
          { key: 'sku', label: 'SKU Code', desc: 'Finished Goods SKU Code' },
          { key: 'skuName', label: 'SKU Name', desc: 'Finished Goods Description' },
          { key: 'rm', label: 'RM Code', desc: 'Raw / Packaging Material Code' },
          { key: 'rmDesc', label: 'RM Description', desc: 'Material Description' },
          { key: 'uom', label: 'UOM', desc: 'Unit of Measurement' },
          { key: 'norms', label: 'Consumption Norms', desc: 'Quantity per production unit' },
        ]
      : type === 'STOCK'
      ? [
          { key: 'itemcode', label: 'Itemcode (RM Match)', desc: 'Store Material Code' },
          { key: 'description', label: 'Material Description', desc: 'Description' },
          { key: 'uom', label: 'UOM', desc: 'Unit of Measurement' },
          { key: 'readyStockForProduction', label: 'Ready Stock For Production', desc: 'Default available stock' },
          { key: 'totalClosing', label: 'Total Closing', desc: 'Closing inventory balance' },
          { key: 'wip', label: 'WIP', desc: 'Work In Progress Stock' },
          { key: 'minStock', label: 'Min Stock', desc: 'Safety minimum stock' },
          { key: 'maxStock', label: 'Max Stock', desc: 'Maximum warehouse capacity' },
          { key: 'moq', label: 'MOQ', desc: 'Minimum Order Quantity' },
          { key: 'reorderLevel', label: 'Re-order Level', desc: 'Inventory re-order trigger' },
          { key: 'totalLeadTime', label: 'Total Lead Time (Days)', desc: 'Procurement cycle days' },
        ]
      : [
          { key: 'sku', label: 'SKU Code', desc: 'Finished Good SKU Code' },
          { key: 'skuName', label: 'SKU Name', desc: 'Optional description' },
          { key: 'plannedQuantity', label: 'Planned Quantity', desc: 'Production target quantity' },
          { key: 'date', label: 'Target Date', desc: 'Production schedule date' },
          { key: 'productionUnit', label: 'Production Unit', desc: 'Pack unit (Box, Tin, Case, etc.)' },
        ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-xl w-full max-h-[90vh] flex flex-col shadow-xl">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Manual Column Mapping · {type === 'BOM' ? 'BOM Master' : type === 'STOCK' ? 'Store Stock' : 'Production Plan'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              File: <span className="font-semibold text-slate-700">{info.fileName}</span> (Sheet: {info.activeSheet})
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-sm font-semibold">
            ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-200">
            Map each internal application field to the corresponding column header in your Excel file.
          </p>

          <div className="space-y-3">
            {requiredFields.map((field) => (
              <div key={field.key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div>
                  <div className="text-xs font-bold text-slate-800">{field.label}</div>
                  <div className="text-[11px] text-slate-500">{field.desc}</div>
                </div>

                <select
                  value={currentMapping[field.key] || ''}
                  onChange={(e) =>
                    setCurrentMapping({
                      ...currentMapping,
                      [field.key]: e.target.value,
                    })
                  }
                  className="text-xs bg-white border border-slate-300 rounded px-2.5 py-1.5 font-medium text-slate-800 min-w-[200px]"
                >
                  <option value="">-- Not Mapped / Default --</option>
                  {availableHeaders.map((hdr) => (
                    <option key={hdr} value={hdr}>
                      {hdr}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 rounded-b-lg flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(currentMapping)}
            className="px-4 py-1.5 text-xs font-semibold bg-amber-500 text-slate-950 rounded hover:bg-amber-400 transition-colors shadow-sm"
          >
            Apply & Re-parse
          </button>
        </div>
      </div>
    </div>
  );
};
