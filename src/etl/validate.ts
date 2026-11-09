import { RawOlistDatasets } from './extract';

export interface FileValidationReport {
  fileName: string;
  rowCount: number;
  validRows: number;
  duplicateRows: number;
  missingValueRows: number;
  status: 'PASSED' | 'WARNING' | 'FAILED';
  issues: string[];
}

export interface ValidationSummary {
  isValid: boolean;
  totalRecordsChecked: number;
  totalDuplicatesDetected: number;
  totalMissingValuesDetected: number;
  totalReferentialIssuesDetected: number;
  totalTypeErrorsDetected: number;
  warningsCount: number;
  errorsCount: number;
  fileReports: Record<string, FileValidationReport>;
  warnings: string[];
  errors: string[];
  durationMs: number;
}

/**
 * Stage 2: Comprehensive Data Validation
 * Performs schema check, duplicate detection, missing-value audit, type verification, and FK integrity.
 */
export function validateRawOlistData(raw: RawOlistDatasets): ValidationSummary {
  const startTime = Date.now();
  const warnings: string[] = [];
  const errors: string[] = [];
  const fileReports: Record<string, FileValidationReport> = {};

  let totalRecordsChecked = 0;
  let totalDuplicatesDetected = 0;
  let totalMissingValuesDetected = 0;
  let totalReferentialIssuesDetected = 0;
  let totalTypeErrorsDetected = 0;

  // Helper to init report
  const initReport = (fileName: string, rowCount: number): FileValidationReport => ({
    fileName,
    rowCount,
    validRows: 0,
    duplicateRows: 0,
    missingValueRows: 0,
    status: 'PASSED',
    issues: []
  });

  // 1. Validate Category Translation
  const catReport = initReport('product_category_name_translation.csv', Object.keys(raw.categoryTranslation).length);
  totalRecordsChecked += catReport.rowCount;
  if (catReport.rowCount === 0) {
    catReport.status = 'WARNING';
    catReport.issues.push('Category translation dictionary is empty. Default category mappings will be used.');
    warnings.push('Category translation dictionary is empty.');
  } else {
    catReport.validRows = catReport.rowCount;
  }
  fileReports['category_translation'] = catReport;

  // 2. Validate Geolocation
  const geoReport = initReport('olist_geolocation_dataset.csv', raw.geolocation.length);
  totalRecordsChecked += geoReport.rowCount;
  const seenGeoZips = new Set<string>();
  let geoDupes = 0;
  let geoMissing = 0;
  let geoTypeErrors = 0;

  raw.geolocation.forEach((row, idx) => {
    const zip = (row['geolocation_zip_code_prefix'] || '').trim();
    const latStr = row['geolocation_lat'];
    const lngStr = row['geolocation_lng'];

    if (!zip) {
      geoMissing++;
      geoReport.issues.push(`Row ${idx + 1}: Missing postal zip prefix`);
    } else if (seenGeoZips.has(zip)) {
      geoDupes++;
    } else {
      seenGeoZips.add(zip);
    }

    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      geoTypeErrors++;
      if (geoReport.issues.length < 5) {
        geoReport.issues.push(`Row ${idx + 1}: Invalid GPS coordinates (${latStr}, ${lngStr})`);
      }
    }
  });

  totalDuplicatesDetected += geoDupes;
  totalMissingValuesDetected += geoMissing;
  totalTypeErrorsDetected += geoTypeErrors;
  geoReport.duplicateRows = geoDupes;
  geoReport.missingValueRows = geoMissing;
  geoReport.validRows = geoReport.rowCount - geoMissing - geoTypeErrors;
  if (geoTypeErrors > 0 || geoMissing > 0) {
    geoReport.status = geoMissing > 10 ? 'FAILED' : 'WARNING';
  }
  fileReports['geolocation'] = geoReport;

  // 3. Validate Customers
  const custReport = initReport('olist_customers_dataset.csv', raw.customers.length);
  totalRecordsChecked += custReport.rowCount;
  const seenCustIds = new Set<string>();
  const validCustomerIds = new Set<string>();
  let custDupes = 0;
  let custMissing = 0;

  if (raw.customers.length === 0) {
    custReport.status = 'FAILED';
    custReport.issues.push('Customer dataset is empty. Cannot generate Customer dimension.');
    errors.push('Customer dataset is empty.');
  }

  raw.customers.forEach((c, idx) => {
    const cid = (c['customer_id'] || '').trim();
    const uid = (c['customer_unique_id'] || '').trim();
    const zip = (c['customer_zip_code_prefix'] || '').trim();

    if (!cid) {
      custMissing++;
      if (custReport.issues.length < 5) custReport.issues.push(`Row ${idx + 1}: Missing customer_id`);
      return;
    }

    if (seenCustIds.has(cid)) {
      custDupes++;
      if (custReport.issues.length < 5) custReport.issues.push(`Row ${idx + 1}: Duplicate customer_id ${cid}`);
      return;
    }
    seenCustIds.add(cid);
    validCustomerIds.add(cid);

    if (!uid || !zip) {
      custMissing++;
    }
  });

  totalDuplicatesDetected += custDupes;
  totalMissingValuesDetected += custMissing;
  custReport.duplicateRows = custDupes;
  custReport.missingValueRows = custMissing;
  custReport.validRows = seenCustIds.size;
  if (custDupes > 0) {
    custReport.issues.push(`Detected ${custDupes} duplicate customer_id records.`);
    warnings.push(`Customers: ${custDupes} duplicate customer_id entries detected.`);
  }
  fileReports['customers'] = custReport;

  // 4. Validate Sellers
  const sellerReport = initReport('olist_sellers_dataset.csv', raw.sellers.length);
  totalRecordsChecked += sellerReport.rowCount;
  const seenSellerIds = new Set<string>();
  const validSellerIds = new Set<string>();
  let sellerDupes = 0;
  let sellerMissing = 0;

  if (raw.sellers.length === 0) {
    sellerReport.status = 'FAILED';
    sellerReport.issues.push('Sellers dataset is empty. Cannot generate Seller dimension.');
    errors.push('Sellers dataset is empty.');
  }

  raw.sellers.forEach((s, idx) => {
    const sid = (s['seller_id'] || '').trim();
    if (!sid) {
      sellerMissing++;
      if (sellerReport.issues.length < 5) sellerReport.issues.push(`Row ${idx + 1}: Missing seller_id`);
      return;
    }
    if (seenSellerIds.has(sid)) {
      sellerDupes++;
      if (sellerReport.issues.length < 5) sellerReport.issues.push(`Row ${idx + 1}: Duplicate seller_id ${sid}`);
      return;
    }
    seenSellerIds.add(sid);
    validSellerIds.add(sid);
  });

  totalDuplicatesDetected += sellerDupes;
  totalMissingValuesDetected += sellerMissing;
  sellerReport.duplicateRows = sellerDupes;
  sellerReport.missingValueRows = sellerMissing;
  sellerReport.validRows = seenSellerIds.size;
  if (sellerDupes > 0) {
    sellerReport.issues.push(`Detected ${sellerDupes} duplicate seller_id records.`);
  }
  fileReports['sellers'] = sellerReport;

  // 5. Validate Products
  const prodReport = initReport('olist_products_dataset.csv', raw.products.length);
  totalRecordsChecked += prodReport.rowCount;
  const seenProdIds = new Set<string>();
  const validProductIds = new Set<string>();
  let prodDupes = 0;
  let prodMissing = 0;
  let prodTypeErrors = 0;

  if (raw.products.length === 0) {
    prodReport.status = 'FAILED';
    prodReport.issues.push('Products dataset is empty. Cannot generate Product dimension.');
    errors.push('Products dataset is empty.');
  }

  raw.products.forEach((p, idx) => {
    const pid = (p['product_id'] || '').trim();
    if (!pid) {
      prodMissing++;
      if (prodReport.issues.length < 5) prodReport.issues.push(`Row ${idx + 1}: Missing product_id`);
      return;
    }
    if (seenProdIds.has(pid)) {
      prodDupes++;
      if (prodReport.issues.length < 5) prodReport.issues.push(`Row ${idx + 1}: Duplicate product_id ${pid}`);
      return;
    }
    seenProdIds.add(pid);
    validProductIds.add(pid);

    if (!p['product_category_name']) {
      prodMissing++;
    }

    if (p['product_weight_g'] && isNaN(parseInt(p['product_weight_g'], 10))) {
      prodTypeErrors++;
    }
  });

  totalDuplicatesDetected += prodDupes;
  totalMissingValuesDetected += prodMissing;
  totalTypeErrorsDetected += prodTypeErrors;
  prodReport.duplicateRows = prodDupes;
  prodReport.missingValueRows = prodMissing;
  prodReport.validRows = seenProdIds.size;
  if (prodMissing > 0) {
    prodReport.issues.push(`${prodMissing} products have missing category names or package specifications.`);
  }
  fileReports['products'] = prodReport;

  // 6. Validate Orders
  const orderReport = initReport('olist_orders_dataset.csv', raw.orders.length);
  totalRecordsChecked += orderReport.rowCount;
  const seenOrderIds = new Set<string>();
  const validOrderIds = new Set<string>();
  let orderDupes = 0;
  let orderMissing = 0;
  let orderFkIssues = 0;
  let orderDateErrors = 0;

  if (raw.orders.length === 0) {
    orderReport.status = 'FAILED';
    orderReport.issues.push('Orders dataset is empty.');
    errors.push('Orders dataset is empty.');
  }

  raw.orders.forEach((o, idx) => {
    const oid = (o['order_id'] || '').trim();
    const cid = (o['customer_id'] || '').trim();
    const purchaseTs = (o['order_purchase_timestamp'] || '').trim();

    if (!oid) {
      orderMissing++;
      if (orderReport.issues.length < 5) orderReport.issues.push(`Row ${idx + 1}: Missing order_id`);
      return;
    }
    if (seenOrderIds.has(oid)) {
      orderDupes++;
      if (orderReport.issues.length < 5) orderReport.issues.push(`Row ${idx + 1}: Duplicate order_id ${oid}`);
      return;
    }
    seenOrderIds.add(oid);
    validOrderIds.add(oid);

    if (!cid) {
      orderMissing++;
    } else if (validCustomerIds.size > 0 && !validCustomerIds.has(cid)) {
      orderFkIssues++;
      if (orderReport.issues.length < 5) {
        orderReport.issues.push(`Row ${idx + 1}: Orphaned customer_id '${cid}' not found in customers dataset`);
      }
    }

    if (!purchaseTs || isNaN(Date.parse(purchaseTs))) {
      orderDateErrors++;
      if (orderReport.issues.length < 5) {
        orderReport.issues.push(`Row ${idx + 1}: Invalid order_purchase_timestamp format '${purchaseTs}'`);
      }
    }
  });

  totalDuplicatesDetected += orderDupes;
  totalMissingValuesDetected += orderMissing;
  totalReferentialIssuesDetected += orderFkIssues;
  totalTypeErrorsDetected += orderDateErrors;
  orderReport.duplicateRows = orderDupes;
  orderReport.missingValueRows = orderMissing;
  orderReport.validRows = validOrderIds.size;
  if (orderFkIssues > 0) {
    orderReport.status = 'WARNING';
    warnings.push(`Orders: ${orderFkIssues} orders reference customer_ids not present in customers dataset.`);
  }
  fileReports['orders'] = orderReport;

  // 7. Validate Order Items
  const itemsReport = initReport('olist_order_items_dataset.csv', raw.orderItems.length);
  totalRecordsChecked += itemsReport.rowCount;
  const seenItemKeys = new Set<string>();
  let itemDupes = 0;
  let itemMissing = 0;
  let itemFkIssues = 0;
  let itemNumericErrors = 0;

  if (raw.orderItems.length === 0) {
    itemsReport.status = 'FAILED';
    itemsReport.issues.push('Order items dataset is empty. Cannot generate fact_sales.');
    errors.push('Order items dataset is empty.');
  }

  raw.orderItems.forEach((item, idx) => {
    const oid = (item['order_id'] || '').trim();
    const seq = (item['order_item_id'] || '').trim();
    const pid = (item['product_id'] || '').trim();
    const sid = (item['seller_id'] || '').trim();
    const priceStr = item['price'];
    const freightStr = item['freight_value'];

    const compositeKey = `${oid}_${seq}`;
    if (!oid || !seq) {
      itemMissing++;
      return;
    }

    if (seenItemKeys.has(compositeKey)) {
      itemDupes++;
      if (itemsReport.issues.length < 5) {
        itemsReport.issues.push(`Row ${idx + 1}: Duplicate line item composite key (order_id: ${oid}, item_id: ${seq})`);
      }
      return;
    }
    seenItemKeys.add(compositeKey);

    // Referential checks
    if (validOrderIds.size > 0 && !validOrderIds.has(oid)) {
      itemFkIssues++;
    }
    if (validProductIds.size > 0 && !validProductIds.has(pid)) {
      itemFkIssues++;
    }
    if (validSellerIds.size > 0 && !validSellerIds.has(sid)) {
      itemFkIssues++;
    }

    // Numeric checks
    const price = parseFloat(priceStr);
    const freight = parseFloat(freightStr);
    if (isNaN(price) || price < 0 || isNaN(freight) || freight < 0) {
      itemNumericErrors++;
      if (itemsReport.issues.length < 5) {
        itemsReport.issues.push(`Row ${idx + 1}: Invalid price/freight numeric value (price: ${priceStr}, freight: ${freightStr})`);
      }
    }
  });

  totalDuplicatesDetected += itemDupes;
  totalMissingValuesDetected += itemMissing;
  totalReferentialIssuesDetected += itemFkIssues;
  totalTypeErrorsDetected += itemNumericErrors;
  itemsReport.duplicateRows = itemDupes;
  itemsReport.missingValueRows = itemMissing;
  itemsReport.validRows = seenItemKeys.size - itemMissing;
  if (itemFkIssues > 0) {
    itemsReport.status = 'WARNING';
    itemsReport.issues.push(`${itemFkIssues} items reference products/sellers/orders outside current batch.`);
  }
  fileReports['order_items'] = itemsReport;

  // 8. Validate Payments
  const payReport = initReport('olist_order_payments_dataset.csv', raw.orderPayments.length);
  totalRecordsChecked += payReport.rowCount;
  const seenPayKeys = new Set<string>();
  let payDupes = 0;
  let payNumericErrors = 0;

  raw.orderPayments.forEach((p, idx) => {
    const oid = (p['order_id'] || '').trim();
    const seq = (p['payment_sequential'] || '1').trim();
    const comp = `${oid}_${seq}`;

    if (seenPayKeys.has(comp)) {
      payDupes++;
    } else {
      seenPayKeys.add(comp);
    }

    const val = parseFloat(p['payment_value']);
    if (isNaN(val) || val < 0) {
      payNumericErrors++;
      if (payReport.issues.length < 5) {
        payReport.issues.push(`Row ${idx + 1}: Invalid payment_value ${p['payment_value']}`);
      }
    }
  });

  totalDuplicatesDetected += payDupes;
  totalTypeErrorsDetected += payNumericErrors;
  payReport.duplicateRows = payDupes;
  payReport.validRows = payReport.rowCount - payNumericErrors;
  fileReports['order_payments'] = payReport;

  // 9. Validate Reviews
  const revReport = initReport('olist_order_reviews_dataset.csv', raw.orderReviews.length);
  totalRecordsChecked += revReport.rowCount;
  let revScoreErrors = 0;

  raw.orderReviews.forEach((r, idx) => {
    const score = parseInt(r['review_score'], 10);
    if (isNaN(score) || score < 1 || score > 5) {
      revScoreErrors++;
      if (revReport.issues.length < 5) {
        revReport.issues.push(`Row ${idx + 1}: Invalid review_score ${r['review_score']} (must be 1-5)`);
      }
    }
  });

  totalTypeErrorsDetected += revScoreErrors;
  revReport.validRows = revReport.rowCount - revScoreErrors;
  fileReports['order_reviews'] = revReport;

  const durationMs = Date.now() - startTime;
  const isValid = errors.length === 0;

  return {
    isValid,
    totalRecordsChecked,
    totalDuplicatesDetected,
    totalMissingValuesDetected,
    totalReferentialIssuesDetected,
    totalTypeErrorsDetected,
    warningsCount: warnings.length,
    errorsCount: errors.length,
    fileReports,
    warnings,
    errors,
    durationMs
  };
}
