export interface DimCustomer {
  customer_key: number;
  customer_id: string;
  customer_unique_id: string;
  zip_code_prefix: string;
  city: string;
  state: string;
  segment: 'Champions' | 'Loyal' | 'Potential' | 'At Risk' | 'Hibernating';
  total_orders_count: number;
  total_lifetime_spend: number;
}

export interface DimProduct {
  product_key: number;
  product_id: string;
  category_name_pt: string;
  category_name_en: string;
  photos_qty: number;
  weight_g: number;
  dimensions_cm: string;
  avg_unit_price: number;
}

export interface DimDate {
  date_key: number; // e.g. 20180415
  full_date: string;
  day_of_month: number;
  day_of_week: number;
  day_name: string;
  month_num: number;
  month_name: string;
  quarter: number;
  year: number;
  is_weekend: boolean;
  season: string;
}

export interface DimLocation {
  location_key: number;
  zip_code_prefix: string;
  city: string;
  state: string;
  region: 'Southeast' | 'South' | 'Northeast' | 'Central-West' | 'North';
  latitude: number;
  longitude: number;
}

export interface DimSeller {
  seller_key: number;
  seller_id: string;
  zip_code_prefix: string;
  city: string;
  state: string;
  region: string;
}

export interface FactSales {
  sales_id: number;
  order_id: string;
  order_item_id: number;
  customer_key: number;
  product_key: number;
  date_key: number;
  location_key: number;
  seller_key: number;
  order_status: 'delivered' | 'shipped' | 'invoiced' | 'processing' | 'canceled';
  quantity: number;
  unit_price: number;
  freight_value: number;
  sales_amount: number;
  total_order_item_value: number;
  payment_value: number;
  review_score: number;
  // Extra attributes required by the MySQL fact_sales schema (sql/schema.sql)
  payment_installments?: number;
  payment_type?: string | null;
  order_purchase_timestamp?: string;
  order_delivered_customer_date?: string | null;
  order_estimated_delivery_date?: string | null;
  shipping_limit_date?: string | null;
}

export interface ETLStageStats {
  stage: 'extract' | 'validate' | 'clean' | 'transform' | 'load';
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  recordsIn: number;
  recordsOut: number;
  errorsCount: number;
  durationMs: number;
}

export interface ETLExecutionLog {
  id: string;
  startTime: string;
  endTime?: string;
  durationMs: number;
  status: 'SUCCESS' | 'FAILED' | 'RUNNING' | 'IDLE';
  recordsExtracted: number;
  recordsTransformed: number;
  recordsLoaded: number;
  failedRecords: number;
  stages: ETLStageStats[];
  sourceFilesDetected: string[];
  missingFiles: string[];
  message: string;
  logs: string[];
}

export interface KPICardData {
  title: string;
  value: number | string;
  rawValue?: number;
  changePercentage: number;
  trend: 'up' | 'down' | 'neutral';
  previousValue: string;
  subtext: string;
}

export interface SalesSummaryMetrics {
  totalSales: number;
  totalFreight: number;
  totalGross: number;
  totalOrders: number;
  totalUnits: number;
  aov: number;
  avgFreight: number;
  freightRatio: number;
  avgReviewScore: number;
  deliveredOrders: number;
  deliveredRevenue: number;
  canceledOrders: number;
  canceledRevenue: number;
  uniqueCustomers: number;
  uniqueProducts: number;
  uniqueSellers: number;
}

export interface MonthlySalesData {
  period: string;
  year: number;
  month: string;
  monthNum: number;
  revenue: number;
  orders: number;
  units: number;
  freight: number;
  aov: number;
  avgRating: number;
  momGrowth: number;
}

export interface QuarterlySalesData {
  quarter: string;
  revenue: number;
  orders: number;
  units: number;
  aov: number;
}

export interface YearlySalesData {
  year: number;
  revenue: number;
  orders: number;
  units: number;
  aov: number;
}

export interface DayOfWeekSalesData {
  dayOfWeek: number;
  dayName: string;
  revenue: number;
  orders: number;
  units: number;
  aov: number;
}

export interface SeasonalitySalesData {
  season: string;
  revenue: number;
  orders: number;
  aov: number;
  percentage: number;
}

export interface WeekendVsWeekdayData {
  weekday: { revenue: number; orders: number; aov: number; percentage: number };
  weekend: { revenue: number; orders: number; aov: number; percentage: number };
}

export interface StatusSalesData {
  status: string;
  orders: number;
  revenue: number;
  units: number;
  percentage: number;
}

export interface PriceBracketData {
  bracket: string;
  range: string;
  units: number;
  revenue: number;
  percentage: number;
}

export interface CategorySalesData {
  category: string;
  categoryPt: string;
  revenue: number;
  orders: number;
  units: number;
  avgPrice: number;
  percentage: number;
  cumulativePercentage: number;
}

export interface RegionalSalesData {
  region: string;
  revenue: number;
  orders: number;
  freight: number;
  freightRatio: number;
  percentage: number;
}

export interface SalesTransactionItem {
  salesId: number;
  orderId: string;
  orderItemId: number;
  date: string;
  orderStatus: string;
  category: string;
  customerCity: string;
  customerState: string;
  sellerCity: string;
  sellerState: string;
  quantity: number;
  unitPrice: number;
  freightValue: number;
  salesAmount: number;
  reviewScore: number;
}

export interface SalesAnalysisResponse {
  summary: SalesSummaryMetrics;
  monthlySales: MonthlySalesData[];
  quarterlySales: QuarterlySalesData[];
  yearlySales: YearlySalesData[];
  dayOfWeekSales: DayOfWeekSalesData[];
  seasonalitySales: SeasonalitySalesData[];
  weekendVsWeekday: WeekendVsWeekdayData;
  salesByStatus: StatusSalesData[];
  priceBrackets: PriceBracketData[];
  salesByCategory: CategorySalesData[];
  topSellingProducts: Array<{
    productId: string;
    productName: string;
    category: string;
    unitsSold: number;
    revenue: number;
    avgPrice: number;
  }>;
  salesByRegion: RegionalSalesData[];
  transactions: SalesTransactionItem[];
}

export interface ProductItemAnalysis {
  productKey: number;
  productId: string;
  categoryPt: string;
  categoryEn: string;
  photosQty: number;
  weightG: number;
  dimensions: string;
  avgPrice: number;
  ordersCount: number;
  unitsSold: number;
  totalRevenue: number;
  avgRating: number;
  avgFreight: number;
}

export interface ProductCategoryAnalysis {
  category: string;
  categoryPt: string;
  revenue: number;
  units: number;
  orders: number;
  productsCount: number;
  avgPrice: number;
  avgRating: number;
  share: number;
}

export interface ProductWeightBracket {
  bracket: string;
  range: string;
  count: number;
  revenue: number;
  units: number;
  avgFreight: number;
  percentage: number;
}

export interface ProductPhotoMetric {
  photoBracket: string;
  productsCount: number;
  unitsSold: number;
  revenue: number;
  avgPrice: number;
}

export interface ProductAnalysisResponse {
  kpis: {
    totalProducts: number;
    activeProducts: number;
    totalCategories: number;
    bestSellingProduct: string;
    bestProductRevenue: number;
    averageProductPrice: number;
    averageWeightG: number;
    averageRating: number;
  };
  products: ProductItemAnalysis[];
  categoryDistribution: ProductCategoryAnalysis[];
  weightBrackets: ProductWeightBracket[];
  photoMetrics: ProductPhotoMetric[];
  priceBrackets: Array<{
    bracket: string;
    range: string;
    productsCount: number;
    unitsSold: number;
    revenue: number;
    percentage: number;
  }>;
}

export interface CustomerProfileItem {
  customerKey: number;
  customerId: string;
  customerUniqueId: string;
  city: string;
  state: string;
  zipCode: string;
  segment: 'Champions' | 'Loyal' | 'Potential' | 'At Risk' | 'Hibernating';
  ordersCount: number;
  lifetimeSpend: number;
  avgOrderValue: number;
  firstOrderDate: string;
  lastOrderDate: string;
  recencyDays: number;
  avgRating: number;
  topCategory: string;
}

export interface CustomerSegmentMetric {
  segment: string;
  count: number;
  percentage: number;
  revenue: number;
  avgLtv: number;
  avgOrders: number;
  recencyDays: number;
  color: string;
  description: string;
  actionStrategy: string;
}

export interface CustomerStateDistribution {
  state: string;
  customerCount: number;
  percentage: number;
  totalSpend: number;
  avgSpendPerCustomer: number;
}

export interface CustomerSpendTier {
  tier: string;
  range: string;
  count: number;
  percentage: number;
  revenue: number;
  avgSpend: number;
}

export interface CustomerFrequencyMetric {
  range: string;
  count: number;
  percentage: number;
  revenue: number;
  avgSpend: number;
}

export interface CustomerAnalysisResponse {
  kpis: {
    totalCustomers: number;
    activeCustomersInFilter: number;
    newCustomers: number;
    returningCustomers: number;
    repeatPurchaseRate: number;
    avgCustomerLtv: number;
    avgOrderValue: number;
    topSegment: string;
    avgCustomerRating: number;
  };
  customerSegmentation: CustomerSegmentMetric[];
  purchaseFrequency: CustomerFrequencyMetric[];
  spendTiers: CustomerSpendTier[];
  stateDistribution: CustomerStateDistribution[];
  topCustomers: CustomerProfileItem[];
  customersList: CustomerProfileItem[];
}

export interface RegionalLogisticsMetric {
  region: string;
  regionPt: string;
  revenue: number;
  orders: number;
  customers: number;
  freight: number;
  avgFreight: number;
  freightRatio: number;
  avgDeliveryDays: number;
  onTimeDeliveryRate: number;
  avgRating: number;
  share: number;
  topCategory: string;
  color: string;
  statesList: string[];
}

export interface StateLogisticsMetric {
  state: string;
  stateName: string;
  region: string;
  revenue: number;
  orders: number;
  customers: number;
  aov: number;
  freight: number;
  avgFreight: number;
  freightRatio: number;
  avgDeliveryDays: number;
  avgRating: number;
  share: number;
}

export interface CityLogisticsMetric {
  city: string;
  state: string;
  region: string;
  revenue: number;
  orders: number;
  customers: number;
  avgFreight: number;
  latitude: number;
  longitude: number;
  avgRating: number;
  topCategory: string;
}

export interface ShippingCorridorMetric {
  corridor: string;
  originState: string;
  destinationState: string;
  isIntraState: boolean;
  orders: number;
  revenue: number;
  avgFreight: number;
  avgDeliveryDays: number;
  avgRating: number;
  share: number;
}

export interface DeliverySpeedBracketMetric {
  bracket: string;
  range: string;
  orders: number;
  percentage: number;
  avgFreight: number;
  avgRating: number;
}

export interface LocationAnalysisResponse {
  kpis: {
    totalRevenue: number;
    totalOrders: number;
    totalCustomers: number;
    activeStates: number;
    activeCities: number;
    avgFreight: number;
    freightRatio: number;
    topRegion: string;
    topRegionShare: number;
    topState: string;
    avgDeliveryDays: number;
    onTimeDeliveryRate: number;
  };
  salesByRegion: RegionalLogisticsMetric[];
  salesByState: StateLogisticsMetric[];
  topCities: CityLogisticsMetric[];
  shippingCorridors: ShippingCorridorMetric[];
  deliverySpeedBrackets: DeliverySpeedBracketMetric[];
  totalSales: number;
}

export interface DashboardResponse {
  kpis: {
    totalSales: KPICardData;
    totalOrders: KPICardData;
    totalCustomers: KPICardData;
    avgOrderValue: KPICardData;
  };
  salesTrend: Array<{
    date: string;
    monthName: string;
    revenue: number;
    orders: number;
    aov: number;
  }>;
  salesByCategory: Array<{
    category: string;
    categoryPt: string;
    revenue: number;
    orders: number;
    percentage: number;
  }>;
  topSellingProducts: Array<{
    productId: string;
    productName: string;
    category: string;
    unitsSold: number;
    revenue: number;
    avgPrice: number;
  }>;
  salesByRegion: Array<{
    region: string;
    revenue: number;
    orders: number;
    percentage: number;
  }>;
  recentOrders: Array<{
    orderId: string;
    customerCity: string;
    customerState: string;
    date: string;
    status: string;
    amount: number;
    itemsCount: number;
    category: string;
    paymentType?: string;
  }>;
  dataSource: {
    type: 'mysql' | 'warehouse_cache';
    databaseConnected: boolean;
    totalFactRows: number;
    lastUpdated: string;
  };
}

export interface FilterState {
  dateRange: 'all' | '2017' | '2018' | 'last90' | 'custom';
  startDate?: string;
  endDate?: string;
  category: string;
  region: string;
  orderStatus: string;
}

export interface StarSchemaTableMeta {
  tableName: string;
  type: 'fact' | 'dimension';
  description: string;
  rowCount: number;
  primaryKey: string;
  foreignKeys: Array<{ column: string; referencesTable: string; referencesColumn: string }>;
  columns: Array<{ name: string; type: string; isKey?: boolean; nullable: boolean; desc: string }>;
  lastUpdated: string;
}

export interface GeneratedReport {
  id: string;
  name: string;
  type: 'Sales Report' | 'Product Report' | 'Customer Report' | 'Location Report';
  generatedAt: string;
  parameters: {
    dateRange: string;
    category?: string;
    region?: string;
  };
  summaryMetrics: Record<string, string | number>;
  recordCount: number;
  breakdown?: Array<Record<string, string | number>>;
}
