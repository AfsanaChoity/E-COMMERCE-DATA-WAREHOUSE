import React from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  Package,
  Users,
  MapPin,
  FileSpreadsheet,
  DatabaseZap,
  Database
} from 'lucide-react';

export type ActivePage =
  | 'dashboard'
  | 'sales'
  | 'products'
  | 'customers'
  | 'locations'
  | 'reports'
  | 'warehouse';

interface SidebarProps {
  activePage: ActivePage;
  setActivePage: (page: ActivePage) => void;
  dbConnected?: boolean;
  totalRecords?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  setActivePage
}) => {
  const navItems = [
    { id: 'dashboard' as ActivePage, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'sales' as ActivePage, label: 'Sales Analysis', icon: TrendingUp },
    { id: 'products' as ActivePage, label: 'Product Analysis', icon: Package },
    { id: 'customers' as ActivePage, label: 'Customer Analysis', icon: Users },
    { id: 'locations' as ActivePage, label: 'Location Analysis', icon: MapPin },
    { id: 'reports' as ActivePage, label: 'Reports', icon: FileSpreadsheet },
    { id: 'warehouse' as ActivePage, label: 'ETL & Data Warehouse', icon: DatabaseZap }
  ];

  return (
    <aside className="w-64 bg-[#0a1020] text-slate-300 flex flex-col shrink-0 border-r border-slate-800/80 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-5 gap-3 border-b border-slate-800/80 bg-[#070b16]">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
          <Database className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-bold text-white text-base tracking-tight leading-none">
            E-Commerce DW
          </h1>
          <span className="text-[11px] text-blue-400 font-medium tracking-wide">
            Olist BI System
          </span>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          Analytical Platform
        </div>
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 text-left ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span className="truncate">{item.label}</span>
              {item.id === 'warehouse' && (
                <span className="ml-auto w-2 h-2 rounded-full bg-emerald-400"></span>
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
};
