import React from 'react';
import {
  Menu,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  Download,
  Database,
  FileCheck,
} from 'lucide-react';

interface HeaderProps {
  onToggleMobile: () => void;
  onLoadDemoData?: () => void;
  onVerifyTestCase: () => void;
  onExportAll: () => void;
  onRecalculate: () => void;
  planPeriodText: string;
  isDemoLoaded?: boolean;
  testCasePassed: boolean | null;
  isCalculated?: boolean;
  onOpenCheckModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleMobile,
  onLoadDemoData,
  onVerifyTestCase,
  onExportAll,
  onRecalculate,
  planPeriodText,
  isDemoLoaded = false,
  testCasePassed,
  isCalculated = true,
  onOpenCheckModal,
}) => {
  return (
    <header className="sticky top-0 z-30 h-14 bg-white/95 backdrop-blur-xs border-b border-slate-200/80 px-4 sm:px-5 flex items-center justify-between gap-4">
      {/* Zone 1: Mobile Hamburger + Brand Wordmark */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobile}
          className="p-1 rounded-md text-slate-600 hover:bg-slate-100 lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-baseline gap-2">
          <span className="text-sm font-bold text-slate-900 tracking-tight whitespace-nowrap">
            SMART PRODUCTION PLANNER AI
          </span>
          <span className="text-[11px] text-slate-400 font-medium hidden xl:inline">
            Cooking Oil MRP Engine
          </span>
        </div>
      </div>

      {/* Zone 2: Navigation Info / Status & Test Pill */}
      <div className="hidden md:flex items-center gap-2.5">
        {!isCalculated ? (
          <div className="text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 font-medium whitespace-nowrap">
            <span>Data Cleared · Ready to Load</span>
          </div>
        ) : (
          planPeriodText && (
            <div className="text-xs text-slate-600 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200 font-medium whitespace-nowrap">
              Plan Period: <span className="font-semibold text-slate-900 font-mono">{planPeriodText}</span>
            </div>
          )
        )}

        {testCasePassed !== null && (
          <button
            onClick={onVerifyTestCase}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
              testCasePassed
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
            }`}
            title="Click to view Section 15 validation test calculation audit"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Section 15 Test: 100% Passed</span>
          </button>
        )}
      </div>

      {/* Zone 3: Primary Action Buttons */}
      <div className="flex items-center gap-2">
        {onOpenCheckModal && (
          <button
            onClick={onOpenCheckModal}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all border shadow-2xs cursor-pointer ${
              isCalculated
                ? 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
                : 'bg-amber-500 text-slate-950 border-amber-500 hover:bg-amber-400 font-bold'
            }`}
            title="Verify whether all mandatory spreadsheets are really loaded before calculating"
          >
            <Database className={`w-3.5 h-3.5 ${isCalculated ? 'text-amber-600' : 'text-slate-950'}`} />
            <span>{isCalculated ? 'Check Loaded Data' : 'Check Data & Calculate'}</span>
          </button>
        )}

        <button
          onClick={onVerifyTestCase}
          className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition-colors"
          title="Verify exact calculations against Section 15 specification"
        >
          <FileCheck className="w-3.5 h-3.5 text-slate-600" />
          <span>Verify Sec 15 Test</span>
        </button>

        <button
          onClick={onExportAll}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-sm"
          title="Download complete multi-sheet Excel planning workbook"
        >
          <Download className="w-3.5 h-3.5 text-slate-300" />
          <span className="hidden md:inline">Export Workbook</span>
          <span className="md:hidden">Export</span>
        </button>

        <button
          onClick={onRecalculate}
          className="p-1.5 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors"
          title="Re-run calculation engine"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
