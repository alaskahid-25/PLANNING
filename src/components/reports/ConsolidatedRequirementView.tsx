import React, { useState, useMemo } from 'react';
import {
  ConsolidatedMaterialRequirement,
  SkuMaterialRequirement,
  StockStatus,
  ProcurementPriority,
} from '../../types';
import { Search, Download, Filter, Info, X, Layers, ExternalLink } from 'lucide-react';
import { exportConsolidatedExcel } from '../../utils/exportUtils';

interface ConsolidatedRequirementViewProps {
  items: ConsolidatedMaterialRequirement[];
  skuRequirements: SkuMaterialRequirement[];
  stockBasis: string;
}

export const ConsolidatedRequirementView: React.FC<ConsolidatedRequirementViewProps> = ({
  items,
  skuRequirements,
  stockBasis,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [selectedRmForTrace, setSelectedRmForTrace] = useState<ConsolidatedMaterialRequirement | null>(null);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchSearch =
        item.rmCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.rmDesc.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'SHORTAGE' && item.shortage > 0) ||
        (statusFilter === 'EXCESS' && item.excess > 0) ||
        item.stockStatus === statusFilter;

      const matchPriority =
        priorityFilter === 'ALL' || item.procurementPriority === priorityFilter;

      return matchSearch && matchStatus && matchPriority;
    });
  }, [items, searchTerm, statusFilter, priorityFilter]);

  // Trace contributing SKUs for selected RM
  const contributingSkus = useMemo(() => {
    if (!selectedRmForTrace) return [];
    return skuRequirements.filter(
      (r) => r.rmCode === selectedRmForTrace.rmCode && r.uom === selectedRmForTrace.uom
    );
  }, [selectedRmForTrace, skuRequirements]);

  return (
    <div className="space-y-4">
      {/* Top Controls Banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">
              Report 1: Consolidated Material Requirement
            </h2>
            <span className="text-[11px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
              {filteredItems.length} of {items.length} Materials
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Consolidated by <strong className="text-slate-800">RM Code + UOM</strong> across all planned SKUs.
            Stock basis: <strong className="text-slate-800">{stockBasis}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => exportConsolidatedExcel(filteredItems)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Excel</span>
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

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-medium">Stock Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-medium text-slate-800"
            >
              <option value="ALL">All Statuses</option>
              <option value="SHORTAGE">Shortage Only</option>
              <option value="EXCESS">Excess Only</option>
              <option value="SUFFICIENT">Sufficient Stock</option>
              <option value="NOT_IN_STORE">Missing from Store</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-medium">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-medium text-slate-800"
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
                <th className="py-2.5 px-3 w-12 text-center">S.No</th>
                <th className="py-2.5 px-3">RM Code</th>
                <th className="py-2.5 px-3 min-w-[220px]">RM Description</th>
                <th className="py-2.5 px-2 text-center w-14">UOM</th>
                <th className="py-2.5 px-3 text-right">Required Qty</th>
                <th className="py-2.5 px-3 text-right">Available Stock</th>
                <th className="py-2.5 px-3 text-right text-slate-300">WIP</th>
                <th className="py-2.5 px-3 text-right text-slate-300">Closing</th>
                <th className="py-2.5 px-3 text-right">Shortage</th>
                <th className="py-2.5 px-3 text-right">Excess</th>
                <th className="py-2.5 px-3 text-center">Stock Status</th>
                <th className="py-2.5 px-3 text-center">Procurement Priority</th>
                <th className="py-2.5 px-2 text-center w-16">Trace</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-400">
                    No material requirements match the active search and filter criteria.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isShortage = item.shortage > 0;
                  const isExcess = item.excess > 0;

                  return (
                    <tr
                      key={`${item.rmCode}-${item.uom}`}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-2 px-3 text-center tabular-nums text-slate-400">
                        {item.sNo}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-900">
                        {item.rmCode}
                      </td>
                      <td className="py-2 px-3 text-slate-800 font-medium">
                        {item.rmDesc}
                        {item.isMissingFromStore && (
                          <span className="ml-1.5 text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-normal border border-amber-200">
                            Missing in Store Stock
                          </span>
                        )}
                        {item.isUomMismatched && (
                          <span className="ml-1.5 text-[10px] text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded font-normal border border-rose-200">
                            Store UOM: {item.storeUom}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-center font-semibold text-slate-600">
                        {item.uom}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900 tabular-nums">
                        {item.totalRequiredQuantity.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-slate-700 tabular-nums">
                        {item.availableStock.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-500 tabular-nums">
                        {item.wip.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-500 tabular-nums">
                        {item.totalClosing.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums">
                        {isShortage ? (
                          <span className="font-bold text-rose-600">
                            {item.shortage.toLocaleString(undefined, {
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums">
                        {isExcess ? (
                          <span className="font-semibold text-blue-600">
                            {item.excess.toLocaleString(undefined, {
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.stockStatus === 'SHORTAGE'
                              ? 'bg-rose-100 text-rose-800'
                              : item.stockStatus === 'EXCESS'
                              ? 'bg-blue-100 text-blue-800'
                              : item.stockStatus === 'NOT_IN_STORE'
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {item.stockStatus}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center">
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
                              : 'bg-slate-50 text-slate-500'
                          }`}
                        >
                          {item.procurementPriority}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center">
                        <button
                          onClick={() => setSelectedRmForTrace(item)}
                          className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                          title="View contributing SKU-wise BOM calculations"
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Traceability Modal */}
      {selectedRmForTrace && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[85vh] flex flex-col shadow-xl">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                    {selectedRmForTrace.rmCode}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">
                    {selectedRmForTrace.rmDesc}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  BOM Requirement Traceability & Calculation Lineage
                </p>
              </div>
              <button
                onClick={() => setSelectedRmForTrace(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                <div>
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">Total Requirement</div>
                  <div className="text-sm font-bold text-slate-900 tabular-nums">
                    {selectedRmForTrace.totalRequiredQuantity.toLocaleString()} {selectedRmForTrace.uom}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">Available Stock</div>
                  <div className="text-sm font-bold text-slate-900 tabular-nums">
                    {selectedRmForTrace.availableStock.toLocaleString()} {selectedRmForTrace.uom}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">Net Shortage / Excess</div>
                  <div
                    className={`text-sm font-bold tabular-nums ${
                      selectedRmForTrace.shortage > 0 ? 'text-rose-600' : 'text-blue-600'
                    }`}
                  >
                    {selectedRmForTrace.shortage > 0
                      ? `-${selectedRmForTrace.shortage.toLocaleString()}`
                      : `+${selectedRmForTrace.excess.toLocaleString()}`}{' '}
                    {selectedRmForTrace.uom}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-800 mb-2">
                  Contributing Planned Finished Goods SKUs:
                </h4>
                <div className="border border-slate-200 rounded-md overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-semibold text-[11px]">
                      <tr>
                        <th className="p-2">Finished Good SKU</th>
                        <th className="p-2 text-right">Planned Qty</th>
                        <th className="p-2 text-right">BOM Norm</th>
                        <th className="p-2 text-right">Calculated RM Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {contributingSkus.map((skuRow, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="p-2 font-medium text-slate-800">
                            <span className="font-mono font-bold text-[11px] block">{skuRow.sku}</span>
                            <span className="text-slate-500 text-[10px]">{skuRow.skuName}</span>
                          </td>
                          <td className="p-2 text-right font-medium tabular-nums">
                            {skuRow.plannedQuantity.toLocaleString()} {skuRow.productionUnit}
                          </td>
                          <td className="p-2 text-right tabular-nums text-slate-600 font-mono">
                            {skuRow.norms}
                          </td>
                          <td className="p-2 text-right font-bold text-slate-900 tabular-nums">
                            {skuRow.requiredQuantity.toLocaleString()} {skuRow.uom}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 rounded-b-lg flex justify-end">
              <button
                onClick={() => setSelectedRmForTrace(null)}
                className="px-4 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
