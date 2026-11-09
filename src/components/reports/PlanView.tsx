import React, { useState, useMemo } from 'react';
import { ProductionPlanItem } from '../../types';
import {
  CalendarDays,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  Download,
  Table,
  LayoutGrid,
  Sparkles,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  downloadNextFewDaysPlanMatrixExcel,
  DEMO_NEXT_FEW_DAYS_PLAN,
} from '../../utils/demoData';

interface PlanViewProps {
  planItems: ProductionPlanItem[];
  onUpdatePlan: (items: ProductionPlanItem[]) => void;
  onRecalculate: () => void;
}

export const PlanView: React.FC<PlanViewProps> = ({ planItems, onUpdatePlan, onRecalculate }) => {
  const [viewMode, setViewMode] = useState<'matrix' | 'list'>('matrix');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState<number>(0);
  const [editDate, setEditDate] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);

  // New batch form state
  const [newSku, setNewSku] = useState('');
  const [newSkuName, setNewSkuName] = useState('');
  const [newQty, setNewQty] = useState(1000);
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newUnit, setNewUnit] = useState('BOXES');

  // Matrix derivation: Extract unique dates sorted chronologically
  const uniqueDates = useMemo(() => {
    const dates = Array.from(new Set(planItems.map((p) => p.date))).filter(Boolean);
    return dates.sort();
  }, [planItems]);

  // Matrix derivation: Group by SKU
  interface MatrixRow {
    sku: string;
    skuName: string;
    unit: string;
    qtyByDate: Record<string, number>;
    totalQty: number;
  }

  const matrixRows = useMemo(() => {
    const rowMap = new Map<string, MatrixRow>();

    planItems.forEach((item) => {
      if (!rowMap.has(item.sku)) {
        rowMap.set(item.sku, {
          sku: item.sku,
          skuName: item.skuName || item.sku,
          unit: item.productionUnit || 'BOXES',
          qtyByDate: {},
          totalQty: 0,
        });
      }

      const row = rowMap.get(item.sku)!;
      row.qtyByDate[item.date] = (row.qtyByDate[item.date] || 0) + item.plannedQuantity;
      row.totalQty += item.plannedQuantity;
    });

    return Array.from(rowMap.values());
  }, [planItems]);

  const handleStartEdit = (item: ProductionPlanItem) => {
    setEditingId(item.id);
    setEditQty(item.plannedQuantity);
    setEditDate(item.date);
  };

  const handleSaveEdit = (id: string) => {
    const updated = planItems.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          plannedQuantity: editQty,
          date: editDate,
        };
      }
      return item;
    });
    onUpdatePlan(updated);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('Remove this production plan entry?')) {
      const updated = planItems.filter((i) => i.id !== id);
      onUpdatePlan(updated);
    }
  };

  const handleAddBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSku.trim()) {
      alert('Please provide a valid Finished Goods SKU code.');
      return;
    }

    const newItem: ProductionPlanItem = {
      id: `plan-${Date.now()}-${newSku}`,
      date: newDate,
      sku: newSku.trim(),
      skuName: newSkuName.trim() || newSku.trim(),
      plannedQuantity: Number(newQty),
      productionUnit: newUnit.trim(),
    };

    onUpdatePlan([...planItems, newItem]);
    setShowAddForm(false);
    setNewSku('');
    setNewSkuName('');
    setNewQty(1000);
  };

  const handleExportPlan = () => {
    if (viewMode === 'matrix') {
      downloadNextFewDaysPlanMatrixExcel();
      return;
    }

    const data = planItems.map((p) => ({
      'Plan Date': p.date,
      'SKU Code': p.sku,
      'SKU Name': p.skuName,
      'Planned Quantity': p.plannedQuantity,
      'Production Unit': p.productionUnit,
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Production Plan');
    XLSX.writeFile(wb, 'Current_Production_Plan.xlsx');
  };

  // Helper to format date string to DD-MM-YYYY for matrix header display
  const formatDateHeader = (dStr: string) => {
    const parts = dStr.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY-MM-DD -> DD-MM-YYYY
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }
    return dStr;
  };

  const totalPlannedQty = planItems.reduce((acc, p) => acc + p.plannedQuantity, 0);

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4 text-amber-600" />
              <span>Production Plan Schedule</span>
            </h2>
            <span className="text-[11px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
              {totalPlannedQty.toLocaleString()} Total Units Scheduled
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Supports both <strong className="text-slate-800">Next Few Days Horizontal Date Matrix</strong> and chronological list formats.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded text-xs font-semibold">
            <button
              onClick={() => setViewMode('matrix')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded transition-colors ${
                viewMode === 'matrix'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="View plan as Multi-Date Schedule Matrix"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-amber-600" />
              <span>Schedule Matrix View</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="View plan as chronological table"
            >
              <Table className="w-3.5 h-3.5 text-slate-600" />
              <span>List View</span>
            </button>
          </div>

          <button
            onClick={() => onUpdatePlan(DEMO_NEXT_FEW_DAYS_PLAN)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 transition-colors shadow-2xs"
            title="Load 09 to 11 Nov multi-day schedule from image"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Load 09–11 Nov Schedule</span>
          </button>

          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Batch</span>
          </button>

          <button
            onClick={handleExportPlan}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Plan</span>
          </button>
        </div>
      </div>

      {/* Add Planned Batch Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddBatch}
          className="bg-amber-50/60 border border-amber-200 rounded-lg p-4 space-y-3"
        >
          <div className="flex items-center justify-between pb-2 border-b border-amber-200/60">
            <h3 className="text-xs font-bold text-slate-900">Add New Production Batch</h3>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-slate-400 hover:text-slate-700 text-xs"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                SKU Code *
              </label>
              <input
                type="text"
                value={newSku}
                onChange={(e) => setNewSku(e.target.value)}
                placeholder="e.g. 7.A.001607"
                required
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono text-xs focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                SKU Description
              </label>
              <input
                type="text"
                value={newSkuName}
                onChange={(e) => setNewSkuName(e.target.value)}
                placeholder="e.g. RAJNI GOLD 15L BOX"
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Planned Qty *
              </label>
              <input
                type="number"
                min="1"
                value={newQty}
                onChange={(e) => setNewQty(Number(e.target.value))}
                required
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-mono focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Pack Unit
              </label>
              <input
                type="text"
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
                placeholder="BOXES / TINS"
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Target Date
              </label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-mono focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 rounded text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400"
            >
              Add to Plan
            </button>
          </div>
        </form>
      )}

      {/* VIEW 1: NEXT FEW DAYS SCHEDULE MATRIX VIEW (Exact user format matching image_94073f6a.png) */}
      {viewMode === 'matrix' && (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden space-y-0">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-800">
                Next Few Days Production Schedule Matrix
              </span>
              <span className="text-[11px] text-slate-500">
                ({uniqueDates.length} Days · {matrixRows.length} Scheduled SKUs)
              </span>
            </div>
            <div className="text-[11px] text-slate-500">
              Yellow background mirrors company standard Finished Goods ERP highlight format.
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-semibold text-[11px] tracking-wide border-b border-slate-800">
                  <th className="py-2.5 px-3 border-r border-slate-800 w-36">SKU Code</th>
                  <th className="py-2.5 px-3 border-r border-slate-800 min-w-[260px]">Finished Goods Description</th>
                  {uniqueDates.map((d) => (
                    <th
                      key={d}
                      className="py-2.5 px-4 text-right border-r border-slate-800 font-mono text-amber-300 font-bold min-w-[110px]"
                    >
                      {formatDateHeader(d)}
                    </th>
                  ))}
                  <th className="py-2.5 px-4 text-right font-bold text-white bg-slate-950 min-w-[120px]">
                    Total Planned
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {matrixRows.length === 0 ? (
                  <tr>
                    <td colSpan={uniqueDates.length + 3} className="py-12 text-center text-slate-400">
                      No production plan items found.
                    </td>
                  </tr>
                ) : (
                  matrixRows.map((row) => (
                    <tr key={row.sku} className="hover:bg-amber-50/20 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold bg-yellow-300 text-slate-950 border-r border-slate-200">
                        {row.sku}
                      </td>
                      <td className="py-2.5 px-3 font-bold bg-yellow-300 text-slate-950 border-r border-slate-200">
                        {row.skuName}
                      </td>

                      {uniqueDates.map((d) => {
                        const qty = row.qtyByDate[d] || 0;
                        return (
                          <td
                            key={d}
                            className="py-2.5 px-4 text-right font-bold tabular-nums text-slate-900 border-r border-slate-100"
                          >
                            {qty > 0 ? qty.toLocaleString() : <span className="text-slate-300 font-normal">-</span>}
                          </td>
                        );
                      })}

                      <td className="py-2.5 px-4 text-right font-bold tabular-nums text-slate-950 bg-slate-50">
                        {row.totalQty.toLocaleString()}{' '}
                        <span className="text-[10px] text-slate-500 font-normal">{row.unit}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {matrixRows.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                    <td className="py-2.5 px-3" colSpan={2}>
                      Daily Total Planned Quantity
                    </td>
                    {uniqueDates.map((d) => {
                      const dayTotal = matrixRows.reduce((acc, r) => acc + (r.qtyByDate[d] || 0), 0);
                      return (
                        <td key={d} className="py-2.5 px-4 text-right tabular-nums font-mono text-slate-950">
                          {dayTotal.toLocaleString()}
                        </td>
                      );
                    })}
                    <td className="py-2.5 px-4 text-right tabular-nums text-amber-700 bg-amber-50 font-mono">
                      {totalPlannedQty.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: CHRONOLOGICAL TABULAR BATCH LIST VIEW */}
      {viewMode === 'list' && (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-semibold text-[11px] tracking-wide border-b border-slate-800">
                  <th className="py-2.5 px-3">Target Date</th>
                  <th className="py-2.5 px-3">SKU Code</th>
                  <th className="py-2.5 px-3 min-w-[240px]">Finished Goods Description</th>
                  <th className="py-2.5 px-3 text-right">Planned Quantity</th>
                  <th className="py-2.5 px-3 text-center">Unit</th>
                  <th className="py-2.5 px-3 text-center w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {planItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No production plan items loaded.
                    </td>
                  </tr>
                ) : (
                  planItems.map((item) => {
                    const isEditing = editingId === item.id;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-slate-600">
                          {isEditing ? (
                            <input
                              type="date"
                              value={editDate}
                              onChange={(e) => setEditDate(e.target.value)}
                              className="px-2 py-0.5 border border-amber-400 rounded text-xs font-mono"
                            />
                          ) : (
                            item.date
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                          {item.sku}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">
                          {item.skuName || item.sku}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-950 tabular-nums">
                          {isEditing ? (
                            <input
                              type="number"
                              min="1"
                              value={editQty}
                              onChange={(e) => setEditQty(Number(e.target.value))}
                              className="w-24 px-2 py-0.5 border border-amber-400 rounded text-xs text-right font-mono"
                            />
                          ) : (
                            item.plannedQuantity.toLocaleString()
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-600 font-medium">
                          {item.productionUnit || 'BOXES'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => handleSaveEdit(item.id)}
                                  className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700"
                                  title="Save changes"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="p-1 rounded bg-slate-200 text-slate-700 hover:bg-slate-300"
                                  title="Cancel"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleStartEdit(item)}
                                  className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded"
                                  title="Edit planned quantity"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDelete(item.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                                  title="Delete planned batch"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
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
      )}
    </div>
  );
};
