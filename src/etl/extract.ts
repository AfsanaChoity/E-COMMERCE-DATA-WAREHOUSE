import fs from 'fs';
import path from 'path';

export interface RawOlistDatasets {
  customers: Array<Record<string, string>>;
  geolocation: Array<Record<string, string>>;
  orderItems: Array<Record<string, string>>;
  orderPayments: Array<Record<string, string>>;
  orderReviews: Array<Record<string, string>>;
  orders: Array<Record<string, string>>;
  products: Array<Record<string, string>>;
  sellers: Array<Record<string, string>>;
  categoryTranslation: Record<string, string>;
}

export interface ExtractResult {
  data: RawOlistDatasets;
  extractedCounts: Record<string, number>;
  totalExtracted: number;
  sourceDir: string;
  sourceFilesDetected: string[];
  missingFiles: string[];
  logs: string[];
  durationMs: number;
}

/**
 * Searches for the Olist raw data directory in configurable locations:
 * 1. Explicit argument / environment variable
 * 2. ./data/raw
 * 3. /data/raw
 * 4. ./data
 * 5. /data
 */
export function resolveRawDir(customDir?: string): string {
  const envDir = process.env.DATA_DIR || process.env.OLIST_DATA_DIR;
  const candidates: string[] = [
    customDir,
    envDir,
    path.resolve(process.cwd(), 'data', 'raw'),
    path.resolve('/data/raw'),
    path.resolve(process.cwd(), 'data'),
    path.resolve('/data'),
    path.resolve(process.cwd(), 'public', 'data')
  ].filter((p): p is string => Boolean(p));

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      // Check if candidate contains at least one Olist CSV file
      try {
        const files = fs.readdirSync(candidate);
        const hasOlist = files.some(f => f.includes('olist_') || f.includes('category_name_translation'));
        if (hasOlist) {
          return candidate;
        }
      } catch {
        // Continue searching
      }
    }
  }

  // Fallback to first existing candidate or ./data/raw
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return path.resolve(process.cwd(), 'data', 'raw');
}

/**
 * Parses RFC 4180 compliant CSV text, taking into account:
 * - UTF-8 Byte Order Mark (BOM)
 * - Quoted fields containing commas
 * - Quoted fields containing newlines
 * - Escaped double quotes ("")
 * - Trimmed headers and line breaks (\r\n, \r, \n)
 */
export function parseCSV(csvText: string): Array<Record<string, string>> {
  // Strip BOM if present
  let cleanText = csvText.charCodeAt(0) === 0xFEFF ? csvText.slice(1) : csvText;
  if (!cleanText.trim()) return [];

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;
  const len = cleanText.length;

  while (i < len) {
    const char = cleanText[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < len && cleanText[i + 1] === '"') {
          // Escaped quote
          currentField += '"';
          i += 2;
          continue;
        } else {
          // Closing quote
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        currentField += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      } else if (char === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
        i++;
        continue;
      } else if (char === '\r') {
        if (i + 1 < len && cleanText[i + 1] === '\n') {
          i++; // skip \r before \n
        }
        currentRow.push(currentField.trim());
        currentField = '';
        if (currentRow.length > 0 && currentRow.some(f => f.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        i++;
        continue;
      } else if (char === '\n') {
        currentRow.push(currentField.trim());
        currentField = '';
        if (currentRow.length > 0 && currentRow.some(f => f.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        i++;
        continue;
      } else {
        currentField += char;
        i++;
        continue;
      }
    }
  }

  // Push remaining field & row
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(f => f.length > 0)) {
      rows.push(currentRow);
    }
  }

  if (rows.length <= 1) return [];

  const headers = rows[0].map(h => h.trim().replace(/^"|"$/g, ''));
  const records: Array<Record<string, string>> = [];

  for (let r = 1; r < rows.length; r++) {
    const values = rows[r];
    const rowObj: Record<string, string> = {};
    headers.forEach((header, idx) => {
      rowObj[header] = values[idx] !== undefined ? values[idx] : '';
    });
    records.push(rowObj);
  }

  return records;
}

/**
 * Stage 1: EXTRACT
 * Extracts all 9 raw Olist CSV datasets from the configured data directory.
 */
export function extractRawOlistData(customDir?: string): ExtractResult {
  const startTime = Date.now();
  const logs: string[] = [];
  const sourceDir = resolveRawDir(customDir);
  logs.push(`ETL [Extract]: Scanning configured data directory: ${sourceDir}`);

  const requiredFiles: Record<keyof RawOlistDatasets, string> = {
    customers: 'olist_customers_dataset.csv',
    geolocation: 'olist_geolocation_dataset.csv',
    orderItems: 'olist_order_items_dataset.csv',
    orderPayments: 'olist_order_payments_dataset.csv',
    orderReviews: 'olist_order_reviews_dataset.csv',
    orders: 'olist_orders_dataset.csv',
    products: 'olist_products_dataset.csv',
    sellers: 'olist_sellers_dataset.csv',
    categoryTranslation: 'product_category_name_translation.csv'
  };

  const sourceFilesDetected: string[] = [];
  const missingFiles: string[] = [];
  const extractedCounts: Record<string, number> = {};

  const data: RawOlistDatasets = {
    customers: [],
    geolocation: [],
    orderItems: [],
    orderPayments: [],
    orderReviews: [],
    orders: [],
    products: [],
    sellers: [],
    categoryTranslation: {}
  };

  let totalExtracted = 0;

  for (const [key, filename] of Object.entries(requiredFiles) as [keyof RawOlistDatasets, string][]) {
    const filePath = path.join(sourceDir, filename);

    if (fs.existsSync(filePath)) {
      sourceFilesDetected.push(filename);
      try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const parsedRows = parseCSV(fileContent);

        if (key === 'categoryTranslation') {
          const transMap: Record<string, string> = {};
          parsedRows.forEach(row => {
            const pt = row['product_category_name'];
            const en = row['product_category_name_english'];
            if (pt && en) transMap[pt.trim()] = en.trim();
          });
          data.categoryTranslation = transMap;
          const count = Object.keys(transMap).length;
          extractedCounts[key] = count;
          totalExtracted += count;
          logs.push(`[Extract] ${filename}: Extracted ${count} category translation pairs`);
        } else {
          data[key] = parsedRows;
          extractedCounts[key] = parsedRows.length;
          totalExtracted += parsedRows.length;
          logs.push(`[Extract] ${filename}: Extracted ${parsedRows.length.toLocaleString()} raw rows`);
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        logs.push(`[Extract ERROR] Failed to read ${filename}: ${errMsg}`);
        missingFiles.push(filename);
      }
    } else {
      missingFiles.push(filename);
      logs.push(`[Extract WARNING] Source file not found: ${filename} in ${sourceDir}`);
    }
  }

  const durationMs = Date.now() - startTime;
  logs.push(`ETL [Extract]: Completed extraction of ${totalExtracted.toLocaleString()} total records from ${sourceFilesDetected.length}/9 datasets in ${durationMs}ms.`);

  return {
    data,
    extractedCounts,
    totalExtracted,
    sourceDir,
    sourceFilesDetected,
    missingFiles,
    logs,
    durationMs
  };
}
