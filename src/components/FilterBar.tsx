import React from 'react';
import { Filter, RotateCcw } from 'lucide-react';
import { FilterState } from '../types';

interface FilterBarProps {
  filters: FilterState;
  onChange: (newFilters: Partial<FilterState>) => void;
  categories?: string[];
  showCategory?: boolean;
  showRegion?: boolean;
  showStatus?: boolean;
}

const REGIONS = ['Southeast', 'South', 'Northeast', 'Central-West', 'North'];
const STATUSES = ['delivered', 'shipped', 'invoiced', 'processing', 'canceled'];

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onChange,
  categories = [
    'health_beauty',
    'computers_accessories',
    'bed_bath_table',
    'sports_leisure',
    'furniture_decor',
    'watches_gifts',
    'telephony',
    'auto',
    'toys'
  ],
  showCategory = true,
  showRegion = true,
  showStatus = true
}) => {
  const isFiltered =
    filters.dateRange !== 'all' ||
    filters.category !== 'all' ||
    filters.region !== 'all' ||
    filters.orderStatus !== 'all';

  const handleReset = () => {
    onChange({
      dateRange: 'all',
      category: 'all',
      region: 'all',
      orderStatus: 'all'
    });
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-xs mb-6 flex flex-wrap items-center justify-between gap-3 text-xs">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 font-semibold text-slate-700 mr-1">
          <Filter className="w-3.5 h-3.5 text-blue-600" />
          <span>Warehouse Filters:</span>
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500">Period:</span>
          <select
            value={filters.dateRange}
            onChange={e => onChange({ dateRange: e.target.value as any })}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 outline-none hover:border-slate-300 transition cursor-pointer"
          >
            <option value="all">All Available (2017 - 2018)</option>
            <option value="2018">Year 2018</option>
            <option value="2017">Year 2017</option>
            <option value="last90">Last 90 Days</option>
          </select>
        </div>

        {/* Category Filter */}
        {showCategory && (
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Category:</span>
            <select
              value={filters.category}
              onChange={e => onChange({ category: e.target.value })}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 outline-none hover:border-slate-300 transition cursor-pointer capitalize"
            >
              <option value="all">All Categories</option>
              {categories.map(c => (
                <option key={c} value={c}>
                  {c.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Region Filter */}
        {showRegion && (
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Region:</span>
            <select
              value={filters.region}
              onChange={e => onChange({ region: e.target.value })}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 outline-none hover:border-slate-300 transition cursor-pointer"
            >
              <option value="all">All Regions</option>
              {REGIONS.map(r => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Order Status Filter */}
        {showStatus && (
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Status:</span>
            <select
              value={filters.orderStatus}
              onChange={e => onChange({ orderStatus: e.target.value })}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 outline-none hover:border-slate-300 transition cursor-pointer capitalize"
            >
              <option value="all">All Statuses</option>
              {STATUSES.map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Reset Button */}
      {isFiltered && (
        <button
          onClick={handleReset}
          className="flex items-center gap-1 px-2.5 py-1 text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-lg transition font-medium cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset Filters</span>
        </button>
      )}
    </div>
  );
};
