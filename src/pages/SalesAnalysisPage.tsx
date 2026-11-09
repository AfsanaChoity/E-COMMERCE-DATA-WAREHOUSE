import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  Calendar,
  Layers,
  DollarSign,
  Package,
  MapPin,
  Download,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Truck,
  Star,
  CheckCircle2,
  XCircle,
  Clock,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ComposedChart,
  AreaChart,
  Area
} from 'recharts';
import { FilterBar } from '../components/FilterBar';
import { api } from '../services/api';
import { FilterState, SalesAnalysisResponse, SalesTransactionItem } from '../types';

interface SalesAnalysisPageProps {
  filters: FilterState;
  onFilterChange: (filters: Partial<FilterState>) => void;
  refreshTrigger: number;
}

type TabType = 'overview' | 'temporal' | 'categories' | 'logistics' | 'transactions';

export const SalesAnalysisPage: React.FC<SalesAnalysisPageProps> = ({
  filters,
  onFilterChange,
  refreshTrigger
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [salesData, setSalesData] = useState<SalesAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Transactions ledger search, filter, and sorting state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'date' | 'amount' | 'freight' | 'score'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    api.getSales(filters)
      .then(res => {
        if (mounted) {
          setSalesData(res);
          setLoading(false);
        }
      })
      .catch(err => {
        console.error('Failed to fetch sales analysis:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to retrieve sales analysis');
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [filters, refreshTrigger]);

  // CSV Exporter Helper
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

  const exportMonthlySalesCSV = () => {
    if (!salesData) return;
    const headers = ['Period', 'Year', 'Month', 'Orders Count', 'Units Sold', 'Merchandise Revenue (BRL)', 'Freight Value (BRL)', 'AOV (BRL)', 'MoM Growth %', 'Average Rating'];
    const rows = salesData.monthlySales.map(m => [
      `"${m.period}"`,
      m.year,
      `"${m.month}"`,
      m.orders,
      m.units,
      m.revenue.toFixed(2),
      m.freight.toFixed(2),
      m.aov.toFixed(2),
      m.momGrowth.toFixed(1),
      m.avgRating.toFixed(1)
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadCSV(csv, `olist_monthly_sales_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const exportCategorySalesCSV = () => {
    if (!salesData) return;
    const headers = ['Category English', 'Category Portuguese', 'Revenue (BRL)', 'Orders Count', 'Units Sold', 'Avg Unit Price (BRL)', 'Share %', 'Cumulative %'];
    const rows = salesData.salesByCategory.map(c => [
      `"${c.category}"`,
      `"${c.categoryPt}"`,
      c.revenue.toFixed(2),
      c.orders,
      c.units,
      c.avgPrice.toFixed(2),
      c.percentage.toFixed(1),
      c.cumulativePercentage.toFixed(1)
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadCSV(csv, `olist_category_sales_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const exportTransactionsCSV = () => {
    if (!salesData) return;
    const headers = ['Sales ID', 'Order ID', 'Order Date', 'Status', 'Category', 'Customer City', 'Customer State', 'Seller City', 'Seller State', 'Quantity', 'Unit Price (BRL)', 'Freight Value (BRL)', 'Sales Amount (BRL)', 'Review Score'];
    const rows = filteredTransactions.map(t => [
      t.salesId,
      `"${t.orderId}"`,
      `"${t.date}"`,
      `"${t.orderStatus}"`,
      `"${t.category}"`,
      `"${t.customerCity}"`,
      `"${t.customerState}"`,
      `"${t.sellerCity}"`,
      `"${t.sellerState}"`,
      t.quantity,
      t.unitPrice.toFixed(2),
      t.freightValue.toFixed(2),
      t.salesAmount.toFixed(2),
      t.reviewScore ?? ''
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadCSV(csv, `olist_sales_transactions_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  // Filtered & Sorted Transactions for Ledger Tab
  const filteredTransactions = useMemo(() => {
    if (!salesData?.transactions) return [];

    let list = salesData.transactions.filter(t => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        t.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.customerCity.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.sellerCity.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || t.orderStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });

    list.sort((a, b) => {
      let comp = 0;
      if (sortField === 'date') comp = a.date.localeCompare(b.date);
      else if (sortField === 'amount') comp = a.salesAmount - b.salesAmount;
      else if (sortField === 'freight') comp = a.freightValue - b.freightValue;
      else if (sortField === 'score') comp = (a.reviewScore || 0) - (b.reviewScore || 0);

      return sortDirection === 'desc' ? -comp : comp;
    });

    return list;
  }, [salesData?.transactions, searchQuery, statusFilter, sortField, sortDirection]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[480px] bg-white rounded-xl border border-slate-200/80 p-8 shadow-xs">
        <div className="w-9 h-9 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-800">Calculating Multi-Dimensional Sales Metrics</p>
        <p className="text-xs text-slate-500 mt-1">Aggregating fact_sales, dim_date, and catalog dimensions from the warehouse</p>
      </div>
    );
  }

  if (error || !salesData) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-sm font-semibold text-red-800">Unable to load sales analysis data</p>
        <p className="text-xs text-red-600 mt-1">{error || 'Unknown warehouse error'}</p>
        <button
          onClick={() => onFilterChange({})}
          className="mt-4 px-4 py-2 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition"
        >
          Reset Filters &amp; Retry
        </button>
      </div>
    );
  }

  const { summary, monthlySales, quarterlySales, yearlySales, dayOfWeekSales, seasonalitySales, weekendVsWeekday, salesByStatus, priceBrackets, salesByCategory, topSellingProducts, salesByRegion } = salesData;

  const tabs: Array<{ id: TabType; label: string }> = [
    { id: 'overview', label: 'Executive Overview' },
    { id: 'temporal', label: 'Temporal & Seasonality' },
    { id: 'categories', label: 'Category & Catalog Pareto' },
    { id: 'logistics', label: 'Geographic & Freight Logistics' },
    { id: 'transactions', label: 'Sales Transaction Ledger' }
  ];

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <FilterBar filters={filters} onChange={onFilterChange} />

      {/* KPI Headline Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Gross Merchandise Revenue */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">Gross Merchandise Sales</span>
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              R$ {summary.totalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="flex flex-col text-xs text-slate-500 mt-1">
              <span className="font-mono tabular-nums font-semibold text-slate-700"> Freight: R$ {summary.totalFreight.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums font-semibold text-slate-700">Gross: R$ {summary.totalGross.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Delivered: R$ {summary.deliveredRevenue.toLocaleString()}</span>
          </div>
        </div>

        {/* Metric 2: Order Volume & AOV */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">Orders &amp; Volume</span>
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {summary.totalOrders.toLocaleString()} <span className="text-sm font-normal text-slate-500">orders</span>
            </div>
            <div className="flex flex-col  text-xs text-slate-500 mt-1">
              <span className="font-mono tabular-nums font-semibold text-emerald-700">Average Ticket: R$ {summary.aov.toFixed(2)}</span>
              <span className="font-mono tabular-nums font-semibold text-slate-700">Units: {summary.totalUnits.toLocaleString()}</span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100  text-xs text-slate-500">
            <span>Distinct Buyers: {summary.uniqueCustomers.toLocaleString()}</span>
            <br />
            <span className="font-mono tabular-nums">{(summary.totalUnits / (summary.totalOrders || 1)).toFixed(2)} items/order</span>
          </div>
        </div>

        {/* Metric 3: Logistics & Freight Impact */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">Shipping &amp; Logistics Impact</span>
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              R$ {summary.avgFreight.toFixed(2)} <span className="text-sm font-normal text-slate-500">/ order</span>
            </div>
            <div className=" text-xs text-slate-500 mt-1">
              <span>Freight Burden: </span>
              <span className="font-mono tabular-nums font-semibold text-amber-700">{summary.freightRatio.toFixed(1)}% of gross</span>
              <br />
              <span>Sellers: </span>
              <span className="font-mono tabular-nums text-slate-700">{summary.uniqueSellers.toLocaleString()}</span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100  text-xs text-slate-500">
            <span>Fulfillment Hub: Southeast (SP)</span>
            <br />
            <span className="text-emerald-700 font-medium">Delivered: {summary.deliveredOrders.toLocaleString()}</span>
          </div>
        </div>

        {/* Metric 4: Customer Satisfaction & Rating */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">Customer Rating Index</span>
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 flex items-center gap-2">
              <span>{summary.avgReviewScore.toFixed(2)}</span>
              <span className="text-sm font-normal text-slate-400">/ 5.0</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              <div className="flex items-center gap-1">
                <span>Completed Orders: </span>
                <span className="font-mono tabular-nums text-emerald-600 font-semibold">{summary.deliveredOrders.toLocaleString()}</span>
                <span className="text-slate-400">({((summary.deliveredOrders / (summary.totalOrders || 1)) * 100).toFixed(1)}%)</span>
              </div>
              <div className="flex items-center gap-1">
                <span>Canceled: </span>
                <span className="font-mono tabular-nums text-rose-600 font-semibold">{summary.canceledOrders.toLocaleString()}</span>
                <span className="text-slate-400">({((summary.canceledOrders / (summary.totalOrders || 1)) * 100).toFixed(1)}%)</span>
              </div>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 text-xs text-slate-500">
            <span>Distinct Catalog SKUs: {summary.uniqueProducts.toLocaleString()}</span>

          </div>
        </div>
      </div>

      {/* Navigation Sub-Bar & Export CSV Action */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-2 rounded-xl border border-slate-200/80 shadow-xs">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${isActive
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
            <span>Export Warehouse Data</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {exportMenuOpen && (
            <div className="absolute right-0 mt-1 w-56 bg-white border border-slate-200 rounded-xl shadow-lg z-20 py-1.5 text-xs text-slate-700 animate-in fade-in duration-100">
              <div className="px-3 py-1 font-semibold text-slate-400 border-b border-slate-100">
                Download CSV Datasets
              </div>
              <button
                onClick={exportMonthlySalesCSV}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 transition cursor-pointer flex items-center justify-between"
              >
                <span>Monthly Sales Aggregates</span>
                <span className="text-[10px] text-slate-400 font-mono">CSV</span>
              </button>
              <button
                onClick={exportCategorySalesCSV}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 transition cursor-pointer flex items-center justify-between"
              >
                <span>Category Performance &amp; Pareto</span>
                <span className="text-[10px] text-slate-400 font-mono">CSV</span>
              </button>
              <button
                onClick={exportTransactionsCSV}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 transition cursor-pointer flex items-center justify-between border-t border-slate-100"
              >
                <span>Itemized Transactions (Filtered)</span>
                <span className="text-[10px] text-slate-400 font-mono">CSV</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: EXECUTIVE OVERVIEW */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Main Composed Chart: Revenue & Order Counts */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-slate-100 gap-2">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Monthly Revenue Trend &amp; Order Volume</h3>
                <p className="text-xs text-slate-500">Dual-axis OLAP comparison: Net Merchandise Sales (R$) vs Total Completed Orders</p>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-blue-600 rounded-xs inline-block" /> Revenue (R$)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-emerald-600 inline-block" /> Order Count
                </span>
              </div>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlySales} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickFormatter={val => `R$${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                  />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#059669' }} />
                  <Tooltip
                    formatter={(val: any, name: any) => [
                      name === 'Revenue (R$)' ? `R$ ${Number(val).toLocaleString()}` : Number(val).toLocaleString(),
                      name
                    ]}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px', border: 'none' }}
                  />
                  <Bar yAxisId="left" dataKey="revenue" name="Revenue (R$)" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="orders" name="Order Count" stroke="#059669" strokeWidth={2.5} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Secondary Charts: Quarterly Breakdown & Average Order Value Evolution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quarterly Performance */}
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                  <h3 className="font-bold text-slate-900 text-sm">Quarterly Revenue Breakdown</h3>
                  <span className="text-xs text-slate-500 font-mono">{quarterlySales.length} Quarters</span>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={quarterlySales} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="quarter" tick={{ fontSize: 11, fill: '#64748b' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip
                        formatter={(v: any) => [`R$ ${Number(v).toLocaleString()}`, 'Revenue']}
                        contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                      />
                      <Bar dataKey="revenue" name="Quarterly Revenue" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
                {quarterlySales.slice(-3).map(q => (
                  <div key={q.quarter} className="p-2 bg-slate-50 rounded-lg">
                    <span className="text-slate-500 block text-[11px]">{q.quarter}</span>
                    <span className="font-bold text-slate-800 font-mono tabular-nums">R$ {(q.revenue / 1000).toFixed(1)}k</span>
                  </div>
                ))}
              </div>
            </div>

            {/* AOV Trend Line */}
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                  <h3 className="font-bold text-slate-900 text-sm">Average Order Value (AOV) Trajectory</h3>
                  <span className="text-xs text-slate-500 font-mono">Mean: R$ {summary.aov.toFixed(2)}</span>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlySales} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#64748b' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={v => `R$${v}`} domain={['auto', 'auto']} />
                      <Tooltip
                        formatter={(v: any) => [`R$ ${Number(v).toFixed(2)}`, 'AOV']}
                        contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                      />
                      <Line type="monotone" dataKey="aov" stroke="#0284c7" strokeWidth={2.5} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Basket Size Stability: Low variance</span>
                <span className="font-mono tabular-nums">Min: R$ {Math.min(...monthlySales.map(m => m.aov)).toFixed(2)} · Max: R$ {Math.max(...monthlySales.map(m => m.aov)).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Quick Insights Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Top Revenue Period</span>
              {(() => {
                const peak = [...monthlySales].sort((a, b) => b.revenue - a.revenue)[0];
                return peak ? (
                  <div className="mt-2">
                    <p className="text-lg font-bold text-slate-900 font-mono">{peak.month} {peak.year}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      R$ {peak.revenue.toLocaleString()} across {peak.orders.toLocaleString()} orders
                    </p>
                  </div>
                ) : null;
              })()}
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Peak Order Volume</span>
              {(() => {
                const peakOrders = [...monthlySales].sort((a, b) => b.orders - a.orders)[0];
                return peakOrders ? (
                  <div className="mt-2">
                    <p className="text-lg font-bold text-emerald-700 font-mono">{peakOrders.orders.toLocaleString()} Orders</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Recorded in {peakOrders.month} {peakOrders.year} (R$ {peakOrders.revenue.toLocaleString()})
                    </p>
                  </div>
                ) : null;
              })()}
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Fulfillment Success Rate</span>
              <div className="mt-2">
                <p className="text-lg font-bold text-blue-700 font-mono">
                  {((summary.deliveredOrders / (summary.totalOrders || 1)) * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {summary.deliveredOrders.toLocaleString()} completed deliveries, {summary.canceledOrders} cancellations
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TEMPORAL & SEASONALITY */}
      {/* ========================================================================= */}
      {activeTab === 'temporal' && (
        <div className="space-y-6">
          {/* Day of Week & Weekend vs Weekday Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Day of Week Breakdown Chart */}
            <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Sales Velocity by Day of Week</h3>
                  <p className="text-xs text-slate-500">Purchasing activity across Sunday through Saturday</p>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dayOfWeekSales} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="dayName" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(v: any, name: any) => [
                        name === 'revenue' ? `R$ ${Number(v).toLocaleString()}` : v,
                        name === 'revenue' ? 'Revenue' : 'Orders'
                      ]}
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                    />
                    <Bar dataKey="revenue" name="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Brazilian Seasonality & Weekend Split */}
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                  <h3 className="font-bold text-slate-900 text-sm">Southern Hemisphere Seasonality</h3>
                  <span className="text-xs text-slate-500">Brazil Climate</span>
                </div>

                <div className="space-y-3">
                  {seasonalitySales.map(season => (
                    <div key={season.season} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-slate-800">{season.season}</span>
                        <span className="font-mono tabular-nums text-slate-600 font-bold">{season.percentage}%</span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-600 h-1.5 rounded-full"
                          style={{ width: `${season.percentage}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1 font-mono">
                        <span>R$ {season.revenue.toLocaleString()}</span>
                        <span>{season.orders.toLocaleString()} orders</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Weekend vs Weekday summary */}
              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5">
                  <span>Weekday: <strong className="font-mono tabular-nums">{weekendVsWeekday.weekday.percentage}%</strong></span>
                  <span>Weekend: <strong className="font-mono tabular-nums">{weekendVsWeekday.weekend.percentage}%</strong></span>
                </div>
                <div className="flex h-2 w-full rounded-full overflow-hidden">
                  <div className="bg-blue-600" style={{ width: `${weekendVsWeekday.weekday.percentage}%` }} />
                  <div className="bg-amber-500" style={{ width: `${weekendVsWeekday.weekend.percentage}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Granular Monthly Data Warehouse Ledger Table */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-slate-100 gap-2">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Monthly Warehouse Aggregates Table</h3>
                <p className="text-xs text-slate-500">Conformed fact_sales rows joined with dim_date temporal hierarchy</p>
              </div>
              <button
                onClick={exportMonthlySalesCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition cursor-pointer self-start sm:self-auto"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-2.5 px-3">Period</th>
                    <th className="py-2.5 px-3">Year / Month</th>
                    <th className="py-2.5 px-3 text-right">Orders</th>
                    <th className="py-2.5 px-3 text-right">Units</th>
                    <th className="py-2.5 px-3 text-right">Freight (R$)</th>
                    <th className="py-2.5 px-3 text-right">AOV (R$)</th>
                    <th className="py-2.5 px-3 text-right">MoM Growth</th>
                    <th className="py-2.5 px-3 text-right">Avg Rating</th>
                    <th className="py-2.5 px-3 text-right font-bold">Total Sales (R$)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono tabular-nums text-[11px]">
                  {monthlySales.map(m => (
                    <tr key={m.period} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-blue-700">{m.period}</td>
                      <td className="py-2.5 px-3 font-sans text-slate-700">{m.month} {m.year}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600">{m.orders.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600">{m.units.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600">R$ {m.freight.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600">R$ {m.aov.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right">
                        <span className={`inline-flex items-center gap-0.5 font-bold ${m.momGrowth > 0 ? 'text-emerald-700' : m.momGrowth < 0 ? 'text-rose-600' : 'text-slate-500'
                          }`}>
                          {m.momGrowth > 0 ? <ArrowUpRight className="w-3 h-3" /> : m.momGrowth < 0 ? <ArrowDownRight className="w-3 h-3" /> : null}
                          {m.momGrowth > 0 ? `+${m.momGrowth}%` : `${m.momGrowth}%`}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-700">★ {m.avgRating.toFixed(1)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        R$ {m.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
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
      {/* TAB 3: CATEGORY & CATALOG PARETO */}
      {/* ========================================================================= */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          {/* Pareto 80/20 Chart */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-slate-100 gap-2">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Category Pareto Analysis (80/20 Rule)</h3>
                <p className="text-xs text-slate-500">Cumulative share of total merchandise revenue by product segment</p>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-blue-600 rounded-xs inline-block" /> Category Revenue
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-amber-500 inline-block" /> Cumulative Share %
                </span>
              </div>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={salesByCategory.slice(0, 10)} margin={{ top: 10, right: 20, left: 10, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="category"
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: '#d97706' }}
                    tickFormatter={v => `${v}%`}
                  />
                  <Tooltip
                    formatter={(v: any, name: any) => [
                      name === 'Category Revenue' ? `R$ ${Number(v).toLocaleString()}` : `${v}%`,
                      name
                    ]}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  />
                  <Bar yAxisId="left" dataKey="revenue" name="Category Revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="cumulativePercentage" name="Cumulative Share %" stroke="#d97706" strokeWidth={2.5} dot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Price Brackets & Top Products Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Price Brackets Distribution */}
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-sm">Ticket Price Bracket Distribution</h3>
                <span className="text-xs text-slate-500">Unit Price Tiers</span>
              </div>

              <div className="space-y-3">
                {priceBrackets.map(b => (
                  <div key={b.bracket} className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-800">{b.bracket}</span>
                      <span className="font-mono tabular-nums text-blue-700 font-bold">{b.percentage}% of sales</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${b.percentage}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1 font-mono">
                      <span>R$ {b.revenue.toLocaleString()}</span>
                      <span>{b.units.toLocaleString()} units sold</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top 10 Product Items */}
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-sm">Top 10 Grossing Product Items</h3>
                <span className="text-xs text-slate-500">By Revenue</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <th className="py-2 px-2.5">Product ID</th>
                      <th className="py-2 px-2.5">Category</th>
                      <th className="py-2 px-2.5 text-right">Units</th>
                      <th className="py-2 px-2.5 text-right">Price</th>
                      <th className="py-2 px-2.5 text-right font-bold">Total Sales</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono tabular-nums text-[11px]">
                    {topSellingProducts.slice(0, 7).map(p => (
                      <tr key={p.productId} className="hover:bg-slate-50/80">
                        <td className="py-2 px-2.5 text-blue-700 font-semibold">{p.productId.slice(0, 10)}...</td>
                        <td className="py-2 px-2.5 font-sans text-slate-700">{p.category}</td>
                        <td className="py-2 px-2.5 text-right text-slate-600">{p.unitsSold}</td>
                        <td className="py-2 px-2.5 text-right text-slate-600">R$ {p.avgPrice.toFixed(0)}</td>
                        <td className="py-2 px-2.5 text-right font-bold text-slate-900">R$ {p.revenue.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Full Category Table */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Category Catalog Performance Breakdown</h3>
              <button
                onClick={exportCategorySalesCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-2.5 px-3">Category (English)</th>
                    <th className="py-2.5 px-3">Original Portuguese</th>
                    <th className="py-2.5 px-3 text-right">Orders</th>
                    <th className="py-2.5 px-3 text-right">Units</th>
                    <th className="py-2.5 px-3 text-right">Avg Unit Price</th>
                    <th className="py-2.5 px-3 text-right">Share %</th>
                    <th className="py-2.5 px-3 text-right font-bold">Total Sales (R$)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono tabular-nums text-[11px]">
                  {salesByCategory.slice(0, 15).map(c => (
                    <tr key={c.category} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 font-sans font-semibold text-slate-900">{c.category}</td>
                      <td className="py-2.5 px-3 font-sans text-slate-500 italic">{c.categoryPt}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600">{c.orders.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600">{c.units.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600">R$ {c.avgPrice.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-blue-700">{c.percentage}%</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">R$ {c.revenue.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: GEOGRAPHIC & FREIGHT LOGISTICS */}
      {/* ========================================================================= */}
      {activeTab === 'logistics' && (
        <div className="space-y-6">
          {/* Macro-Region Comparison */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Brazilian Macro-Region Sales &amp; Logistics Impact</h3>
                <p className="text-xs text-slate-500">Distribution of revenue and freight burden across Brazil's 5 geographical zones</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
              {salesByRegion.map(reg => (
                <div key={reg.region} className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-xs font-bold text-slate-800 block mb-1">{reg.region}</span>
                  <p className="text-lg font-bold font-mono text-slate-900">R$ {(reg.revenue / 1000).toFixed(0)}k</p>
                  <div className="mt-2 pt-2 border-t border-slate-200 text-[11px] text-slate-500 space-y-0.5 font-mono">
                    <div className="flex justify-between">
                      <span>Orders:</span>
                      <span className="font-semibold text-slate-700">{reg.orders.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Market Share:</span>
                      <span className="font-semibold text-blue-700">{reg.percentage}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Freight Burden:</span>
                      <span className="font-semibold text-amber-700">{reg.freightRatio}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Freight Burden Ratio Analysis Chart */}
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesByRegion} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="region" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(v: any, name: any) => [
                      name === 'revenue' ? `R$ ${Number(v).toLocaleString()}` : `R$ ${Number(v).toLocaleString()}`,
                      name === 'revenue' ? 'Merchandise Revenue' : 'Freight Shipping'
                    ]}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="revenue" name="Merchandise Revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="freight" name="Freight Shipping" fill="#d97706" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Regional Table Breakdown */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
            <h3 className="font-bold text-slate-900 text-sm mb-3">Geographic Distribution Ledger</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-2.5 px-3">Macro-Region</th>
                    <th className="py-2.5 px-3 text-right">Orders</th>
                    <th className="py-2.5 px-3 text-right">Market Share %</th>
                    <th className="py-2.5 px-3 text-right">Freight Value (R$)</th>
                    <th className="py-2.5 px-3 text-right">Freight Ratio %</th>
                    <th className="py-2.5 px-3 text-right font-bold">Total Sales (R$)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono tabular-nums text-[11px]">
                  {salesByRegion.map(r => (
                    <tr key={r.region} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 font-sans font-semibold text-slate-800">{r.region}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600">{r.orders.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right text-blue-700 font-bold">{r.percentage}%</td>
                      <td className="py-2.5 px-3 text-right text-slate-600">R$ {r.freight.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right text-amber-700 font-semibold">{r.freightRatio}%</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">R$ {r.revenue.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: SALES TRANSACTION LEDGER */}
      {/* ========================================================================= */}
      {activeTab === 'transactions' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Itemized Fact Sales Transactions</h3>
              <p className="text-xs text-slate-500">Granular view of individual order items joined across the 5 star-schema dimensions</p>
            </div>
            <button
              onClick={exportTransactionsCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition cursor-pointer shadow-xs self-start sm:self-auto"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export {filteredTransactions.length} Transactions</span>
            </button>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <div className="relative w-full max-w-sm">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Order ID, City, or Category..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Status Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Status:</span>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="delivered">Delivered</option>
                  <option value="shipped">Shipped</option>
                  <option value="invoiced">Invoiced</option>
                  <option value="canceled">Canceled</option>
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
                  <option value="date">Date</option>
                  <option value="amount">Sales Amount</option>
                  <option value="freight">Freight</option>
                  <option value="score">Rating</option>
                </select>
                <button
                  onClick={() => setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'))}
                  className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition"
                  title="Toggle sort direction"
                >
                  {sortDirection === 'desc' ? <ArrowDownRight className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2.5 px-3">Order ID</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Customer Location</th>
                  <th className="py-2.5 px-3">Seller Origin</th>
                  <th className="py-2.5 px-3 text-right">Qty</th>
                  <th className="py-2.5 px-3 text-right">Price</th>
                  <th className="py-2.5 px-3 text-right">Freight</th>
                  <th className="py-2.5 px-3 text-right font-bold">Total Sales</th>
                  <th className="py-2.5 px-3 text-right">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono tabular-nums text-[11px]">
                {filteredTransactions.slice(0, 50).map(t => (
                  <tr key={`${t.orderId}-${t.orderItemId}`} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-blue-700" title={t.orderId}>
                      {t.orderId.slice(0, 8)}...
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{t.date}</td>
                    <td className="py-2.5 px-3 font-sans">
                      <span className={`inline-flex items-center gap-1 ${t.orderStatus === 'delivered'
                          ? 'text-emerald-700'
                          : t.orderStatus === 'canceled'
                            ? 'text-rose-600'
                            : 'text-amber-700'
                        }`}>
                        {t.orderStatus === 'delivered' ? <CheckCircle2 className="w-3 h-3" /> : t.orderStatus === 'canceled' ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        <span className="capitalize">{t.orderStatus}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-800">{t.category}</td>
                    <td className="py-2.5 px-3 font-sans text-slate-600">
                      {t.customerCity}, {t.customerState}
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-500">
                      {t.sellerCity}, {t.sellerState}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600">{t.quantity}</td>
                    <td className="py-2.5 px-3 text-right text-slate-600">R$ {t.unitPrice.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right text-slate-500">R$ {t.freightValue.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                      R$ {t.salesAmount.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {t.reviewScore ? (
                        <span className="font-semibold text-amber-600">★ {t.reviewScore}</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}

                {filteredTransactions.length === 0 && (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-slate-500 font-sans">
                      No sales transactions match your current query or filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Showing {Math.min(50, filteredTransactions.length)} of {filteredTransactions.length} item records</span>
            <span>Brazilian E-Commerce Star Schema · fact_sales</span>
          </div>
        </div>
      )}
    </div>
  );
};
