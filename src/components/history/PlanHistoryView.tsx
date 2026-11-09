import React, { useState } from 'react';
import { PlanHistoryRecord } from '../../types';
import { History, Calendar, Trash2, ArrowRight, Download, CheckCircle2, AlertTriangle, Layers, RotateCcw } from 'lucide-react';
import { exportConsolidatedExcel } from '../../utils/exportUtils';

interface PlanHistoryViewProps {
  history: PlanHistoryRecord[];
  onReloadPlan: (record: PlanHistoryRecord) => void;
  onDeleteHistory: (id: string) => void;
  onClearHistory: () => void;
}

export const PlanHistoryView: React.FC<PlanHistoryViewProps> = ({
  history,
  onReloadPlan,
  onDeleteHistory,
  onClearHistory,
}) => {
  const [selectedPlanForCompare, setSelectedPlanForCompare] = useState<string[]>([]);

  const toggleSelectForCompare = (id: string) => {
    setSelectedPlanForCompare((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id].slice(-2)
    );
  };

  const comparedPlans = history.filter((h) => selectedPlanForCompare.includes(h.id));

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              <History className="w-4 h-4 text-slate-700" />
              <span>Production Plan Run History & Version Audit</span>
            </h2>
            <span className="text-[11px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
              {history.length} Saved Snapshots
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Every calculated production plan run is archived with full traceability. Reopen prior plans, evaluate plan-to-plan delta shifts, or export past reports.
          </p>
        </div>

        {history.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                if (confirm('Clear all historical plan archives?')) {
                  onClearHistory();
                }
              }}
              className="px-3 py-1.5 rounded text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors"
            >
              Clear All History
            </button>
          </div>
        )}
      </div>

      {/* Comparison Drawer if 2 plans are selected */}
      {comparedPlans.length === 2 && (
        <div className="bg-slate-900 text-white rounded-lg p-5 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Side-by-Side Production Plan Comparison
            </div>
            <button
              onClick={() => setSelectedPlanForCompare([])}
              className="text-xs text-slate-400 hover:text-white"
            >
              Close Comparison
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            {comparedPlans.map((p, idx) => (
              <div key={p.id} className="bg-slate-800/80 p-3.5 rounded-lg border border-slate-700 space-y-2">
                <div className="font-bold text-sm text-white">
                  Plan #{idx + 1}: {p.planName}
                </div>
                <div className="text-[11px] text-slate-400">
                  Run: {new Date(p.createdAt).toLocaleString()} · Period: {p.productionPeriod}
                </div>
                <div className="pt-2 border-t border-slate-700 space-y-1 text-slate-300">
                  <div className="flex justify-between">
                    <span>SKUs:</span> <strong className="text-white">{p.skuCount}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Production Qty:</span> <strong className="text-white">{p.totalPlannedQty.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Material Req:</span> <strong className="text-white">{Math.round(p.totalMaterialRequirement).toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Shortage:</span>{' '}
                    <strong className={p.totalShortage > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                      {p.totalShortage.toLocaleString()}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Estimated Cost:</span>{' '}
                    <strong className="text-white">
                      {p.currency} {Math.round(p.totalEstimatedCost).toLocaleString()}
                    </strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white font-semibold text-[11px] tracking-wide border-b border-slate-800">
                <th className="py-2.5 px-3 w-10 text-center">Compare</th>
                <th className="py-2.5 px-3">Plan Name</th>
                <th className="py-2.5 px-3">Calculation Timestamp</th>
                <th className="py-2.5 px-3">Production Period</th>
                <th className="py-2.5 px-3 text-right">SKUs</th>
                <th className="py-2.5 px-3 text-right">Planned Qty</th>
                <th className="py-2.5 px-3 text-right">Total RM Req</th>
                <th className="py-2.5 px-3 text-right">Total Shortage</th>
                <th className="py-2.5 px-3 text-right">Estimated Cost</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-center w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    No historical production plans archived yet. Process a production plan to save an immutable record.
                  </td>
                </tr>
              ) : (
                history.map((record) => {
                  const isChecked = selectedPlanForCompare.includes(record.id);

                  return (
                    <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectForCompare(record.id)}
                          className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                          title="Select 2 plans to compare"
                        />
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {record.planName}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 tabular-nums">
                        {new Date(record.createdAt).toLocaleString([], {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 font-medium">
                        {record.productionPeriod}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-800 tabular-nums">
                        {record.skuCount}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-800 tabular-nums">
                        {record.totalPlannedQty.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-slate-700">
                        {Math.round(record.totalMaterialRequirement).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold tabular-nums">
                        {record.totalShortage > 0 ? (
                          <span className="text-rose-600">{record.totalShortage.toLocaleString()}</span>
                        ) : (
                          <span className="text-emerald-700">0</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-slate-900">
                        {record.currency} {Math.round(record.totalEstimatedCost).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            record.status === 'COMPLETED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : record.status === 'CRITICAL_SHORTAGES'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {record.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              if (confirm(`Reopen and restore plan "${record.planName}"?`)) {
                                onReloadPlan(record);
                              }
                            }}
                            className="p-1 rounded text-amber-700 hover:bg-amber-50 font-semibold"
                            title="Reopen plan in current workspace"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>

                          {record.dataSnapshot?.consolidatedRequirements && (
                            <button
                              onClick={() =>
                                exportConsolidatedExcel(
                                  record.dataSnapshot!.consolidatedRequirements,
                                  `Archived_${record.planName}.xlsx`
                                )
                              }
                              className="p-1 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                              title="Download archived Excel report"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => onDeleteHistory(record.id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            title="Delete record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
