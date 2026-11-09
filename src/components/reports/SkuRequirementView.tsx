import React, { useState, useMemo } from 'react';
import { SkuMaterialRequirement } from '../../types';
import { Search, Download, Filter } from 'lucide-react';
import { exportSkuWiseExcel } from '../../utils/exportUtils';

interface SkuRequirementViewProps {
  skuRequirements: SkuMaterialRequirement[];
}

export const SkuRequirementView: React.FC<SkuRequirementViewProps> = ({ skuRequirements }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [skuFilter, setSkuFilter] = useState('ALL');

  // Unique SKUs for dropdown
  const uniqueSkus = useMemo(() => {
    return Array.from(new Set(skuRequirements.map((r) => r.sku)));
  }, [skuRequirements]);

  const filtered = useMemo(() => {
    return skuRequirements.filter((r) => {
      const matchSearch =
        r.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.skuName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.rmCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.rmDesc.toLowerCase().includes(searchTerm.toLowerCase());

      const matchSku = skuFilter === 'ALL' || r.sku === skuFilter;
      return matchSearch && matchSku;
    });
  }, [skuRequirements, searchTerm, skuFilter]);

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">
              Report 2: SKU-Wise Material Requirement
            </h2>
            <span className="text-[11px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
              {filtered.length} Component Rows
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Transparent calculation breakdown: <strong className="text-slate-800">Required Quantity = Planned Quantity × BOM Norms</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => exportSkuWiseExcel(filtered)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Excel</span>
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative w-full max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search SKU, RM Code or Description..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs focus:bg-white focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">Filter by SKU:</span>
          <select
            value={skuFilter}
            onChange={(e) => setSkuFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-xs font-medium text-slate-800"
          >
            <option value="ALL">All SKUs ({uniqueSkus.length})</option>
            {uniqueSkus.map((sku) => (
              <option key={sku} value={sku}>
                {sku}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white font-semibold text-[11px] tracking-wide border-b border-slate-800">
                <th className="py-2.5 px-3">SKU Code</th>
                <th className="py-2.5 px-3 min-w-[200px]">Finished Goods Description</th>
                <th className="py-2.5 px-3 text-right">Planned Qty</th>
                <th className="py-2.5 px-2 text-center">Unit</th>
                <th className="py-2.5 px-3">RM Code</th>
                <th className="py-2.5 px-3 min-w-[220px]">RM Description</th>
                <th className="py-2.5 px-2 text-center w-14">UOM</th>
                <th className="py-2.5 px-3 text-right font-mono">BOM Norms</th>
                <th className="py-2.5 px-3 text-right">Required RM Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No SKU requirements found.
                  </td>
                </tr>
              ) : (
                filtered.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2 px-3 font-mono font-bold text-slate-900">
                      {item.sku}
                    </td>
                    <td className="py-2 px-3 font-medium text-slate-800">
                      {item.skuName}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-slate-900 tabular-nums">
                      {item.plannedQuantity.toLocaleString()}
                    </td>
                    <td className="py-2 px-2 text-center text-slate-500 font-medium">
                      {item.productionUnit}
                    </td>
                    <td className="py-2 px-3 font-mono font-bold text-slate-800">
                      {item.rmCode}
                    </td>
                    <td className="py-2 px-3 text-slate-700">
                      {item.rmDesc}
                    </td>
                    <td className="py-2 px-2 text-center font-semibold text-slate-600">
                      {item.uom}
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-600">
                      {item.norms}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-slate-900 tabular-nums">
                      {item.requiredQuantity.toLocaleString(undefined, {
                        maximumFractionDigits: 3,
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
