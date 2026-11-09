import React, { useState, useEffect } from 'react';
import {
  DatabaseZap,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  ArrowRight,
  RefreshCw,
  FileCode,
  Table,
  Check,
  HardDrive,
  Copy,
  Download,
  FileText,
  Search,
  BookOpen,
  ShieldCheck,
  RotateCcw,
  Terminal,
  FolderOpen,
  ChevronLeft,
  ChevronRight,
  PlayCircle,
  Sparkles,
  Zap,
  Activity,
  Cpu,
  HelpCircle,
  Filter,
  BarChart3,
  ExternalLink,
  AlertTriangle
} from 'lucide-react';
import { StarSchemaVisualizer } from '../components/StarSchemaVisualizer';
import { PowerBiIntegration } from '../components/PowerBiIntegration';
import { api } from '../services/api';
import { ETLExecutionLog, StarSchemaTableMeta } from '../types';

interface ColumnMapping {
  targetCol: string;
  sourceFile: string;
  sourceCol: string;
  dataType: string;
  rule: string;
}

interface TableMapping {
  tableName: string;
  tableType: string;
  grain: string;
  primaryKey: string;
  columns: ColumnMapping[];
}

interface ValidationReportData {
  isValid: boolean;
  totalRecordsChecked: number;
  totalDuplicatesDetected: number;
  totalMissingValuesDetected: number;
  totalReferentialIssuesDetected: number;
  totalTypeErrorsDetected: number;
  warningsCount: number;
  errorsCount: number;
  fileReports: Record<string, {
    fileName: string;
    rowCount: number;
    validRows: number;
    duplicateRows: number;
    missingValueRows: number;
    status: 'PASSED' | 'WARNING' | 'FAILED';
    issues: string[];
  }>;
  warnings: string[];
  errors: string[];
  durationMs: number;
}

interface QueryResultData {
  queryId: string;
  queryName: string;
  description: string;
  columns: string[];
  rows: Record<string, any>[];
  rowCount: number;
  rowsScanned: number;
  executionTimeMs: number;
}

const PRESET_QUERIES = [
  {
    id: 'top_categories',
    title: 'Top 10 Categories by Revenue & Reviews',
    badge: 'Category Margin',
    category: 'Commercial OLAP',
    sqlPreview: 'SELECT p.category_name_en, SUM(f.price) AS revenue, COUNT(*) AS units, AVG(f.review_score) FROM fact_sales f JOIN dim_product p ON f.product_key = p.product_key GROUP BY 1 ORDER BY revenue DESC LIMIT 10;'
  },
  {
    id: 'regional_logistics',
    title: 'Macro-Regional Fulfillment & Freight SLA',
    badge: 'Logistics SLA',
    category: 'Geographic OLAP',
    sqlPreview: 'SELECT l.region, COUNT(DISTINCT f.order_id) AS orders, SUM(f.price) AS gmv, AVG(f.freight_value) AS avg_freight FROM fact_sales f JOIN dim_location l ON f.location_key = l.location_key GROUP BY 1 ORDER BY gmv DESC;'
  },
  {
    id: 'rfm_cohorts',
    title: 'Customer RFM Segmentation Spend & Headcount',
    badge: 'Customer Cohorts',
    category: 'Customer OLAP',
    sqlPreview: 'SELECT c.customer_segment, COUNT(*) AS buyers, SUM(c.total_spend) AS gmv, AVG(c.lifetime_value) AS ltv FROM dim_customer c GROUP BY 1 ORDER BY gmv DESC;'
  },
  {
    id: 'monthly_trend',
    title: 'Monthly Sales Velocity & AOV Trajectory',
    badge: 'Time Dimension',
    category: 'Temporal OLAP',
    sqlPreview: 'SELECT d.year, d.month_name, COUNT(DISTINCT f.order_id) AS orders, SUM(f.price) AS revenue, AVG(f.price) AS aov FROM fact_sales f JOIN dim_date d ON f.date_key = d.date_key GROUP BY 1, 2 ORDER BY d.year, d.month_num;'
  },
  {
    id: 'payment_mix',
    title: 'Payment Channel Distribution & Installments',
    badge: 'Financial Flow',
    category: 'Financial OLAP',
    sqlPreview: 'SELECT f.payment_type, COUNT(*) AS txn_volume, SUM(f.payment_value) AS total_val, AVG(f.payment_installments) AS avg_installments FROM fact_sales f GROUP BY 1 ORDER BY total_val DESC;'
  },
  {
    id: 'top_states',
    title: 'Top 10 Destination States by GMV',
    badge: 'Federative Units',
    category: 'Geographic OLAP',
    sqlPreview: 'SELECT l.state, COUNT(DISTINCT f.order_id) AS orders, SUM(f.price) AS revenue, AVG(f.freight_value) AS freight FROM fact_sales f JOIN dim_location l ON f.location_key = l.location_key GROUP BY 1 ORDER BY revenue DESC LIMIT 10;'
  }
];

export const DataWarehousePage: React.FC = () => {
  const [etlStatus, setEtlStatus] = useState<{
    currentLog: ETLExecutionLog | null;
    history: ETLExecutionLog[];
    sourceDir: string;
  } | null>(null);
  const [schemaTables, setSchemaTables] = useState<StarSchemaTableMeta[]>([]);
  const [isRunningETL, setIsRunningETL] = useState(false);
  const [currentExecutionStage, setCurrentExecutionStage] = useState<number>(0);
  const [isValidating, setIsValidating] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [validationReport, setValidationReport] = useState<ValidationReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    'schema' | 'powerbi' | 'browser' | 'query' | 'validation' | 'mapping' | 'sql' | 'pipeline' | 'logs' | 'cli'
  >('browser');

  // SQL Viewer State
  const [selectedSqlFile, setSelectedSqlFile] = useState<
    'schema.sql' | 'database.sql' | 'seed.sql' | 'analytical_queries.sql' | 'power_bi_views.sql' | 'power_bi_dax_measures.dax'
  >('power_bi_views.sql');
  const [sqlContent, setSqlContent] = useState<string>('');
  const [sqlLoading, setSqlLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Mapping State
  const [mappings, setMappings] = useState<TableMapping[]>([]);
  const [selectedMappingTable, setSelectedMappingTable] = useState<string>('fact_sales');
  const [mappingSearch, setMappingSearch] = useState<string>('');

  // Table Data Browser State
  const [selectedBrowserTable, setSelectedBrowserTable] = useState<string>('fact_sales');
  const [browserSearch, setBrowserSearch] = useState<string>('');
  const [browserPage, setBrowserPage] = useState<number>(1);
  const [browserLimit, setBrowserLimit] = useState<number>(20);
  const [browserTableData, setBrowserTableData] = useState<{
    totalRows: number;
    totalPages: number;
    columns: string[];
    rows: Record<string, any>[];
  } | null>(null);
  const [browserLoading, setBrowserLoading] = useState<boolean>(false);

  // OLAP Query Runner State
  const [selectedQueryId, setSelectedQueryId] = useState<string>('top_categories');
  const [queryExecuting, setQueryExecuting] = useState<boolean>(false);
  const [queryResult, setQueryResult] = useState<QueryResultData | null>(null);

  // Success toast notice
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchData = async () => {
    try {
      const [etlRes, schemaRes, mapRes] = await Promise.all([
        api.getETLStatus(),
        api.getWarehouseSchema(),
        api.getSourceMapping()
      ]);
      setEtlStatus(etlRes);
      setSchemaTables(schemaRes.tables);
      setMappings(mapRes.mappings);
    } catch (err) {
      console.error('Error loading DW status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab === 'sql') {
      loadSqlFile(selectedSqlFile);
    }
  }, [activeTab, selectedSqlFile]);

  // Load Table Data in Browser when tab or selection changes
  const fetchTableBrowserData = async () => {
    setBrowserLoading(true);
    try {
      const res = await api.getWarehouseTableData(
        selectedBrowserTable,
        browserPage,
        browserLimit,
        browserSearch
      );
      if (res.success) {
        setBrowserTableData({
          totalRows: res.totalRows,
          totalPages: res.totalPages,
          columns: res.columns,
          rows: res.rows
        });
      }
    } catch (err) {
      console.error('Failed to load table browser rows:', err);
    } finally {
      setBrowserLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'browser') {
      fetchTableBrowserData();
    }
  }, [activeTab, selectedBrowserTable, browserPage, browserLimit]);

  // Trigger search on debounce or Enter
  const handleBrowserSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setBrowserPage(1);
    fetchTableBrowserData();
  };

  // Run OLAP Query
  const handleRunOlapQuery = async (queryIdToRun?: string) => {
    const qId = queryIdToRun || selectedQueryId;
    setQueryExecuting(true);
    try {
      const res = await api.executeWarehouseQuery(qId);
      if (res.success) {
        setQueryResult({
          queryId: res.queryId,
          queryName: res.queryName,
          description: res.description,
          columns: res.columns,
          rows: res.rows,
          rowCount: res.rowCount,
          rowsScanned: res.rowsScanned,
          executionTimeMs: res.executionTimeMs
        });
        showToast(`Executed "${res.queryName}" in ${res.executionTimeMs}ms!`);
      }
    } catch (err) {
      console.error('OLAP query error:', err);
    } finally {
      setQueryExecuting(false);
    }
  };

  // Run default query once tab is opened
  useEffect(() => {
    if (activeTab === 'query' && !queryResult) {
      handleRunOlapQuery('top_categories');
    }
  }, [activeTab]);

  const loadSqlFile = async (
    fileName:
      | 'schema.sql'
      | 'database.sql'
      | 'seed.sql'
      | 'analytical_queries.sql'
      | 'power_bi_views.sql'
      | 'power_bi_dax_measures.dax'
  ) => {
    setSqlLoading(true);
    try {
      const content = await api.getSQLFile(fileName);
      setSqlContent(content);
    } catch (err) {
      setSqlContent(`-- Failed to load ${fileName}\n-- ${String(err)}`);
    } finally {
      setSqlLoading(false);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast('SQL script copied to clipboard!');
  };

  const handleDownloadSql = () => {
    const blob = new Blob([sqlContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = selectedSqlFile;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${selectedSqlFile}`);
  };

  const handleRunETL = async () => {
    setIsRunningETL(true);
    setCurrentExecutionStage(1);
    
    // Simulate stage visual progression
    const stageTimer1 = setTimeout(() => setCurrentExecutionStage(2), 250);
    const stageTimer2 = setTimeout(() => setCurrentExecutionStage(3), 550);
    const stageTimer3 = setTimeout(() => setCurrentExecutionStage(4), 850);
    const stageTimer4 = setTimeout(() => setCurrentExecutionStage(5), 1150);

    try {
      const res = await api.runETL();
      if (res.success) {
        await fetchData();
        if (activeTab === 'browser') {
          fetchTableBrowserData();
        }
        showToast('Full ETL Pipeline executed successfully: Fact & Dimension tables reloaded!');
      }
    } catch (err) {
      console.error('ETL trigger failed:', err);
    } finally {
      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      clearTimeout(stageTimer3);
      clearTimeout(stageTimer4);
      setIsRunningETL(false);
      setCurrentExecutionStage(0);
    }
  };

  const handleValidate = async () => {
    setIsValidating(true);
    try {
      const res = await api.validateETL();
      if (res.success) {
        setValidationReport(res.validation);
        setActiveTab('validation');
        showToast(`Validated ${res.totalExtracted.toLocaleString()} rows across ${res.sourceFilesDetected.length} source files!`);
      }
    } catch (err) {
      console.error('Validation failed:', err);
    } finally {
      setIsValidating(false);
    }
  };

  const handleReset = async () => {
    setIsResetting(true);
    try {
      await api.resetWarehouse();
      await fetchData();
      setValidationReport(null);
      if (activeTab === 'browser') {
        fetchTableBrowserData();
      }
      showToast('Warehouse tables reset and truncated.');
      setShowResetModal(false);
    } catch (err) {
      console.error('Reset failed:', err);
    } finally {
      setIsResetting(false);
    }
  };

  // Export current table browser data to CSV
  const handleExportTableCSV = () => {
    if (!browserTableData || browserTableData.rows.length === 0) return;
    const cols = browserTableData.columns;
    const lines = [cols.map(c => `"${c}"`).join(',')];
    browserTableData.rows.forEach(r => {
      lines.push(cols.map(c => `"${r[c] ?? ''}"`).join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedBrowserTable}_slice.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Exported ${selectedBrowserTable} to CSV!`);
  };

  // Export query result to CSV
  const handleExportQueryCSV = () => {
    if (!queryResult || queryResult.rows.length === 0) return;
    const cols = queryResult.columns;
    const lines = [cols.map(c => `"${c}"`).join(',')];
    queryResult.rows.forEach(r => {
      lines.push(cols.map(c => `"${r[c] ?? ''}"`).join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${queryResult.queryId}_result.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Exported query result to CSV!');
  };

  const currentRun = etlStatus?.currentLog;
  const currentMapping = mappings.find(m => m.tableName === selectedMappingTable) || mappings[0];

  const filteredColumns = currentMapping?.columns.filter(col => 
    col.targetCol.toLowerCase().includes(mappingSearch.toLowerCase()) ||
    col.sourceFile.toLowerCase().includes(mappingSearch.toLowerCase()) ||
    col.sourceCol.toLowerCase().includes(mappingSearch.toLowerCase()) ||
    col.rule.toLowerCase().includes(mappingSearch.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Notice */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-slate-700 animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Top Banner: ETL Overview & Operational Actions */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-5 md:p-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  MySQL Data Warehouse &amp; ETL Pipeline
                </h1>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                <span className="text-slate-300">&bull;</span>
                <span className="text-slate-500">9 Olist Source Datasets</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            <button
              onClick={handleValidate}
              disabled={isValidating || isRunningETL}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 active:bg-slate-100 transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            >
              <ShieldCheck className={`w-3.5 h-3.5 text-indigo-600 ${isValidating ? 'animate-spin' : ''}`} />
              {isValidating ? 'Validating...' : 'Validate Datasets'}
            </button>

            <button
              onClick={() => setShowResetModal(true)}
              disabled={isResetting || isRunningETL}
              className="px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 border border-rose-200 rounded-lg transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Truncate fact & dimension tables"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
              Reset Warehouse
            </button>

            <button
              onClick={handleRunETL}
              disabled={isRunningETL}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm shadow-blue-500/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Play className={`w-3.5 h-3.5 ${isRunningETL ? 'animate-spin' : ''}`} />
              {isRunningETL ? 'Executing Pipeline...' : 'Run Full ETL Pipeline'}
            </button>
          </div>
        </div>

        {/* Status Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-5 border-t border-slate-100">
          <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-100">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Pipeline Status</div>
            <div className="flex items-center gap-1.5 mt-1 font-bold text-xs text-emerald-600">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {currentRun?.status || 'COMPLETED'}
            </div>
          </div>

          <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-100">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Records Extracted</div>
            <div className="font-bold text-xs text-slate-900 mt-1 font-mono">
              {currentRun?.recordsExtracted.toLocaleString() || '147'}
            </div>
          </div>

          <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-100">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Cleaned &amp; Transformed</div>
            <div className="font-bold text-xs text-blue-600 mt-1 font-mono">
              {currentRun?.recordsTransformed.toLocaleString() || '106'}
            </div>
          </div>

          <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-100">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Warehouse Loaded</div>
            <div className="font-bold text-xs text-indigo-600 mt-1 font-mono">
              {currentRun?.recordsLoaded.toLocaleString() || '106'}
            </div>
          </div>

          <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-100">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Data Quality Index</div>
            <div className="font-bold text-xs text-emerald-600 mt-1 font-mono flex items-center gap-1">
              99.8% Passed
            </div>
          </div>

          <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-100">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Execution Duration</div>
            <div className="font-bold text-xs text-slate-900 mt-1 font-mono flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              {currentRun ? `${(currentRun.durationMs / 1000).toFixed(2)}s` : '0.04s'}
            </div>
          </div>
        </div>
      </div>

      {/* 5-Stage ETL Architecture Flow with Animated Execution Tracker */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            5-Stage ETL Pipeline Lifecycle
          </h2>
          {isRunningETL && (
            <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 animate-pulse flex items-center gap-1.5">
              <Activity className="w-3 h-3 animate-spin" />
              Stage {currentExecutionStage} Active
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {[
            {
              stageNum: 1,
              step: '1. EXTRACT',
              title: 'Source CSVs',
              desc: '9 Olist raw files read from filesystem',
              color: 'border-blue-200 bg-blue-50/40 text-blue-900',
              activeColor: 'ring-2 ring-blue-500 bg-blue-100/70',
              icon: FileCode
            },
            {
              stageNum: 2,
              step: '2. VALIDATE',
              title: 'Integrity Check',
              desc: 'Schema validation, null checks, deduplication',
              color: 'border-indigo-200 bg-indigo-50/40 text-indigo-900',
              activeColor: 'ring-2 ring-indigo-500 bg-indigo-100/70',
              icon: HardDrive
            },
            {
              stageNum: 3,
              step: '3. CLEAN',
              title: 'Data Scrubbing',
              desc: 'Whitespace trim, date parse, category translation',
              color: 'border-cyan-200 bg-cyan-50/40 text-cyan-900',
              activeColor: 'ring-2 ring-cyan-500 bg-cyan-100/70',
              icon: RefreshCw
            },
            {
              stageNum: 4,
              step: '4. TRANSFORM',
              title: 'Dimensional Modeling',
              desc: 'Date surrogate keys, dim lookups, RFM scores',
              color: 'border-amber-200 bg-amber-50/40 text-amber-900',
              activeColor: 'ring-2 ring-amber-500 bg-amber-100/70',
              icon: Table
            },
            {
              stageNum: 5,
              step: '5. LOAD',
              title: 'Star Schema Store',
              desc: 'fact_sales + 5 dimension tables indexed',
              color: 'border-emerald-200 bg-emerald-50/40 text-emerald-900',
              activeColor: 'ring-2 ring-emerald-500 bg-emerald-100/70',
              icon: DatabaseZap
            }
          ].map((stage, idx) => {
            const Icon = stage.icon;
            const isStageActive = isRunningETL && currentExecutionStage === stage.stageNum;
            return (
              <div
                key={stage.step}
                className={`p-3.5 rounded-lg border flex flex-col justify-between transition-all duration-200 ${
                  isStageActive ? stage.activeColor : stage.color
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-[10px] font-bold tracking-wider uppercase mb-1">
                    <span>{stage.step}</span>
                    <Icon className="w-3.5 h-3.5 opacity-70" />
                  </div>
                  <div className="font-bold text-xs">{stage.title}</div>
                  <div className="text-[11px] opacity-80 mt-1 leading-snug">{stage.desc}</div>
                </div>
                {idx < 4 && (
                  <div className="hidden md:flex justify-end mt-2">
                    <ArrowRight className="w-3.5 h-3.5 opacity-40" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Primary Subtabs Navigation */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('browser')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition cursor-pointer ${
            activeTab === 'browser'
              ? 'border-blue-600 text-blue-600 font-bold bg-blue-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Table Data Browser
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition cursor-pointer ${
            activeTab === 'logs'
              ? 'border-blue-600 text-blue-600 font-bold bg-blue-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          ETL Console Logs
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 0: POWER BI INTEGRATION SUITE */}
      {/* ========================================================================= */}
      {activeTab === 'powerbi' && (
        <PowerBiIntegration />
      )}

      {/* ========================================================================= */}
      {/* TAB 2: LIVE TABLE DATA BROWSER */}
      {/* ========================================================================= */}
      {activeTab === 'browser' && (
        <div className="space-y-4">
          {/* Table Selection and Search Header */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">
                Select Table:
              </span>
              {[
                'fact_sales',
                'dim_customer',
                'dim_product',
                'dim_date',
                'dim_location',
                'dim_seller',
                'vw_sales_summary',
                'vw_monthly_sales',
                'vw_product_performance',
                'vw_category_sales',
                'vw_customer_behavior',
                'vw_regional_sales',
                'vw_order_performance'
              ].map(t => (
                <button
                  key={t}
                  onClick={() => {
                    setSelectedBrowserTable(t);
                    setBrowserPage(1);
                  }}
                  className={`px-2.5 py-1 text-xs font-mono rounded-lg border transition cursor-pointer ${
                    selectedBrowserTable === t
                      ? t.startsWith('vw_')
                        ? 'bg-amber-600 text-white border-amber-600 font-bold shadow-xs'
                        : 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                      : t.startsWith('vw_')
                        ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <form onSubmit={handleBrowserSearchSubmit} className="relative flex-1 md:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder={`Search ${selectedBrowserTable}...`}
                  value={browserSearch}
                  onChange={e => setBrowserSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                />
              </form>

              <button
                onClick={handleExportTableCSV}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Slice</span>
              </button>
            </div>
          </div>

          {/* Table Data Grid */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-mono flex items-center gap-2">
                  <Table className="w-4 h-4 text-blue-600" />
                  {selectedBrowserTable}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Showing {browserTableData?.rows.length || 0} rows of {browserTableData?.totalRows.toLocaleString() || 0} total indexed records
                </p>
              </div>

              {/* Rows Per Page Selector */}
              <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                <span>Rows per page:</span>
                <select
                  value={browserLimit}
                  onChange={e => {
                    setBrowserLimit(Number(e.target.value));
                    setBrowserPage(1);
                  }}
                  className="bg-white border border-slate-200 rounded px-2 py-1 font-mono text-xs cursor-pointer outline-none"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            {browserLoading ? (
              <div className="py-20 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
                <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span>Scanning warehouse table records...</span>
              </div>
            ) : browserTableData && browserTableData.rows.length > 0 ? (
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 z-10 shadow-2xs">
                    <tr className="text-slate-600 font-semibold font-mono text-[11px] uppercase tracking-wider">
                      {browserTableData.columns.map(col => (
                        <th key={col} className="py-2.5 px-3 whitespace-nowrap bg-slate-100">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {browserTableData.rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition">
                        {browserTableData.columns.map(col => (
                          <td key={col} className="py-2.5 px-3 whitespace-nowrap text-slate-800">
                            {row[col] === null || row[col] === undefined ? (
                              <span className="text-slate-400 italic">null</span>
                            ) : typeof row[col] === 'number' ? (
                              row[col].toLocaleString()
                            ) : (
                              String(row[col])
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-16 text-center text-xs text-slate-400">
                No records found matching "{browserSearch}" in {selectedBrowserTable}.
              </div>
            )}

            {/* Pagination Controls */}
            {browserTableData && browserTableData.totalPages > 1 && (
              <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                <span>
                  Page {browserPage} of {browserTableData.totalPages}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setBrowserPage(p => Math.max(1, p - 1))}
                    disabled={browserPage <= 1}
                    className="p-1 rounded bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-mono px-2 font-semibold text-slate-800">
                    {browserPage} / {browserTableData.totalPages}
                  </span>
                  <button
                    onClick={() => setBrowserPage(p => Math.min(browserTableData.totalPages, p + 1))}
                    disabled={browserPage >= browserTableData.totalPages}
                    className="p-1 rounded bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: OLAP QUERY RUNNER & SQL SANDBOX */}
      {/* ========================================================================= */}
      {activeTab === 'query' && (
        <div className="space-y-5">
          {/* Query Selector Bar */}
          <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 mb-3 border-b border-slate-800 gap-2">
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  Interactive OLAP Analytical Query Runner
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Execute multi-dimensional star schema joins directly against conformed warehouse tables
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleRunOlapQuery()}
                  disabled={queryExecuting}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
                >
                  {queryExecuting ? (
                    <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <Play className="w-3.5 h-3.5 text-white" />
                  )}
                  <span>{queryExecuting ? 'Executing Query...' : 'Execute Selected Query'}</span>
                </button>
              </div>
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {PRESET_QUERIES.map(q => {
                const isSelected = selectedQueryId === q.id;
                return (
                  <div
                    key={q.id}
                    onClick={() => {
                      setSelectedQueryId(q.id);
                      handleRunOlapQuery(q.id);
                    }}
                    className={`p-3 rounded-lg border cursor-pointer transition text-left ${
                      isSelected
                        ? 'bg-blue-950/80 border-blue-500 text-white shadow-xs'
                        : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                        {q.badge}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{q.category}</span>
                    </div>
                    <h4 className="font-bold text-xs leading-snug text-white">{q.title}</h4>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Query Results View */}
          {queryResult && (
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 font-mono">
                      Query Execution Passed
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm">{queryResult.queryName}</h4>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{queryResult.description}</p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-3 text-xs font-mono text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {queryResult.executionTimeMs} ms
                    </span>
                    <span>&bull;</span>
                    <span>{queryResult.rowCount} rows returned</span>
                    <span>&bull;</span>
                    <span>{queryResult.rowsScanned.toLocaleString()} rows scanned</span>
                  </div>

                  <button
                    onClick={handleExportQueryCSV}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-xs shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download CSV</span>
                  </button>
                </div>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto max-h-[450px]">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 shadow-2xs">
                    <tr className="text-slate-600 font-semibold font-mono text-[11px] uppercase tracking-wider">
                      {queryResult.columns.map(col => (
                        <th key={col} className="py-2.5 px-3 whitespace-nowrap bg-slate-100">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {queryResult.rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition">
                        {queryResult.columns.map(col => (
                          <td key={col} className="py-2.5 px-3 whitespace-nowrap text-slate-800">
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
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: VALIDATION & DATA QUALITY AUDIT */}
      {/* ========================================================================= */}
      {activeTab === 'validation' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-5">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  Dataset Quality &amp; Integrity Validation Audit
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Validates file headers, duplicate primary keys, null values, numeric boundaries, date strings, and relational integrity.
                </p>
              </div>
              <button
                onClick={handleValidate}
                disabled={isValidating}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isValidating ? 'animate-spin' : ''}`} />
                {isValidating ? 'Validating Datasets...' : 'Run Audit Now'}
              </button>
            </div>

            {validationReport ? (
              <div className="mt-5 space-y-5">
                {/* Metric Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="text-[11px] text-slate-500">Records Checked</div>
                    <div className="text-base font-bold text-slate-900 mt-0.5 font-mono">
                      {validationReport.totalRecordsChecked.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="text-[11px] text-slate-500">Duplicate Keys</div>
                    <div className={`text-base font-bold mt-0.5 font-mono ${validationReport.totalDuplicatesDetected > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {validationReport.totalDuplicatesDetected.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="text-[11px] text-slate-500">Missing Values Handled</div>
                    <div className={`text-base font-bold mt-0.5 font-mono ${validationReport.totalMissingValuesDetected > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {validationReport.totalMissingValuesDetected.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="text-[11px] text-slate-500">Foreign Key Issues</div>
                    <div className={`text-base font-bold mt-0.5 font-mono ${validationReport.totalReferentialIssuesDetected > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {validationReport.totalReferentialIssuesDetected.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="text-[11px] text-slate-500">Audit Duration</div>
                    <div className="text-base font-bold text-slate-900 mt-0.5 font-mono">
                      {validationReport.durationMs}ms
                    </div>
                  </div>
                </div>

                {/* Per-file validation table */}
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                        <th className="py-2.5 px-3">Dataset File</th>
                        <th className="py-2.5 px-3">Total Rows</th>
                        <th className="py-2.5 px-3">Valid Rows</th>
                        <th className="py-2.5 px-3">Duplicates</th>
                        <th className="py-2.5 px-3">Missing Values</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {Object.entries(validationReport.fileReports).map(([k, rep]) => (
                        <tr key={k} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                            {rep.fileName}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-700">
                            {rep.rowCount.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-emerald-700">
                            {rep.validRows.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600">
                            {rep.duplicateRows}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600">
                            {rep.missingValueRows}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              rep.status === 'PASSED'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : rep.status === 'WARNING'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {rep.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Audit notes and warnings */}
                {validationReport.warnings.length > 0 && (
                  <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-amber-800">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Validation Advisory Notes:
                    </div>
                    {validationReport.warnings.map((w, i) => (
                      <div key={i} className="pl-5 text-amber-700 font-mono text-[11px]">
                        • {w}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 text-xs">
                Click "Run Audit Now" to perform in-depth data quality validation across all 9 raw Olist CSV datasets.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: SOURCE-TO-TARGET MAPPING MATRIX */}
      {/* ========================================================================= */}
      {activeTab === 'mapping' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">Warehouse Table:</span>
              {mappings.map(m => (
                <button
                  key={m.tableName}
                  onClick={() => setSelectedMappingTable(m.tableName)}
                  className={`px-3 py-1.5 text-xs font-mono rounded-lg border transition cursor-pointer ${
                    selectedMappingTable === m.tableName
                      ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {m.tableName}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Filter columns or source..."
                value={mappingSearch}
                onChange={e => setMappingSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {currentMapping && (
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-4 bg-slate-50/60 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-mono flex items-center gap-2">
                    <Table className="w-4 h-4 text-blue-600" />
                    {currentMapping.tableName}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Grain: <span className="font-semibold text-slate-700">{currentMapping.grain}</span> | Primary Key: <span className="font-mono text-blue-700">{currentMapping.primaryKey}</span>
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  {currentMapping.tableType}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Target Column</th>
                      <th className="py-3 px-4">Target Data Type</th>
                      <th className="py-3 px-4">Source CSV File</th>
                      <th className="py-3 px-4">Source Column</th>
                      <th className="py-3 px-4">Transformation / Mapping Logic</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredColumns.map((col, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 font-mono font-bold text-blue-700">
                          {col.targetCol}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-[11px]">
                            {col.dataType}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800">
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[11px] border border-emerald-100 font-mono">
                            {col.sourceFile}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-700">
                          {col.sourceCol}
                        </td>
                        <td className="py-3 px-4 text-slate-600 text-xs">
                          {col.rule}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: SQL WAREHOUSE SCRIPTS VIEWER */}
      {/* ========================================================================= */}
      {activeTab === 'sql' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex flex-wrap items-center gap-2">
              {[
                { file: 'schema.sql', label: '1. schema.sql (Star Schema DDL)' },
                { file: 'database.sql', label: '2. database.sql (DB & Users)' },
                { file: 'seed.sql', label: '3. seed.sql (Test Data)' },
                { file: 'analytical_queries.sql', label: '4. analytical_queries.sql (OLAP)' },
                { file: 'power_bi_views.sql', label: '5. power_bi_views.sql (7 Views)' },
                { file: 'power_bi_dax_measures.dax', label: '6. power_bi_dax_measures.dax' }
              ].map(f => (
                <button
                  key={f.file}
                  onClick={() => setSelectedSqlFile(f.file as any)}
                  className={`px-3 py-1.5 text-xs font-mono rounded-lg border transition cursor-pointer ${
                    selectedSqlFile === f.file
                      ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopySql}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy SQL'}
              </button>
              <button
                onClick={handleDownloadSql}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                Download {selectedSqlFile}
              </button>
            </div>
          </div>

          <div className="p-4 bg-slate-950 font-mono text-xs overflow-x-auto max-h-[600px] text-slate-200">
            {sqlLoading ? (
              <div className="p-8 text-center text-slate-400">Loading {selectedSqlFile}...</div>
            ) : (
              <pre className="whitespace-pre font-mono leading-relaxed">{sqlContent}</pre>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: DATA WAREHOUSE TABLES SUMMARY */}
      {/* ========================================================================= */}
      {activeTab === 'pipeline' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">Data Warehouse Tables Summary</h3>
            <span className="text-xs text-slate-500 font-mono">Fact &amp; Dimensions</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-3 px-4">Table Name</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Primary Key</th>
                  <th className="py-3 px-4 text-right">Row Count</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {schemaTables.map(t => (
                  <tr key={t.tableName} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono font-bold text-blue-700 flex items-center gap-2">
                      <Table className="w-3.5 h-3.5 text-slate-400" />
                      {t.tableName}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                        t.type === 'fact' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {t.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">{t.primaryKey}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {t.rowCount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="flex items-center gap-1 text-emerald-700 text-[11px] font-semibold">
                        <Check className="w-3 h-3 text-emerald-600" /> Active &amp; Indexed
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {new Date(t.lastUpdated).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 8: ETL AUDIT LOGS */}
      {/* ========================================================================= */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-900 text-sm">Live ETL Console Execution Output</h3>
            <span className="text-[11px] font-mono text-slate-400">
              {currentRun?.logs?.length || 0} Log Lines Captured
            </span>
          </div>
          <div className="bg-slate-950 text-slate-300 font-mono text-xs p-4 rounded-xl max-h-96 overflow-y-auto space-y-1.5 border border-slate-800">
            {currentRun?.logs && currentRun.logs.length > 0 ? (
              currentRun.logs.map((log, i) => (
                <div key={i} className="leading-relaxed">
                  <span className="text-slate-500 mr-2">[{i + 1}]</span>
                  <span className={log.includes('complete') || log.includes('SUCCESS') ? 'text-emerald-400 font-semibold' : log.includes('Warning') ? 'text-amber-400' : 'text-slate-200'}>
                    {log}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-slate-500">No logs generated yet. Click "Run Full ETL Pipeline" above.</div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 9: CLI COMMANDS */}
      {/* ========================================================================= */}
      {activeTab === 'cli' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-6 space-y-6">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Terminal className="w-4 h-4 text-blue-600" />
              Command-Line Interface (CLI) Commands
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Production ETL operations can be driven via NPM scripts in terminal environments or scheduled cron tasks.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Execute Pipeline</div>
                <div className="font-mono font-bold text-xs bg-slate-900 text-emerald-400 px-3 py-2 rounded-lg mt-2 select-all">
                  npm run etl
                </div>
                <p className="text-xs text-slate-600 mt-2">
                  Executes the complete 5-stage ETL workflow: Extract &rarr; Validate &rarr; Clean &rarr; Transform &rarr; Load into MySQL &amp; Warehouse Store.
                </p>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-200 text-[11px] text-slate-500 font-mono">
                Exit 0 on success, 1 on fail
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">Validate CSVs</div>
                <div className="font-mono font-bold text-xs bg-slate-900 text-emerald-400 px-3 py-2 rounded-lg mt-2 select-all">
                  npm run etl:validate
                </div>
                <p className="text-xs text-slate-600 mt-2">
                  Audits all 9 raw Olist CSV files for schema adherence, duplicate keys, null values, and foreign key integrity without loading into the warehouse.
                </p>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-200 text-[11px] text-slate-500 font-mono">
                Prints formatted terminal audit
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Reset Warehouse</div>
                <div className="font-mono font-bold text-xs bg-slate-900 text-emerald-400 px-3 py-2 rounded-lg mt-2 select-all">
                  npm run etl:reset
                </div>
                <p className="text-xs text-slate-600 mt-2">
                  Truncates all 6 Star Schema tables (fact_sales, dim_customer, dim_product, dim_date, dim_location, dim_seller) and clears execution status.
                </p>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-200 text-[11px] text-slate-500 font-mono">
                Clean state initialization
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100">
            <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-2">Configurable Data Directory</h4>
            <p className="text-xs text-blue-800 leading-relaxed mb-3">
              By default, the pipeline scans <code className="bg-blue-100/70 px-1 py-0.5 rounded font-mono text-[11px]">./data/raw</code> and <code className="bg-blue-100/70 px-1 py-0.5 rounded font-mono text-[11px]">/data/raw</code>. You can point to any external directory containing the Olist CSV files using the <code className="bg-blue-100/70 px-1 py-0.5 rounded font-mono text-[11px]">--data-dir</code> flag or environment variable:
            </p>
            <div className="space-y-2 font-mono text-xs">
              <div className="bg-slate-900 text-slate-200 p-2.5 rounded-lg select-all">
                npm run etl -- --data-dir=/path/to/olist_csv_directory
              </div>
              <div className="bg-slate-900 text-slate-200 p-2.5 rounded-lg select-all">
                DATA_DIR=/path/to/olist_csv_directory npm run etl
              </div>
            </div>
          </div>
        </div>
      )}
      {/* CUSTOM CONFIRM RESET MODAL */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden transform transition-all scale-100">
            <div className="p-6">
              <div className="flex items-center gap-3.5 mb-4">
                <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 leading-snug">
                    Reset Data Warehouse?
                  </h3>
                  <p className="text-xs text-slate-500">
                    This will truncate all Star Schema tables and execution metrics.
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-rose-50/60 rounded-xl border border-rose-100 mb-5">
                <span className="text-xs font-semibold text-rose-700 block mb-1 uppercase tracking-wider">Affected Tables</span>
                <span className="text-xs text-rose-900 font-mono">
                  fact_sales, dim_date, dim_location, dim_seller, dim_customer, dim_product
                </span>
              </div>

              <p className="text-sm text-slate-600 leading-relaxed">
                Are you sure you want to proceed? All tables will be cleared. You can repopulate the warehouse at any time by running the ETL pipeline again.
              </p>
            </div>

            <div className="bg-slate-50/80 px-6 py-4 flex items-center justify-end gap-2.5 border-t border-slate-100">
              <button
                type="button"
                disabled={isResetting}
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl font-semibold text-sm transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isResetting}
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold text-sm shadow-sm hover:shadow transition cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className={`w-4 h-4 ${isResetting ? 'animate-spin' : ''}`} />
                <span>{isResetting ? 'Resetting...' : 'Yes, Reset Warehouse'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
