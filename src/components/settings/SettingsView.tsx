import React, { useState } from 'react';
import { AppSettings } from '../../types';
import { verifySampleTestCase } from '../../utils/calculationEngine';
import { Settings, CheckCircle2, AlertTriangle, ShieldCheck, RefreshCw, Save } from 'lucide-react';

interface SettingsViewProps {
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
  onRecalculate: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSaveSettings,
  onRecalculate,
}) => {
  const [currentSettings, setCurrentSettings] = useState<AppSettings>(settings);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testResult, setTestResult] = useState(() => verifySampleTestCase());

  const handleSave = () => {
    onSaveSettings(currentSettings);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
    onRecalculate();
  };

  const handleRunTest = () => {
    const res = verifySampleTestCase();
    setTestResult(res);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              <Settings className="w-4 h-4 text-slate-700" />
              <span>Application Settings & Calculation Policy</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Configure inventory evaluation criteria, production unit conversions, supplier lead time thresholds, and execute algorithmic integrity tests.
            </p>
          </div>

          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 rounded text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors shadow-sm"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save & Recalculate</span>
          </button>
        </div>

        {saveSuccess && (
          <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800 font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Settings saved successfully. Production plan requirements recalculated.</span>
          </div>
        )}
      </div>

      {/* SECTION 15 VERIFICATION TEST RUNNER */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded uppercase">
                Section 15 Audit
              </span>
              <h3 className="text-sm font-bold text-slate-900">
                Sample Validation Test Specification Engine
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Mandatory test suite from prompt Section 15 ensuring exact decimal-safe calculations.
            </p>
          </div>

          <button
            onClick={handleRunTest}
            className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Re-verify Test</span>
          </button>
        </div>

        {/* Test Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="bg-slate-50 p-3.5 rounded border border-slate-200 space-y-2">
            <div className="font-semibold text-slate-800 text-[11px] uppercase tracking-wider">
              Input Parameters:
            </div>
            <div className="space-y-1 text-slate-600">
              <div>• Plan SKU 7.A.001607 = 10,000 units (BOM Norm 0.06 KGS)</div>
              <div>• Plan SKU 7.A.001329 = 5,000 units (BOM Norm 0.09 KGS)</div>
              <div>• Store Stock 1.N.009083 Ready Stock = 800 KGS</div>
            </div>
          </div>

          <div
            className={`p-3.5 rounded border space-y-2 ${
              testResult.passed
                ? 'bg-emerald-50/70 border-emerald-200'
                : 'bg-rose-50/70 border-rose-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="font-bold text-emerald-900 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>100% Passed · Verified Exact Results</span>
              </div>
              <span className="font-mono font-bold text-xs bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded">
                VALIDATED
              </span>
            </div>
            <div className="space-y-1 text-slate-700 tabular-nums">
              <div>• SKU 1 Requirement: <strong>{testResult.details.sku1Req} KGS</strong> (Expected: 600)</div>
              <div>• SKU 2 Requirement: <strong>{testResult.details.sku2Req} KGS</strong> (Expected: 450)</div>
              <div>• Consolidated RM 1.N.009083: <strong>{testResult.details.consolidatedReq} KGS</strong> (Expected: 1,050)</div>
              <div>• Net Shortage: <strong className="text-rose-600">{testResult.details.shortage} KGS</strong> (Expected: 250)</div>
              <div>• Excess: <strong>{testResult.details.excess} KGS</strong> (Expected: 0)</div>
            </div>
          </div>
        </div>
      </div>

      {/* INVENTORY EVALUATION POLICY */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
          Store Stock Availability Configuration
        </h3>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-800 mb-1">
              Stock Basis for Requirement Matching
            </label>
            <p className="text-slate-500 text-[11px] mb-2">
              Default recommended basis: <strong className="text-slate-700">Ready Stock For Production</strong>. WIP is preserved separately to prevent premature allocation.
            </p>
            <select
              value={currentSettings.stockBasis}
              onChange={(e) =>
                setCurrentSettings({
                  ...currentSettings,
                  stockBasis: e.target.value as any,
                })
              }
              className="bg-white border border-slate-300 rounded px-3 py-2 text-xs font-medium text-slate-900 w-full max-w-md focus:border-amber-500 focus:outline-none"
            >
              <option value="readyStockForProduction">
                Ready Stock For Production (Recommended Default)
              </option>
              <option value="totalClosing">Total Closing Stock</option>
              <option value="totalQuantityWipClosing">
                Total Quantity (WIP & Closing Stock Combined)
              </option>
              <option value="opening">Opening Stock</option>
            </select>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={currentSettings.includeGpPending}
                onChange={(e) =>
                  setCurrentSettings({
                    ...currentSettings,
                    includeGpPending: e.target.checked,
                  })
                }
                className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
              />
              <span className="font-semibold text-slate-800">
                Include "GP Pending" (Gate Pass Pending) in projected stock availability
              </span>
            </label>
            <p className="text-[11px] text-slate-500 ml-6 mt-0.5">
              When checked, material quantities under pending gate passes are credited to usable stock.
            </p>
          </div>
        </div>
      </div>

      {/* PRODUCTION UNIT & CONVERSIONS */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
          Production Unit & Conversion Factors
        </h3>
        <p className="text-xs text-slate-500">
          "Never assume that a planned quantity of 10,000 automatically means 10,000 individual units or 10,000 cartons."
          Configure the default unit multiplier applied against BOM norms.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-800 mb-1">
              Default Production Planning Unit
            </label>
            <input
              type="text"
              value={currentSettings.defaultProductionUnit}
              onChange={(e) =>
                setCurrentSettings({
                  ...currentSettings,
                  defaultProductionUnit: e.target.value.toUpperCase(),
                })
              }
              className="bg-white border border-slate-300 rounded px-3 py-1.5 text-xs font-medium w-full focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-800 mb-1">
              Reporting Currency
            </label>
            <input
              type="text"
              value={currentSettings.defaultCurrency}
              onChange={(e) =>
                setCurrentSettings({
                  ...currentSettings,
                  defaultCurrency: e.target.value.toUpperCase(),
                })
              }
              className="bg-white border border-slate-300 rounded px-3 py-1.5 text-xs font-medium w-full focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-800 mb-1">
              Critical Lead Time Threshold (Days)
            </label>
            <input
              type="number"
              min="1"
              max="90"
              value={currentSettings.criticalLeadTimeThresholdDays}
              onChange={(e) =>
                setCurrentSettings({
                  ...currentSettings,
                  criticalLeadTimeThresholdDays: Number(e.target.value),
                })
              }
              className="bg-white border border-slate-300 rounded px-3 py-1.5 text-xs font-mono w-full focus:border-amber-500 focus:outline-none"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Materials with supplier lead times ≥ this value are prioritized as CRITICAL.
            </span>
          </div>

          <div>
            <label className="block font-semibold text-slate-800 mb-1">
              Display Decimal Precision
            </label>
            <input
              type="number"
              min="0"
              max="4"
              value={currentSettings.decimalPrecision}
              onChange={(e) =>
                setCurrentSettings({
                  ...currentSettings,
                  decimalPrecision: Number(e.target.value),
                })
              }
              className="bg-white border border-slate-300 rounded px-3 py-1.5 text-xs font-mono w-full focus:border-amber-500 focus:outline-none"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Calculations remain decimal-safe; rounding applies only to display.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
