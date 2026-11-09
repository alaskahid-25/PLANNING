import React, { useState, useMemo } from 'react';
import { ConsolidatedMaterialRequirement } from '../../types';
import { Search, Download, ShoppingCart, Calendar, AlertTriangle, Clock } from 'lucide-react';
import { exportProcurementPlanExcel } from '../../utils/exportUtils';

interface ProcurementPlanViewProps {
  items: ConsolidatedMaterialRequirement[];
}

export const ProcurementPlanView: React.FC<ProcurementPlanViewProps> = ({ items }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [actionOnly, setActionOnly] = useState(true);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchSearch =
        item.rmCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.rmDesc.toLowerCase().includes(searchTerm.toLowerCase());

      const matchPriority =
        priorityFilter === 'ALL' || item.procurementPriority === priorityFilter;

      const matchAction = !actionOnly || item.suggestedPurchaseQty > 0 || item.shortage > 0;

      return matchSearch && matchPriority && matchAction;
    });
  }, [items, searchTerm, priorityFilter, actionOnly]);

  const totalSuggestedOrderItems = items.filter((i) => i.suggestedPurchaseQty > 0).length;

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              <ShoppingCart className="w-4 h-4 text-amber-600" />
              <span>Report 5: Procurement Action & Purchase Recommendation Plan</span>
            </h2>
            <span className="text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded">
              {totalSuggestedOrderItems} Recommended Purchase Orders
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Intelligent purchase quantities factored by <strong className="text-slate-800">MOQ batches</strong>,{' '}
            <strong className="text-slate-800">Re-order Levels</strong>, and{' '}
            <strong className="text-slate-800">Supplier Lead Times</strong>. Shows Latest PO Release Dates to protect production.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => exportProcurementPlanExcel(filtered)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Procurement Plan</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative w-full max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search RM Code or Description..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs focus:bg-white focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-slate-700 font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={actionOnly}
              onChange={(e) => setActionOnly(e.target.checked)}
              className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
            />
            <span>Show actionable items only</span>
          </label>

          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-medium">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-xs font-medium text-slate-800"
            >
              <option value="ALL">All Priorities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
              <option value="NO_ACTION">No Action</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white font-semibold text-[11px] tracking-wide border-b border-slate-800">
                <th className="py-2.5 px-3">RM Code</th>
                <th className="py-2.5 px-3 min-w-[200px]">RM Description</th>
                <th className="py-2.5 px-2 text-center w-14">UOM</th>
                <th className="py-2.5 px-3 text-right">Shortage</th>
                <th className="py-2.5 px-3 text-right text-slate-300">Re-order Lvl</th>
                <th className="py-2.5 px-3 text-right text-slate-300">MOQ</th>
                <th className="py-2.5 px-2 text-center">Lead Time</th>
                <th className="py-2.5 px-3 text-right font-bold text-amber-300">Suggested Purchase Qty</th>
                <th className="py-2.5 px-3 text-center">Latest PO Release Date</th>
                <th className="py-2.5 px-3 text-center">Priority</th>
                <th className="py-2.5 px-3 min-w-[240px]">Action Required & Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    No procurement actions required for current filters.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const isActionable = item.suggestedPurchaseQty > 0;
                  const isCritical = item.procurementPriority === 'CRITICAL';
                  const isOverdue = item.leadTimeRisk.includes('Overdue');

                  return (
                    <tr
                      key={item.rmCode}
                      className={`hover:bg-slate-50 transition-colors ${
                        isCritical ? 'bg-rose-50/20' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                        {item.rmCode}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">
                        {item.rmDesc}
                      </td>
                      <td className="py-2.5 px-2 text-center font-semibold text-slate-600">
                        {item.uom}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums">
                        {item.shortage > 0 ? (
                          <span className="font-bold text-rose-600">
                            {item.shortage.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-slate-500">
                        {item.reorderLevel ? item.reorderLevel.toLocaleString() : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-slate-500">
                        {item.moq ? item.moq.toLocaleString() : '-'}
                      </td>
                      <td className="py-2.5 px-2 text-center tabular-nums font-semibold">
                        {item.totalLeadTime || 7}d
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-950 tabular-nums bg-amber-50/70 border-x border-amber-100">
                        {isActionable ? (
                          <span>
                            {item.suggestedPurchaseQty.toLocaleString(undefined, {
                              maximumFractionDigits: 2,
                            })}{' '}
                            <span className="text-[10px] text-slate-500 font-normal">{item.uom}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">None</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center tabular-nums">
                        {item.latestProcurementReleaseDate ? (
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                              isOverdue
                                ? 'bg-rose-100 text-rose-900 font-bold animate-pulse'
                                : 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {item.latestProcurementReleaseDate}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Immediate</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.procurementPriority === 'CRITICAL'
                              ? 'bg-rose-600 text-white'
                              : item.procurementPriority === 'HIGH'
                              ? 'bg-amber-500 text-slate-950'
                              : item.procurementPriority === 'MEDIUM'
                              ? 'bg-orange-100 text-orange-900'
                              : item.procurementPriority === 'LOW'
                              ? 'bg-slate-100 text-slate-700'
                              : 'bg-slate-50 text-slate-400'
                          }`}
                        >
                          {item.procurementPriority}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-slate-700">
                        <div className="font-medium text-slate-900">{item.actionRequired}</div>
                        {item.roundingOrMoqAdjustment && (
                          <div className="text-[10px] text-amber-700 font-medium mt-0.5">
                            {item.roundingOrMoqAdjustment}
                          </div>
                        )}
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
