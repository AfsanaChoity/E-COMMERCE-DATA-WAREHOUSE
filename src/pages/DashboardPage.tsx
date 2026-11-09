import React, { useEffect, useState } from 'react';
import {
  DollarSign,
  ShoppingCart,
  Users,
  CreditCard,
  TrendingUp,
  BarChart3,
  PieChart as PieIcon,
  Package,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { KPICard } from '../components/KPICard';
import { FilterBar } from '../components/FilterBar';
import { api } from '../services/api';
import { DashboardResponse, FilterState } from '../types';

interface DashboardPageProps {
  filters: FilterState;
  onFilterChange: (filters: Partial<FilterState>) => void;
  refreshTrigger: number;
}

const REGION_COLORS = ['#2563eb', '#0d9488', '#7c3aed', '#f59e0b', '#10b981'];

export const DashboardPage: React.FC<DashboardPageProps> = ({
  filters,
  onFilterChange,
  refreshTrigger
}) => {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api.getDashboard(filters)
      .then(res => {
        if (mounted) {
          setData(res);
          setError(null);
          setLoading(false);
        }
      })
      .catch(err => {
        if (mounted) {
          setError(err.message);
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [filters, refreshTrigger]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs text-slate-500 font-medium">Querying Data Warehouse Analytical Aggregates...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm">
        <p className="font-semibold">Failed to fetch Data Warehouse metrics</p>
        <p className="text-xs text-rose-600 mt-1">{error || 'Unknown error'}</p>
      </div>
    );
  }

  const { kpis, salesTrend, salesByCategory, topSellingProducts, salesByRegion, recentOrders } = data;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Dimensional Filter Bar */}
      <FilterBar filters={filters} onChange={onFilterChange} />

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <KPICard
          data={kpis.totalSales}
          accentColor="blue"
        />
        <KPICard
          data={kpis.totalOrders}
          accentColor="teal"
        />
        <KPICard
          data={kpis.totalCustomers}
          accentColor="purple"
        />
        <KPICard
          data={kpis.avgOrderValue}
          accentColor="green"
        />
      </div>

      {/* Primary Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Sales Trend Chart (Area) - 2 Cols */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                Sales &amp; Revenue Trend
              </h3>
              <p className="text-xs text-slate-500">Monthly revenue (R$) and order volume aggregations from fact_sales</p>
            </div>
            <span className="text-[11px] font-medium bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md">
              OLAP Aggregate
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="monthName" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={val => `R$${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <Tooltip
                  formatter={(val: any) => [`R$ ${Number(val).toLocaleString()}`, 'Revenue']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px', border: 'none' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. Sales by Region (Donut) - 1 Col */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-teal-600" />
                Sales by Region
              </h3>
              <p className="text-xs text-slate-500">Brazilian geographic distribution</p>
            </div>
          </div>

          <div className="h-52 w-full my-auto">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={salesByRegion}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="revenue"
                  nameKey="region"
                >
                  {salesByRegion.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={REGION_COLORS[index % REGION_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [`R$ ${Number(val).toLocaleString()}`, 'Revenue']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
            {salesByRegion.slice(0, 4).map((r, i) => (
              <div key={r.region} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: REGION_COLORS[i % REGION_COLORS.length] }}></span>
                  <span className="text-slate-700 font-medium">{r.region}</span>
                </div>
                <span className="font-mono text-slate-500">{r.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Secondary Row: Category Distribution & Top Selling Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 2. Sales by Category (Bar) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-purple-600" />
                Sales by Category
              </h3>
              <p className="text-xs text-slate-500">Revenue contribution by translated product categories</p>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">Top Categories</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesByCategory.slice(0, 7)} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={val => `R$${val}`} />
                <YAxis dataKey="category" type="category" tick={{ fontSize: 10, fill: '#334155' }} tickLine={false} width={100} />
                <Tooltip
                  formatter={(val: any) => [`R$ ${Number(val).toLocaleString()}`, 'Revenue']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="revenue" fill="#7c3aed" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. Top Selling Products */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-600" />
                Top Selling Products
              </h3>
              <p className="text-xs text-slate-500">Ranked by total sales volume from dim_product</p>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">dim_product</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 font-semibold pb-2">
                  <th className="pb-2">Product</th>
                  <th className="pb-2 text-right">Units</th>
                  <th className="pb-2 text-right">Avg Price</th>
                  <th className="pb-2 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {topSellingProducts.map((p, idx) => (
                  <tr key={p.productId} className="hover:bg-slate-50/80">
                    <td className="py-2.5 pr-2">
                      <div className="font-semibold text-slate-800 truncate max-w-[200px]">{p.productName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{p.category}</div>
                    </td>
                    <td className="py-2.5 text-right font-mono text-slate-600">{p.unitsSold}</td>
                    <td className="py-2.5 text-right font-mono text-slate-600">R$ {p.avgPrice.toFixed(2)}</td>
                    <td className="py-2.5 text-right font-mono font-semibold text-emerald-700">R$ {p.revenue.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 5. Recent Orders Table */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              Recent Olist Customer Orders
            </h3>
            <p className="text-xs text-slate-500">Live order transactions populated across Star Schema dimensions</p>
          </div>
          <span className="text-xs font-mono text-slate-400">Total in View: {recentOrders.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-semibold">
                <th className="py-2.5 px-3">Order ID</th>
                <th className="py-2.5 px-3">Customer Location</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Items</th>
                <th className="py-2.5 px-3 text-right">Order Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {recentOrders.map(order => (
                <tr key={order.orderId} className="hover:bg-slate-50/80">
                  <td className="py-2.5 px-3 font-semibold text-blue-700 truncate max-w-[140px]">
                    {order.orderId}
                  </td>
                  <td className="py-2.5 px-3 font-sans text-slate-700">
                    {order.customerCity}, <span className="font-semibold text-slate-900">{order.customerState}</span>
                  </td>
                  <td className="py-2.5 px-3 font-sans text-slate-600 capitalize">
                    {order.category}
                  </td>
                  <td className="py-2.5 px-3 text-slate-500">
                    {order.date}
                  </td>
                  <td className="py-2.5 px-3 font-sans">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                      order.status === 'delivered'
                        ? 'bg-emerald-50 text-emerald-700'
                        : order.status === 'shipped'
                        ? 'bg-blue-50 text-blue-700'
                        : order.status === 'canceled'
                        ? 'bg-rose-50 text-rose-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-600">
                    {order.itemsCount}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                    R$ {order.amount.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
