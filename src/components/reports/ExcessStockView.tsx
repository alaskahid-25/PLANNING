import React, { useState, useMemo } from 'react';
import { ConsolidatedMaterialRequirement } from '../../types';
import { Search, Download, TrendingUp } from 'lucide-react';
import { exportExcessExcel } from '../../utils/exportUtils';

interface ExcessStockViewProps {
  items: ConsolidatedMaterialRequirement[];
}

export const ExcessStockView: React.FC<ExcessStockViewProps> = ({ items }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [aboveMaxOnly, setAboveMaxOnly] = useState(false);

  const excessItems = useMemo(() => {
    return items.filter((i) => i.excess > 0);
  }, [items]);

  const filtered = useMemo(() => {
    return excessItems.filter((item) => {
      const matchSearch =
        item.rmCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.rmDesc.toLowerCase().includes(searchTerm.toLowerCase());

      const excessAboveMax =
        item.maxStock && item.availableStock > item.maxStock
          ? item.availableStock - item.maxStock
          : 0;

      const matchAboveMax = !aboveMaxOnly || excessAboveMax > 0;
      return matchSearch && matchAboveMax;
    });
  }, [excessItems, searchTerm, aboveMaxOnly]);

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span>Report 4: Excess Stock Analysis</span>
            </h2>
            <span className="text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded">
              {excessItems.length} Materials with Surplus Inventory
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Materials where current usable stock exceeds requirements for the uploaded production plan.
            Helps finance identify tied-up working capital and prevent redundant procurement.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => exportExcessExcel(filtered)}
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

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-slate-700 font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={aboveMaxOnly}
              onChange={(e) => setAboveMaxOnly(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Show only items exceeding Max Stock capacity</span>
          </label>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white font-semibold text-[11px] tracking-wide border-b border-slate-800">
                <th className="py-2.5 px-3">RM Code</th>
                <th className="py-2.5 px-3 min-w-[220px]">RM Description</th>
                <th className="py-2.5 px-2 text-center w-14">UOM</th>
                <th className="py-2.5 px-3 text-right">Available Stock</th>
                <th className="py-2.5 px-3 text-right">Required Qty</th>
                <th className="py-2.5 px-3 text-right text-blue-300">Surplus / Excess Qty</th>
                <th className="py-2.5 px-3 text-right">ERP Max Stock</th>
                <th className="py-2.5 px-3 text-right">Excess Above Max Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No excess stock materials found for the current criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const excessAboveMax =
                    item.maxStock && item.availableStock > item.maxStock
                      ? item.availableStock - item.maxStock
                      : 0;

                  return (
                    <tr key={item.rmCode} className="hover:bg-blue-50/30 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                        {item.rmCode}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">
                        {item.rmDesc}
                      </td>
                      <td className="py-2.5 px-2 text-center font-semibold text-slate-600">
                        {item.uom}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-800 tabular-nums">
                        {item.availableStock.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600 tabular-nums">
                        {item.totalRequiredQuantity.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-blue-600 tabular-nums">
                        +{item.excess.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-slate-500">
                        {item.maxStock ? item.maxStock.toLocaleString() : 'N/A'}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-semibold">
                        {excessAboveMax > 0 ? (
                          <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-bold border border-amber-200">
                            +{excessAboveMax.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
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
