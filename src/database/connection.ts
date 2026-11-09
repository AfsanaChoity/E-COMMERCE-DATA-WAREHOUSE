import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

let pool: mysql.Pool | null = null;
let lastConnectionStatus: { connected: boolean; message: string; timestamp: string } = {
  connected: false,
  message: 'Not connected yet',
  timestamp: new Date().toISOString()
};

export interface DBConfig {
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
}

export function getDBConfig(): DBConfig {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'olist_datawarehouse'
  };
}

export function getMySQLPool(): mysql.Pool {
  if (!pool) {
    const config = getDBConfig();
    pool = mysql.createPool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 4000
    });
  }
  return pool;
}

export async function testMySQLConnection(customConfig?: Partial<DBConfig>): Promise<{ connected: boolean; message: string; version?: string }> {
  try {
    const config = { ...getDBConfig(), ...customConfig };
    const tempConnection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      connectTimeout: 3000
    });

    const [rows] = await tempConnection.query<mysql.RowDataPacket[]>('SELECT VERSION() as version');
    const version = (rows[0] as any)?.version || 'MySQL 8.0+';
    await tempConnection.end();

    lastConnectionStatus = {
      connected: true,
      message: `Successfully connected to MySQL ${version} at ${config.host}:${config.port}/${config.database}`,
      timestamp: new Date().toISOString()
    };

    return { connected: true, message: lastConnectionStatus.message, version };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    lastConnectionStatus = {
      connected: false,
      message: `MySQL Connection Failed: ${errMsg}. Utilizing high-performance in-memory Star Schema Warehouse engine.`,
      timestamp: new Date().toISOString()
    };
    return { connected: false, message: lastConnectionStatus.message };
  }
}

export function getConnectionStatus() {
  return lastConnectionStatus;
}

export async function initializeMySQLSchema(): Promise<{ success: boolean; message: string }> {
  try {
    const p = getMySQLPool();
    const schemaPath = path.resolve(process.cwd(), 'sql', 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      return { success: false, message: 'sql/schema.sql not found' };
    }

    const sqlScript = fs.readFileSync(schemaPath, 'utf-8');
    // Split statements by semicolon
    const statements = sqlScript
      .replace(/--.*$/gm, '')
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const stmt of statements) {
      await p.query(stmt);
    }

    return { success: true, message: 'MySQL Star Schema initialized successfully.' };
  } catch (err: unknown) {
    return {
      success: false,
      message: `Failed to initialize MySQL schema: ${err instanceof Error ? err.message : String(err)}`
    };
  }
}
