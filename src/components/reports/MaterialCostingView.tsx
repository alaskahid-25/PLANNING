import React, { useState, useMemo } from 'react';
import { ConsolidatedMaterialRequirement, MaterialPriceItem, SkuMaterialRequirement } from '../../types';
import { Search, Download, DollarSign, Edit3, Check, X, Info, AlertCircle } from 'lucide-react';
import { exportCostingExcel } from '../../utils/exportUtils';

interface MaterialCostingViewProps {
  items: ConsolidatedMaterialRequirement[];
  skuRequirements: SkuMaterialRequirement[];
  priceItems: MaterialPriceItem[];
  onUpdateRate: (rmCode: string, newRate: number, uom: string) => void;
  currency: string;
}

export const MaterialCostingView: React.FC<MaterialCostingViewProps> = ({
  items,
  skuRequirements,
  priceItems,
  onUpdateRate,
  currency,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMissingOnly, setFilterMissingOnly] = useState(false);
  const [editingRmCode, setEditingRmCode] = useState<string | null>(null);
  const [editingRateValue, setEditingRateValue] = useState<string>('');

  // Cost calculations
  const { totalPricedCost, totalProcurementValue, uncostedItems, uncostedQty, bulkOilCost, packagingCost } =
    useMemo(() => {
      let pricedCost = 0;
      let procVal = 0;
      let uncostedCount = 0;
      let uncostedQuantity = 0;
      let oilCost = 0;
      let packCost = 0;

      items.forEach((item) => {
        if (item.hasRate && item.rate && item.totalCost) {
          pricedCost += item.totalCost;
          if (item.suggestedPurchaseQty > 0) {
            procVal += item.suggestedPurchaseQty * item.rate;
          }

          // Category classification
          const isBulkOil =
            item.rmDesc.toLowerCase().includes('oil') ||
            item.rmDesc.toLowerCase().includes('crude') ||
            item.rmCode.includes('00100');

          if (isBulkOil) {
            oilCost += item.totalCost;
          } else {
            packCost += item.totalCost;
          }
        } else {
          uncostedCount++;
          uncostedQuantity += item.totalRequiredQuantity;
        }
      });

      return {
        totalPricedCost: pricedCost,
        totalProcurementValue: procVal,
        uncostedItems: uncostedCount,
        uncostedQty: uncostedQuantity,
        bulkOilCost: oilCost,
        packagingCost: packCost,
      };
    }, [items]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchSearch =
        item.rmCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.rmDesc.toLowerCase().includes(searchTerm.toLowerCase());

      const matchMissing = !filterMissingOnly || !item.hasRate;
      return matchSearch && matchMissing;
    });
  }, [items, searchTerm, filterMissingOnly]);

  const handleStartEdit = (rmCode: string, currentRate?: number) => {
    setEditingRmCode(rmCode);
    setEditingRateValue(currentRate ? String(currentRate) : '');
  };

  const handleSaveEdit = (rmCode: string, uom: string) => {
    const val = parseFloat(editingRateValue);
    if (!isNaN(val) && val >= 0) {
      onUpdateRate(rmCode, val, uom);
    }
    setEditingRmCode(null);
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span>Report 6: Material Costing & Valuation</span>
            </h2>
            <span className="text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded">
              Base Currency: {currency}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Strict costing rule: Rates are never invented. Materials without verified unit prices show{' '}
            <strong className="text-slate-700">"RATE NOT AVAILABLE"</strong> and are safely excluded from the financial total.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => exportCostingExcel(filtered)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Cost Report</span>
          </button>
        </div>
      </div>

      {/* Financial Summary Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Total Material Requirement Cost
          </div>
          <div className="text-xl font-bold text-slate-900 tabular-nums mt-1">
            {currency} {Math.round(totalPricedCost).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Bulk Oil: {currency} {Math.round(bulkOilCost).toLocaleString()} · Pack: {currency}{' '}
            {Math.round(packagingCost).toLocaleString()}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Shortage Procurement Value
          </div>
          <div className="text-xl font-bold text-amber-700 tabular-nums mt-1">
            {currency} {Math.round(totalProcurementValue).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Capital required for recommended POs
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Priced Materials
          </div>
          <div className="text-xl font-bold text-emerald-700 tabular-nums mt-1">
            {items.length - uncostedItems} / {items.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {Math.round(((items.length - uncostedItems) / (items.length || 1)) * 100)}% valuation coverage
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Uncosted Missing Rates
          </div>
          <div className="text-xl font-bold text-rose-600 tabular-nums mt-1">
            {uncostedItems} Materials
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {Math.round(uncostedQty).toLocaleString()} units uncosted
          </div>
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
          <label className="flex items-center gap-1.5 text-xs text-slate-700 font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={filterMissingOnly}
              onChange={(e) => setFilterMissingOnly(e.target.checked)}
              className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
            />
            <span>Show materials with missing rates only</span>
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
                <th className="py-2.5 px-3 min-w-[200px]">RM Description</th>
                <th className="py-2.5 px-2 text-center w-14">UOM</th>
                <th className="py-2.5 px-3 text-right">Required Quantity</th>
                <th className="py-2.5 px-3 text-right">Rate per UOM ({currency})</th>
                <th className="py-2.5 px-3 text-right font-bold text-emerald-300">Total Material Cost ({currency})</th>
                <th className="py-2.5 px-3 text-center">Costing Status</th>
                <th className="py-2.5 px-2 text-center w-20">Edit Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No material costing records match the search.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const isEditing = editingRmCode === item.rmCode;

                  return (
                    <tr key={item.rmCode} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-3 font-mono font-bold text-slate-900">
                        {item.rmCode}
                      </td>
                      <td className="py-2 px-3 font-medium text-slate-800">
                        {item.rmDesc}
                      </td>
                      <td className="py-2 px-2 text-center font-semibold text-slate-600">
                        {item.uom}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums font-semibold text-slate-800">
                        {item.totalRequiredQuantity.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })}
                      </td>

                      {/* Rate Column (Editable) */}
                      <td className="py-2 px-3 text-right tabular-nums">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="number"
                              step="0.01"
                              value={editingRateValue}
                              onChange={(e) => setEditingRateValue(e.target.value)}
                              className="w-24 px-1.5 py-0.5 text-right text-xs border border-amber-500 rounded bg-white font-mono"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveEdit(item.rmCode, item.uom)}
                              className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700"
                              title="Save Rate"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setEditingRmCode(null)}
                              className="p-1 rounded bg-slate-200 text-slate-700 hover:bg-slate-300"
                              title="Cancel"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : item.hasRate && item.rate !== undefined ? (
                          <span className="font-mono font-medium text-slate-800">
                            {currency} {item.rate.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-[11px] text-rose-600 font-semibold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            RATE NOT AVAILABLE
                          </span>
                        )}
                      </td>

                      {/* Total Cost */}
                      <td className="py-2 px-3 text-right font-bold text-slate-900 tabular-nums">
                        {item.hasRate && item.totalCost !== undefined ? (
                          <span>
                            {currency}{' '}
                            {Math.round(item.totalCost).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal text-[11px]">Excluded (Uncosted)</span>
                        )}
                      </td>

                      {/* Costing Status */}
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.hasRate
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {item.hasRate ? 'Priced' : 'Missing Rate'}
                        </span>
                      </td>

                      {/* Quick Edit button */}
                      <td className="py-2 px-2 text-center">
                        {!isEditing && (
                          <button
                            onClick={() => handleStartEdit(item.rmCode, item.rate)}
                            className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                            title="Edit / Set unit price"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
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
