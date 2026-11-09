import { extractRawOlistData, resolveRawDir } from './extract';
import { validateRawOlistData, ValidationSummary } from './validate';
import { cleanOlistData } from './clean';
import { transformToStarSchema } from './transform';
import { loadIntoWarehouse } from './load';
import { ensureRawOlistFiles } from './seed_raw_data';
import { ETLExecutionLog, ETLStageStats } from '../types';

let currentLog: ETLExecutionLog | null = null;
const executionHistory: ETLExecutionLog[] = [];

export function getETLStatus(): {
  currentLog: ETLExecutionLog | null;
  history: ETLExecutionLog[];
  sourceDir: string;
} {
  return {
    currentLog,
    history: executionHistory,
    sourceDir: resolveRawDir()
  };
}

export function resetETLStatus() {
  currentLog = null;
  executionHistory.length = 0;
}

/**
 * Runs ONLY the Extract and Validate stages (used by npm run etl:validate)
 */
export async function runETLValidation(customDir?: string): Promise<{
  validation: ValidationSummary;
  sourceDir: string;
  sourceFilesDetected: string[];
  missingFiles: string[];
  totalExtracted: number;
  durationMs: number;
}> {
  const startTime = Date.now();
  const rawDir = resolveRawDir(customDir);
  ensureRawOlistFiles(rawDir);

  const extractRes = extractRawOlistData(rawDir);
  const validationRes = validateRawOlistData(extractRes.data);
  const durationMs = Date.now() - startTime;

  return {
    validation: validationRes,
    sourceDir: rawDir,
    sourceFilesDetected: extractRes.sourceFilesDetected,
    missingFiles: extractRes.missingFiles,
    totalExtracted: extractRes.totalExtracted,
    durationMs
  };
}

/**
 * Production-style ETL Pipeline:
 * Stage 1: EXTRACT  - Reads all 9 Olist CSV files from configured data directory
 * Stage 2: VALIDATE - Checks schema, duplicate detection, missing-value audit, data types & FKs
 * Stage 3: CLEAN    - Normalizes dates, cleans strings, handles nulls, aggregates duplicates
 * Stage 4: TRANSFORM- Maps into Kimball Star Schema dimensions & fact_sales
 * Stage 5: LOAD     - Commits into analytical warehouse store & relational DB
 */
export async function runETLPipeline(customDir?: string): Promise<ETLExecutionLog> {
  const startTime = new Date();
  const runId = `etl_${startTime.getTime()}`;
  const logs: string[] = [];

  logs.push(`[${startTime.toISOString()}] Initializing Production Data Warehouse ETL Pipeline...`);

  // Configurable data directory resolution
  const rawDir = resolveRawDir(customDir);
  logs.push(`Data directory resolved to: ${rawDir}`);

  // Guarantee starter dataset exists if empty
  ensureRawOlistFiles(rawDir);

  const stageStats: ETLStageStats[] = [
    { stage: 'extract', status: 'PENDING', recordsIn: 0, recordsOut: 0, errorsCount: 0, durationMs: 0 },
    { stage: 'validate', status: 'PENDING', recordsIn: 0, recordsOut: 0, errorsCount: 0, durationMs: 0 },
    { stage: 'clean', status: 'PENDING', recordsIn: 0, recordsOut: 0, errorsCount: 0, durationMs: 0 },
    { stage: 'transform', status: 'PENDING', recordsIn: 0, recordsOut: 0, errorsCount: 0, durationMs: 0 },
    { stage: 'load', status: 'PENDING', recordsIn: 0, recordsOut: 0, errorsCount: 0, durationMs: 0 }
  ];

  const logEntry: ETLExecutionLog = {
    id: runId,
    startTime: startTime.toISOString(),
    durationMs: 0,
    status: 'RUNNING',
    recordsExtracted: 0,
    recordsTransformed: 0,
    recordsLoaded: 0,
    failedRecords: 0,
    stages: stageStats,
    sourceFilesDetected: [],
    missingFiles: [],
    message: 'Pipeline running...',
    logs
  };

  currentLog = logEntry;

  try {
    // -------------------------------------------------------------
    // STAGE 1: EXTRACT
    // -------------------------------------------------------------
    const t0 = Date.now();
    stageStats[0].status = 'RUNNING';
    const extractRes = extractRawOlistData(rawDir);
    stageStats[0].durationMs = Date.now() - t0;
    stageStats[0].recordsIn = extractRes.totalExtracted;
    stageStats[0].recordsOut = extractRes.totalExtracted;
    stageStats[0].errorsCount = extractRes.missingFiles.length;
    stageStats[0].status = 'COMPLETED';

    logEntry.recordsExtracted = extractRes.totalExtracted;
    logEntry.sourceFilesDetected = extractRes.sourceFilesDetected;
    logEntry.missingFiles = extractRes.missingFiles;
    logs.push(...extractRes.logs);

    if (extractRes.totalExtracted === 0) {
      throw new Error(`No CSV data could be extracted from directory: ${rawDir}`);
    }

    // -------------------------------------------------------------
    // STAGE 2: VALIDATE
    // -------------------------------------------------------------
    const t1 = Date.now();
    stageStats[1].status = 'RUNNING';
    stageStats[1].recordsIn = extractRes.totalExtracted;
    const valRes = validateRawOlistData(extractRes.data);
    stageStats[1].durationMs = Date.now() - t1;
    stageStats[1].recordsOut = extractRes.totalExtracted;
    stageStats[1].errorsCount = valRes.errorsCount;
    stageStats[1].status = valRes.isValid ? 'COMPLETED' : 'FAILED';

    logs.push(`ETL [Validate]: Checked ${valRes.totalRecordsChecked.toLocaleString()} records across 9 datasets in ${valRes.durationMs}ms.`);
    logs.push(`- Duplicates detected: ${valRes.totalDuplicatesDetected.toLocaleString()}`);
    logs.push(`- Missing values detected: ${valRes.totalMissingValuesDetected.toLocaleString()}`);
    logs.push(`- Type / format issues detected: ${valRes.totalTypeErrorsDetected.toLocaleString()}`);
    logs.push(`- Referential integrity issues: ${valRes.totalReferentialIssuesDetected.toLocaleString()}`);

    if (valRes.warnings.length > 0) {
      valRes.warnings.forEach(w => logs.push(`[Validate Warning] ${w}`));
    }

    if (!valRes.isValid) {
      valRes.errors.forEach(e => logs.push(`[Validate Error] ${e}`));
      throw new Error(`Data validation failed with ${valRes.errorsCount} critical errors.`);
    }

    // -------------------------------------------------------------
    // STAGE 3: CLEAN & SCRUB
    // -------------------------------------------------------------
    const t2 = Date.now();
    stageStats[2].status = 'RUNNING';
    stageStats[2].recordsIn = extractRes.totalExtracted;
    const cleanRes = cleanOlistData(extractRes.data);
    stageStats[2].durationMs = Date.now() - t2;
    const cleanedTotal =
      cleanRes.cleaned.orders.length +
      cleanRes.cleaned.customers.length +
      cleanRes.cleaned.products.length +
      cleanRes.cleaned.sellers.length +
      cleanRes.cleaned.orderItems.length;

    stageStats[2].recordsOut = cleanedTotal;
    stageStats[2].errorsCount = cleanRes.invalidRecordsDiscarded;
    stageStats[2].status = 'COMPLETED';
    logEntry.failedRecords += cleanRes.invalidRecordsDiscarded;
    logs.push(...cleanRes.logs);

    // -------------------------------------------------------------
    // STAGE 4: TRANSFORM (Star Schema Dimensional Modeling)
    // -------------------------------------------------------------
    const t3 = Date.now();
    stageStats[3].status = 'RUNNING';
    stageStats[3].recordsIn = cleanedTotal;
    const transformed = transformToStarSchema(cleanRes.cleaned);
    stageStats[3].durationMs = Date.now() - t3;
    const transformedTotal =
      transformed.factSales.length +
      transformed.dimCustomer.length +
      transformed.dimProduct.length +
      transformed.dimDate.length +
      transformed.dimLocation.length +
      transformed.dimSeller.length;

    stageStats[3].recordsOut = transformedTotal;
    stageStats[3].status = 'COMPLETED';
    logEntry.recordsTransformed = transformedTotal;
    logs.push(...transformed.logs);

    // -------------------------------------------------------------
    // STAGE 5: LOAD (Analytical Warehouse Storage)
    // -------------------------------------------------------------
    const t4 = Date.now();
    stageStats[4].status = 'RUNNING';
    stageStats[4].recordsIn = transformedTotal;
    const loadRes = await loadIntoWarehouse(transformed);
    stageStats[4].durationMs = Date.now() - t4;
    stageStats[4].recordsOut = loadRes.recordsLoaded;
    stageStats[4].status = 'COMPLETED';
    logEntry.recordsLoaded = loadRes.recordsLoaded;
    logs.push(...loadRes.logs);

    // Finalize Success
    const endTime = new Date();
    logEntry.endTime = endTime.toISOString();
    logEntry.durationMs = endTime.getTime() - startTime.getTime();
    logEntry.status = 'SUCCESS';
    logEntry.message = `ETL Pipeline completed successfully in ${(logEntry.durationMs / 1000).toFixed(2)}s. Extracted: ${logEntry.recordsExtracted.toLocaleString()}, Transformed: ${logEntry.recordsTransformed.toLocaleString()}, Loaded: ${logEntry.recordsLoaded.toLocaleString()}, Rejected: ${logEntry.failedRecords.toLocaleString()}.`;
    logs.push(`[${endTime.toISOString()}] Pipeline finished: SUCCESS (${(logEntry.durationMs / 1000).toFixed(2)}s)`);

  } catch (err: unknown) {
    const endTime = new Date();
    logEntry.endTime = endTime.toISOString();
    logEntry.durationMs = endTime.getTime() - startTime.getTime();
    logEntry.status = 'FAILED';
    const errMessage = err instanceof Error ? err.message : String(err);
    logEntry.message = `ETL Pipeline failed: ${errMessage}`;
    logs.push(`[${endTime.toISOString()}] Pipeline FAILED: ${errMessage}`);
  }

  // Prepend to history, keeping last 20
  executionHistory.unshift({ ...logEntry });
  if (executionHistory.length > 20) {
    executionHistory.pop();
  }

  return logEntry;
}

// NOTE: The startup auto-run ("prime the warehouse") now lives in server.ts startServer().
// It used to run here at import time, which made `npm run etl` execute the pipeline twice
// concurrently and caused ER_DUP_ENTRY errors in MySQL.

