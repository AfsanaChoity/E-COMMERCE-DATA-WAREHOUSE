import React, { useState } from 'react';
import { Database, Key, ArrowRight, Table, Layers } from 'lucide-react';
import { StarSchemaTableMeta } from '../types';

interface StarSchemaVisualizerProps {
  tables?: StarSchemaTableMeta[];
}

export const StarSchemaVisualizer: React.FC<StarSchemaVisualizerProps> = ({ tables = [] }) => {
  const [selectedTable, setSelectedTable] = useState<string>('fact_sales');

  const factTable = tables.find(t => t.tableName === 'fact_sales');
  const dimCustomer = tables.find(t => t.tableName === 'dim_customer');
  const dimProduct = tables.find(t => t.tableName === 'dim_product');
  const dimDate = tables.find(t => t.tableName === 'dim_date');
  const dimLocation = tables.find(t => t.tableName === 'dim_location');
  const dimSeller = tables.find(t => t.tableName === 'dim_seller');

  const activeTableMeta = tables.find(t => t.tableName === selectedTable) || factTable;

  const dimensionNodes = [
    { table: dimCustomer, name: 'dim_customer', label: 'Customer Dimension', fk: 'customer_key', color: 'border-emerald-500 bg-emerald-50/50 text-emerald-900' },
    { table: dimProduct, name: 'dim_product', label: 'Product Dimension', fk: 'product_key', color: 'border-purple-500 bg-purple-50/50 text-purple-900' },
    { table: dimDate, name: 'dim_date', label: 'Date Dimension', fk: 'date_key', color: 'border-amber-500 bg-amber-50/50 text-amber-900' },
    { table: dimLocation, name: 'dim_location', label: 'Location Dimension', fk: 'location_key', color: 'border-teal-500 bg-teal-50/50 text-teal-900' },
    { table: dimSeller, name: 'dim_seller', label: 'Seller Dimension', fk: 'seller_key', color: 'border-indigo-500 bg-indigo-50/50 text-indigo-900' }
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-4 mb-6 border-b border-slate-100">
        <div>
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            Interactive Star Schema ERD Architecture
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Academic Data Warehouse structure showing central transactional fact table and surrounding conformed dimensions.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded font-semibold">1 Central Fact</span>
          <span className="text-slate-400">+</span>
          <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded font-semibold">5 Dimensions</span>
        </div>
      </div>

      {/* ERD Diagram Canvas */}
      <div className="relative bg-slate-950 rounded-xl p-6 border border-slate-800 overflow-hidden text-slate-200">
        {/* Background grid pattern */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px]"></div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          {/* Left Dimensions */}
          <div className="space-y-4">
            {dimensionNodes.slice(0, 3).map(node => (
              <div
                key={node.name}
                onClick={() => setSelectedTable(node.name)}
                className={`cursor-pointer transition-all duration-200 p-4 rounded-xl border-2 bg-slate-900/90 hover:bg-slate-800 ${
                  selectedTable === node.name
                    ? 'border-blue-400 shadow-lg shadow-blue-500/20 scale-[1.02]'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Table className="w-4 h-4 text-slate-400" />
                    <span className="font-mono font-bold text-sm text-white">{node.name}</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                    1 : N
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 space-y-1 font-mono">
                  <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
                    <Key className="w-3 h-3" /> PK: {node.table?.primaryKey || `${node.name}_key`}
                  </div>
                  <div className="text-slate-400 truncate">
                    Rows: {node.table?.rowCount.toLocaleString() || 0}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Central Fact Table */}
          <div className="relative">
            <div
              onClick={() => setSelectedTable('fact_sales')}
              className={`cursor-pointer transition-all duration-200 p-5 rounded-xl border-2 bg-slate-900 shadow-2xl ${
                selectedTable === 'fact_sales'
                  ? 'border-blue-500 shadow-blue-500/30 scale-[1.03]'
                  : 'border-blue-500/60 hover:border-blue-400'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center text-white">
                    <Database className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="font-mono font-bold text-base text-white">fact_sales</h4>
                    <span className="text-[10px] text-blue-400 uppercase tracking-wider font-semibold">Central Fact Table</span>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold bg-blue-900/60 text-blue-300 px-2.5 py-1 rounded-md border border-blue-700">
                  {factTable?.rowCount.toLocaleString() || 0} Rows
                </span>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="text-[11px] font-semibold text-slate-400 uppercase">Primary &amp; Foreign Keys:</div>
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <span className="text-amber-400 flex items-center gap-1">
                    <Key className="w-3 h-3" /> sales_id (PK)
                  </span>
                  <span className="text-blue-300">order_id (Degenerate)</span>
                  <span className="text-emerald-400">customer_key (FK)</span>
                  <span className="text-purple-400">product_key (FK)</span>
                  <span className="text-amber-300">date_key (FK)</span>
                  <span className="text-teal-400">location_key (FK)</span>
                  <span className="text-indigo-400">seller_key (FK)</span>
                  <span className="text-slate-400">order_status</span>
                </div>

                <div className="pt-2 border-t border-slate-800 text-[11px] font-semibold text-slate-400 uppercase">
                  Additive Measures:
                </div>
                <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-300">
                  <span>• quantity</span>
                  <span>• unit_price</span>
                  <span>• freight_value</span>
                  <span className="text-emerald-400 font-bold">• sales_amount</span>
                  <span>• payment_value</span>
                  <span>• review_score</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Dimensions */}
          <div className="space-y-4">
            {dimensionNodes.slice(3).map(node => (
              <div
                key={node.name}
                onClick={() => setSelectedTable(node.name)}
                className={`cursor-pointer transition-all duration-200 p-4 rounded-xl border-2 bg-slate-900/90 hover:bg-slate-800 ${
                  selectedTable === node.name
                    ? 'border-blue-400 shadow-lg shadow-blue-500/20 scale-[1.02]'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Table className="w-4 h-4 text-slate-400" />
                    <span className="font-mono font-bold text-sm text-white">{node.name}</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                    1 : N
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 space-y-1 font-mono">
                  <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
                    <Key className="w-3 h-3" /> PK: {node.table?.primaryKey || `${node.name}_key`}
                  </div>
                  <div className="text-slate-400 truncate">
                    Rows: {node.table?.rowCount.toLocaleString() || 0}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Selected Table Schema Inspector */}
      {activeTableMeta && (
        <div className="mt-6 border border-slate-200 rounded-xl p-5 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 mb-4 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-base text-slate-900">{activeTableMeta.tableName}</span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full uppercase ${
                  activeTableMeta.type === 'fact' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {activeTableMeta.type} table
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">{activeTableMeta.description}</p>
            </div>
            <div className="text-xs font-mono text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg">
              Total Rows: <span className="font-bold text-slate-900">{activeTableMeta.rowCount.toLocaleString()}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <th className="py-2.5 px-3">Column Name</th>
                  <th className="py-2.5 px-3">Data Type</th>
                  <th className="py-2.5 px-3">Constraint / Key</th>
                  <th className="py-2.5 px-3">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 bg-white font-mono text-[11px]">
                {activeTableMeta.columns.map(col => (
                  <tr key={col.name} className="hover:bg-slate-50/80">
                    <td className="py-2 px-3 font-semibold text-slate-900 flex items-center gap-1.5">
                      {col.isKey && <Key className="w-3 h-3 text-amber-500 shrink-0" />}
                      {col.name}
                    </td>
                    <td className="py-2 px-3 text-blue-600 font-semibold">{col.type}</td>
                    <td className="py-2 px-3">
                      {col.isKey ? (
                        <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">PRIMARY KEY</span>
                      ) : col.name.endsWith('_key') ? (
                        <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">FOREIGN KEY</span>
                      ) : col.nullable ? (
                        <span className="text-slate-400">NULLABLE</span>
                      ) : (
                        <span className="text-slate-600">NOT NULL</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-slate-600 font-sans">{col.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
