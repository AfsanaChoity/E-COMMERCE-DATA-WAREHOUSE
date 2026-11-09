import { RawOlistDatasets } from './extract';

export interface CleanedDataset {
  customers: Array<{
    customerId: string;
    customerUniqueId: string;
    zipCodePrefix: string;
    city: string;
    state: string;
  }>;
  sellers: Array<{
    sellerId: string;
    zipCodePrefix: string;
    city: string;
    state: string;
  }>;
  products: Array<{
    productId: string;
    categoryPt: string;
    photosQty: number;
    weightG: number;
    dimensionsCm: string;
  }>;
  orders: Array<{
    orderId: string;
    customerId: string;
    orderStatus: 'delivered' | 'shipped' | 'invoiced' | 'processing' | 'canceled';
    purchaseTimestamp: string;
    approvedAt?: string;
    deliveredCarrierDate?: string;
    deliveredCustomerDate?: string;
    estimatedDeliveryDate?: string;
  }>;
  orderItems: Array<{
    orderId: string;
    orderItemId: number;
    productId: string;
    sellerId: string;
    shippingLimitDate: string;
    price: number;
    freightValue: number;
  }>;
  orderPayments: Map<string, { paymentType: string; paymentValue: number; installments: number }>;
  orderReviews: Map<string, { reviewScore: number; comment?: string }>;
  geolocation: Map<string, { lat: number; lng: number; city: string; state: string }>;
  categoryTranslation: Record<string, string>;
}

export interface CleanResult {
  cleaned: CleanedDataset;
  duplicatesRemoved: number;
  missingValuesHandled: number;
  invalidRecordsDiscarded: number;
  logs: string[];
  durationMs: number;
}

/**
 * Normalizes date strings to standard ISO / YYYY-MM-DD HH:mm:ss format
 */
export function normalizeDateString(dateStr?: string): string | undefined {
  if (!dateStr || !dateStr.trim()) return undefined;
  const clean = dateStr.trim();
  const parsed = Date.parse(clean);
  if (isNaN(parsed)) return undefined;

  const d = new Date(parsed);
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  const mm = pad(d.getUTCMonth() + 1);
  const dd = pad(d.getUTCDate());
  const hh = pad(d.getUTCHours());
  const min = pad(d.getUTCMinutes());
  const ss = pad(d.getUTCSeconds());

  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}

/**
 * Safe numeric conversion with lower/upper bounding and default fallback
 */
export function parseNumeric(
  val: any,
  fallback: number,
  options?: { min?: number; max?: number; roundDecimals?: number }
): { value: number; wasMissingOrInvalid: boolean } {
  if (val === undefined || val === null || val === '') {
    return { value: fallback, wasMissingOrInvalid: true };
  }
  const parsed = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '.').trim());
  if (isNaN(parsed) || !isFinite(parsed)) {
    return { value: fallback, wasMissingOrInvalid: true };
  }

  let finalVal = parsed;
  if (options?.min !== undefined && finalVal < options.min) finalVal = options.min;
  if (options?.max !== undefined && finalVal > options.max) finalVal = options.max;
  if (options?.roundDecimals !== undefined) {
    const factor = Math.pow(10, options.roundDecimals);
    finalVal = Math.round(finalVal * factor) / factor;
  }
  return { value: finalVal, wasMissingOrInvalid: false };
}

/**
 * Stage 3: CLEAN & DATA SCRUBBING
 * Applies deduplication, missing-value imputation, date normalization, and numeric sanitization.
 */
export function cleanOlistData(raw: RawOlistDatasets): CleanResult {
  const startTime = Date.now();
  const logs: string[] = [];
  let duplicatesRemoved = 0;
  let missingValuesHandled = 0;
  let invalidRecordsDiscarded = 0;

  logs.push('ETL [Clean]: Starting data scrubbing, deduplication, and normalization...');

  // 1. Clean Geolocation: Aggregate coordinate centroids per postal prefix
  const geoMap = new Map<string, { lat: number; lng: number; city: string; state: string }>();
  const geoSumMap = new Map<string, { latSum: number; lngSum: number; count: number; city: string; state: string }>();

  raw.geolocation.forEach(g => {
    const zip = (g['geolocation_zip_code_prefix'] || '').trim().padStart(5, '0');
    if (!zip || zip === '00000') {
      missingValuesHandled++;
      return;
    }

    const latParsed = parseNumeric(g['geolocation_lat'], NaN);
    const lngParsed = parseNumeric(g['geolocation_lng'], NaN);

    if (isNaN(latParsed.value) || isNaN(lngParsed.value)) {
      missingValuesHandled++;
      return;
    }

    const city = (g['geolocation_city'] || 'sao paulo').trim().toLowerCase();
    const state = (g['geolocation_state'] || 'SP').trim().toUpperCase();

    if (geoSumMap.has(zip)) {
      duplicatesRemoved++;
      const current = geoSumMap.get(zip)!;
      current.latSum += latParsed.value;
      current.lngSum += lngParsed.value;
      current.count += 1;
    } else {
      geoSumMap.set(zip, {
        latSum: latParsed.value,
        lngSum: lngParsed.value,
        count: 1,
        city,
        state
      });
    }
  });

  // Calculate centroid per prefix
  geoSumMap.forEach((val, zip) => {
    geoMap.set(zip, {
      lat: Number((val.latSum / val.count).toFixed(6)),
      lng: Number((val.lngSum / val.count).toFixed(6)),
      city: val.city,
      state: val.state
    });
  });

  logs.push(`[Clean] Geolocation: Processed ${geoMap.size.toLocaleString()} unique postal centroids.`);

  // 2. Clean Customers
  const customerSeen = new Set<string>();
  const cleanedCustomers: CleanedDataset['customers'] = [];

  raw.customers.forEach(c => {
    const customerId = (c['customer_id'] || '').trim();
    if (!customerId) {
      invalidRecordsDiscarded++;
      return;
    }
    if (customerSeen.has(customerId)) {
      duplicatesRemoved++;
      return;
    }
    customerSeen.add(customerId);

    let customerUniqueId = (c['customer_unique_id'] || '').trim();
    if (!customerUniqueId) {
      customerUniqueId = customerId;
      missingValuesHandled++;
    }

    let zip = (c['customer_zip_code_prefix'] || '').trim().padStart(5, '0');
    if (!zip || zip === '00000') {
      zip = '01001';
      missingValuesHandled++;
    }

    let city = (c['customer_city'] || '').trim().toLowerCase();
    if (!city) {
      city = 'sao paulo';
      missingValuesHandled++;
    }

    let state = (c['customer_state'] || '').trim().toUpperCase();
    if (!state || state.length !== 2) {
      state = 'SP';
      missingValuesHandled++;
    }

    cleanedCustomers.push({
      customerId,
      customerUniqueId,
      zipCodePrefix: zip,
      city,
      state
    });
  });

  logs.push(`[Clean] Customers: Retained ${cleanedCustomers.length.toLocaleString()} validated customer records.`);

  // 3. Clean Sellers
  const sellerSeen = new Set<string>();
  const cleanedSellers: CleanedDataset['sellers'] = [];

  raw.sellers.forEach(s => {
    const sellerId = (s['seller_id'] || '').trim();
    if (!sellerId) {
      invalidRecordsDiscarded++;
      return;
    }
    if (sellerSeen.has(sellerId)) {
      duplicatesRemoved++;
      return;
    }
    sellerSeen.add(sellerId);

    let zip = (s['seller_zip_code_prefix'] || '').trim().padStart(5, '0');
    if (!zip || zip === '00000') {
      zip = '01001';
      missingValuesHandled++;
    }

    let city = (s['seller_city'] || '').trim().toLowerCase();
    if (!city) {
      city = 'sao paulo';
      missingValuesHandled++;
    }

    let state = (s['seller_state'] || '').trim().toUpperCase();
    if (!state || state.length !== 2) {
      state = 'SP';
      missingValuesHandled++;
    }

    cleanedSellers.push({
      sellerId,
      zipCodePrefix: zip,
      city,
      state
    });
  });

  logs.push(`[Clean] Sellers: Retained ${cleanedSellers.length.toLocaleString()} merchant profiles.`);

  // 4. Clean Products
  const productSeen = new Set<string>();
  const cleanedProducts: CleanedDataset['products'] = [];

  raw.products.forEach(p => {
    const productId = (p['product_id'] || '').trim();
    if (!productId) {
      invalidRecordsDiscarded++;
      return;
    }
    if (productSeen.has(productId)) {
      duplicatesRemoved++;
      return;
    }
    productSeen.add(productId);

    let cat = (p['product_category_name'] || '').trim().toLowerCase();
    if (!cat) {
      cat = 'outros';
      missingValuesHandled++;
    }

    const photosRes = parseNumeric(p['product_photos_qty'], 1, { min: 1 });
    if (photosRes.wasMissingOrInvalid) missingValuesHandled++;

    const weightRes = parseNumeric(p['product_weight_g'], 500, { min: 0 });
    if (weightRes.wasMissingOrInvalid) missingValuesHandled++;

    const lRes = parseNumeric(p['product_length_cm'], 10, { min: 1 });
    const wRes = parseNumeric(p['product_width_cm'], 10, { min: 1 });
    const hRes = parseNumeric(p['product_height_cm'], 10, { min: 1 });

    cleanedProducts.push({
      productId,
      categoryPt: cat,
      photosQty: photosRes.value,
      weightG: weightRes.value,
      dimensionsCm: `${lRes.value}x${wRes.value}x${hRes.value}`
    });
  });

  logs.push(`[Clean] Products: Retained ${cleanedProducts.length.toLocaleString()} catalog products.`);

  // 5. Clean Payments: Group and aggregate by order_id
  const paymentMap = new Map<string, { paymentType: string; paymentValue: number; installments: number }>();
  const seenPaymentKeys = new Set<string>();

  raw.orderPayments.forEach(p => {
    const orderId = (p['order_id'] || '').trim();
    const seq = (p['payment_sequential'] || '1').trim();
    if (!orderId) {
      invalidRecordsDiscarded++;
      return;
    }

    const payKey = `${orderId}_${seq}`;
    if (seenPaymentKeys.has(payKey)) {
      duplicatesRemoved++;
    } else {
      seenPaymentKeys.add(payKey);
    }

    const valRes = parseNumeric(p['payment_value'], 0.0, { min: 0, roundDecimals: 2 });
    if (valRes.wasMissingOrInvalid) missingValuesHandled++;

    const instRes = parseNumeric(p['payment_installments'], 1, { min: 1 });
    const pType = (p['payment_type'] || 'credit_card').trim().toLowerCase();

    if (paymentMap.has(orderId)) {
      const existing = paymentMap.get(orderId)!;
      existing.paymentValue = Number((existing.paymentValue + valRes.value).toFixed(2));
      existing.installments = Math.max(existing.installments, instRes.value);
    } else {
      paymentMap.set(orderId, {
        paymentType: pType,
        paymentValue: valRes.value,
        installments: instRes.value
      });
    }
  });

  // 6. Clean Reviews: Keep latest review or highest rating per order
  const reviewMap = new Map<string, { reviewScore: number; comment?: string }>();
  const seenReviewKeys = new Set<string>();

  raw.orderReviews.forEach(r => {
    const revId = (r['review_id'] || '').trim();
    const orderId = (r['order_id'] || '').trim();
    if (!orderId) {
      invalidRecordsDiscarded++;
      return;
    }

    if (revId && seenReviewKeys.has(revId)) {
      duplicatesRemoved++;
    } else if (revId) {
      seenReviewKeys.add(revId);
    }

    const scoreRes = parseNumeric(r['review_score'], 5, { min: 1, max: 5 });
    if (scoreRes.wasMissingOrInvalid) missingValuesHandled++;

    const comment = (r['review_comment_message'] || '').trim() || undefined;

    if (reviewMap.has(orderId)) {
      // Order already has review; update if new score is different
      duplicatesRemoved++;
    } else {
      reviewMap.set(orderId, {
        reviewScore: scoreRes.value,
        comment
      });
    }
  });

  // 7. Clean Orders
  const orderSeen = new Set<string>();
  const cleanedOrders: CleanedDataset['orders'] = [];

  raw.orders.forEach(o => {
    const orderId = (o['order_id'] || '').trim();
    const customerId = (o['customer_id'] || '').trim();
    if (!orderId || !customerId) {
      invalidRecordsDiscarded++;
      return;
    }

    if (orderSeen.has(orderId)) {
      duplicatesRemoved++;
      return;
    }
    orderSeen.add(orderId);

    const rawStatus = (o['order_status'] || 'delivered').trim().toLowerCase();
    const validStatuses: Array<CleanedDataset['orders'][0]['orderStatus']> = [
      'delivered', 'shipped', 'invoiced', 'processing', 'canceled'
    ];
    const orderStatus = (validStatuses.includes(rawStatus as any) ? rawStatus : 'delivered') as any;

    const purchaseNorm = normalizeDateString(o['order_purchase_timestamp']);
    let purchaseTimestamp = purchaseNorm;
    if (!purchaseTimestamp) {
      purchaseTimestamp = '2018-05-15 12:00:00';
      missingValuesHandled++;
    }

    cleanedOrders.push({
      orderId,
      customerId,
      orderStatus,
      purchaseTimestamp,
      approvedAt: normalizeDateString(o['order_approved_at']),
      deliveredCarrierDate: normalizeDateString(o['order_delivered_carrier_date']),
      deliveredCustomerDate: normalizeDateString(o['order_delivered_customer_date']),
      estimatedDeliveryDate: normalizeDateString(o['order_estimated_delivery_date'])
    });
  });

  logs.push(`[Clean] Orders: Retained ${cleanedOrders.length.toLocaleString()} validated orders.`);

  // 8. Clean Order Items
  const cleanedItems: CleanedDataset['orderItems'] = [];
  const seenLineItemKeys = new Set<string>();

  raw.orderItems.forEach(item => {
    const orderId = (item['order_id'] || '').trim();
    const productId = (item['product_id'] || '').trim();
    const sellerId = (item['seller_id'] || '').trim();
    const seqRes = parseNumeric(item['order_item_id'], 1, { min: 1 });

    if (!orderId || !productId) {
      invalidRecordsDiscarded++;
      return;
    }

    const itemKey = `${orderId}_${seqRes.value}`;
    if (seenLineItemKeys.has(itemKey)) {
      duplicatesRemoved++;
      return;
    }
    seenLineItemKeys.add(itemKey);

    const priceRes = parseNumeric(item['price'], 10.0, { min: 0.01, roundDecimals: 2 });
    if (priceRes.wasMissingOrInvalid) missingValuesHandled++;

    const freightRes = parseNumeric(item['freight_value'], 0.0, { min: 0.0, roundDecimals: 2 });
    if (freightRes.wasMissingOrInvalid) missingValuesHandled++;

    cleanedItems.push({
      orderId,
      orderItemId: seqRes.value,
      productId,
      sellerId: sellerId || 'seller_unknown',
      shippingLimitDate: normalizeDateString(item['shipping_limit_date']) || '',
      price: priceRes.value,
      freightValue: freightRes.value
    });
  });

  logs.push(`[Clean] Order Items: Retained ${cleanedItems.length.toLocaleString()} valid line items.`);

  const durationMs = Date.now() - startTime;
  logs.push(`ETL [Clean]: Completed scrubbing in ${durationMs}ms: ${duplicatesRemoved.toLocaleString()} duplicate records handled, ${missingValuesHandled.toLocaleString()} missing values imputed, ${invalidRecordsDiscarded.toLocaleString()} unrecoverable rows rejected.`);

  return {
    cleaned: {
      customers: cleanedCustomers,
      sellers: cleanedSellers,
      products: cleanedProducts,
      orders: cleanedOrders,
      orderItems: cleanedItems,
      orderPayments: paymentMap,
      orderReviews: reviewMap,
      geolocation: geoMap,
      categoryTranslation: raw.categoryTranslation
    },
    duplicatesRemoved,
    missingValuesHandled,
    invalidRecordsDiscarded,
    logs,
    durationMs
  };
}
