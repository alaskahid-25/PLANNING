import React from 'react';
import {
  LayoutDashboard,
  Upload,
  CalendarDays,
  Layers,
  Warehouse,
  AlertTriangle,
  TrendingUp,
  ShoppingCart,
  DollarSign,
  Brain,
  ShieldAlert,
  History,
  Settings,
  ChevronRight,
  Menu,
  X,
  Boxes,
  CalendarRange,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'upload'
  | 'production-plan'
  | 'custom-scheduler'
  | 'consolidated-rm'
  | 'sku-requirements'
  | 'stock-analysis'
  | 'shortage-analysis'
  | 'excess-stock'
  | 'procurement-plan'
  | 'material-costing'
  | 'ai-summary'
  | 'data-validation'
  | 'plan-history'
  | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  shortageCount: number;
  criticalProcurementCount: number;
  validationIssueCount: number;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  shortageCount,
  criticalProcurementCount,
  validationIssueCount,
  mobileOpen,
  setMobileOpen,
}) => {
  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'upload' as NavTab, label: 'Upload Excel Files', icon: Upload },
    { id: 'production-plan' as NavTab, label: 'Production Plan', icon: CalendarDays },
    { id: 'custom-scheduler' as NavTab, label: 'Custom Date & SKU Planner', icon: CalendarRange },
    { id: 'consolidated-rm' as NavTab, label: 'Material Requirement', icon: Layers },
    { id: 'sku-requirements' as NavTab, label: 'SKU BOM Breakdown', icon: Boxes },
    { id: 'stock-analysis' as NavTab, label: 'Stock Analysis', icon: Warehouse },
    {
      id: 'shortage-analysis' as NavTab,
      label: 'Shortage Analysis',
      icon: AlertTriangle,
      badge: shortageCount > 0 ? shortageCount : null,
      badgeColor: 'bg-rose-500 text-white',
    },
    { id: 'excess-stock' as NavTab, label: 'Excess Stock', icon: TrendingUp },
    {
      id: 'procurement-plan' as NavTab,
      label: 'Procurement Planning',
      icon: ShoppingCart,
      badge: criticalProcurementCount > 0 ? criticalProcurementCount : null,
      badgeColor: 'bg-amber-500 text-slate-950 font-bold',
    },
    { id: 'material-costing' as NavTab, label: 'Material Costing', icon: DollarSign },
    { id: 'ai-summary' as NavTab, label: 'AI Management Summary', icon: Brain },
    {
      id: 'data-validation' as NavTab,
      label: 'Data Validation',
      icon: ShieldAlert,
      badge: validationIssueCount > 0 ? validationIssueCount : null,
      badgeColor: 'bg-slate-700 text-slate-200',
    },
    { id: 'plan-history' as NavTab, label: 'Plan History', icon: History },
    { id: 'settings' as NavTab, label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center text-slate-950 font-black text-sm tracking-wider shadow-sm">
              SP
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight text-white leading-tight">
                SMART PLANNER AI
              </div>
              <div className="text-[10px] text-amber-400 font-medium tracking-wide">
                COOKING OIL ERP
              </div>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1 rounded text-slate-400 hover:text-white lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all group ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon
                    className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                      isActive ? 'text-slate-950' : 'text-slate-500 group-hover:text-slate-300'
                    }`}
                  />
                  <span className="truncate tracking-tight">{item.label}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {item.badge !== null && item.badge !== undefined && (
                    <span
                      className={`px-1.5 py-0.2 text-[9px] rounded-full font-bold tabular-nums ${item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                  )}
                  {isActive && <ChevronRight className="w-3 h-3 text-slate-950" />}
                </div>
              </button>
            );
          })}
        </nav>

        {/* System Version & Plant Info */}
        <div className="p-4 border-t border-slate-800 text-[11px] text-slate-400 bg-slate-950/40">
          <div className="flex items-center justify-between font-medium text-slate-300">
            <span>Plant #1 (Refinery & Packing)</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Palmolein · Sunflower · Groundnut · Mustard
          </div>
        </div>
      </aside>
    </>
  );
};
