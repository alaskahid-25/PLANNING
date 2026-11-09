import React, { useState } from 'react';
import {
  Boxes,
  Package,
  Layers,
  Scale,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  AlertCircle,
  Clock,
  DollarSign,
  ShoppingCart,
  Timer,
  ArrowRight,
  TrendingDown,
  BarChart3,
  PieChart,
} from 'lucide-react';
import { CalculationResult } from '../../utils/calculationEngine';
import { NavTab } from '../layout/Sidebar';

interface DashboardViewProps {
  calcResult: CalculationResult;
  onNavigate: (tab: NavTab) => void;
  stockBasis: string;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  calcResult,
  onNavigate,
  stockBasis,
}) => {
  const { kpis, consolidatedRequirements, skuRequirements } = calcResult;
  const [chartMetric, setChartMetric] = useState<'quantity' | 'shortage'>('shortage');

  // Top 10 Shortage materials
  const topShortages = [...consolidatedRequirements]
    .filter((i) => i.shortage > 0)
    .sort((a, b) => b.shortage - a.shortage)
    .slice(0, 10);

  // Top required materials
  const topRequired = [...consolidatedRequirements]
    .sort((a, b) => b.totalRequiredQuantity - a.totalRequiredQuantity)
    .slice(0, 8);

  // Priority breakdown
  const priorityCounts = {
    CRITICAL: consolidatedRequirements.filter((i) => i.procurementPriority === 'CRITICAL').length,
    HIGH: consolidatedRequirements.filter((i) => i.procurementPriority === 'HIGH').length,
    MEDIUM: consolidatedRequirements.filter((i) => i.procurementPriority === 'MEDIUM').length,
    LOW: consolidatedRequirements.filter((i) => i.procurementPriority === 'LOW').length,
    NO_ACTION: consolidatedRequirements.filter((i) => i.procurementPriority === 'NO_ACTION').length,
  };

  // SKU Plan breakdown
  const skuPlanMap = new Map<string, { sku: string; skuName: string; planQty: number }>();
  skuRequirements.forEach((r) => {
    if (!skuPlanMap.has(r.sku)) {
      skuPlanMap.set(r.sku, { sku: r.sku, skuName: r.skuName, planQty: r.plannedQuantity });
    }
  });
  const skuPlanList = Array.from(skuPlanMap.values()).sort((a, b) => b.planQty - a.planQty);

  // 12 KPI Cards Config
  const kpiCards = [
    {
      id: 1,
      title: 'Total SKUs in Plan',
      value: kpis.totalSkusInPlan.toLocaleString(),
      subtext: 'Active production plan lines',
      icon: Boxes,
      color: 'text-slate-900',
      bg: 'bg-white',
      border: 'border-slate-200',
      tab: 'production-plan' as NavTab,
    },
    {
      id: 2,
      title: 'Planned Production Qty',
      value: kpis.totalPlannedQty.toLocaleString(),
      subtext: 'Boxes / Tins / Cases scheduled',
      icon: Package,
      color: 'text-slate-900',
      bg: 'bg-white',
      border: 'border-slate-200',
      tab: 'production-plan' as NavTab,
    },
    {
      id: 3,
      title: 'Total Unique RM Materials',
      value: kpis.totalUniqueRmCount.toLocaleString(),
      subtext: 'Raw & packaging materials',
      icon: Layers,
      color: 'text-slate-900',
      bg: 'bg-white',
      border: 'border-slate-200',
      tab: 'consolidated-rm' as NavTab,
    },
    {
      id: 4,
      title: 'Total Material Requirement',
      value: Math.round(kpis.totalMaterialRequirementQty).toLocaleString(),
      subtext: 'Aggregated gross requirement',
      icon: Scale,
      color: 'text-slate-900',
      bg: 'bg-white',
      border: 'border-slate-200',
      tab: 'consolidated-rm' as NavTab,
    },
    {
      id: 5,
      title: 'Materials with Sufficient Stock',
      value: kpis.sufficientStockCount.toLocaleString(),
      subtext: `${kpis.stockSufficiencyPct}% sufficiency rate`,
      icon: CheckCircle2,
      color: 'text-emerald-700',
      bg: 'bg-emerald-50/50',
      border: 'border-emerald-200',
      tab: 'consolidated-rm' as NavTab,
    },
    {
      id: 6,
      title: 'Materials with Shortage',
      value: kpis.shortageCount.toLocaleString(),
      subtext: kpis.shortageCount > 0 ? 'Requires purchase action' : 'No shortages identified',
      icon: AlertTriangle,
      color: kpis.shortageCount > 0 ? 'text-rose-700 font-bold' : 'text-slate-700',
      bg: kpis.shortageCount > 0 ? 'bg-rose-50/60' : 'bg-white',
      border: kpis.shortageCount > 0 ? 'border-rose-300' : 'border-slate-200',
      tab: 'shortage-analysis' as NavTab,
    },
    {
      id: 7,
      title: 'Materials with Excess Stock',
      value: kpis.excessStockCount.toLocaleString(),
      subtext: 'Usable stock exceeds plan',
      icon: TrendingUp,
      color: 'text-blue-700',
      bg: 'bg-blue-50/50',
      border: 'border-blue-200',
      tab: 'excess-stock' as NavTab,
    },
    {
      id: 8,
      title: 'Missing from Store Stock',
      value: kpis.missingFromStoreCount.toLocaleString(),
      subtext: kpis.missingFromStoreCount > 0 ? 'Not found in Store ERP' : 'All items matched',
      icon: AlertCircle,
      color: kpis.missingFromStoreCount > 0 ? 'text-amber-800' : 'text-slate-700',
      bg: kpis.missingFromStoreCount > 0 ? 'bg-amber-50/60' : 'bg-white',
      border: kpis.missingFromStoreCount > 0 ? 'border-amber-300' : 'border-slate-200',
      tab: 'data-validation' as NavTab,
    },
    {
      id: 9,
      title: 'Critical Procurement Items',
      value: kpis.criticalProcurementCount.toLocaleString(),
      subtext: 'High production stoppage risk',
      icon: ShoppingCart,
      color: kpis.criticalProcurementCount > 0 ? 'text-rose-700 font-bold' : 'text-slate-700',
      bg: kpis.criticalProcurementCount > 0 ? 'bg-rose-50/60' : 'bg-white',
      border: kpis.criticalProcurementCount > 0 ? 'border-rose-300' : 'border-slate-200',
      tab: 'procurement-plan' as NavTab,
    },
    {
      id: 10,
      title: 'Estimated Material Cost',
      value: `${kpis.currency} ${Math.round(kpis.estimatedMaterialCost).toLocaleString()}`,
      subtext: kpis.uncostedRmCount > 0 ? `${kpis.uncostedRmCount} RM rates unpriced` : '100% materials priced',
      icon: DollarSign,
      color: 'text-slate-900',
      bg: 'bg-white',
      border: 'border-slate-200',
      tab: 'material-costing' as NavTab,
    },
    {
      id: 11,
      title: 'Estimated Procurement Value',
      value: `${kpis.currency} ${Math.round(kpis.estimatedProcurementValue).toLocaleString()}`,
      subtext: 'Net purchase order value',
      icon: ShoppingCart,
      color: 'text-slate-900',
      bg: 'bg-white',
      border: 'border-slate-200',
      tab: 'procurement-plan' as NavTab,
    },
    {
      id: 12,
      title: 'Long Lead-Time Materials',
      value: kpis.longLeadTimeCount.toLocaleString(),
      subtext: 'Lead time ≥ 14 days',
      icon: Timer,
      color: kpis.longLeadTimeCount > 0 ? 'text-amber-700' : 'text-slate-700',
      bg: kpis.longLeadTimeCount > 0 ? 'bg-amber-50/40' : 'bg-white',
      border: kpis.longLeadTimeCount > 0 ? 'border-amber-200' : 'border-slate-200',
      tab: 'procurement-plan' as NavTab,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Executive Quick Alert Bar */}
      <div className="bg-slate-900 text-white rounded-lg p-5 shadow-sm border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold bg-amber-500 text-slate-950 px-2 py-0.5 rounded tracking-wide uppercase">
                Plant Production Status
              </span>
              <span className="text-xs text-slate-400">
                Stock Policy: <strong className="text-white">{stockBasis}</strong>
              </span>
            </div>
            <h2 className="text-base font-bold text-white tracking-tight">
              {kpis.shortageCount === 0
                ? 'All Raw Materials Available · Production Plan Ready for Execution'
                : `${kpis.shortageCount} Materials Require Urgent Procurement to Fulfill Planned Production`}
            </h2>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              Consolidated {kpis.totalSkusInPlan} SKUs representing {kpis.totalPlannedQty.toLocaleString()} production units across {kpis.totalUniqueRmCount} raw & packaging components. Overall stock sufficiency stands at <strong className="text-amber-400">{kpis.stockSufficiencyPct}%</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              onClick={() => onNavigate('custom-scheduler')}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <span>Custom Date & SKU Planner</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onNavigate('ai-summary')}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs rounded border border-slate-700 transition-colors flex items-center gap-1.5"
            >
              <span>AI Summary</span>
            </button>
            <button
              onClick={() => onNavigate('shortage-analysis')}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs rounded border border-slate-700 transition-colors"
            >
              Shortages ({kpis.shortageCount})
            </button>
          </div>
        </div>
      </div>

      {/* 12 KPI CARDS GRID */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3.5">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              onClick={() => onNavigate(card.tab)}
              className={`${card.bg} ${card.border} border rounded-lg p-3.5 shadow-2xs hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between group`}
            >
              <div>
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase truncate">
                    {card.title}
                  </span>
                  <Icon className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-colors shrink-0" />
                </div>
                <div className={`text-lg font-bold ${card.color} tabular-nums leading-tight truncate`}>
                  {card.value}
                </div>
              </div>
              <div className="text-[10px] text-slate-500 mt-2 truncate">
                {card.subtext}
              </div>
            </div>
          );
        })}
      </div>

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CHART 1: Top Shortages / Required Materials Bar Chart */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {chartMetric === 'shortage' ? 'Top Materials with Highest Shortage' : 'Required vs Available Stock (Top Consumed Materials)'}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Exact quantities calculated by multiplying BOM norms with planned production
                </p>
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded text-xs">
                <button
                  onClick={() => setChartMetric('shortage')}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                    chartMetric === 'shortage'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Shortages
                </button>
                <button
                  onClick={() => setChartMetric('quantity')}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                    chartMetric === 'quantity'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Gross Req vs Stock
                </button>
              </div>
            </div>

            {/* Visual Bar Items */}
            <div className="mt-4 space-y-3">
              {(chartMetric === 'shortage' ? topShortages : topRequired).length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  No material shortages identified for the current production plan.
                </div>
              ) : (
                (chartMetric === 'shortage' ? topShortages : topRequired).map((item) => {
                  const maxVal = Math.max(
                    ...consolidatedRequirements.map((i) =>
                      chartMetric === 'shortage' ? i.shortage : Math.max(i.totalRequiredQuantity, i.availableStock)
                    )
                  ) || 1;

                  const shortagePct = Math.min(100, Math.round((item.shortage / maxVal) * 100));
                  const reqPct = Math.min(100, Math.round((item.totalRequiredQuantity / maxVal) * 100));
                  const stockPct = Math.min(100, Math.round((item.availableStock / maxVal) * 100));

                  return (
                    <div key={item.rmCode} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 truncate max-w-md">
                          <span className="font-mono font-bold text-slate-800 text-[11px]">{item.rmCode}</span>
                          <span className="text-slate-500 truncate text-[11px]">{item.rmDesc}</span>
                        </div>

                        <div className="flex items-center gap-2 text-right shrink-0">
                          {chartMetric === 'shortage' ? (
                            <span className="font-bold text-rose-600 tabular-nums text-xs">
                              Shortage: {item.shortage.toLocaleString()} {item.uom}
                            </span>
                          ) : (
                            <div className="text-[11px] tabular-nums">
                              <span className="text-slate-900 font-semibold">{item.totalRequiredQuantity.toLocaleString()}</span>
                              <span className="text-slate-400"> req / </span>
                              <span className="text-emerald-700 font-medium">{item.availableStock.toLocaleString()} {item.uom}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {chartMetric === 'shortage' ? (
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-rose-500 rounded-full transition-all"
                            style={{ width: `${Math.max(shortagePct, 3)}%` }}
                          />
                        </div>
                      ) : (
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex gap-0.5">
                          <div
                            className="h-full bg-slate-800 rounded-full"
                            style={{ width: `${reqPct}%` }}
                            title={`Required: ${item.totalRequiredQuantity}`}
                          />
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${stockPct}%` }}
                            title={`Available: ${item.availableStock}`}
                          />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>
              {chartMetric === 'shortage'
                ? `Showing ${topShortages.length} of ${kpis.shortageCount} total deficit materials`
                : 'Dark bar = Required gross qty | Green bar = Available production stock'}
            </span>
            <button
              onClick={() => onNavigate(chartMetric === 'shortage' ? 'shortage-analysis' : 'consolidated-rm')}
              className="text-amber-600 hover:text-amber-700 font-semibold flex items-center gap-1"
            >
              <span>Detailed Report</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* CHART 2: Procurement Priority Distribution & Sufficiency Gauge */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Procurement Priority Breakdown</h3>
              <span className="text-[11px] text-slate-500">Total: {kpis.totalUniqueRmCount}</span>
            </div>

            {/* Radial / Sufficiency Progress */}
            <div className="mt-4 p-4 bg-slate-50 rounded-lg text-center border border-slate-100">
              <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                Overall Stock Sufficiency
              </div>
              <div className="text-3xl font-black text-slate-900 mt-1 tabular-nums">
                {kpis.stockSufficiencyPct}%
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {kpis.sufficientStockCount} of {kpis.totalUniqueRmCount} materials covered
              </div>

              <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden mt-3">
                <div
                  className="bg-emerald-600 h-full rounded-full transition-all"
                  style={{ width: `${kpis.stockSufficiencyPct}%` }}
                />
              </div>
            </div>

            {/* Priority Status Rows */}
            <div className="mt-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2 rounded bg-rose-50/60 border border-rose-200">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                  <span className="font-bold text-rose-900">CRITICAL</span>
                </div>
                <span className="font-bold tabular-nums text-rose-800">{priorityCounts.CRITICAL} materials</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-amber-50/60 border border-amber-200">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="font-semibold text-amber-900">HIGH</span>
                </div>
                <span className="font-bold tabular-nums text-amber-800">{priorityCounts.HIGH} materials</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-orange-50/60 border border-orange-200">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-orange-400" />
                  <span className="font-medium text-orange-900">MEDIUM</span>
                </div>
                <span className="font-semibold tabular-nums text-orange-800">{priorityCounts.MEDIUM} materials</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-slate-100 border border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                  <span className="font-medium text-slate-700">LOW (Near ROL)</span>
                </div>
                <span className="font-semibold tabular-nums text-slate-700">{priorityCounts.LOW} materials</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-emerald-50/60 border border-emerald-200">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="font-medium text-emerald-900">NO ACTION (Stock OK)</span>
                </div>
                <span className="font-bold tabular-nums text-emerald-800">{priorityCounts.NO_ACTION} materials</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-right">
            <button
              onClick={() => onNavigate('procurement-plan')}
              className="text-xs font-semibold text-amber-600 hover:text-amber-700 inline-flex items-center gap-1"
            >
              <span>Open Procurement Action Plan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* SKU-WISE PRODUCTION PLAN OVERVIEW */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">SKU-wise Production Plan & Material Impact</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Production volume driving component bill of materials consumption
            </p>
          </div>
          <button
            onClick={() => onNavigate('production-plan')}
            className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1"
          >
            <span>View Full Plan</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {skuPlanList.map((skuItem) => {
            const comps = skuRequirements.filter((r) => r.sku === skuItem.sku);
            return (
              <div key={skuItem.sku} className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {skuItem.sku}
                  </span>
                  <span className="text-xs font-bold text-slate-900 tabular-nums">
                    {skuItem.planQty.toLocaleString()} Units
                  </span>
                </div>

                <div className="text-xs font-semibold text-slate-800 mt-2 line-clamp-1">
                  {skuItem.skuName}
                </div>

                <div className="mt-3 pt-2 border-t border-slate-200/80 text-[11px] text-slate-500 flex items-center justify-between">
                  <span>{comps.length} BOM Components</span>
                  <span className="font-medium text-slate-700">Norms applied</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
