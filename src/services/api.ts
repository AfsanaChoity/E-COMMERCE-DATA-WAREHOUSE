import {
  DashboardResponse,
  FilterState,
  ETLExecutionLog,
  StarSchemaTableMeta,
  GeneratedReport,
  SalesAnalysisResponse,
  ProductAnalysisResponse,
  CustomerAnalysisResponse,
  LocationAnalysisResponse
} from '../types';

function buildQuery(filters?: Partial<FilterState>): string {
  if (!filters) return '';
  const params = new URLSearchParams();
  if (filters.dateRange) params.append('dateRange', filters.dateRange);
  if (filters.category && filters.category !== 'all') params.append('category', filters.category);
  if (filters.region && filters.region !== 'all') params.append('region', filters.region);
  if (filters.orderStatus && filters.orderStatus !== 'all') params.append('orderStatus', filters.orderStatus);
  const q = params.toString();
  return q ? `?${q}` : '';
}

export const api = {
  async getDashboard(filters?: Partial<FilterState>): Promise<DashboardResponse> {
    const res = await fetch(`/api/dashboard${buildQuery(filters)}`);
    if (!res.ok) throw new Error(`Dashboard fetch error: ${res.statusText}`);
    return res.json();
  },

  async getSales(filters?: Partial<FilterState>): Promise<SalesAnalysisResponse> {
    const res = await fetch(`/api/sales${buildQuery(filters)}`);
    if (!res.ok) throw new Error(`Sales fetch error: ${res.statusText}`);
    return res.json();
  },

  async getProducts(filters?: Partial<FilterState>): Promise<ProductAnalysisResponse> {
    const res = await fetch(`/api/products${buildQuery(filters)}`);
    if (!res.ok) throw new Error(`Products fetch error: ${res.statusText}`);
    return res.json();
  },

  async getCustomers(filters?: Partial<FilterState>): Promise<CustomerAnalysisResponse> {
    const res = await fetch(`/api/customers${buildQuery(filters)}`);
    if (!res.ok) throw new Error(`Customers fetch error: ${res.statusText}`);
    return res.json();
  },

  async getLocations(filters?: Partial<FilterState>): Promise<LocationAnalysisResponse> {
    const res = await fetch(`/api/locations${buildQuery(filters)}`);
    if (!res.ok) throw new Error(`Locations fetch error: ${res.statusText}`);
    return res.json();
  },

  async getReports(): Promise<{ reports: GeneratedReport[] }> {
    const res = await fetch('/api/reports');
    if (!res.ok) throw new Error(`Reports fetch error: ${res.statusText}`);
    return res.json();
  },

  async generateReport(payload: {
    name?: string;
    type: string;
    dateRange: string;
    category?: string;
    region?: string;
  }): Promise<{ success: boolean; report: GeneratedReport }> {
    const res = await fetch('/api/reports/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`Report generation error: ${res.statusText}`);
    return res.json();
  },

  async deleteReport(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/reports/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error(`Report deletion error: ${res.statusText}`);
    return res.json();
  },

  async getETLStatus(): Promise<{
    currentLog: ETLExecutionLog | null;
    history: ETLExecutionLog[];
    sourceDir: string;
  }> {
    const res = await fetch('/api/etl/status');
    if (!res.ok) throw new Error(`ETL status error: ${res.statusText}`);
    return res.json();
  },

  async runETL(dataDir?: string): Promise<{ success: boolean; result: ETLExecutionLog }> {
    const res = await fetch('/api/etl/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataDir })
    });
    if (!res.ok) throw new Error(`ETL trigger error: ${res.statusText}`);
    return res.json();
  },

  async validateETL(dataDir?: string): Promise<{
    success: boolean;
    validation: any;
    sourceDir: string;
    sourceFilesDetected: string[];
    missingFiles: string[];
    totalExtracted: number;
    durationMs: number;
  }> {
    const res = await fetch('/api/etl/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataDir })
    });
    if (!res.ok) throw new Error(`Validation error: ${res.statusText}`);
    return res.json();
  },

  async resetWarehouse(): Promise<{
    success: boolean;
    message: string;
    mysqlReset: boolean;
    clearedTables: string[];
    durationMs: number;
  }> {
    const res = await fetch('/api/etl/reset', { method: 'POST' });
    if (!res.ok) throw new Error(`Reset error: ${res.statusText}`);
    return res.json();
  },

  async getWarehouseSchema(): Promise<{ tables: StarSchemaTableMeta[] }> {
    const res = await fetch('/api/warehouse/schema');
    if (!res.ok) throw new Error(`Schema error: ${res.statusText}`);
    return res.json();
  },

  async getWarehouseTableData(tableName: string, page = 1, limit = 20, search = ''): Promise<{
    success: boolean;
    tableName: string;
    totalRows: number;
    page: number;
    limit: number;
    totalPages: number;
    columns: string[];
    rows: Record<string, any>[];
  }> {
    const query = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      search
    });
    const res = await fetch(`/api/warehouse/table/${tableName}?${query.toString()}`);
    if (!res.ok) throw new Error(`Table data error: ${res.statusText}`);
    return res.json();
  },

  async executeWarehouseQuery(queryId: string): Promise<{
    success: boolean;
    queryId: string;
    queryName: string;
    description: string;
    columns: string[];
    rows: Record<string, any>[];
    rowCount: number;
    rowsScanned: number;
    executionTimeMs: number;
  }> {
    const res = await fetch('/api/warehouse/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queryId })
    });
    if (!res.ok) throw new Error(`Query execution error: ${res.statusText}`);
    return res.json();
  },

  async getDBSettings(): Promise<{
    config: { host: string; port: number; user: string; database: string };
    status: { connected: boolean; message: string; timestamp: string };
  }> {
    const res = await fetch('/api/settings/db');
    if (!res.ok) throw new Error(`DB settings error: ${res.statusText}`);
    return res.json();
  },

  async testDBConnection(creds: {
    host: string;
    port: string | number;
    user: string;
    password?: string;
    database: string;
  }): Promise<{ connected: boolean; message: string; version?: string }> {
    const res = await fetch('/api/settings/db/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(creds)
    });
    return res.json();
  },

  async initDBSchema(): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/settings/db/init', { method: 'POST' });
    return res.json();
  },

  async getSQLFile(file: string): Promise<string> {
    const res = await fetch(`/api/warehouse/sql/${file}`);
    if (!res.ok) throw new Error(`Failed to load ${file}: ${res.statusText}`);
    return res.text();
  },

  async getPowerBIGuide(): Promise<string> {
    const res = await fetch('/api/powerbi/guide');
    if (!res.ok) throw new Error(`Failed to load Power BI guide: ${res.statusText}`);
    return res.text();
  },

  async getSourceMapping(): Promise<{
    mappings: Array<{
      tableName: string;
      tableType: string;
      grain: string;
      primaryKey: string;
      columns: Array<{
        targetCol: string;
        sourceFile: string;
        sourceCol: string;
        dataType: string;
        rule: string;
      }>;
    }>;
  }> {
    const res = await fetch('/api/warehouse/mapping');
    if (!res.ok) throw new Error(`Failed to load mapping: ${res.statusText}`);
    return res.json();
  }
};
