import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserCheck,
  UserPlus,
  Repeat,
  DollarSign,
  Search,
  MapPin,
  Star,
  Download,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  X,
  Clock,
  ShieldCheck,
  TrendingUp,
  SlidersHorizontal,
  Compass,
  Layers,
  Sparkles,
  BarChart3,
  Calendar
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Line,
  Legend
} from 'recharts';
import { FilterBar } from '../components/FilterBar';
import { api } from '../services/api';
import {
  FilterState,
  CustomerAnalysisResponse,
  CustomerProfileItem,
  CustomerSegmentMetric
} from '../types';

interface CustomerAnalysisPageProps {
  filters: FilterState;
  onFilterChange: (filters: Partial<FilterState>) => void;
  refreshTrigger: number;
}

type CustomerTabType = 'rfm_segments' | 'frequency_ltv' | 'geography' | 'ledger';

const SEGMENT_COLORS: Record<string, string> = {
  Champions: '#2563eb',
  Loyal: '#0d9488',
  Potential: '#7c3aed',
  'At Risk': '#d97706',
  Hibernating: '#64748b'
};

const CHART_PALETTE = ['#2563eb', '#0d9488', '#7c3aed', '#d97706', '#10b981', '#ef4444', '#6366f1', '#ec4899'];

export const CustomerAnalysisPage: React.FC<CustomerAnalysisPageProps> = ({
  filters,
  onFilterChange,
  refreshTrigger
}) => {
  const [activeTab, setActiveTab] = useState<CustomerTabType>('rfm_segments');
  const [data, setData] = useState<CustomerAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Customer Ledger controls
  const [searchTerm, setSearchTerm] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');
  const [sortField, setSortField] = useState<'spend' | 'orders' | 'recency' | 'rating'>('spend');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfileItem | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    api.getCustomers(filters)
      .then(res => {
        if (mounted) {
          setData(res);
          setLoading(false);
        }
      })
      .catch(err => {
        console.error('Failed to fetch customer analysis:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to retrieve customer metrics');
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [filters, refreshTrigger]);

  // CSV Exporters
  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setExportMenuOpen(false);
  };

  const exportSegmentsCSV = () => {
    if (!data) return;
    const headers = ['Segment', 'Buyer Count', 'Share %', 'Total Revenue (BRL)', 'Average LTV (BRL)', 'Avg Orders', 'Avg Recency (Days)', 'Description', 'Strategy'];
    const rows = data.customerSegmentation.map(s => [
      `"${s.segment}"`,
      s.count,
      s.percentage.toFixed(1),
      s.revenue.toFixed(2),
      s.avgLtv.toFixed(2),
      s.avgOrders.toFixed(1),
      s.recencyDays,
      `"${s.description}"`,
      `"${s.actionStrategy}"`
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadCSV(csv, `olist_customer_segments_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const exportCustomerLedgerCSV = () => {
    if (!data) return;
    const headers = ['Customer Key', 'Customer UUID', 'City', 'State', 'Zip Code', 'RFM Segment', 'Orders Count', 'Lifetime Spend (BRL)', 'Average Order Value (BRL)', 'Recency (Days)', 'Review Score', 'Top Category'];
    const rows = filteredCustomers.map(c => [
      c.customerKey,
      `"${c.customerId}"`,
      `"${c.city}"`,
      `"${c.state}"`,
      `"${c.zipCode}"`,
      `"${c.segment}"`,
      c.ordersCount,
      c.lifetimeSpend.toFixed(2),
      c.avgOrderValue.toFixed(2),
      c.recencyDays,
      c.avgRating.toFixed(1),
      `"${c.topCategory}"`
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadCSV(csv, `olist_customers_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const exportGeographicCSV = () => {
    if (!data) return;
    const headers = ['State Code', 'Customer Count', 'Percentage %', 'Total Spend (BRL)', 'Avg Spend Per Customer (BRL)'];
    const rows = data.stateDistribution.map(s => [
      `"${s.state}"`,
      s.customerCount,
      s.percentage.toFixed(1),
      s.totalSpend.toFixed(2),
      s.avgSpendPerCustomer.toFixed(2)
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadCSV(csv, `olist_customer_geographic_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  // Filter and sort customer profiles
  const allCustomerRecords = useMemo(() => {
    if (!data) return [];
    return data.customersList || [];
  }, [data]);

  const filteredCustomers = useMemo(() => {
    if (!allCustomerRecords) return [];

    let list = allCustomerRecords.filter(c => {
      const matchSearch =
        searchTerm.trim() === '' ||
        c.customerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.customerUniqueId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.topCategory.toLowerCase().includes(searchTerm.toLowerCase());

      const matchSegment = segmentFilter === 'all' || c.segment.toLowerCase() === segmentFilter.toLowerCase();
      const matchState = stateFilter === 'all' || c.state.toUpperCase() === stateFilter.toUpperCase();

      return matchSearch && matchSegment && matchState;
    });

    list.sort((a, b) => {
      let comp = 0;
      if (sortField === 'spend') comp = a.lifetimeSpend - b.lifetimeSpend;
      else if (sortField === 'orders') comp = a.ordersCount - b.ordersCount;
      else if (sortField === 'recency') comp = a.recencyDays - b.recencyDays;
      else if (sortField === 'rating') comp = a.avgRating - b.avgRating;

      return sortDirection === 'desc' ? -comp : comp;
    });

    return list;
  }, [allCustomerRecords, searchTerm, segmentFilter, stateFilter, sortField, sortDirection]);

  const totalPages = Math.ceil(filteredCustomers.length / pageSize) || 1;
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, currentPage, pageSize]);

  // Distinct states for filter
  const distinctStates = useMemo(() => {
    if (!data?.stateDistribution) return [];
    return data.stateDistribution.map(s => s.state).sort();
  }, [data?.stateDistribution]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[480px] bg-white rounded-xl border border-slate-200/80 p-8 shadow-xs">
        <div className="w-9 h-9 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-800">Computing Customer Analytics &amp; RFM Segmentation</p>
        <p className="text-xs text-slate-500 mt-1">Slicing buyer behavior, retention curves, recency windows, and geographic concentration from dim_customer</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-sm font-semibold text-red-800">Unable to load customer analytics</p>
        <p className="text-xs text-red-600 mt-1">{error || 'Unknown warehouse error'}</p>
        <button
          onClick={() => onFilterChange({})}
          className="mt-4 px-4 py-2 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition cursor-pointer"
        >
          Reset Filters &amp; Retry
        </button>
      </div>
    );
  }

  const { kpis, customerSegmentation, purchaseFrequency, spendTiers, stateDistribution, topCustomers } = data;

  const tabs: Array<{ id: CustomerTabType; label: string }> = [
    { id: 'rfm_segments', label: 'RFM Segmentation & Strategy' },
    { id: 'frequency_ltv', label: 'Order Frequency & LTV Tiers' },
    { id: 'geography', label: 'Geographic Penetration' },
    { id: 'ledger', label: 'Customer Profiles Ledger' }
  ];

  return (
    <div className="space-y-6">
      {/* Global Filter Bar */}
      <FilterBar filters={filters} onChange={onFilterChange} showCategory={true} showRegion={true} />

      {/* KPI Headline Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Active Buyers & Universe */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">Total Buyer Accounts</span>
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {kpis.totalCustomers.toLocaleString()} <span className="text-sm font-normal text-slate-500">Buyers</span>
            </div>
            <div className="flex flex-col text-xs text-slate-500 mt-1">
              <div>
                <span>Active in Filter: </span>
                <span className="font-mono tabular-nums font-semibold text-blue-700">{kpis.activeCustomersInFilter.toLocaleString()}</span>
                <span className="font-mono tabular-nums text-slate-600"> ({((kpis.activeCustomersInFilter / (kpis.totalCustomers || 1)) * 100).toFixed(1)}% active)</span>
              </div>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 text-xs text-slate-500">
            <span>Dominant Segment: {kpis.topSegment}</span>
            <br />
            <span className="text-slate-400 font-mono">dim_customer</span>
          </div>
        </div>

        {/* Metric 2: Repeat Purchase Rate & Retention */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">Repeat Purchase Rate</span>
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 flex items-center gap-2">
              <span>{kpis.repeatPurchaseRate}%</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                {kpis.returningCustomers.toLocaleString()} repeat
              </span>
            </div>
            <div className="flex flex-col text-xs text-slate-500 mt-1">
              <div>
                <span>One-Time Buyers: </span>
                <span className="font-mono tabular-nums font-semibold text-slate-700">{kpis.newCustomers.toLocaleString()}</span>
              </div>
              <span className="text-slate-500">Single Order</span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 text-xs text-slate-500">
            <span>Marketplace Benchmark: ~3.0%</span>
            <br />
            <span className="text-emerald-700 font-semibold font-mono">Brazilian Norm</span>
          </div>
        </div>

        {/* Metric 3: Average Customer Lifetime Value (LTV) */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">Average Customer LTV</span>
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              R$ {kpis.avgCustomerLtv.toFixed(2)}
            </div>
            <div className="flex flex-col text-xs text-slate-500 mt-1">
              <div>
                <span>Average Basket (AOV): </span>
                <span className="font-mono tabular-nums font-semibold text-slate-700">R$ {kpis.avgOrderValue.toFixed(2)}</span>
              </div>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 text-xs text-slate-500">
            <span>Cumulative Spend / Buyer</span>
            <br />
            <span className="text-teal-700 font-medium font-mono">BRL</span>
          </div>
        </div>

        {/* Metric 4: Customer Satisfaction Index */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">Customer Rating Index</span>
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 flex items-center gap-2">
              <span>{kpis.avgCustomerRating.toFixed(2)}</span>
              <span className="text-sm font-normal text-slate-400">/ 5.0</span>
            </div>
            <div className="flex flex-col text-xs text-slate-500 mt-1">
              <div>
                <span>Top Buyer Spend: </span>
                <span className="font-mono tabular-nums font-semibold text-emerald-700">
                  R$ {topCustomers[0]?.lifetimeSpend.toLocaleString() || '0'}
                </span>
              </div>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 text-xs text-slate-500">
            <span>Buyer Feedback Score</span>
            <br />
            <span className="text-amber-700 font-medium font-mono">Verified Reviews</span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Bar & Export Data Action */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-2 rounded-xl border border-slate-200/80 shadow-xs">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Export Data Dropdown */}
        <div className="relative shrink-0">
          <button
            onClick={() => setExportMenuOpen(prev => !prev)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition cursor-pointer shadow-xs whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Customer Datasets</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {exportMenuOpen && (
            <div className="absolute right-0 mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-lg z-20 py-1.5 text-xs text-slate-700 animate-in fade-in duration-100">
              <div className="px-3 py-1 font-semibold text-slate-400 border-b border-slate-100">
                Download CSV Datasets
              </div>
              <button
                onClick={exportSegmentsCSV}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 transition cursor-pointer flex items-center justify-between"
              >
                <span>RFM Segments &amp; Strategy</span>
                <span className="text-[10px] text-slate-400 font-mono">CSV</span>
              </button>
              <button
                onClick={exportCustomerLedgerCSV}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 transition cursor-pointer flex items-center justify-between border-t border-slate-100"
              >
                <span>Customer Ledger ({filteredCustomers.length} Records)</span>
                <span className="text-[10px] text-slate-400 font-mono">CSV</span>
              </button>
              <button
                onClick={exportGeographicCSV}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 transition cursor-pointer flex items-center justify-between border-t border-slate-100"
              >
                <span>State Geographic Distribution</span>
                <span className="text-[10px] text-slate-400 font-mono">CSV</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: RFM SEGMENTS & STRATEGY */}
      {/* ========================================================================= */}
      {activeTab === 'rfm_segments' && (
        <div className="space-y-6">
          {/* Main Visuals: RFM Bar Chart & Share Donut */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* RFM Customer Segment Breakdown Bar Chart */}
            <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-slate-100 gap-2">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">RFM Customer Segmentation Distribution</h3>
                  <p className="text-xs text-slate-500">Recency, Frequency &amp; Monetary spend tiers mapped across buyers</p>
                </div>
                <span className="text-xs text-slate-500 font-mono">{customerSegmentation.length} Segments</span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={customerSegmentation} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="segment" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip
                      formatter={(v: any, name: any) => [
                        `${Number(v).toLocaleString()} buyers`,
                        'Count'
                      ]}
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {customerSegmentation.map(entry => (
                        <Cell key={`cell-${entry.segment}`} fill={SEGMENT_COLORS[entry.segment] || '#2563eb'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-4 border-t border-slate-100 text-xs">
                {customerSegmentation.map(s => (
                  <div key={s.segment} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5 mb-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="truncate">{s.segment}</span>
                    </span>
                    <p className="text-base font-bold font-mono text-slate-900">{s.count.toLocaleString()}</p>
                    <span className="text-[10px] text-slate-500 font-mono">{s.percentage}% share</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Revenue Contribution by Segment Donut */}
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                  <h3 className="font-bold text-slate-900 text-sm">Segment Revenue Share</h3>
                  <span className="text-xs text-slate-500 font-mono">BRL Total</span>
                </div>

                <div className="h-48 w-full my-auto">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={customerSegmentation}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={2}
                        dataKey="revenue"
                        nameKey="segment"
                      >
                        {customerSegmentation.map(entry => (
                          <Cell key={`cell-rev-${entry.segment}`} fill={SEGMENT_COLORS[entry.segment] || '#2563eb'} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: any) => [`R$ ${Number(v).toLocaleString()}`, 'Revenue']}
                        contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-1.5">
                {customerSegmentation.map(s => (
                  <div key={s.segment} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-slate-700">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                      <span>{s.segment}</span>
                    </span>
                    <span className="font-mono tabular-nums text-slate-900 font-bold">
                      R$ {s.revenue.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Strategic RFM Segment Matrix Cards & Playbooks */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">RFM Strategic Playbook &amp; Segment Actions</h3>
                <p className="text-xs text-slate-500">Tailored marketing, retention, and win-back tactics derived from customer purchasing patterns</p>
              </div>
              <Sparkles className="w-4 h-4 text-purple-600" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {customerSegmentation.map(s => (
                <div key={s.segment} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold text-white" style={{ backgroundColor: s.color }}>
                        {s.segment}
                      </span>
                      <span className="text-xs font-mono font-semibold text-slate-500">
                        {s.count.toLocaleString()} buyers ({s.percentage}%)
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mb-3">{s.description}</p>

                    <div className="grid grid-cols-3 gap-2 py-2.5 my-2 border-y border-slate-200/80 font-mono text-[11px] tabular-nums">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block font-sans">Avg LTV</span>
                        <span className="font-bold text-slate-900">R$ {s.avgLtv.toFixed(0)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block font-sans">Avg Orders</span>
                        <span className="font-bold text-slate-900">{s.avgOrders.toFixed(1)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block font-sans">Recency</span>
                        <span className="font-bold text-slate-900">~{s.recencyDays}d</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-200/60">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Recommended Action</span>
                    <p className="text-xs font-semibold text-slate-800">{s.actionStrategy}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ORDER FREQUENCY & LTV TIERS */}
      {/* ========================================================================= */}
      {activeTab === 'frequency_ltv' && (
        <div className="space-y-6">
          {/* Order Frequency vs Revenue Contribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Purchase Frequency Distribution */}
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Purchase Frequency Distribution</h3>
                  <p className="text-xs text-slate-500">Lifetime completed order counts per customer</p>
                </div>
                <Repeat className="w-4 h-4 text-emerald-600" />
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={purchaseFrequency} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="range" tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip
                      formatter={(v: any, name: any) => [
                        `${Number(v).toLocaleString()} buyers`,
                        'Count'
                      ]}
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                    />
                    <Bar dataKey="count" fill="#0d9488" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2.5 pt-3 border-t border-slate-100">
                {purchaseFrequency.map(f => (
                  <div key={f.range} className="p-2.5 bg-slate-50 rounded-lg flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-slate-800 block">{f.range}</span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {f.count.toLocaleString()} buyers ({f.percentage}%)
                      </span>
                    </div>
                    <div className="text-right font-mono">
                      <span className="font-bold text-slate-900 block">R$ {f.revenue.toLocaleString()}</span>
                      <span className="text-[11px] text-slate-400">R$ {f.avgSpend.toFixed(0)} avg spend</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Customer Spend Tiers */}
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Customer Lifetime Spend Tiers</h3>
                    <p className="text-xs text-slate-500">Classification by cumulative BRL gross purchase value</p>
                  </div>
                  <DollarSign className="w-4 h-4 text-blue-600" />
                </div>

                <div className="space-y-3.5">
                  {spendTiers.map(t => (
                    <div key={t.tier} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-bold text-slate-800">{t.tier}</span>
                        <span className="font-mono font-semibold text-blue-700">{t.percentage}% of buyers</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${t.percentage}%` }} />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5 font-mono">
                        <span>{t.count.toLocaleString()} buyers</span>
                        <span className="font-semibold text-slate-800">R$ {t.revenue.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
                <span>Total Filtered Revenue:</span>
                <span className="font-mono font-bold text-slate-900">
                  R$ {spendTiers.reduce((s, t) => s + t.revenue, 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Top 10 High Value Buyers Ledger */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Top Lifetime Spenders (VIP Buyers)</h3>
                <p className="text-xs text-slate-500">Highest gross purchase value customer accounts in the current slice</p>
              </div>
              <span className="text-xs font-mono text-slate-400">Top 15 Accounts</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-2.5 px-3">Customer UUID</th>
                    <th className="py-2.5 px-3">Location</th>
                    <th className="py-2.5 px-3">Segment</th>
                    <th className="py-2.5 px-3 text-right">Orders</th>
                    <th className="py-2.5 px-3 text-right">AOV (BRL)</th>
                    <th className="py-2.5 px-3 text-right">Recency</th>
                    <th className="py-2.5 px-3 text-right">Rating</th>
                    <th className="py-2.5 px-3 text-right font-bold">Lifetime Spend (R$)</th>
                    <th className="py-2.5 px-3 text-center">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono tabular-nums text-[11px]">
                  {topCustomers.map(c => (
                    <tr key={c.customerId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-blue-700" title={c.customerId}>
                        {c.customerId.slice(0, 10)}...
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-700">
                        {c.city}, <span className="font-semibold text-slate-900">{c.state}</span>
                      </td>
                      <td className="py-2.5 px-3 font-sans">
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
                          style={{ backgroundColor: SEGMENT_COLORS[c.segment] || '#2563eb' }}
                        >
                          {c.segment}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-700 font-bold">
                        {c.ordersCount}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600">
                        R$ {c.avgOrderValue.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-500">
                        {c.recencyDays}d ago
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="font-semibold text-amber-600">★ {c.avgRating.toFixed(1)}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                        R$ {c.lifetimeSpend.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => setSelectedCustomer(c)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-sans font-medium transition cursor-pointer"
                        >
                          Profile
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: GEOGRAPHIC PENETRATION */}
      {/* ========================================================================= */}
      {activeTab === 'geography' && (
        <div className="space-y-6">
          {/* Top States Bar Chart & Concentration */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-slate-100 gap-2">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Customer Penetration by Brazilian State</h3>
                  <p className="text-xs text-slate-500">Registered buyers distributed across federal units</p>
                </div>
                <span className="text-xs text-slate-500 font-mono">{stateDistribution.length} Active States</span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stateDistribution.slice(0, 10)} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="state" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip
                      formatter={(v: any) => [`${Number(v).toLocaleString()} buyers`, 'Customer Count']}
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                    />
                    <Bar dataKey="customerCount" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-4 border-t border-slate-100 text-xs">
                {stateDistribution.slice(0, 5).map(s => (
                  <div key={s.state} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="font-bold text-slate-900 block">{s.state}</span>
                    <p className="text-base font-bold font-mono text-blue-700">{s.customerCount.toLocaleString()}</p>
                    <span className="text-[10px] text-slate-500 font-mono">{s.percentage}% share</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Macro-Region Concentration Summary */}
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                  <h3 className="font-bold text-slate-900 text-sm">Macro-Region Clustering</h3>
                  <Compass className="w-4 h-4 text-blue-600" />
                </div>

                <div className="space-y-3">
                  <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="font-bold text-blue-900">Southeast (SP, RJ, MG, ES)</span>
                      <span className="font-mono font-bold text-blue-700">~68.2%</span>
                    </div>
                    <p className="text-[11px] text-blue-700 leading-relaxed">
                      Primary economic hub with dense metropolitan purchasing power and lowest average freight costs.
                    </p>
                  </div>

                  <div className="p-3 bg-teal-50/50 rounded-lg border border-teal-100">
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="font-bold text-teal-900">South (PR, SC, RS)</span>
                      <span className="font-mono font-bold text-teal-700">~14.5%</span>
                    </div>
                    <p className="text-[11px] text-teal-700 leading-relaxed">
                      Strong per-capita spending, high repeat purchase loyalty in Curitiba &amp; Porto Alegre.
                    </p>
                  </div>

                  <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-100">
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="font-bold text-amber-900">Other Regions (NE, CW, North)</span>
                      <span className="font-mono font-bold text-amber-700">~17.3%</span>
                    </div>
                    <p className="text-[11px] text-amber-700 leading-relaxed">
                      Higher freight friction but higher basket sizes to offset logistics delivery costs.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
                <span>Top State: São Paulo (SP)</span>
                <span className="font-mono font-semibold text-slate-700">Highest Liquidity</span>
              </div>
            </div>
          </div>

          {/* Full State Geographic Performance Table */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">State-by-State Customer Performance Matrix</h3>
                <p className="text-xs text-slate-500">Cross-dimensional metrics across all 27 Brazilian federative units</p>
              </div>
              <button
                onClick={exportGeographicCSV}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition cursor-pointer shadow-xs self-start sm:self-auto"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export State Metrics</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-2.5 px-3">State Code</th>
                    <th className="py-2.5 px-3 text-right">Customer Count</th>
                    <th className="py-2.5 px-3 text-right">Customer Share %</th>
                    <th className="py-2.5 px-3 text-right">Avg Spend / Buyer</th>
                    <th className="py-2.5 px-3 text-right font-bold">Total State Spend (R$)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono tabular-nums text-[11px]">
                  {stateDistribution.map(s => (
                    <tr key={s.state} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-slate-900 font-sans">
                        {s.state}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-700 font-semibold">
                        {s.customerCount.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right text-blue-700 font-bold">
                        {s.percentage}%
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600">
                        R$ {s.avgSpendPerCustomer.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        R$ {s.totalSpend.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: CUSTOMER PROFILES LEDGER */}
      {/* ========================================================================= */}
      {activeTab === 'ledger' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Customer Profile Ledger &amp; Account History</h3>
              <p className="text-xs text-slate-500">Conformed dim_customer ledger with granular spend, recency, location, and satisfaction scores</p>
            </div>
            <button
              onClick={exportCustomerLedgerCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition cursor-pointer shadow-xs self-start sm:self-auto"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export {filteredCustomers.length} Filtered Buyers</span>
            </button>
          </div>

          {/* Search, Filter and Sort Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <div className="relative w-full max-w-sm">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Customer UUID, City, Category..."
                  value={searchTerm}
                  onChange={e => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Segment Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Segment:</span>
                <select
                  value={segmentFilter}
                  onChange={e => {
                    setSegmentFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="all">All Segments</option>
                  {customerSegmentation.map(s => (
                    <option key={s.segment} value={s.segment}>{s.segment}</option>
                  ))}
                </select>
              </div>

              {/* State Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">State:</span>
                <select
                  value={stateFilter}
                  onChange={e => {
                    setStateFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer max-w-[100px]"
                >
                  <option value="all">All States</option>
                  {distinctStates.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              {/* Sort By Field */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Sort:</span>
                <select
                  value={sortField}
                  onChange={e => setSortField(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="spend">Lifetime Spend</option>
                  <option value="orders">Orders Count</option>
                  <option value="recency">Recency (Days)</option>
                  <option value="rating">Review Rating</option>
                </select>
                <button
                  onClick={() => setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'))}
                  className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition cursor-pointer"
                  title="Toggle sort direction"
                >
                  {sortDirection === 'desc' ? <ArrowDownRight className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Customer Ledger Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2.5 px-3">Customer UUID</th>
                  <th className="py-2.5 px-3">Location</th>
                  <th className="py-2.5 px-3">Segment</th>
                  <th className="py-2.5 px-3 text-right">Orders</th>
                  <th className="py-2.5 px-3 text-right">Recency</th>
                  <th className="py-2.5 px-3">Top Category</th>
                  <th className="py-2.5 px-3 text-right">Rating</th>
                  <th className="py-2.5 px-3 text-right font-bold">Lifetime Spend (R$)</th>
                  <th className="py-2.5 px-3 text-center">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono tabular-nums text-[11px]">
                {paginatedCustomers.map(c => (
                  <tr key={c.customerId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-blue-700" title={c.customerId}>
                      {c.customerId.slice(0, 10)}...
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-700">
                      {c.city}, <span className="font-semibold text-slate-900">{c.state}</span>
                    </td>
                    <td className="py-2.5 px-3 font-sans">
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
                        style={{ backgroundColor: SEGMENT_COLORS[c.segment] || '#2563eb' }}
                      >
                        {c.segment}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-slate-700">
                      {c.ordersCount}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-500">
                      {c.recencyDays}d ago
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-600 capitalize truncate max-w-[130px]" title={c.topCategory}>
                      {c.topCategory}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="font-semibold text-amber-600">★ {c.avgRating.toFixed(1)}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                      R$ {c.lifetimeSpend.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => setSelectedCustomer(c)}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-sans font-medium transition cursor-pointer"
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                ))}

                {paginatedCustomers.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500 font-sans">
                      No customer accounts match your current search filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-100 text-xs text-slate-500">
            <span>
              Showing {paginatedCustomers.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} – {Math.min(currentPage * pageSize, filteredCustomers.length)} of {filteredCustomers.length} customers
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-mono">Page {currentPage} of {totalPages}</span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer 360° Profile Inspector Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden text-xs">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <h4 className="font-bold text-slate-900 text-sm">Customer 360° Profile Inspector</h4>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <span className="text-[11px] text-slate-400 uppercase font-mono block">Customer Identifier (Order Account UUID)</span>
                <span className="font-mono font-bold text-slate-900 text-xs break-all">{selectedCustomer.customerId}</span>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 uppercase font-mono block">Unique Person Identifier</span>
                <span className="font-mono text-slate-600 text-[11px] break-all">{selectedCustomer.customerUniqueId}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Location</span>
                  <span className="font-semibold text-slate-800">
                    {selectedCustomer.city}, {selectedCustomer.state} (CEP {selectedCustomer.zipCode})
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">RFM Segment</span>
                  <span
                    className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                    style={{ backgroundColor: SEGMENT_COLORS[selectedCustomer.segment] || '#2563eb' }}
                  >
                    {selectedCustomer.segment}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 border border-slate-200 rounded-lg">
                  <span className="text-[10px] text-slate-400 uppercase block">Lifetime Spend</span>
                  <span className="font-mono font-bold text-emerald-700 text-sm">
                    R$ {selectedCustomer.lifetimeSpend.toLocaleString()}
                  </span>
                </div>
                <div className="p-3 border border-slate-200 rounded-lg">
                  <span className="text-[10px] text-slate-400 uppercase block">Total Orders</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">{selectedCustomer.ordersCount}</span>
                </div>
                <div className="p-3 border border-slate-200 rounded-lg">
                  <span className="text-[10px] text-slate-400 uppercase block">Avg Order (AOV)</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    R$ {selectedCustomer.avgOrderValue.toFixed(0)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Recency Window</span>
                  <span className="font-mono font-semibold text-slate-800">~{selectedCustomer.recencyDays} days ago</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Last active: {selectedCustomer.lastOrderDate}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Top Product Category</span>
                  <span className="font-semibold text-slate-800 capitalize">{selectedCustomer.topCategory}</span>
                  <span className="text-[10px] text-amber-600 block mt-0.5 font-mono">
                    ★ {selectedCustomer.avgRating.toFixed(1)} review satisfaction
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono">dim_customer · warehouseStore</span>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
