import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Layers,
  Award,
  DollarSign,
  Search,
  Scale,
  Camera,
  Star,
  Download,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUpRight,
  ArrowDownRight,
  SlidersHorizontal,
  ChevronDown,
  X,
  Truck,
  Box,
  CheckCircle2,
  TrendingUp,
  BarChart3
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
  ProductAnalysisResponse,
  ProductItemAnalysis,
  ProductCategoryAnalysis
} from '../types';

interface ProductAnalysisPageProps {
  filters: FilterState;
  onFilterChange: (filters: Partial<FilterState>) => void;
  refreshTrigger: number;
}

type ProductTabType = 'overview' | 'logistics_specs' | 'categories' | 'sku_ledger';

const CHART_COLORS = ['#2563eb', '#0d9488', '#7c3aed', '#d97706', '#10b981', '#ef4444', '#6366f1', '#ec4899'];

export const ProductAnalysisPage: React.FC<ProductAnalysisPageProps> = ({
  filters,
  onFilterChange,
  refreshTrigger
}) => {
  const [activeTab, setActiveTab] = useState<ProductTabType>('overview');
  const [data, setData] = useState<ProductAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // SKU Ledger state
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortField, setSortField] = useState<'revenue' | 'units' | 'price' | 'weight' | 'rating'>('revenue');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [selectedProduct, setSelectedProduct] = useState<ProductItemAnalysis | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    api.getProducts(filters)
      .then(res => {
        if (mounted) {
          setData(res);
          setLoading(false);
        }
      })
      .catch(err => {
        console.error('Failed to fetch product analysis:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to retrieve product metrics');
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

  const exportProductCatalogCSV = () => {
    if (!data) return;
    const headers = ['Product Key', 'Product ID', 'Category English', 'Category Portuguese', 'Photos Qty', 'Weight (g)', 'Dimensions (cm)', 'Orders Count', 'Units Sold', 'Avg Unit Price (BRL)', 'Total Revenue (BRL)', 'Average Rating', 'Avg Freight (BRL)'];
    const rows = filteredProducts.map(p => [
      p.productKey,
      `"${p.productId}"`,
      `"${p.categoryEn}"`,
      `"${p.categoryPt}"`,
      p.photosQty,
      p.weightG,
      `"${p.dimensions}"`,
      p.ordersCount,
      p.unitsSold,
      p.avgPrice.toFixed(2),
      p.totalRevenue.toFixed(2),
      p.avgRating.toFixed(1),
      p.avgFreight.toFixed(2)
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadCSV(csv, `olist_product_catalog_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const exportCategoryDistributionCSV = () => {
    if (!data) return;
    const headers = ['Category English', 'Category Portuguese', 'Products Count', 'Units Sold', 'Orders Count', 'Avg Price (BRL)', 'Avg Rating', 'Market Share %', 'Total Revenue (BRL)'];
    const rows = data.categoryDistribution.map(c => [
      `"${c.category}"`,
      `"${c.categoryPt}"`,
      c.productsCount,
      c.units,
      c.orders,
      c.avgPrice.toFixed(2),
      c.avgRating.toFixed(1),
      c.share.toFixed(1),
      c.revenue.toFixed(2)
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadCSV(csv, `olist_category_performance_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    if (!data?.products) return [];

    let list = data.products.filter(p => {
      const matchSearch =
        searchTerm.trim() === '' ||
        p.productId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.categoryEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.categoryPt.toLowerCase().includes(searchTerm.toLowerCase());

      const matchCategory = categoryFilter === 'all' || p.categoryEn.toLowerCase() === categoryFilter.toLowerCase();

      return matchSearch && matchCategory;
    });

    list.sort((a, b) => {
      let comp = 0;
      if (sortField === 'revenue') comp = a.totalRevenue - b.totalRevenue;
      else if (sortField === 'units') comp = a.unitsSold - b.unitsSold;
      else if (sortField === 'price') comp = a.avgPrice - b.avgPrice;
      else if (sortField === 'weight') comp = a.weightG - b.weightG;
      else if (sortField === 'rating') comp = a.avgRating - b.avgRating;

      return sortDirection === 'desc' ? -comp : comp;
    });

    return list;
  }, [data?.products, searchTerm, categoryFilter, sortField, sortDirection]);

  const totalPages = Math.ceil(filteredProducts.length / pageSize) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[480px] bg-white rounded-xl border border-slate-200/80 p-8 shadow-xs">
        <div className="w-9 h-9 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-800">Analyzing Product Catalog &amp; Dimensions</p>
        <p className="text-xs text-slate-500 mt-1">Extracting product attributes, weights, photography impact, and category velocity from dim_product</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-sm font-semibold text-red-800">Unable to load product catalog metrics</p>
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

  const { kpis, categoryDistribution, weightBrackets, photoMetrics, priceBrackets } = data;

  const tabs: Array<{ id: ProductTabType; label: string }> = [
    { id: 'overview', label: 'Catalog Overview' },
    { id: 'logistics_specs', label: 'Specs, Weight & Photos' },
    { id: 'categories', label: 'Category Matrix' },
    { id: 'sku_ledger', label: 'SKU Performance Ledger' }
  ];

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <FilterBar filters={filters} onChange={onFilterChange} showRegion={false} />

      {/* KPI Headline Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Catalog Products & Active SKUs */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">Catalog SKU Breadth</span>
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {kpis.totalProducts.toLocaleString()} <span className="text-sm font-normal text-slate-500">SKUs</span>
            </div>
            <div className="flex flex-col text-xs text-slate-500 mt-1">
              <div>
                <span>Active in Filter: </span>
                <span className="font-mono tabular-nums font-semibold text-emerald-700">{kpis.activeProducts.toLocaleString()}</span>
                <span className="font-mono tabular-nums text-slate-600"> ({((kpis.activeProducts / (kpis.totalProducts || 1)) * 100).toFixed(1)}% velocity)</span>
              </div>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 text-xs text-slate-500">
            <span>Distinct Categories: {kpis.totalCategories}</span>
            <br />
            <span className="text-slate-400 font-mono">dim_product</span>
          </div>
        </div>

        {/* Metric 2: Average Catalog Price */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">Average Product Price</span>
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              R$ {kpis.averageProductPrice.toFixed(2)}
            </div>
            <div className="flex flex-col text-xs text-slate-500 mt-1">
              <span className="font-medium text-slate-700">Weighted Unit Price</span>
              <span className="text-slate-500">Catalog Index</span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 text-xs text-slate-500">
            <span>Price Range: R$ 0.85 – R$ 6,735</span>
            <br />
            <span className="text-emerald-700 font-medium">BRL</span>
          </div>
        </div>

        {/* Metric 3: Physical Specs & Average Weight */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">Average Package Weight</span>
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {(kpis.averageWeightG / 1000).toFixed(2)} <span className="text-sm font-normal text-slate-500">kg</span>
            </div>
            <div className="flex flex-col text-xs text-slate-500 mt-1">
              <div>
                <span>Raw Average: </span>
                <span className="font-mono tabular-nums font-semibold text-slate-700">{kpis.averageWeightG.toLocaleString()} grams</span>
              </div>
              <span className="text-slate-500">Standard Tier</span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 text-xs text-slate-500">
            <span>Packaging &amp; Freight Correlated</span>
            <br />
            <span className="text-slate-400 font-mono">Brazilian Post</span>
          </div>
        </div>

        {/* Metric 4: Customer Product Satisfaction Rating */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">Product Rating Index</span>
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 flex items-center gap-2">
              <span>{kpis.averageRating.toFixed(2)}</span>
              <span className="text-sm font-normal text-slate-400">/ 5.0</span>
            </div>
            <div className="flex flex-col text-xs text-slate-500 mt-1">
              <span>Best Performer: </span>
              <span className="font-semibold text-slate-800 truncate" title={kpis.bestSellingProduct}>
                {kpis.bestSellingProduct}
              </span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 text-xs text-slate-500">
            <span>Peak SKU: R$ {kpis.bestProductRevenue.toLocaleString()}</span>
            <br />
            <span className="text-emerald-700 font-medium font-mono">Top 1</span>
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
            <span>Export Product Data</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {exportMenuOpen && (
            <div className="absolute right-0 mt-1 w-56 bg-white border border-slate-200 rounded-xl shadow-lg z-20 py-1.5 text-xs text-slate-700 animate-in fade-in duration-100">
              <div className="px-3 py-1 font-semibold text-slate-400 border-b border-slate-100">
                Download CSV Datasets
              </div>
              <button
                onClick={exportProductCatalogCSV}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 transition cursor-pointer flex items-center justify-between"
              >
                <span>Product Catalog &amp; SKUs</span>
                <span className="text-[10px] text-slate-400 font-mono">CSV</span>
              </button>
              <button
                onClick={exportCategoryDistributionCSV}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 transition cursor-pointer flex items-center justify-between border-t border-slate-100"
              >
                <span>Category Performance Matrix</span>
                <span className="text-[10px] text-slate-400 font-mono">CSV</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CATALOG OVERVIEW */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Main Visuals: Category Revenue Bar Chart & Market Share Donut */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Categories Bar Chart */}
            <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-slate-100 gap-2">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Top Product Categories by Gross Sales</h3>
                  <p className="text-xs text-slate-500">Revenue generation across top catalog categories</p>
                </div>
                <span className="text-xs text-slate-500 font-mono">{categoryDistribution.length} Distinct Categories</span>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryDistribution.slice(0, 8)} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="category"
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      angle={-15}
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(v: any) => [`R$ ${Number(v).toLocaleString()}`, 'Gross Revenue']}
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                    />
                    <Bar dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Category Market Share Donut */}
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                  <h3 className="font-bold text-slate-900 text-sm">Market Share Concentration</h3>
                  <span className="text-xs text-slate-500 font-mono">Top 6 Share</span>
                </div>

                <div className="h-52 w-full my-auto">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryDistribution.slice(0, 6)}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={2}
                        dataKey="revenue"
                        nameKey="category"
                      >
                        {categoryDistribution.slice(0, 6).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
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
                {categoryDistribution.slice(0, 4).map((c, i) => (
                  <div key={c.category} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-slate-700 truncate max-w-[150px]">
                      <span className="w-2 h-2 rounded-xs" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="capitalize">{c.category}</span>
                    </span>
                    <span className="font-mono tabular-nums text-slate-800 font-bold">{c.share}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Catalog Highlights & Price Brackets Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Catalog Price Bracket Structure */}
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-sm">Catalog Ticket Price Distribution</h3>
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
                      <span>{b.productsCount} SKUs ({b.unitsSold.toLocaleString()} units sold)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Catalog Health & Quality Index */}
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                  <h3 className="font-bold text-slate-900 text-sm">Catalog Health &amp; Category Ratings</h3>
                  <span className="text-xs text-slate-500">Satisfaction Metrics</span>
                </div>

                <div className="space-y-3">
                  {categoryDistribution.slice(0, 5).map(c => (
                    <div key={c.category} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
                      <div>
                        <span className="font-semibold text-xs text-slate-800 capitalize block">{c.category}</span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {c.productsCount} SKUs · R$ {c.avgPrice.toFixed(0)} avg price
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold font-mono text-amber-600 flex items-center justify-end gap-1">
                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                          <span>{c.avgRating.toFixed(1)}</span>
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">{c.units.toLocaleString()} units</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
                <span>Total Catalog Volume: {categoryDistribution.reduce((s, c) => s + c.units, 0).toLocaleString()} units</span>
                <span className="font-mono text-emerald-700 font-semibold">High Quality Threshold (&gt; 4.0 ★)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SPECS, WEIGHT & PHOTOS */}
      {/* ========================================================================= */}
      {activeTab === 'logistics_specs' && (
        <div className="space-y-6">
          {/* Weight Class vs Average Freight Cost */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-slate-100 gap-2">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Product Weight Classification &amp; Freight Impact</h3>
                <p className="text-xs text-slate-500">Analysis of package physical weight in grams vs average shipping freight charged (R$)</p>
              </div>
              <span className="text-xs text-slate-500 font-mono">5 Weight Tiers</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-6">
              {weightBrackets.map(wb => (
                <div key={wb.bracket} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-xs font-bold text-slate-800 block mb-1">{wb.range}</span>
                  <p className="text-lg font-bold font-mono text-slate-900">R$ {wb.avgFreight.toFixed(2)}</p>
                  <span className="text-[10px] text-slate-400 block mb-2">avg freight / order</span>
                  <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500 space-y-0.5 font-mono">
                    <div className="flex justify-between">
                      <span>SKUs:</span>
                      <span className="font-semibold text-slate-700">{wb.count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Share:</span>
                      <span className="font-semibold text-blue-700">{wb.percentage}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Units:</span>
                      <span className="font-semibold text-slate-700">{wb.units.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={weightBrackets} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="range" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#d97706' }} tickFormatter={v => `R$${v}`} />
                  <Tooltip
                    formatter={(v: any, name: any) => [
                      name === 'Revenue (R$)' ? `R$ ${Number(v).toLocaleString()}` : `R$ ${Number(v).toFixed(2)}`,
                      name
                    ]}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  />
                  <Bar yAxisId="left" dataKey="revenue" name="Revenue (R$)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="avgFreight" name="Avg Freight Cost (R$)" stroke="#d97706" strokeWidth={2.5} dot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Photography Quantity & Conversion Impact */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Product Photography Impact on Sales</h3>
                  <p className="text-xs text-slate-500">Correlation between product images and units sold</p>
                </div>
                <Camera className="w-4 h-4 text-purple-600" />
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={photoMetrics} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="photoBracket" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip
                      formatter={(v: any, name: any) => [
                        name === 'Units Sold' ? Number(v).toLocaleString() : `R$ ${Number(v).toLocaleString()}`,
                        name
                      ]}
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                    />
                    <Bar dataKey="unitsSold" name="Units Sold" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Photography Breakdown Table */}
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                  <h3 className="font-bold text-slate-900 text-sm">Photo Depth Breakdown</h3>
                  <span className="text-xs text-slate-500">dim_product.photos_qty</span>
                </div>

                <div className="space-y-3">
                  {photoMetrics.map(pm => (
                    <div key={pm.photoBracket} className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xs">
                          {pm.photoBracket.slice(0, 2)}
                        </div>
                        <div>
                          <span className="font-semibold text-xs text-slate-800 block">{pm.photoBracket}</span>
                          <span className="text-[11px] text-slate-500 font-mono">{pm.productsCount} catalog SKUs</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold font-mono text-slate-900 block">R$ {pm.revenue.toLocaleString()}</span>
                        <span className="text-[11px] text-slate-500 font-mono">{pm.unitsSold.toLocaleString()} units sold</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
                <span>Olist Catalog Insight:</span>
                <span className="font-semibold text-slate-700">Multi-photo listings show higher AOV</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CATEGORY MATRIX */}
      {/* ========================================================================= */}
      {activeTab === 'categories' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Conformed Category Performance Matrix</h3>
              <p className="text-xs text-slate-500">Cross-dimensional metrics mapped from Portuguese to English translation</p>
            </div>
            <button
              onClick={exportCategoryDistributionCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition cursor-pointer shadow-xs self-start sm:self-auto"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export {categoryDistribution.length} Categories</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2.5 px-3">Category (English)</th>
                  <th className="py-2.5 px-3">Portuguese Original</th>
                  <th className="py-2.5 px-3 text-right">SKU Count</th>
                  <th className="py-2.5 px-3 text-right">Orders</th>
                  <th className="py-2.5 px-3 text-right">Units Sold</th>
                  <th className="py-2.5 px-3 text-right">Avg Unit Price</th>
                  <th className="py-2.5 px-3 text-right">Rating</th>
                  <th className="py-2.5 px-3 text-right">Share %</th>
                  <th className="py-2.5 px-3 text-right font-bold">Total Sales (R$)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono tabular-nums text-[11px]">
                {categoryDistribution.map(cat => (
                  <tr key={cat.category} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-sans font-semibold text-slate-900 capitalize">
                      {cat.category}
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-500 italic">
                      {cat.categoryPt}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600">
                      {cat.productsCount}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600">
                      {cat.orders.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-700 font-semibold">
                      {cat.units.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600">
                      R$ {cat.avgPrice.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-sans">
                      <span className="inline-flex items-center gap-1 text-amber-600 font-semibold font-mono">
                        <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                        <span>{cat.avgRating.toFixed(1)}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-blue-700">
                      {cat.share}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                      R$ {cat.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SKU PERFORMANCE LEDGER */}
      {/* ========================================================================= */}
      {activeTab === 'sku_ledger' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Product Item Catalog &amp; SKU Performance</h3>
              <p className="text-xs text-slate-500">Full catalog ledger with granular dimensions, weight, physical sizing, and revenue</p>
            </div>
            <button
              onClick={exportProductCatalogCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition cursor-pointer shadow-xs self-start sm:self-auto"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export {filteredProducts.length} Filtered SKUs</span>
            </button>
          </div>

          {/* Search, Filter and Sort Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <div className="relative w-full max-w-sm">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search SKU UUID, Category (EN/PT)..."
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
              {/* Category Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Category:</span>
                <select
                  value={categoryFilter}
                  onChange={e => {
                    setCategoryFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer max-w-[140px] truncate"
                >
                  <option value="all">All Categories</option>
                  {categoryDistribution.map(c => (
                    <option key={c.category} value={c.category}>{c.category}</option>
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
                  <option value="revenue">Total Sales</option>
                  <option value="units">Units Sold</option>
                  <option value="price">Avg Price</option>
                  <option value="weight">Weight (g)</option>
                  <option value="rating">Rating</option>
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

          {/* SKU Ledger Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2.5 px-3">Product UUID</th>
                  <th className="py-2.5 px-3">Category (EN)</th>
                  <th className="py-2.5 px-3 text-right">Photos</th>
                  <th className="py-2.5 px-3 text-right">Weight (g)</th>
                  <th className="py-2.5 px-3">Dimensions (cm)</th>
                  <th className="py-2.5 px-3 text-right">Orders</th>
                  <th className="py-2.5 px-3 text-right">Units</th>
                  <th className="py-2.5 px-3 text-right">Avg Price</th>
                  <th className="py-2.5 px-3 text-right">Rating</th>
                  <th className="py-2.5 px-3 text-right font-bold">Total Sales (R$)</th>
                  <th className="py-2.5 px-3 text-center">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono tabular-nums text-[11px]">
                {paginatedProducts.map(p => (
                  <tr key={p.productId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-blue-700" title={p.productId}>
                      {p.productId.slice(0, 10)}...
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-800 capitalize font-medium">
                      {p.categoryEn}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600">
                      {p.photosQty}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600">
                      {p.weightG.toLocaleString()}g
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-500 text-[10px]">
                      {p.dimensions}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600">
                      {p.ordersCount}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-slate-700">
                      {p.unitsSold}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600">
                      R$ {p.avgPrice.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="font-semibold text-amber-600">★ {p.avgRating.toFixed(1)}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                      R$ {p.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => setSelectedProduct(p)}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-sans font-medium transition cursor-pointer"
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                ))}

                {paginatedProducts.length === 0 && (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-slate-500 font-sans">
                      No products match your current search criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-100 text-xs text-slate-500">
            <span>
              Showing {paginatedProducts.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} – {Math.min(currentPage * pageSize, filteredProducts.length)} of {filteredProducts.length} products
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

      {/* SKU Detail Quick View Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden text-xs">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-600" />
                <h4 className="font-bold text-slate-900 text-sm">Product SKU Specification</h4>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <span className="text-[11px] text-slate-400 uppercase font-mono block">Product Identifier (UUID)</span>
                <span className="font-mono font-bold text-slate-900 text-xs break-all">{selectedProduct.productId}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Category (English)</span>
                  <span className="font-semibold text-slate-800 capitalize">{selectedProduct.categoryEn}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Category (Portuguese)</span>
                  <span className="font-semibold text-slate-800 italic">{selectedProduct.categoryPt}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 border border-slate-200 rounded-lg">
                  <span className="text-[10px] text-slate-400 uppercase block">Package Weight</span>
                  <span className="font-mono font-bold text-slate-900">{selectedProduct.weightG.toLocaleString()}g</span>
                </div>
                <div className="p-3 border border-slate-200 rounded-lg">
                  <span className="text-[10px] text-slate-400 uppercase block">Dimensions</span>
                  <span className="font-mono font-bold text-slate-900">{selectedProduct.dimensions} cm</span>
                </div>
                <div className="p-3 border border-slate-200 rounded-lg">
                  <span className="text-[10px] text-slate-400 uppercase block">Photo Count</span>
                  <span className="font-mono font-bold text-slate-900">{selectedProduct.photosQty} images</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                  <span className="text-[10px] text-blue-600 uppercase block">Total Sales</span>
                  <span className="font-mono font-bold text-blue-900 text-sm">R$ {selectedProduct.totalRevenue.toLocaleString()}</span>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                  <span className="text-[10px] text-emerald-600 uppercase block">Units Sold</span>
                  <span className="font-mono font-bold text-emerald-900 text-sm">{selectedProduct.unitsSold}</span>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
                  <span className="text-[10px] text-amber-600 uppercase block">Customer Rating</span>
                  <span className="font-mono font-bold text-amber-900 text-sm flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    <span>{selectedProduct.avgRating.toFixed(1)}</span>
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg text-slate-600 flex justify-between items-center font-mono">
                <span>Average Freight / Order:</span>
                <span className="font-bold text-slate-800">R$ {selectedProduct.avgFreight.toFixed(2)}</span>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedProduct(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition cursor-pointer"
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
