import { CleanedDataset } from './clean';
import {
  DimCustomer,
  DimProduct,
  DimDate,
  DimLocation,
  DimSeller,
  FactSales
} from '../types';

export interface TransformedStarSchema {
  dimCustomer: DimCustomer[];
  dimProduct: DimProduct[];
  dimDate: DimDate[];
  dimLocation: DimLocation[];
  dimSeller: DimSeller[];
  factSales: FactSales[];
  logs: string[];
  durationMs: number;
}

/**
 * Maps a Brazilian state code (UF) to its official IBGE Macro-Region
 */
export function getBrazilianRegion(state: string): DimLocation['region'] {
  const s = (state || '').toUpperCase().trim();
  if (['SP', 'RJ', 'MG', 'ES'].includes(s)) return 'Southeast';
  if (['RS', 'SC', 'PR'].includes(s)) return 'South';
  if (['BA', 'PE', 'CE', 'RN', 'PB', 'MA', 'AL', 'SE', 'PI'].includes(s)) return 'Northeast';
  if (['DF', 'GO', 'MT', 'MS'].includes(s)) return 'Central-West';
  return 'North'; // AM, PA, RO, TO, AC, AP, RR
}

/**
 * Formats a city name to clean Title Case
 */
function toTitleCase(str: string): string {
  if (!str) return 'Sao Paulo';
  return str
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Stage 4: TRANSFORM
 * Models and populates the Kimball Star Schema:
 * - dim_location
 * - dim_seller
 * - dim_product (with Portuguese to English category translation)
 * - dim_date (conformed calendar dimension generation)
 * - dim_customer (with RFM behavioral segmentation)
 * - fact_sales (grain: order line item)
 */
export function transformToStarSchema(cleaned: CleanedDataset): TransformedStarSchema {
  const startTime = Date.now();
  const logs: string[] = [];
  logs.push('ETL [Transform]: Transforming cleansed datasets into Star Schema dimensional structures...');

  // =========================================================================
  // 1. LOCATION DIMENSION LOADING (dim_location)
  // =========================================================================
  const locationMap = new Map<string, DimLocation>();
  let nextLocationKey = 1;

  function getOrCreateLocationKey(zip: string, city: string, state: string): number {
    const normZip = (zip || '01001').padStart(5, '0');
    const normState = (state || 'SP').toUpperCase();
    const normCity = toTitleCase(city || 'sao paulo');
    const key = `${normZip}_${normCity}_${normState}`;

    if (locationMap.has(key)) {
      return locationMap.get(key)!.location_key;
    }

    const region = getBrazilianRegion(normState);
    const geo = cleaned.geolocation.get(normZip);

    const loc: DimLocation = {
      location_key: nextLocationKey++,
      zip_code_prefix: normZip,
      city: normCity,
      state: normState,
      region,
      latitude: geo ? geo.lat : -23.5505,
      longitude: geo ? geo.lng : -46.6333
    };

    locationMap.set(key, loc);
    return loc.location_key;
  }

  // Pre-seed locations from customers and sellers
  cleaned.customers.forEach(c => {
    getOrCreateLocationKey(c.zipCodePrefix, c.city, c.state);
  });
  cleaned.sellers.forEach(s => {
    getOrCreateLocationKey(s.zipCodePrefix, s.city, s.state);
  });

  logs.push(`[Transform] dim_location: Built ${locationMap.size.toLocaleString()} unique postal hub entities.`);

  // =========================================================================
  // 2. SELLER DIMENSION LOADING (dim_seller)
  // =========================================================================
  const sellerMap = new Map<string, DimSeller>();
  let nextSellerKey = 1;

  cleaned.sellers.forEach(s => {
    if (!sellerMap.has(s.sellerId)) {
      sellerMap.set(s.sellerId, {
        seller_key: nextSellerKey++,
        seller_id: s.sellerId,
        zip_code_prefix: s.zipCodePrefix,
        city: toTitleCase(s.city),
        state: s.state,
        region: getBrazilianRegion(s.state)
      });
    }
  });

  // Default fallback merchant
  if (!sellerMap.has('seller_unknown')) {
    sellerMap.set('seller_unknown', {
      seller_key: nextSellerKey++,
      seller_id: 'seller_unknown',
      zip_code_prefix: '01001',
      city: 'Sao Paulo',
      state: 'SP',
      region: 'Southeast'
    });
  }

  logs.push(`[Transform] dim_seller: Loaded ${sellerMap.size.toLocaleString()} registered merchants.`);

  // =========================================================================
  // 3. PRODUCT DIMENSION LOADING (dim_product & category translation)
  // =========================================================================
  const productPriceSums = new Map<string, { total: number; count: number }>();
  cleaned.orderItems.forEach(item => {
    const current = productPriceSums.get(item.productId) || { total: 0, count: 0 };
    current.total += item.price;
    current.count += 1;
    productPriceSums.set(item.productId, current);
  });

  const productMap = new Map<string, DimProduct>();
  let nextProductKey = 1;

  cleaned.products.forEach(p => {
    // Category Translation
    const rawCat = p.categoryPt;
    const translated = cleaned.categoryTranslation[rawCat];
    const categoryEn = translated ? translated : rawCat.replace(/_/g, ' ');

    const priceInfo = productPriceSums.get(p.productId) || { total: 100, count: 1 };
    const avgPrice = Number((priceInfo.total / priceInfo.count).toFixed(2));

    productMap.set(p.productId, {
      product_key: nextProductKey++,
      product_id: p.productId,
      category_name_pt: rawCat,
      category_name_en: categoryEn,
      photos_qty: p.photosQty,
      weight_g: p.weightG,
      dimensions_cm: p.dimensionsCm,
      avg_unit_price: avgPrice
    });
  });

  logs.push(`[Transform] dim_product: Loaded ${productMap.size.toLocaleString()} catalog products with translated categories.`);

  // =========================================================================
  // 4. DATE DIMENSION GENERATION (dim_date)
  // =========================================================================
  const dateMap = new Map<number, DimDate>();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  function getOrCreateDateKey(timestampStr?: string): number {
    let validDate: Date;
    if (timestampStr) {
      const parsed = Date.parse(timestampStr);
      validDate = isNaN(parsed) ? new Date('2018-05-15T12:00:00Z') : new Date(parsed);
    } else {
      validDate = new Date('2018-05-15T12:00:00Z');
    }

    const year = validDate.getUTCFullYear();
    const month = validDate.getUTCMonth() + 1;
    const day = validDate.getUTCDate();
    const dateKey = year * 10000 + month * 100 + day;

    if (!dateMap.has(dateKey)) {
      const dayOfWeek = validDate.getUTCDay();
      const quarter = Math.ceil(month / 3);
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      // Brazilian Southern Hemisphere seasons
      let season = 'Autumn';
      if (month === 12 || month <= 2) season = 'Summer';
      else if (month >= 3 && month <= 5) season = 'Autumn';
      else if (month >= 6 && month <= 8) season = 'Winter';
      else season = 'Spring';

      const pad = (n: number) => String(n).padStart(2, '0');
      const fullDateStr = `${year}-${pad(month)}-${pad(day)}`;

      dateMap.set(dateKey, {
        date_key: dateKey,
        full_date: fullDateStr,
        day_of_month: day,
        day_of_week: dayOfWeek,
        day_name: dayNames[dayOfWeek],
        month_num: month,
        month_name: monthNames[month - 1],
        quarter,
        year,
        is_weekend: isWeekend,
        season
      });
    }

    return dateKey;
  }

  // Pre-seed date dimension for common range 2016-2018
  const baseDates = ['2016-09-04', '2017-01-01', '2017-07-01', '2018-01-01', '2018-08-30'];
  baseDates.forEach(bd => getOrCreateDateKey(bd));

  // =========================================================================
  // 5. CUSTOMER DIMENSION LOADING (dim_customer & RFM segmentation)
  // =========================================================================
  const orderMap = new Map<string, (typeof cleaned.orders)[0]>();
  cleaned.orders.forEach(o => orderMap.set(o.orderId, o));

  const customerSpending = new Map<string, { totalSpend: number; orderCount: number; lastDate: number }>();
  cleaned.orderItems.forEach(item => {
    const order = orderMap.get(item.orderId);
    if (!order) return;
    const current = customerSpending.get(order.customerId) || { totalSpend: 0, orderCount: 0, lastDate: 0 };
    current.totalSpend += item.price;
    current.orderCount += 1;
    customerSpending.set(order.customerId, current);
  });

  const customerMap = new Map<string, DimCustomer>();
  let nextCustomerKey = 1;

  cleaned.customers.forEach(c => {
    const spending = customerSpending.get(c.customerId) || { totalSpend: 0, orderCount: 1, lastDate: 0 };
    let segment: DimCustomer['segment'] = 'Hibernating';

    // RFM Segmentation Matrix
    if (spending.totalSpend > 400 || spending.orderCount >= 3) {
      segment = 'Champions';
    } else if (spending.totalSpend > 200 || spending.orderCount >= 2) {
      segment = 'Loyal';
    } else if (spending.totalSpend > 100) {
      segment = 'Potential';
    } else if (spending.totalSpend > 50) {
      segment = 'At Risk';
    } else {
      segment = 'Hibernating';
    }

    customerMap.set(c.customerId, {
      customer_key: nextCustomerKey++,
      customer_id: c.customerId,
      customer_unique_id: c.customerUniqueId,
      zip_code_prefix: c.zipCodePrefix,
      city: toTitleCase(c.city),
      state: c.state,
      segment,
      total_orders_count: spending.orderCount,
      total_lifetime_spend: Number(spending.totalSpend.toFixed(2))
    });
  });

  logs.push(`[Transform] dim_customer: Loaded ${customerMap.size.toLocaleString()} customer profiles with RFM segments.`);

  // =========================================================================
  // 6. FACT SALES GENERATION (fact_sales)
  // =========================================================================
  const factSales: FactSales[] = [];
  let nextSalesId = 1;

  cleaned.orderItems.forEach(item => {
    const order = orderMap.get(item.orderId);
    if (!order) return;

    let customer = customerMap.get(order.customerId);
    if (!customer) {
      const fallbackCustomer: DimCustomer = {
        customer_key: nextCustomerKey++,
        customer_id: order.customerId,
        customer_unique_id: order.customerId,
        zip_code_prefix: '01001',
        city: 'Sao Paulo',
        state: 'SP',
        segment: 'Potential',
        total_orders_count: 1,
        total_lifetime_spend: item.price
      };
      customer = fallbackCustomer;
      customerMap.set(order.customerId, fallbackCustomer);
    }

    let product = productMap.get(item.productId);
    if (!product) {
      product = {
        product_key: nextProductKey++,
        product_id: item.productId,
        category_name_pt: 'outros',
        category_name_en: 'others',
        photos_qty: 1,
        weight_g: 500,
        dimensions_cm: '10x10x10',
        avg_unit_price: item.price
      };
      productMap.set(item.productId, product);
    }

    let seller = sellerMap.get(item.sellerId);
    if (!seller) {
      seller = sellerMap.get('seller_unknown')!;
    }

    const dateKey = getOrCreateDateKey(order.purchaseTimestamp);
    const locKey = getOrCreateLocationKey(customer.zip_code_prefix, customer.city, customer.state);

    const quantity = 1;
    const unitPrice = Number(item.price.toFixed(2));
    const freightValue = Number(item.freightValue.toFixed(2));
    const salesAmount = Number((unitPrice * quantity).toFixed(2));
    const totalItemVal = Number((salesAmount + freightValue).toFixed(2));

    const payment = cleaned.orderPayments.get(order.orderId);
    const review = cleaned.orderReviews.get(order.orderId);

    factSales.push({
      sales_id: nextSalesId++,
      order_id: order.orderId,
      order_item_id: item.orderItemId,
      customer_key: customer.customer_key,
      product_key: product.product_key,
      date_key: dateKey,
      location_key: locKey,
      seller_key: seller.seller_key,
      order_status: order.orderStatus,
      quantity,
      unit_price: unitPrice,
      freight_value: freightValue,
      sales_amount: salesAmount,
      total_order_item_value: totalItemVal,
      payment_value: payment ? Number(payment.paymentValue.toFixed(2)) : totalItemVal,
      review_score: review ? review.reviewScore : 5,
      payment_installments: payment ? Math.max(1, payment.installments || 1) : 1,
      payment_type: payment ? payment.paymentType : null,
      order_purchase_timestamp: order.purchaseTimestamp,
      order_delivered_customer_date: order.deliveredCustomerDate || null,
      order_estimated_delivery_date: order.estimatedDeliveryDate || null,
      shipping_limit_date: item.shippingLimitDate || null
    });
  });

  const dimCustomer = Array.from(customerMap.values());
  const dimProduct = Array.from(productMap.values());
  const dimDate = Array.from(dateMap.values()).sort((a, b) => a.date_key - b.date_key);
  const dimLocation = Array.from(locationMap.values());
  const dimSeller = Array.from(sellerMap.values());

  const durationMs = Date.now() - startTime;
  logs.push(`ETL [Transform]: Successfully transformed Star Schema in ${durationMs}ms:`);
  logs.push(`- fact_sales: ${factSales.length.toLocaleString()} rows`);
  logs.push(`- dim_customer: ${dimCustomer.length.toLocaleString()} rows`);
  logs.push(`- dim_product: ${dimProduct.length.toLocaleString()} rows`);
  logs.push(`- dim_date: ${dimDate.length.toLocaleString()} rows`);
  logs.push(`- dim_location: ${dimLocation.length.toLocaleString()} rows`);
  logs.push(`- dim_seller: ${dimSeller.length.toLocaleString()} rows`);

  return {
    dimCustomer,
    dimProduct,
    dimDate,
    dimLocation,
    dimSeller,
    factSales,
    logs,
    durationMs
  };
}
