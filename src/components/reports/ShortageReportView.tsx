import React, { useState, useMemo } from 'react';
import { ConsolidatedMaterialRequirement } from '../../types';
import { Search, Download, AlertTriangle, AlertCircle, Clock } from 'lucide-react';
import { exportShortageExcel } from '../../utils/exportUtils';

interface ShortageReportViewProps {
  items: ConsolidatedMaterialRequirement[];
}

export const ShortageReportView: React.FC<ShortageReportViewProps> = ({ items }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [leadTimeFilter, setLeadTimeFilter] = useState('ALL');

  const shortagesOnly = useMemo(() => {
    return items.filter((item) => item.shortage > 0);
  }, [items]);

  const filtered = useMemo(() => {
    return shortagesOnly.filter((item) => {
      const matchSearch =
        item.rmCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.rmDesc.toLowerCase().includes(searchTerm.toLowerCase());

      const matchPriority =
        priorityFilter === 'ALL' || item.procurementPriority === priorityFilter;

      const matchLeadTime =
        leadTimeFilter === 'ALL' ||
        (leadTimeFilter === 'LONG' && (item.totalLeadTime || 0) >= 14) ||
        (leadTimeFilter === 'SHORT' && (item.totalLeadTime || 0) < 14);

      return matchSearch && matchPriority && matchLeadTime;
    });
  }, [shortagesOnly, searchTerm, priorityFilter, leadTimeFilter]);

  const totalShortageUnits = shortagesOnly.reduce((acc, i) => acc + i.shortage, 0);

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Report 3: Material Shortage Analysis</span>
            </h2>
            <span className="text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded">
              {shortagesOnly.length} Deficit Materials
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Materials where Gross Required Quantity exceeds Available Production Stock. Requires urgent procurement action.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => exportShortageExcel(filtered)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Shortage Report</span>
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
              placeholder="Search Shortage RM Code or Description..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs focus:bg-white focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-medium">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-xs font-medium text-slate-800"
            >
              <option value="ALL">All Priorities</option>
              <option value="CRITICAL">Critical Only</option>
              <option value="HIGH">High Priority</option>
              <option value="MEDIUM">Medium Priority</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-medium">Lead Time:</span>
            <select
              value={leadTimeFilter}
              onChange={(e) => setLeadTimeFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-xs font-medium text-slate-800"
            >
              <option value="ALL">All Lead Times</option>
              <option value="LONG">Long Lead Time (≥ 14 Days)</option>
              <option value="SHORT">Short Lead Time (&lt; 14 Days)</option>
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
                <th className="py-2.5 px-3 text-right">Required Qty</th>
                <th className="py-2.5 px-3 text-right">Available Stock</th>
                <th className="py-2.5 px-3 text-right text-rose-300">Net Shortage</th>
                <th className="py-2.5 px-3 text-right">Deficit %</th>
                <th className="py-2.5 px-3 text-center">Req Prod Date</th>
                <th className="py-2.5 px-2 text-center">Lead Time</th>
                <th className="py-2.5 px-3 text-center">Procurement Priority</th>
                <th className="py-2.5 px-3 text-right">Suggested Purchase Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    No material shortages match the active filters.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const shortagePct =
                    item.totalRequiredQuantity > 0
                      ? (item.shortage / item.totalRequiredQuantity) * 100
                      : 0;

                  return (
                    <tr key={item.rmCode} className="hover:bg-rose-50/30 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                        {item.rmCode}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">
                        {item.rmDesc}
                        {item.isMissingFromStore && (
                          <span className="block text-[10px] text-rose-600 font-semibold">
                            Not found in Store ERP (100% shortage)
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-center font-semibold text-slate-600">
                        {item.uom}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-slate-700">
                        {item.totalRequiredQuantity.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-slate-700">
                        {item.availableStock.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-rose-600 tabular-nums">
                        {item.shortage.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-slate-800">
                        {shortagePct.toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-600 tabular-nums">
                        {item.earliestRequiredDate || 'Immediate'}
                      </td>
                      <td className="py-2.5 px-2 text-center tabular-nums font-semibold">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[11px] ${
                            (item.totalLeadTime || 0) >= 14
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {item.totalLeadTime || 7}d
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.procurementPriority === 'CRITICAL'
                              ? 'bg-rose-600 text-white'
                              : item.procurementPriority === 'HIGH'
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-orange-100 text-orange-900'
                          }`}
                        >
                          {item.procurementPriority}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900 tabular-nums bg-amber-50/40">
                        {item.suggestedPurchaseQty.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })}
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
