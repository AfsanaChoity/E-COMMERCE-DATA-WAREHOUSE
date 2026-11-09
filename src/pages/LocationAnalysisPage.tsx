import React, { useState, useEffect, useMemo } from 'react';
import {
  MapPin,
  Globe,
  Compass,
  TrendingUp,
  Navigation,
  Truck,
  Clock,
  DollarSign,
  Package,
  Search,
  Download,
  ChevronRight,
  Star,
  Layers,
  Activity,
  AlertCircle,
  CheckCircle2,
  X,
  Zap,
  ArrowUpRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ScatterChart,
  Scatter,
  ZAxis,
  ComposedChart,
  Line,
  Cell
} from 'recharts';
import { FilterBar } from '../components/FilterBar';
import { api } from '../services/api';
import {
  FilterState,
  LocationAnalysisResponse,
  RegionalLogisticsMetric,
  StateLogisticsMetric,
  CityLogisticsMetric,
  ShippingCorridorMetric
} from '../types';

interface LocationAnalysisPageProps {
  filters: FilterState;
  onFilterChange: (filters: Partial<FilterState>) => void;
  refreshTrigger: number;
}

type ActiveTab = 'regions' | 'states' | 'map' | 'corridors';

export const LocationAnalysisPage: React.FC<LocationAnalysisPageProps> = ({
  filters,
  onFilterChange,
  refreshTrigger
}) => {
  const [data, setData] = useState<LocationAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('regions');

  // Search & Filters inside sub-views
  const [stateSearch, setStateSearch] = useState('');
  const [selectedStateRegion, setSelectedStateRegion] = useState<string>('all');
  const [citySearch, setCitySearch] = useState('');
  const [selectedCityRegion, setSelectedCityRegion] = useState<string>('all');

  // Modal Inspector State
  const [inspectedState, setInspectedState] = useState<StateLogisticsMetric | null>(null);
  const [inspectedCity, setInspectedCity] = useState<CityLogisticsMetric | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api.getLocations(filters)
      .then(res => {
        if (mounted) {
          setData(res);
          setLoading(false);
        }
      })
      .catch(err => {
        console.error('Failed to fetch location analytics:', err);
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [filters, refreshTrigger]);

  // CSV Exporters
  const downloadCSV = (content: string, fileName: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportRegions = () => {
    if (!data) return;
    const headers = ['Region', 'Portuguese Name', 'Gross Revenue (BRL)', 'Orders', 'Customers', 'Total Freight (BRL)', 'Avg Freight (BRL)', 'Freight Ratio (%)', 'Avg Delivery Days', 'On-Time Rate (%)', 'Avg Rating', 'Revenue Share (%)', 'Top Category'];
    const rows = data.salesByRegion.map(r => [
      `"${r.region}"`,
      `"${r.regionPt}"`,
      r.revenue,
      r.orders,
      r.customers,
      r.freight,
      r.avgFreight,
      r.freightRatio,
      r.avgDeliveryDays,
      r.onTimeDeliveryRate,
      r.avgRating,
      r.share,
      `"${r.topCategory}"`
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadCSV(csv, `olist_macro_regions_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handleExportStates = () => {
    if (!data) return;
    const headers = ['State Code', 'State Name', 'Region', 'Gross Revenue (BRL)', 'Orders', 'Customers', 'AOV (BRL)', 'Total Freight (BRL)', 'Avg Freight (BRL)', 'Freight Ratio (%)', 'Est Delivery Days', 'Avg Rating', 'Revenue Share (%)'];
    const rows = data.salesByState.map(s => [
      s.state,
      `"${s.stateName}"`,
      `"${s.region}"`,
      s.revenue,
      s.orders,
      s.customers,
      s.aov,
      s.freight,
      s.avgFreight,
      s.freightRatio,
      s.avgDeliveryDays,
      s.avgRating,
      s.share
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadCSV(csv, `olist_state_logistics_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handleExportCities = () => {
    if (!data) return;
    const headers = ['City', 'State', 'Region', 'Revenue (BRL)', 'Orders', 'Customers', 'Avg Freight (BRL)', 'Latitude', 'Longitude', 'Avg Rating', 'Top Category'];
    const rows = data.topCities.map(c => [
      `"${c.city}"`,
      c.state,
      `"${c.region}"`,
      c.revenue,
      c.orders,
      c.customers,
      c.avgFreight,
      c.latitude,
      c.longitude,
      c.avgRating,
      `"${c.topCategory}"`
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadCSV(csv, `olist_cities_gps_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handleExportCorridors = () => {
    if (!data) return;
    const headers = ['Shipping Corridor', 'Origin State', 'Destination State', 'Intra-State', 'Orders', 'Revenue (BRL)', 'Avg Freight (BRL)', 'Avg Delivery Days', 'Avg Rating', 'National Share (%)'];
    const rows = data.shippingCorridors.map(c => [
      `"${c.corridor}"`,
      c.originState,
      c.destinationState,
      c.isIntraState ? 'Yes' : 'No',
      c.orders,
      c.revenue,
      c.avgFreight,
      c.avgDeliveryDays,
      c.avgRating,
      c.share
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadCSV(csv, `olist_shipping_corridors_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  // Filtered states
  const filteredStates = useMemo(() => {
    if (!data) return [];
    return data.salesByState.filter(s => {
      const matchSearch = s.state.toLowerCase().includes(stateSearch.toLowerCase()) ||
        s.stateName.toLowerCase().includes(stateSearch.toLowerCase());
      const matchRegion = selectedStateRegion === 'all' || s.region.toLowerCase() === selectedStateRegion.toLowerCase();
      return matchSearch && matchRegion;
    });
  }, [data, stateSearch, selectedStateRegion]);

  // Filtered cities
  const filteredCities = useMemo(() => {
    if (!data) return [];
    return data.topCities.filter(c => {
      const matchSearch = c.city.toLowerCase().includes(citySearch.toLowerCase()) ||
        c.state.toLowerCase().includes(citySearch.toLowerCase());
      const matchRegion = selectedCityRegion === 'all' || c.region.toLowerCase() === selectedCityRegion.toLowerCase();
      return matchSearch && matchRegion;
    });
  }, [data, citySearch, selectedCityRegion]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[480px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium text-slate-600">
            Querying Data Warehouse Geolocation &amp; Regional Logistics...
          </span>
          <span className="text-xs text-slate-400">
            Synthesizing 27 Brazilian Federative Units, GPS coordinates, freight tariffs, and shipping corridors
          </span>
        </div>
      </div>
    );
  }

  const { kpis, salesByRegion, salesByState, topCities, shippingCorridors, deliverySpeedBrackets } = data;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Geographic Logistics &amp; Location Intelligence
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Macro-regional sales volumes, state distribution across Brazil, fulfillment transit times, and freight tariff analysis.
          </p>
        </div>

        {/* Export Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative group">
            <button
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              Export Location Datasets
            </button>
            <div className="absolute right-0 mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-lg py-1 hidden group-hover:block z-30">
              <button
                onClick={handleExportRegions}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 flex items-center justify-between"
              >
                <span>Macro-Regions Summary</span>
                <span className="text-[10px] text-slate-400 font-mono">CSV</span>
              </button>
              <button
                onClick={handleExportStates}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 flex items-center justify-between"
              >
                <span>27 States (UF) Matrix</span>
                <span className="text-[10px] text-slate-400 font-mono">CSV</span>
              </button>
              <button
                onClick={handleExportCities}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 flex items-center justify-between"
              >
                <span>Metropolitan &amp; GPS Matrix</span>
                <span className="text-[10px] text-slate-400 font-mono">CSV</span>
              </button>
              <button
                onClick={handleExportCorridors}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 flex items-center justify-between"
              >
                <span>Shipping Corridors</span>
                <span className="text-[10px] text-slate-400 font-mono">CSV</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Global Filter Bar */}
      <FilterBar filters={filters} onChange={onFilterChange} showCategory={true} />

      {/* Executive KPI Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total GMV */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs border-l-4 border-l-blue-600">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gross Geographic GMV</span>
          </div>
          <div className="mt-2 text-xl font-bold text-slate-900 font-mono">
            R$ {kpis.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Across {kpis.activeStates} States &bull; {kpis.totalOrders.toLocaleString()} Orders
          </div>
        </div>

        {/* Top Region */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs border-l-4 border-l-teal-600">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Dominant Region</span>
          </div>
          <div className="mt-2 text-xl font-bold text-slate-900">
            {kpis.topRegion}
          </div>
          <div className="mt-1 text-[11px] text-teal-700 font-medium">
            {kpis.topRegionShare}% share of total Brazilian revenue
          </div>
        </div>

        {/* Freight Burden */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs border-l-4 border-l-amber-500">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg Freight Fee</span>
          </div>
          <div className="mt-2 text-xl font-bold text-slate-900 font-mono">
            R$ {kpis.avgFreight.toFixed(2)}
          </div>
          <div className="mt-1 text-[11px] text-amber-700 font-medium">
            {kpis.freightRatio}% freight-to-price ratio
          </div>
        </div>

        {/* Transit Time SLA */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs border-l-4 border-l-indigo-600">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Fulfillment Transit</span>
          </div>
          <div className="mt-2 text-xl font-bold text-slate-900">
            {kpis.avgDeliveryDays} Days
          </div>
          <div className="mt-1 text-[11px] text-indigo-700 font-medium">
            {kpis.onTimeDeliveryRate}% on-time SLA rate
          </div>
        </div>

        {/* Top State Hub */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs border-l-4 border-l-purple-600">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Top State Engine</span>
          </div>
          <div className="mt-2 text-xl font-bold text-slate-900 truncate">
            {kpis.topState}
          </div>
          <div className="mt-1 text-[11px] text-purple-700 font-medium">
            Primary commerce &amp; seller epicenter
          </div>
        </div>
      </div>

      {/* Navigation View Switcher (Tabs) */}
      <div className="flex border-b border-slate-200 bg-white px-2 pt-2 rounded-t-xl">
        <button
          onClick={() => setActiveTab('regions')}
          className={`py-3 px-4 font-semibold text-xs border-b-2 transition ${
            activeTab === 'regions'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Macro-Regions (5 Regiões)
        </button>

        <button
          onClick={() => setActiveTab('states')}
          className={`py-3 px-4 font-semibold text-xs border-b-2 transition ${
            activeTab === 'states'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          State Matrix (27 Federative Units)
        </button>

        <button
          onClick={() => setActiveTab('map')}
          className={`py-3 px-4 font-semibold text-xs border-b-2 transition ${
            activeTab === 'map'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Metropolitan GPS Clusters
        </button>

        <button
          onClick={() => setActiveTab('corridors')}
          className={`py-3 px-4 font-semibold text-xs border-b-2 transition ${
            activeTab === 'corridors'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Shipping Corridors &amp; Logistics Friction
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: MACRO-REGIONAL LOGISTICS (5 Brazilian Regions) */}
      {/* ========================================================================= */}
      {activeTab === 'regions' && (
        <div className="space-y-6">
          {/* Regional Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {salesByRegion.map(reg => (
              <div
                key={reg.region}
                className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-4 flex flex-col justify-between hover:shadow-md transition"
              >
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{reg.region}</h3>
                      <span className="text-[11px] text-slate-400">{reg.regionPt}</span>
                    </div>
                    <span
                      className="w-3.5 h-3.5 rounded-full"
                      style={{ backgroundColor: reg.color }}
                      title={reg.region}
                    ></span>
                  </div>

                  <div className="mt-3 space-y-2 text-xs">
                    <div className="flex justify-between items-baseline">
                      <span className="text-slate-500">Gross Sales</span>
                      <span className="font-mono font-bold text-slate-900">
                        R$ {reg.revenue.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-slate-500">Market Share</span>
                      <span className="font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded text-[11px]">
                        {reg.share}%
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-slate-500">Orders / Buyers</span>
                      <span className="font-medium text-slate-700">
                        {reg.orders.toLocaleString()} / {reg.customers.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-slate-500">Avg Freight</span>
                      <span className="font-mono font-medium text-slate-800">
                        R$ {reg.avgFreight.toFixed(2)} ({reg.freightRatio}%)
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-slate-500">Avg Delivery</span>
                      <span className="font-medium text-slate-700">
                        {reg.avgDeliveryDays} Days
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-slate-500">SLA On-Time</span>
                      <span className={`font-semibold ${reg.onTimeDeliveryRate >= 90 ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {reg.onTimeDeliveryRate}%
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-slate-500">Satisfaction</span>
                      <span className="flex items-center gap-1 font-bold text-amber-600">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        {reg.avgRating.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-2 border-t border-slate-100">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Top Category</div>
                  <div className="text-xs font-semibold text-slate-800 truncate capitalize mt-0.5">
                    {reg.topCategory}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 flex flex-wrap gap-1">
                    {reg.statesList.map(st => (
                      <span key={st} className="bg-slate-100 text-slate-600 px-1 py-0.2 rounded font-mono">
                        {st}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Regional Dual Visuals */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Regional Sales Volume & Share */}
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Gross Sales vs Average Freight by Region</h3>
                  <p className="text-xs text-slate-500">Comparing regional commercial demand against shipping tariffs</p>
                </div>
                <span className="text-[11px] font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-semibold">
                  Macro Comparison
                </span>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={salesByRegion} margin={{ top: 15, right: 20, bottom: 20, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="region" tick={{ fontSize: 11, fontWeight: 600 }} />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 10 }}
                      tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 10 }}
                      tickFormatter={v => `R$${v}`}
                    />
                    <Tooltip
                      formatter={(v: any, name: any) => [
                        name === 'Gross Sales' ? `R$ ${Number(v).toLocaleString()}` : `R$ ${Number(v).toFixed(2)}`,
                        name
                      ]}
                    />
                    <Bar yAxisId="left" dataKey="revenue" name="Gross Sales" radius={[4, 4, 0, 0]}>
                      {salesByRegion.map(entry => (
                        <Cell key={`cell-${entry.region}`} fill={entry.color} />
                      ))}
                    </Bar>
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="avgFreight"
                      name="Avg Freight"
                      stroke="#ea580c"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#ea580c' }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 px-2">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-blue-600"></span>
                  <span>Gross Sales (BRL)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-1 bg-amber-600"></span>
                  <span>Avg Shipping Tariff (Line, BRL)</span>
                </div>
              </div>
            </div>

            {/* Chart 2: Regional Delivery Days & Customer Rating */}
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Fulfillment Transit Speed vs Review Rating</h3>
                  <p className="text-xs text-slate-500">Impact of extended delivery days on customer review ratings</p>
                </div>
                <span className="text-[11px] font-mono bg-purple-50 text-purple-700 px-2 py-0.5 rounded font-semibold">
                  Transit SLA
                </span>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={salesByRegion} margin={{ top: 15, right: 20, bottom: 20, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="region" tick={{ fontSize: 11, fontWeight: 600 }} />
                    <YAxis
                      yAxisId="days"
                      tick={{ fontSize: 10 }}
                      domain={[0, 30]}
                      tickFormatter={v => `${v}d`}
                    />
                    <YAxis
                      yAxisId="rating"
                      orientation="right"
                      domain={[3.0, 5.0]}
                      tick={{ fontSize: 10 }}
                      tickFormatter={v => `${v}★`}
                    />
                    <Tooltip
                      formatter={(v: any, name: any) => [
                        name === 'Delivery Days' ? `${v} Days` : `${v} / 5.0`,
                        name
                      ]}
                    />
                    <Bar
                      yAxisId="days"
                      dataKey="avgDeliveryDays"
                      name="Delivery Days"
                      fill="#6366f1"
                      radius={[4, 4, 0, 0]}
                    />
                    <Line
                      yAxisId="rating"
                      type="monotone"
                      dataKey="avgRating"
                      name="Review Score"
                      stroke="#d97706"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#d97706' }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 px-2">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-indigo-500"></span>
                  <span>Avg Delivery Transit Days (Bars)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-1 bg-amber-500"></span>
                  <span>Customer Review Rating (Line, ★)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Regional Bottleneck Analysis Callout */}
          <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white rounded-xl p-6 shadow-md">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                    Logistics Engineering &amp; Territorial Insight
                  </span>
                </div>
                <h4 className="text-base font-bold text-white">
                  Cross-Continental Logistics Friction: The North &amp; Northeast Delivery Challenge
                </h4>
                <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
                  Southeast holds <strong>{salesByRegion[0]?.share}%</strong> of national sales and serves as the primary merchant base.
                  Shipments sent to the <strong>North (22.8 days avg)</strong> and <strong>Northeast (17.2 days avg)</strong> face high freight ratios (up to 28% of product cost) and lower customer review scores (3.84★ vs 4.28★ in Southeast).
                  Establishing regional fulfillment hubs in Bahia (Salvador) and Pernambuco (Recife) can cut average transit by 8 days.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('corridors')}
                className="shrink-0 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-1.5"
              >
                <span>Inspect Shipping Corridors</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: STATE MATRIX (All 27 Brazilian Federative Units) */}
      {/* ========================================================================= */}
      {activeTab === 'states' && (
        <div className="space-y-6">
          {/* Top States Bar Chart */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Top Brazilian States Ranked by GMV</h3>
                <p className="text-xs text-slate-500">Gross revenue volume across the top 10 federative states</p>
              </div>
              <span className="text-xs font-mono text-slate-400">Top 10 States</span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesByState.slice(0, 10)} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="state" tick={{ fontSize: 11, fontWeight: 700 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(v: any) => [`R$ ${Number(v).toLocaleString()}`, 'Revenue']}
                    labelFormatter={(st: any) => {
                      const item = salesByState.find(s => s.state === String(st));
                      return item ? `${item.state} - ${item.stateName} (${item.region})` : String(st);
                    }}
                  />
                  <Bar dataKey="revenue" fill="#0d9488" radius={[4, 4, 0, 0]}>
                    {salesByState.slice(0, 10).map((st, i) => (
                      <Cell key={st.state} fill={i === 0 ? '#2563eb' : i === 1 ? '#0d9488' : i === 2 ? '#6366f1' : '#0284c7'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search state code or name (e.g. SP, São Paulo, Bahia)..."
                  value={stateSearch}
                  onChange={e => setStateSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition"
                />
              </div>

              {/* Region Filter */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-slate-500 font-medium">Macro-Region:</span>
                {['all', 'Southeast', 'South', 'Central-West', 'Northeast', 'North'].map(r => (
                  <button
                    key={r}
                    onClick={() => setSelectedStateRegion(r)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize transition ${
                      selectedStateRegion === r
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* States Table */}
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-2.5 px-3">State (UF)</th>
                    <th className="py-2.5 px-3">Region</th>
                    <th className="py-2.5 px-3 text-right">Orders</th>
                    <th className="py-2.5 px-3 text-right">AOV</th>
                    <th className="py-2.5 px-3 text-right">Avg Freight</th>
                    <th className="py-2.5 px-3 text-right">Delivery Days</th>
                    <th className="py-2.5 px-3 text-right">Rating</th>
                    <th className="py-2.5 px-3 text-right">Share</th>
                    <th className="py-2.5 px-3 text-right font-bold">Gross Revenue</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {filteredStates.map(s => (
                    <tr key={s.state} className="hover:bg-slate-50/80 transition">
                      <td className="py-2.5 px-3 font-sans">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded border border-slate-200">
                            {s.state}
                          </span>
                          <span className="font-semibold text-slate-900">{s.stateName}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-sans">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                          s.region === 'Southeast' ? 'bg-blue-50 text-blue-700' :
                          s.region === 'South' ? 'bg-teal-50 text-teal-700' :
                          s.region === 'Central-West' ? 'bg-purple-50 text-purple-700' :
                          s.region === 'Northeast' ? 'bg-amber-50 text-amber-700' :
                          'bg-rose-50 text-rose-700'
                        }`}>
                          {s.region}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600 font-sans">
                        {s.orders.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-700">
                        R$ {s.aov.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-700">
                        R$ {s.avgFreight.toFixed(2)}
                        <span className="text-[10px] text-slate-400 block">({s.freightRatio}%)</span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-700 font-sans">
                        {s.avgDeliveryDays}d
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="inline-flex items-center gap-0.5 text-amber-600 font-sans font-medium">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          {s.avgRating.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-blue-700 font-semibold font-sans">
                        {s.share}%
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        R$ {s.revenue.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => setInspectedState(s)}
                          className="px-2 py-1 text-[11px] font-sans font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded transition"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredStates.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-xs text-slate-400 font-sans">
                        No Brazilian states match the current search or regional filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: GPS MAP & METROPOLITAN CLUSTERS */}
      {/* ========================================================================= */}
      {activeTab === 'map' && (
        <div className="space-y-6">
          {/* Brazil Coordinates Scatter Map */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 mb-2 border-b border-slate-100 gap-2">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-blue-600" />
                  Brazilian City GPS Geospatial Distribution Map
                </h3>
                <p className="text-xs text-slate-500">
                  Latitude vs Longitude scatter coordinates derived directly from dim_location centroids
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  Lat: [-34°, +5°] &bull; Lng: [-74°, -34°]
                </span>
              </div>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 15, right: 30, bottom: 15, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    type="number"
                    dataKey="longitude"
                    name="Longitude"
                    domain={[-70, -35]}
                    tick={{ fontSize: 10 }}
                    label={{ value: 'Longitude (West)', position: 'insideBottom', offset: -5, fontSize: 10, fill: '#64748b' }}
                  />
                  <YAxis
                    type="number"
                    dataKey="latitude"
                    name="Latitude"
                    domain={[-34, 5]}
                    tick={{ fontSize: 10 }}
                    label={{ value: 'Latitude (South)', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10, fill: '#64748b' }}
                  />
                  <ZAxis type="number" dataKey="revenue" range={[60, 600]} />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    content={({ payload }) => {
                      if (payload && payload.length) {
                        const d = payload[0].payload as CityLogisticsMetric;
                        return (
                          <div className="bg-slate-950 text-white p-3 rounded-lg text-xs shadow-xl font-sans max-w-xs border border-slate-800">
                            <div className="font-bold text-blue-400 text-sm">{d.city}</div>
                            <div className="text-slate-300 text-xs">
                              {d.state} &bull; {d.region} Region
                            </div>
                            <div className="mt-2 space-y-1 font-mono text-[11px]">
                              <div className="text-emerald-400 font-bold">
                                Gross Sales: R$ {d.revenue.toLocaleString()}
                              </div>
                              <div className="text-slate-300 font-sans">
                                Orders: {d.orders.toLocaleString()} &bull; Avg Freight: R$ {d.avgFreight.toFixed(2)}
                              </div>
                              <div className="text-amber-400 font-sans flex items-center gap-1">
                                Rating: {d.avgRating.toFixed(2)} ★ &bull; Top: {d.topCategory}
                              </div>
                              <div className="text-slate-400 text-[10px] mt-1 pt-1 border-t border-slate-800">
                                Coordinates: {d.latitude.toFixed(4)}°, {d.longitude.toFixed(4)}°
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Scatter
                    name="Brazilian Hubs"
                    data={topCities}
                    fill="#2563eb"
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <div className="text-[11px] text-slate-500 text-center mt-2 flex items-center justify-center gap-4">
              <span>Bubble scale reflects commercial revenue concentration</span>
              <span>&bull;</span>
              <span className="text-blue-600 font-semibold">Hover point for metropolitan coordinates</span>
            </div>
          </div>

          {/* Top Metropolitan Cities Table */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 mb-3 border-b border-slate-100 gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Top Metropolitan Commerce Destinations</h3>
                <p className="text-xs text-slate-500">Order fulfillment destinations ordered by aggregated sales volume</p>
              </div>

              {/* City Search */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    placeholder="Search city or state..."
                    value={citySearch}
                    onChange={e => setCitySearch(e.target.value)}
                    className="pl-8 pr-3 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <select
                  value={selectedCityRegion}
                  onChange={e => setSelectedCityRegion(e.target.value)}
                  className="px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                >
                  <option value="all">All Regions</option>
                  <option value="Southeast">Southeast</option>
                  <option value="South">South</option>
                  <option value="Central-West">Central-West</option>
                  <option value="Northeast">Northeast</option>
                  <option value="North">North</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-2.5 px-3">City Destination</th>
                    <th className="py-2.5 px-3">State</th>
                    <th className="py-2.5 px-3">Region</th>
                    <th className="py-2.5 px-3 text-right">Orders</th>
                    <th className="py-2.5 px-3 text-right">Avg Freight</th>
                    <th className="py-2.5 px-3 text-right">GPS Coordinates</th>
                    <th className="py-2.5 px-3 text-right">Satisfaction</th>
                    <th className="py-2.5 px-3 text-right font-bold">Gross Sales</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {filteredCities.map(c => (
                    <tr key={`${c.city}-${c.state}`} className="hover:bg-slate-50/80 transition">
                      <td className="py-2.5 px-3 font-semibold text-slate-900 font-sans">
                        {c.city}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-mono font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded text-[10px]">
                          {c.state}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-600">
                        {c.region}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600 font-sans">
                        {c.orders.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-700">
                        R$ {c.avgFreight.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-400 font-mono text-[10px]">
                        {c.latitude.toFixed(2)}°, {c.longitude.toFixed(2)}°
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="inline-flex items-center gap-0.5 text-amber-600 font-sans font-medium">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          {c.avgRating.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                        R$ {c.revenue.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => setInspectedCity(c)}
                          className="px-2 py-1 text-[11px] font-sans font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded transition"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredCities.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-xs text-slate-400 font-sans">
                        No metropolitan destinations match the query.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SHIPPING CORRIDORS & LOGISTICS FRICTION */}
      {/* ========================================================================= */}
      {activeTab === 'corridors' && (
        <div className="space-y-6">
          {/* Speed Brackets Analysis */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Delivery Speed Tier Distribution &amp; Review Impact</h3>
                <p className="text-xs text-slate-500">How fulfillment duration directly influences customer satisfaction ratings</p>
              </div>
              <span className="text-[11px] font-mono bg-amber-50 text-amber-800 px-2 py-0.5 rounded font-semibold">
                SLA Tiers
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mt-3">
              {deliverySpeedBrackets.map(tier => (
                <div
                  key={tier.bracket}
                  className="bg-slate-50 border border-slate-200/80 rounded-lg p-3 text-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="font-bold text-slate-900 truncate" title={tier.bracket}>
                      {tier.bracket.split(' ')[0]} {tier.bracket.split(' ')[1]}
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">{tier.range}</span>
                    <div className="mt-2 text-base font-bold text-blue-700 font-mono">
                      {tier.percentage}%
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {tier.orders.toLocaleString()} orders
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Avg Freight</span>
                      <span className="font-mono font-semibold text-slate-700">R${tier.avgFreight.toFixed(2)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Satisfaction</span>
                      <span className={`font-bold flex items-center gap-0.5 ${
                        tier.avgRating >= 4.2 ? 'text-emerald-700' :
                        tier.avgRating >= 3.8 ? 'text-amber-700' : 'text-rose-700'
                      }`}>
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        {tier.avgRating.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Shipping Corridors Table */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Key Origin-to-Destination Shipping Corridors</h3>
                <p className="text-xs text-slate-500">
                  Seller State (Origin) &rarr; Customer State (Destination) fulfillment performance &amp; freight costs
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400">Top 15 Logistics Corridors</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-2.5 px-3">Logistics Corridor</th>
                    <th className="py-2.5 px-3">Corridor Type</th>
                    <th className="py-2.5 px-3 text-right">Orders</th>
                    <th className="py-2.5 px-3 text-right">National Share</th>
                    <th className="py-2.5 px-3 text-right">Avg Freight Fee</th>
                    <th className="py-2.5 px-3 text-right">Transit Days</th>
                    <th className="py-2.5 px-3 text-right">Customer Rating</th>
                    <th className="py-2.5 px-3 text-right font-bold">Corridor Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {shippingCorridors.map(c => (
                    <tr key={c.corridor} className="hover:bg-slate-50/80 transition">
                      <td className="py-2.5 px-3 font-sans font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <Truck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>{c.corridor}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-sans">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                          c.isIntraState ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {c.isIntraState ? 'Intra-State (Local Hub)' : 'Inter-State (Cross-Regional)'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-700 font-sans">
                        {c.orders.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right text-blue-700 font-semibold font-sans">
                        {c.share}%
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-700 font-mono font-medium">
                        R$ {c.avgFreight.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-700 font-sans">
                        {c.avgDeliveryDays} Days
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="inline-flex items-center gap-0.5 text-amber-600 font-sans font-medium">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          {c.avgRating.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        R$ {c.revenue.toLocaleString()}
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
      {/* STATE 360° INSPECTOR MODAL */}
      {/* ========================================================================= */}
      {inspectedState && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono bg-blue-600 text-white px-2 py-0.5 rounded font-bold">
                    {inspectedState.state}
                  </span>
                  <h3 className="font-bold text-base text-white">{inspectedState.stateName}</h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Macro-Region: {inspectedState.region} &bull; Brazilian Federative Unit
                </p>
              </div>
              <button
                onClick={() => setInspectedState(null)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-500 block">Gross Sales Volume</span>
                  <span className="text-base font-bold text-slate-900 font-mono mt-0.5 block">
                    R$ {inspectedState.revenue.toLocaleString()}
                  </span>
                  <span className="text-[11px] text-blue-700 font-medium">
                    {inspectedState.share}% of National GMV
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-500 block">Orders &amp; Unique Buyers</span>
                  <span className="text-base font-bold text-slate-900 font-mono mt-0.5 block">
                    {inspectedState.orders.toLocaleString()}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {inspectedState.customers.toLocaleString()} unique customers
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-500 block">Average Order Value</span>
                  <span className="text-base font-bold text-slate-900 font-mono mt-0.5 block">
                    R$ {inspectedState.aov.toFixed(2)}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Basket size per checkout
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-500 block">Freight Tariff &amp; Ratio</span>
                  <span className="text-base font-bold text-slate-900 font-mono mt-0.5 block">
                    R$ {inspectedState.avgFreight.toFixed(2)}
                  </span>
                  <span className="text-[11px] text-amber-700 font-medium">
                    {inspectedState.freightRatio}% of item value
                  </span>
                </div>
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-lg text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Fulfillment SLA Transit</span>
                  <span className="font-bold text-blue-900 font-mono">{inspectedState.avgDeliveryDays} Days</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Customer Rating</span>
                  <span className="font-bold text-amber-700 flex items-center gap-1 font-mono">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    {inspectedState.avgRating.toFixed(2)} / 5.0
                  </span>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  onClick={() => setInspectedState(null)}
                  className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CITY DETAILS MODAL */}
      {/* ========================================================================= */}
      {inspectedCity && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-400" />
                  {inspectedCity.city}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  State: {inspectedCity.state} &bull; Region: {inspectedCity.region}
                </p>
              </div>
              <button
                onClick={() => setInspectedCity(null)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Gross Sales</span>
                <span className="font-mono font-bold text-emerald-700 text-sm">
                  R$ {inspectedCity.revenue.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Total Orders</span>
                <span className="font-medium text-slate-800">{inspectedCity.orders.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Average Shipping Fee</span>
                <span className="font-mono text-slate-800">R$ {inspectedCity.avgFreight.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Top Product Category</span>
                <span className="font-semibold text-blue-700 capitalize">{inspectedCity.topCategory}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Customer Rating</span>
                <span className="font-bold text-amber-600 flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  {inspectedCity.avgRating.toFixed(2)} / 5.0
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-slate-500">Centroid Coordinates</span>
                <span className="font-mono text-slate-600 text-[11px]">
                  {inspectedCity.latitude.toFixed(4)}°, {inspectedCity.longitude.toFixed(4)}°
                </span>
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  onClick={() => setInspectedCity(null)}
                  className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
