import React, { useState, useMemo } from 'react';
import { StoreStockItem, ConsolidatedMaterialRequirement } from '../../types';
import { Search, Download, Warehouse, ShieldAlert, CheckCircle2 } from 'lucide-react';
import * as XLSX from 'xlsx';

interface StockAnalysisViewProps {
  storeStockItems: StoreStockItem[];
  consolidatedRequirements: ConsolidatedMaterialRequirement[];
  stockBasis: string;
}

export const StockAnalysisView: React.FC<StockAnalysisViewProps> = ({
  storeStockItems,
  consolidatedRequirements,
  stockBasis,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = useMemo(() => {
    return storeStockItems.filter((item) => {
      return (
        item.itemcode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.remarks && item.remarks.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    });
  }, [storeStockItems, searchTerm]);

  const handleExportStockExcel = () => {
    const data = filtered.map((item) => ({
      'Itemcode': item.itemcode,
      'Description': item.description,
      'UOM': item.uom,
      'Ready Stock For Production': item.readyStockForProduction,
      'Total Closing': item.totalClosing,
      'WIP': item.wip,
      'Total Qty (WIP & Closing)': item.totalQuantityWipClosing,
      'Opening': item.opening,
      'Receipts': item.receipts,
      'GP Pending': item.gpPending,
      'QC Issues': item.qcIssues,
      'Loading Issues': item.loadingIssue,
      'Packing Issues': item.packingIssues,
      'Hold/Reject QC': item.holdRejectQc,
      'Min Stock': item.minStock,
      'Max Stock': item.maxStock,
      'MOQ': item.moq,
      'Re-order Level': item.reorderLevel,
      'Lead Time (Days)': item.totalLeadTime,
      'Remarks': item.remarks,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Store Stock Analysis');
    XLSX.writeFile(wb, 'Store_Stock_Inventory_Analysis.xlsx');
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              <Warehouse className="w-4 h-4 text-slate-700" />
              <span>Report: Store Stock & ERP Movement Audit</span>
            </h2>
            <span className="text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200 px-2 py-0.5 rounded">
              {filtered.length} Material Stock Records
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Full ERP store inventory visibility. Active stock basis for requirement matching:{' '}
            <strong className="text-amber-700">{stockBasis}</strong>. WIP is preserved separately without double counting.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleExportStockExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Stock Excel</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs flex items-center justify-between gap-3 text-xs">
        <div className="relative w-full max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search Itemcode, Description, Remarks..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs focus:bg-white focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>

        <div className="text-xs text-slate-500">
          Showing {filtered.length} of {storeStockItems.length} inventory lines
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white font-semibold text-[11px] tracking-wide border-b border-slate-800">
                <th className="py-2.5 px-3">Itemcode</th>
                <th className="py-2.5 px-3 min-w-[200px]">Description</th>
                <th className="py-2.5 px-2 text-center w-14">UOM</th>
                <th className="py-2.5 px-3 text-right bg-amber-500/20 text-amber-200">
                  Ready Stock (Prod)
                </th>
                <th className="py-2.5 px-3 text-right">Total Closing</th>
                <th className="py-2.5 px-3 text-right text-slate-300">WIP</th>
                <th className="py-2.5 px-3 text-right text-slate-300">Opening</th>
                <th className="py-2.5 px-3 text-right text-slate-300">Receipts</th>
                <th className="py-2.5 px-3 text-right text-slate-300">Packing Issues</th>
                <th className="py-2.5 px-3 text-right text-slate-300">QC Issues</th>
                <th className="py-2.5 px-3 text-right text-slate-300">Hold/Reject QC</th>
                <th className="py-2.5 px-3 text-right">Min / Max</th>
                <th className="py-2.5 px-2 text-center">Lead Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-400">
                    No Store Stock records match the search query.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.itemcode} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2 px-3 font-mono font-bold text-slate-900">
                      {item.itemcode}
                    </td>
                    <td className="py-2 px-3 font-medium text-slate-800">
                      {item.description}
                      {item.remarks && (
                        <span className="block text-[10px] text-slate-400 truncate max-w-xs">
                          {item.remarks}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-center font-semibold text-slate-600">
                      {item.uom}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-slate-950 tabular-nums bg-amber-50/50">
                      {item.readyStockForProduction.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="py-2 px-3 text-right font-semibold text-slate-700 tabular-nums">
                      {item.totalClosing.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums text-slate-500">
                      {item.wip.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums text-slate-500">
                      {item.opening.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums text-slate-500">
                      {item.receipts.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums text-slate-500">
                      {item.packingIssues.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums text-slate-500">
                      {item.qcIssues.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums text-slate-500">
                      {item.holdRejectQc > 0 ? (
                        <span className="text-rose-600 font-semibold">
                          {item.holdRejectQc.toLocaleString()}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums text-slate-500 text-[11px]">
                      {item.minStock ? item.minStock.toLocaleString() : '0'} /{' '}
                      {item.maxStock ? item.maxStock.toLocaleString() : '∞'}
                    </td>
                    <td className="py-2 px-2 text-center tabular-nums font-semibold text-slate-700">
                      {item.totalLeadTime || 7}d
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
