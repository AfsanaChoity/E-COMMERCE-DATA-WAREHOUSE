import React, { useState, useEffect } from 'react';
import { Sidebar, ActivePage } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardPage } from './pages/DashboardPage';
import { SalesAnalysisPage } from './pages/SalesAnalysisPage';
import { ProductAnalysisPage } from './pages/ProductAnalysisPage';
import { CustomerAnalysisPage } from './pages/CustomerAnalysisPage';
import { LocationAnalysisPage } from './pages/LocationAnalysisPage';
import { ReportsPage } from './pages/ReportsPage';
import { DataWarehousePage } from './pages/DataWarehousePage';
import { FilterState } from './types';
import { api } from './services/api';

export function App() {
  const [activePage, setActivePage] = useState<ActivePage>('dashboard');
  const [filters, setFilters] = useState<FilterState>({
    dateRange: 'all',
    category: 'all',
    region: 'all',
    orderStatus: 'all'
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dbConnected, setDbConnected] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);

  // Check DB status and total records count
  useEffect(() => {
    api.getDBSettings()
      .then(res => {
        setDbConnected(res.status?.connected || false);
      })
      .catch(() => setDbConnected(false));

    api.getWarehouseSchema()
      .then(res => {
        const fact = res.tables.find(t => t.tableName === 'fact_sales');
        if (fact) setTotalRecords(fact.rowCount);
      })
      .catch(() => {});
  }, [refreshTrigger]);

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setRefreshTrigger(prev => prev + 1);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  const pageTitles: Record<ActivePage, string> = {
    dashboard: 'Executive BI Dashboard',
    sales: 'Sales & Revenue Analysis',
    products: 'Product Catalog Performance',
    customers: 'Customer Segmentation & Behavior',
    locations: 'Geographic Logistics & Delivery',
    reports: 'Analytical Reports Repository',
    warehouse: 'ETL Pipeline & Star Schema Data Warehouse'
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 font-sans text-slate-800">
      {/* Dark Navy Sidebar */}
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        dbConnected={dbConnected}
        totalRecords={totalRecords}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          pageTitle={pageTitles[activePage]}
          filters={filters}
          onFilterChange={handleFilterChange}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />

        {/* Scrollable Workspace */}
        <main className="flex-1 overflow-y-auto p-6 bg-[#f8fafc]">
          {activePage === 'dashboard' && (
            <DashboardPage
              filters={filters}
              onFilterChange={handleFilterChange}
              refreshTrigger={refreshTrigger}
            />
          )}

          {activePage === 'sales' && (
            <SalesAnalysisPage
              filters={filters}
              onFilterChange={handleFilterChange}
              refreshTrigger={refreshTrigger}
            />
          )}

          {activePage === 'products' && (
            <ProductAnalysisPage
              filters={filters}
              onFilterChange={handleFilterChange}
              refreshTrigger={refreshTrigger}
            />
          )}

          {activePage === 'customers' && (
            <CustomerAnalysisPage
              filters={filters}
              onFilterChange={handleFilterChange}
              refreshTrigger={refreshTrigger}
            />
          )}

          {activePage === 'locations' && (
            <LocationAnalysisPage
              filters={filters}
              onFilterChange={handleFilterChange}
              refreshTrigger={refreshTrigger}
            />
          )}

          {activePage === 'reports' && <ReportsPage />}

          {activePage === 'warehouse' && <DataWarehousePage />}
        </main>
      </div>
    </div>
  );
}

export default App;
