#!/usr/bin/env tsx
import 'dotenv/config'; // .env theke DB_HOST, DB_PASSWORD ityadi load kore (eta chhara MySQL connection fail kore)
import { runETLPipeline, runETLValidation } from './pipeline';
import { resetWarehouse } from './reset';
import { resolveRawDir } from './extract';

// ANSI terminal colors
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  bgBlue: '\x1b[44m\x1b[37m\x1b[1m',
  bgGreen: '\x1b[42m\x1b[30m\x1b[1m',
  bgRed: '\x1b[41m\x1b[37m\x1b[1m'
};

function printBanner(title: string) {
  console.log(`\n${c.cyan}======================================================================${c.reset}`);
  console.log(`${c.bold}${c.magenta}  BRAZILIAN E-COMMERCE DATA WAREHOUSE (OLIST)  ${c.reset}`);
  console.log(`${c.bold}${c.blue}  ${title}  ${c.reset}`);
  console.log(`${c.cyan}======================================================================${c.reset}\n`);
}

function parseArgs(): { command: 'run' | 'validate' | 'reset' | 'help'; customDir?: string } {
  const args = process.argv.slice(2);
  let command: 'run' | 'validate' | 'reset' | 'help' = 'run';
  let customDir: string | undefined;

  for (const arg of args) {
    if (arg === 'validate' || arg === '--validate') {
      command = 'validate';
    } else if (arg === 'reset' || arg === '--reset') {
      command = 'reset';
    } else if (arg === 'run' || arg === '--run') {
      command = 'run';
    } else if (arg === '--help' || arg === '-h') {
      command = 'help';
    } else if (arg.startsWith('--data-dir=')) {
      customDir = arg.split('=')[1];
    } else if (!arg.startsWith('-') && !['validate', 'reset', 'run'].includes(arg)) {
      customDir = arg;
    }
  }

  return { command, customDir };
}

async function handleValidate(customDir?: string) {
  printBanner('ETL VALIDATION RUN (Extract & Validate)');
  console.log(`${c.bold}Configured Source Directory:${c.reset} ${resolveRawDir(customDir)}\n`);
  console.log(`${c.dim}[1/2] Extracting and checking raw CSV datasets...${c.reset}`);

  try {
    const res = await runETLValidation(customDir);
    const { validation } = res;

    console.log(`\n${c.bold}Files Status (${res.sourceFilesDetected.length}/9 detected):${c.reset}`);
    Object.entries(validation.fileReports).forEach(([key, rep]) => {
      const statusBadge = rep.status === 'PASSED'
        ? `${c.green}[PASS]${c.reset}`
        : rep.status === 'WARNING'
          ? `${c.yellow}[WARN]${c.reset}`
          : `${c.red}[FAIL]${c.reset}`;

      console.log(`  ${statusBadge} ${rep.fileName.padEnd(38)} Rows: ${String(rep.rowCount).padStart(7)}  Valid: ${String(rep.validRows).padStart(7)}  Dupes: ${String(rep.duplicateRows).padStart(4)}`);
      if (rep.issues.length > 0) {
        rep.issues.slice(0, 3).forEach(iss => console.log(`      ${c.dim}-> ${iss}${c.reset}`));
      }
    });

    console.log(`\n${c.bold}Validation Audit Metrics:${c.reset}`);
    console.log(`  - Total Records Inspected:      ${c.bold}${validation.totalRecordsChecked.toLocaleString()}${c.reset}`);
    console.log(`  - Duplicate Keys Detected:       ${validation.totalDuplicatesDetected > 0 ? c.yellow : c.green}${validation.totalDuplicatesDetected.toLocaleString()}${c.reset}`);
    console.log(`  - Missing Values Handled:       ${validation.totalMissingValuesDetected > 0 ? c.yellow : c.green}${validation.totalMissingValuesDetected.toLocaleString()}${c.reset}`);
    console.log(`  - Foreign Key / Ref Issues:     ${validation.totalReferentialIssuesDetected > 0 ? c.yellow : c.green}${validation.totalReferentialIssuesDetected.toLocaleString()}${c.reset}`);
    console.log(`  - Numeric / Format Errors:      ${validation.totalTypeErrorsDetected > 0 ? c.yellow : c.green}${validation.totalTypeErrorsDetected.toLocaleString()}${c.reset}`);
    console.log(`  - Validation Execution Time:    ${validation.durationMs}ms`);

    if (validation.isValid) {
      console.log(`\n${c.bgGreen} VALIDATION PASSED ${c.reset} ${c.green}Datasets conform to Olist Star Schema requirements.${c.reset}\n`);
      process.exit(0);
    } else {
      console.log(`\n${c.bgRed} VALIDATION FAILED ${c.reset} ${c.red}${validation.errors.join(' | ')}${c.reset}\n`);
      process.exit(1);
    }
  } catch (err: unknown) {
    console.error(`\n${c.red}[ERROR] Validation aborted:${c.reset}`, err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

async function handleReset() {
  printBanner('DATA WAREHOUSE RESET (Truncate Tables)');
  console.log(`${c.yellow}Resetting in-memory warehouse store and database tables...${c.reset}\n`);

  try {
    const res = await resetWarehouse();
    console.log(`${c.green}✔ ${res.message}${c.reset}`);
    console.log(`  - Cleared Tables: ${res.clearedTables.join(', ')}`);
    console.log(`  - MySQL Truncated: ${res.mysqlReset ? `${c.green}Yes${c.reset}` : `${c.dim}No (database offline)${c.reset}`}`);
    console.log(`  - Duration: ${res.durationMs}ms\n`);
    process.exit(0);
  } catch (err: unknown) {
    console.error(`\n${c.red}[ERROR] Reset failed:${c.reset}`, err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

async function handleRun(customDir?: string) {
  printBanner('FULL PRODUCTION ETL PIPELINE');
  console.log(`${c.bold}Data Directory:${c.reset} ${resolveRawDir(customDir)}`);
  console.log(`${c.dim}Stages: Extract -> Validate -> Clean -> Transform -> Load${c.reset}\n`);

  const tStart = Date.now();
  try {
    const result = await runETLPipeline(customDir);

    console.log(`\n${c.bold}Stage Performance:${c.reset}`);
    result.stages.forEach(stage => {
      const badge = stage.status === 'COMPLETED'
        ? `${c.green}✔ COMPLETED${c.reset}`
        : `${c.red}✖ FAILED${c.reset}`;
      console.log(`  ${badge.padEnd(20)} ${c.bold}${stage.stage.toUpperCase().padEnd(10)}${c.reset} Records In: ${String(stage.recordsIn).padStart(7)}  Out: ${String(stage.recordsOut).padStart(7)}  Time: ${stage.durationMs}ms`);
    });

    console.log(`\n${c.bold}Warehouse ETL Pipeline Summary:${c.reset}`);
    console.log(`  - Records Extracted:     ${c.bold}${result.recordsExtracted.toLocaleString()}${c.reset}`);
    console.log(`  - Records Transformed:   ${c.bold}${result.recordsTransformed.toLocaleString()}${c.reset}`);
    console.log(`  - Records Loaded:        ${c.bold}${c.green}${result.recordsLoaded.toLocaleString()}${c.reset}`);
    console.log(`  - Rejected Records:      ${result.failedRecords > 0 ? c.yellow : c.green}${result.failedRecords.toLocaleString()}${c.reset}`);
    console.log(`  - Total Duration:        ${c.bold}${((Date.now() - tStart) / 1000).toFixed(2)}s${c.reset}`);

    if (result.status === 'SUCCESS') {
      console.log(`\n${c.bgGreen} ETL COMPLETED SUCCESSFULLY ${c.reset} ${c.green}${result.message}${c.reset}\n`);
      process.exit(0);
    } else {
      console.log(`\n${c.bgRed} ETL PIPELINE FAILED ${c.reset} ${c.red}${result.message}${c.reset}\n`);
      process.exit(1);
    }
  } catch (err: unknown) {
    console.error(`\n${c.red}[FATAL] Pipeline execution terminated:${c.reset}`, err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

function printHelp() {
  printBanner('ETL CLI HELP & USAGE');
  console.log(`Usage:`);
  console.log(`  npm run etl                   Run full ETL pipeline (Extract -> Validate -> Transform -> Load)`);
  console.log(`  npm run etl:validate          Validate Olist raw CSV datasets without loading`);
  console.log(`  npm run etl:reset             Reset & truncate Star Schema tables`);
  console.log(`\nOptions:`);
  console.log(`  --data-dir=<path>             Specify custom directory containing Olist CSV files`);
  console.log(`  --help, -h                    Show this help message`);
  console.log(`\nExamples:`);
  console.log(`  npm run etl`);
  console.log(`  npm run etl -- --data-dir=/data/raw`);
  console.log(`  npm run etl:validate`);
  console.log(`  npm run etl:reset\n`);
  process.exit(0);
}

async function main() {
  const { command, customDir } = parseArgs();

  switch (command) {
    case 'validate':
      await handleValidate(customDir);
      break;
    case 'reset':
      await handleReset();
      break;
    case 'help':
      printHelp();
      break;
    case 'run':
    default:
      await handleRun(customDir);
      break;
  }
}

main();
