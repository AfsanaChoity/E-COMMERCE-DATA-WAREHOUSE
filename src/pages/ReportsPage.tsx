import React, { useState, useEffect, useMemo } from 'react';
import {
  FileSpreadsheet,
  Download,
  Plus,
  Clock,
  Search,
  Trash2,
  Eye,
  Printer,
  Zap,
  BarChart3,
  TrendingUp,
  Package,
  Users,
  MapPin,
  CheckCircle2,
  X,
  FileJson,
  Layers,
  Sparkles,
  SlidersHorizontal,
  ChevronDown,
  AlertTriangle
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell
} from 'recharts';
import { api } from '../services/api';
import { GeneratedReport } from '../types';

type ReportTypeFilter = 'all' | 'Sales Report' | 'Product Report' | 'Customer Report' | 'Location Report';
type SortOrder = 'newest' | 'oldest' | 'records_desc' | 'name_asc';

export const ReportsPage: React.FC = () => {
  const [reports, setReports] = useState<GeneratedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<GeneratedReport | null>(null);
  const [reportToDelete, setReportToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Search, filter, and sorting state
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<ReportTypeFilter>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');

  // Form states for new report modal
  const [reportType, setReportType] = useState<GeneratedReport['type']>('Sales Report');
  const [reportName, setReportName] = useState('');
  const [dateRange, setDateRange] = useState('all');
  const [category, setCategory] = useState('all');
  const [region, setRegion] = useState('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTemplateExecuting, setActiveTemplateExecuting] = useState<string | null>(null);

  // Success toast notice
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchReports = () => {
    setLoading(true);
    api.getReports()
      .then(res => {
        setReports(res.reports);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load reports:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // Filter & Sort logic
  const filteredAndSortedReports = useMemo(() => {
    return reports
      .filter(r => {
        const matchesSearch =
          r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (r.parameters.category && r.parameters.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (r.parameters.region && r.parameters.region.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesType = typeFilter === 'all' || r.type === typeFilter;
        return matchesSearch && matchesType;
      })
      .sort((a, b) => {
        if (sortOrder === 'newest') {
          return new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime();
        }
        if (sortOrder === 'oldest') {
          return new Date(a.generatedAt).getTime() - new Date(b.generatedAt).getTime();
        }
        if (sortOrder === 'records_desc') {
          return b.recordCount - a.recordCount;
        }
        if (sortOrder === 'name_asc') {
          return a.name.localeCompare(b.name);
        }
        return 0;
      });
  }, [reports, searchTerm, typeFilter, sortOrder]);

  // Handle Custom Generation
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const generatedName =
        reportName.trim() ||
        `${reportType.replace(' Report', '')} Analysis - ${dateRange.toUpperCase()}${region !== 'all' ? ` (${region})` : ''
        }`;
      const res = await api.generateReport({
        name: generatedName,
        type: reportType,
        dateRange,
        category,
        region
      });
      if (res.success) {
        setReports(prev => [res.report, ...prev]);
        setShowGenerateModal(false);
        setReportName('');
        showToast(`Successfully generated "${res.report.name}"!`);
      }
    } catch (err) {
      console.error('Report generation error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle One-Click Templates
  const handleRunTemplate = async (
    templateName: string,
    type: GeneratedReport['type'],
    params: { dateRange: string; category?: string; region?: string }
  ) => {
    setActiveTemplateExecuting(templateName);
    try {
      const res = await api.generateReport({
        name: `${templateName} (${new Date().toLocaleDateString()})`,
        type,
        dateRange: params.dateRange,
        category: params.category || 'all',
        region: params.region || 'all'
      });
      if (res.success) {
        setReports(prev => [res.report, ...prev]);
        showToast(`Template "${templateName}" compiled and archived!`);
      }
    } catch (err) {
      console.error('Template run error:', err);
    } finally {
      setActiveTemplateExecuting(null);
    }
  };

  // Trigger Delete Confirmation Modal
  const requestDeleteReport = (id: string, name: string) => {
    setReportToDelete({ id, name });
  };

  // Confirm Delete Action from Modal
  const confirmDeleteReport = async () => {
    if (!reportToDelete) return;
    setIsDeleting(true);
    try {
      await api.deleteReport(reportToDelete.id);
      setReports(prev => prev.filter(r => r.id !== reportToDelete.id));
      if (selectedReport?.id === reportToDelete.id) {
        setSelectedReport(null);
      }
      showToast(`Report "${reportToDelete.name}" removed from archive.`);
      setReportToDelete(null);
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // CSV Exporter (Comprehensive: Summary + Breakdown)
  const handleDownloadCSV = (report: GeneratedReport) => {
    const lines: string[] = [];
    lines.push(`"Report Title","${report.name}"`);
    lines.push(`"Report Type","${report.type}"`);
    lines.push(`"Generated At","${new Date(report.generatedAt).toISOString()}"`);
    lines.push(`"Date Range","${report.parameters.dateRange}"`);
    if (report.parameters.region) lines.push(`"Region Filter","${report.parameters.region}"`);
    if (report.parameters.category) lines.push(`"Category Filter","${report.parameters.category}"`);
    lines.push(`"Total Records","${report.recordCount}"`);
    lines.push('');
    lines.push('--- EXECUTIVE SUMMARY METRICS ---');
    lines.push('"Metric","Value"');
    Object.entries(report.summaryMetrics).forEach(([k, v]) => {
      lines.push(`"${k}","${v}"`);
    });

    if (report.breakdown && report.breakdown.length > 0) {
      lines.push('');
      lines.push('--- DETAILED DIMENSIONAL BREAKDOWN ---');
      const keys = Object.keys(report.breakdown[0]);
      lines.push(keys.map(k => `"${k}"`).join(','));
      report.breakdown.forEach(row => {
        lines.push(keys.map(k => `"${row[k] ?? ''}"`).join(','));
      });
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(lines.join('\n'));
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `${report.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // JSON Exporter for BI tools (Looker, Tableau, PowerBI)
  const handleDownloadJSON = (report: GeneratedReport) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(report, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `${report.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Friendly Trigger
  const handlePrint = () => {
    window.print();
  };

  // One-Click Templates Definition
  const templates = [
    {
      id: 'tmpl_sales',
      title: 'Commercial Revenue & GMV Audit',
      subtitle: 'Monthly gross sales, order velocity, and payment distribution across Brazil',
      type: 'Sales Report' as const,
      icon: TrendingUp,
      color: 'blue',
      badge: 'Sales GMV',
      params: { dateRange: 'all' }
    },
    {
      id: 'tmpl_products',
      title: 'Product Catalog Velocity & Margins',
      subtitle: 'SKU rank by units sold, category distribution, and satisfaction ratings',
      type: 'Product Report' as const,
      icon: Package,
      color: 'purple',
      badge: 'Catalog & SKU',
      params: { dateRange: '2018', category: 'all' }
    },
    {
      id: 'tmpl_customers',
      title: 'Customer RFM Cohorts & Retention',
      subtitle: 'Segmentation matrix (Champions, Loyal, At-Risk) with lifetime spend',
      type: 'Customer Report' as const,
      icon: Users,
      color: 'emerald',
      badge: 'RFM Cohorts',
      params: { dateRange: 'all' }
    },
    {
      id: 'tmpl_logistics',
      title: 'Territorial Logistics & Freight SLAs',
      subtitle: 'Cross-regional shipping tariffs, transit days, and fulfillment delay rates',
      type: 'Location Report' as const,
      icon: MapPin,
      color: 'teal',
      badge: 'Territorial SLA',
      params: { dateRange: 'all', region: 'Southeast' }
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-slate-700 animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <FileSpreadsheet className="w-6 h-6 text-blue-600" />
              Executive BI Reports &amp; Analytics Extracts
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Generate formal analytical extracts, export dimensional aggregates in CSV/JSON, and review historical business performance.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowGenerateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm shadow-blue-500/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Generate Custom Report</span>
          </button>
        </div>
      </div>

      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Archived Reports
          </span>
          <span className="text-xl font-bold text-slate-900 font-mono mt-1 block">
            {reports.length}
          </span>
          <span className="text-[10px] text-slate-500">Available in memory store</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Coverage Domains
          </span>
          <span className="text-xl font-bold text-blue-600 font-mono mt-1 block">
            4 Core Domains
          </span>
          <span className="text-[10px] text-slate-500">Sales, Products, Customers, Logistics</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Total Records Tracked
          </span>
          <span className="text-xl font-bold text-emerald-600 font-mono mt-1 block">
            {reports.reduce((acc, r) => acc + (r.recordCount || 0), 0).toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-500">Fact sales &amp; dimension rows</span>
        </div>
      </div>

      {/* Pre-Built Instant Report Templates */}
      <div className="bg-gradient-to-r from-slate-900 to-blue-950 p-5 rounded-2xl text-white shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 mb-3 border-b border-slate-800 gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold text-white">One-Click Executive Report Templates</h2>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Instantly compile conformed analytical extracts directly against the star schema engine.
            </p>
          </div>
          <span className="text-[11px] font-mono bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-400/30 self-start sm:self-auto">
            Zero Configuration Required
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {templates.map(tmpl => {
            const IconComponent = tmpl.icon;
            const isRunning = activeTemplateExecuting === tmpl.title;
            return (
              <div
                key={tmpl.id}
                className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl p-3.5 flex flex-col justify-between transition group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                      {tmpl.badge}
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-slate-700/60 flex items-center justify-center text-blue-400 group-hover:scale-105 transition">
                      <IconComponent className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <h3 className="font-bold text-xs text-white leading-snug">{tmpl.title}</h3>
                  <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">{tmpl.subtitle}</p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-700/60 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-mono">{tmpl.type.replace(' Report', '')}</span>
                  <button
                    onClick={() => handleRunTemplate(tmpl.title, tmpl.type, tmpl.params)}
                    disabled={isRunning}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-semibold transition disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {isRunning ? (
                      <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <Zap className="w-3 h-3 text-amber-300" />
                    )}
                    <span>{isRunning ? 'Running...' : 'Run Now'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reports Vault & Ledger Section */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Search & Filter Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search reports by title, parameter, or keyword..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition"
            />
          </div>

          {/* Filter Pills and Sort */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Type Filter Buttons */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              {(['all', 'Sales Report', 'Product Report', 'Customer Report', 'Location Report'] as ReportTypeFilter[]).map(
                t => (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className={`px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer ${typeFilter === t
                        ? 'bg-white text-blue-600 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                      }`}
                  >
                    {t === 'all' ? 'All Types' : t.replace(' Report', '')}
                  </button>
                )
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={sortOrder}
                onChange={e => setSortOrder(e.target.value as SortOrder)}
                className="pl-3 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="records_desc">Most Records</option>
                <option value="name_asc">Name (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Ledger Table */}
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
            <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span>Loading reports vault...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-3 px-4">Report Name &amp; Title</th>
                  <th className="py-3 px-4">Domain Category</th>
                  <th className="py-3 px-4">Parameters</th>
                  <th className="py-3 px-4">Generation Date</th>
                  <th className="py-3 px-4 text-right">Records Count</th>
                  <th className="py-3 px-4 text-center">Quick Export</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredAndSortedReports.map(report => (
                  <tr key={report.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <div
                          className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${report.type === 'Sales Report'
                              ? 'bg-blue-50 text-blue-600'
                              : report.type === 'Product Report'
                                ? 'bg-purple-50 text-purple-600'
                                : report.type === 'Customer Report'
                                  ? 'bg-emerald-50 text-emerald-600'
                                  : 'bg-teal-50 text-teal-600'
                            }`}
                        >
                          {report.type === 'Sales Report' && <TrendingUp className="w-3.5 h-3.5" />}
                          {report.type === 'Product Report' && <Package className="w-3.5 h-3.5" />}
                          {report.type === 'Customer Report' && <Users className="w-3.5 h-3.5" />}
                          {report.type === 'Location Report' && <MapPin className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <span className="block leading-snug">{report.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">ID: {report.id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${report.type === 'Sales Report'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : report.type === 'Product Report'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : report.type === 'Customer Report'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-teal-50 text-teal-700 border border-teal-200'
                          }`}
                      >
                        {report.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                          {report.parameters.dateRange.toUpperCase()}
                        </span>
                        {report.parameters.region && report.parameters.region !== 'all' && (
                          <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                            {report.parameters.region}
                          </span>
                        )}
                        {report.parameters.category && report.parameters.category !== 'all' && (
                          <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded capitalize">
                            {report.parameters.category.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(report.generatedAt).toLocaleString()}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-800 font-semibold">
                      {report.recordCount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => handleDownloadCSV(report)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold transition cursor-pointer"
                          title="Export CSV"
                        >
                          CSV
                        </button>
                        <button
                          onClick={() => handleDownloadJSON(report)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold transition cursor-pointer"
                          title="Export JSON"
                        >
                          JSON
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedReport(report)}
                          className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-xs font-semibold transition cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Inspect</span>
                        </button>
                        <button
                          onClick={() => requestDeleteReport(report.id, report.name)}
                          className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                          title="Delete Report"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredAndSortedReports.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-slate-400">
                      No reports match the current query or filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* GENERATE CUSTOM REPORT MODAL */}
      {/* ========================================================================= */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h4 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                  Generate Analytical Report
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Execute dimensional aggregations against the Olist Data Warehouse
                </p>
              </div>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGenerate} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Report Title (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Q2 2018 Southeast Logistics & Regional Review"
                  value={reportName}
                  onChange={e => setReportName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Domain Subject / Report Type
                </label>
                <select
                  value={reportType}
                  onChange={e => setReportType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none font-medium cursor-pointer"
                >
                  <option value="Sales Report">Sales Report (Revenue, AOV, Order Trends)</option>
                  <option value="Product Report">Product Report (Catalog Velocity &amp; Category Margins)</option>
                  <option value="Customer Report">Customer Report (RFM Segments, LTV &amp; Repeat Rates)</option>
                  <option value="Location Report">Location Report (Regional Logistics &amp; Freight SLAs)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date Period</label>
                  <select
                    value={dateRange}
                    onChange={e => setDateRange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none font-medium cursor-pointer"
                  >
                    <option value="all">All Available Historical (2017 - 2018)</option>
                    <option value="2018">Year 2018</option>
                    <option value="2017">Year 2017</option>
                    <option value="last90">Last 90 Days</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Macro-Region</label>
                  <select
                    value={region}
                    onChange={e => setRegion(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none font-medium cursor-pointer"
                  >
                    <option value="all">All Brazilian Regions</option>
                    <option value="Southeast">Southeast (Sudeste)</option>
                    <option value="South">South (Sul)</option>
                    <option value="Central-West">Central-West (Centro-Oeste)</option>
                    <option value="Northeast">Northeast (Nordeste)</option>
                    <option value="North">North (Norte)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Product Category Scope</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none font-medium cursor-pointer"
                >
                  <option value="all">All Categories</option>
                  <option value="health_beauty">Health &amp; Beauty</option>
                  <option value="watches_gifts">Watches &amp; Gifts</option>
                  <option value="bed_bath_table">Bed Bath &amp; Table</option>
                  <option value="sports_leisure">Sports &amp; Leisure</option>
                  <option value="computers_accessories">Computers &amp; Accessories</option>
                  <option value="furniture_decor">Furniture &amp; Decor</option>
                  <option value="housewares">Housewares</option>
                  <option value="auto">Auto &amp; Parts</option>
                </select>
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-lg text-slate-600">
                <span className="font-semibold text-blue-900 block mb-0.5">Execution Guarantee:</span>
                Extract will calculate conformed metrics and generate dimensional row-level records for instant CSV and JSON export.
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition shadow-xs disabled:opacity-60 cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmitting && (
                    <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  )}
                  <span>{isSubmitting ? 'Computing Aggregates...' : 'Generate & Store'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* REPORT 360° INSPECTOR / DETAIL VIEWER MODAL */}
      {/* ========================================================================= */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${selectedReport.type === 'Sales Report'
                        ? 'bg-blue-600 text-white'
                        : selectedReport.type === 'Product Report'
                          ? 'bg-purple-600 text-white'
                          : selectedReport.type === 'Customer Report'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-teal-600 text-white'
                      }`}
                  >
                    {selectedReport.type}
                  </span>
                  <h3 className="font-bold text-base text-white">{selectedReport.name}</h3>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 font-mono">
                  <span>Generated: {new Date(selectedReport.generatedAt).toLocaleString()}</span>
                  <span>&bull;</span>
                  <span>Records: {selectedReport.recordCount.toLocaleString()}</span>
                  <span>&bull;</span>
                  <span>Period: {selectedReport.parameters.dateRange.toUpperCase()}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 space-y-6 overflow-y-auto">
              {/* Executive Summary Metrics Grid */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
                  Aggregated Summary KPIs
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {Object.entries(selectedReport.summaryMetrics).map(([key, val]) => (
                    <div key={key} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                      <span className="text-[11px] text-slate-500 block truncate" title={key}>
                        {key}
                      </span>
                      <span className="text-base font-bold text-slate-900 font-mono mt-1 block truncate">
                        {val}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dimensional Breakdown Visual & Table */}
              {selectedReport.breakdown && selectedReport.breakdown.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-purple-600" />
                      Dimensional Breakdown &amp; Ledger
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {selectedReport.breakdown.length} breakdown records
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    <div className="overflow-x-auto max-h-60">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold sticky top-0">
                            {Object.keys(selectedReport.breakdown[0]).map(col => (
                              <th key={col} className="py-2 px-3 whitespace-nowrap">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                          {selectedReport.breakdown.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/70">
                              {Object.keys(selectedReport.breakdown![0]).map(col => (
                                <td key={col} className="py-2 px-3 whitespace-nowrap text-slate-800">
                                  {typeof row[col] === 'number'
                                    ? Number(row[col]).toLocaleString()
                                    : String(row[col])}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0 text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadCSV(selectedReport)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Full CSV</span>
                </button>
                <button
                  onClick={() => handleDownloadJSON(selectedReport)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg font-semibold transition cursor-pointer"
                >
                  <FileJson className="w-3.5 h-3.5 text-slate-500" />
                  <span>Export JSON</span>
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg font-semibold transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500" />
                  <span>Print View</span>
                </button>
              </div>

              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={() => {
                    requestDeleteReport(selectedReport.id, selectedReport.name);
                  }}
                  className="px-3 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg font-semibold transition cursor-pointer"
                >
                  Delete Report
                </button>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-semibold transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* CUSTOM CONFIRM DELETE MODAL */}
      {reportToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden transform transition-all scale-100">
            <div className="p-6">
              <div className="flex items-center gap-3.5 mb-4">
                <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 leading-snug">
                    Delete Report?
                  </h3>
                  <p className="text-xs text-slate-500">
                    This action will permanently delete the report archive.
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 mb-5">
                <span className="text-xs font-semibold text-slate-500 block mb-1 uppercase tracking-wider">Report Name</span>
                <span className="text-sm font-semibold text-slate-900 break-words">{reportToDelete.name}</span>
              </div>

              <p className="text-sm text-slate-600 leading-relaxed">
                Are you sure you want to remove this report from the Data Warehouse catalog? You will need to regenerate it to view these analytics again.
              </p>
            </div>

            <div className="bg-slate-50/80 px-6 py-4 flex items-center justify-end gap-2.5 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setReportToDelete(null)}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl font-semibold text-sm transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDeleteReport}
                className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold text-sm shadow-sm hover:shadow transition cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? 'Deleting...' : 'Yes, Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
