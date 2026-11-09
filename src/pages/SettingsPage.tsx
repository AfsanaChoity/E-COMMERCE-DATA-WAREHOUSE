import React, { useState, useEffect } from 'react';
import {
  Settings,
  Database,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Server,
  Play,
  FileCode,
  ShieldCheck,
  Check
} from 'lucide-react';
import { api } from '../services/api';

export const SettingsPage: React.FC = () => {
  const [dbConfig, setDbConfig] = useState({
    host: 'localhost',
    port: 3306,
    user: 'root',
    database: 'olist_datawarehouse'
  });
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<{
    connected: boolean;
    message: string;
    timestamp: string;
  } | null>(null);

  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{
    connected: boolean;
    message: string;
    version?: string;
  } | null>(null);

  const [initLoading, setInitLoading] = useState(false);
  const [initResult, setInitResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    api.getDBSettings()
      .then(res => {
        if (res.config) {
          setDbConfig(res.config);
        }
        if (res.status) {
          setStatus(res.status);
        }
      })
      .catch(err => console.error('Error fetching DB settings:', err));
  }, []);

  const handleTestConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await api.testDBConnection({
        ...dbConfig,
        password
      });
      setTestResult(res);
    } catch (err: unknown) {
      setTestResult({
        connected: false,
        message: err instanceof Error ? err.message : String(err)
      });
    } finally {
      setTestLoading(false);
    }
  };

  const handleInitSchema = async () => {
    setInitLoading(true);
    setInitResult(null);
    try {
      const res = await api.initDBSchema();
      setInitResult(res);
    } catch (err: unknown) {
      setInitResult({
        success: false,
        message: err instanceof Error ? err.message : String(err)
      });
    } finally {
      setInitLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl animate-in fade-in duration-150">
      {/* Settings Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">System &amp; Database Settings</h2>
            <p className="text-xs text-slate-500">Configure MySQL 8.0+ connection parameters and manage warehouse schemas</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* MySQL Connection Configuration Card - 2 Cols */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-600" />
                MySQL 8.0+ Connection Parameters
              </h3>
              <p className="text-xs text-slate-500">Credentials used for Star Schema tables and OLAP analytics</p>
            </div>
            {status?.connected ? (
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" /> Connected
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                <AlertCircle className="w-3.5 h-3.5" /> Using Analytical Cache
              </span>
            )}
          </div>

          <form onSubmit={handleTestConnection} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Database Host</label>
                <input
                  type="text"
                  value={dbConfig.host}
                  onChange={e => setDbConfig({ ...dbConfig, host: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none font-mono focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Port</label>
                <input
                  type="number"
                  value={dbConfig.port}
                  onChange={e => setDbConfig({ ...dbConfig, port: parseInt(e.target.value, 10) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none font-mono focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Username</label>
                <input
                  type="text"
                  value={dbConfig.user}
                  onChange={e => setDbConfig({ ...dbConfig, user: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none font-mono focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none font-mono focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Database Name</label>
              <input
                type="text"
                value={dbConfig.database}
                onChange={e => setDbConfig({ ...dbConfig, database: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none font-mono focus:border-blue-500"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <button
                type="submit"
                disabled={testLoading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition shadow-xs disabled:opacity-60 cursor-pointer"
              >
                <Server className="w-3.5 h-3.5" />
                <span>{testLoading ? 'Testing...' : 'Test MySQL Connection'}</span>
              </button>

              <button
                type="button"
                onClick={handleInitSchema}
                disabled={initLoading}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-lg transition shadow-xs disabled:opacity-60 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{initLoading ? 'Running DDL...' : 'Initialize Star Schema Tables'}</span>
              </button>
            </div>
          </form>

          {/* Test or Init Output Message */}
          {testResult && (
            <div className={`mt-4 p-3.5 rounded-xl border text-xs ${
              testResult.connected ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              <div className="font-bold flex items-center gap-1.5">
                {testResult.connected ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
                {testResult.connected ? 'MySQL Connection Successful!' : 'Connection Attempt Failed'}
              </div>
              <p className="mt-1 text-[11px] font-mono">{testResult.message}</p>
            </div>
          )}

          {initResult && (
            <div className={`mt-4 p-3.5 rounded-xl border text-xs ${
              initResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              <div className="font-bold flex items-center gap-1.5">
                {initResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
                {initResult.message}
              </div>
            </div>
          )}
        </div>

        {/* Dataset & System Information - 1 Col */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
            <h3 className="font-bold text-slate-900 text-sm mb-3">Data Source Specification</h3>
            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex justify-between">
                <span className="text-slate-400">Dataset:</span>
                <span className="font-medium text-slate-800">Olist Brazilian E-Commerce</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Source:</span>
                <span className="font-medium text-slate-800">Kaggle Public Dataset</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Raw Files:</span>
                <span className="font-medium text-slate-800">9 CSV Datasets</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Schema Type:</span>
                <span className="font-medium text-blue-600">Star Schema (1 Fact, 5 Dim)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Surrogate Keys:</span>
                <span className="font-medium text-slate-800">Integer Auto-Increment</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
            <h3 className="font-bold text-slate-900 text-sm mb-3">Enterprise DW Architecture</h3>
            <div className="space-y-2 text-xs text-slate-600">
              <p className="leading-relaxed text-slate-500">
                Built with strict Data Warehouse engineering practices:
              </p>
              <ul className="space-y-1.5 text-slate-700">
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Kimball Dimensional Modeling</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Surrogate Keys across Dimensions</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Composite indexing on FKs &amp; measures</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Zero fake data: Olist real Brazilian records</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
