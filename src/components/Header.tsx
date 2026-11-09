import React from 'react';
import { Calendar } from 'lucide-react';
import { FilterState } from '../types';

interface HeaderProps {
  pageTitle: string;
  filters: FilterState;
  onFilterChange: (newFilters: Partial<FilterState>) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  pageTitle,
  filters,
  onFilterChange
}) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 sticky top-0 z-20 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      {/* Title & Breadcrumbs */}
      <div>
        <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
          <span>Olist Data Warehouse</span>
        </div>
        <h2 className="text-lg font-bold text-slate-900 leading-tight">
          {pageTitle}
        </h2>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Date Range Selector */}
        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-1 text-xs text-slate-700 shadow-xs">
          <Calendar className="w-3.5 h-3.5 text-slate-500 ml-1.5 mr-1" />
          <select
            value={filters.dateRange}
            onChange={e => onFilterChange({ dateRange: e.target.value as any })}
            className="bg-transparent font-medium py-1 pr-2 outline-none cursor-pointer text-slate-700 text-xs"
          >
            <option value="all">All Dates (2017-2018)</option>
            <option value="2018">Year 2018</option>
            <option value="2017">Year 2017</option>
            <option value="last90">Last 90 Days</option>
          </select>
        </div>
      </div>
    </header>
  );
};
