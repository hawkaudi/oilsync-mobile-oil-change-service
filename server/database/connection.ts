import { Pool, PoolClient } from "pg";
import { log } from "../middleware/logging";

// Database connection pool
let pool: Pool | null = null;

export const getPool = (): Pool => {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      console.error(
        "🔴 [DATABASE] DATABASE_URL environment variable is required",
      );
      throw new Error("DATABASE_URL environment variable is required");
    }

    pool = new Pool({
      connectionString,
      ssl:
        process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false }
          : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pool.on("error", (err) => {
      console.error("🔴 [DATABASE] Unexpected error on idle client", err);
    });

    console.log("🔵 [DATABASE] Pool created successfully");
  }

  return pool;
};

export const executeQuery = async <T = any>(
  text: string,
  params?: any[],
  req?: any,
): Promise<T[]> => {
  const pool = getPool();
  const client = await pool.connect();

  try {
    const start = Date.now();
    const result = await client.query(text, params);
    const duration = Date.now() - start;

    log(
      "DEBUG",
      "DATABASE",
      `Query executed in ${duration}ms`,
      {
        query: text.replace(/\s+/g, " ").trim(),
        params: params?.length || 0,
        rows: result.rows.length,
        duration,
      },
      req,
    );

    return result.rows;
  } catch (error) {
    log(
      "ERROR",
      "DATABASE",
      "Query execution failed",
      {
        query: text.replace(/\s+/g, " ").trim(),
        params: params?.length || 0,
        error: error.message,
      },
      req,
    );
    throw error;
  } finally {
    client.release();
  }
};

export const executeQuerySingle = async <T = any>(
  text: string,
  params?: any[],
  req?: any,
): Promise<T | null> => {
  const results = await executeQuery<T>(text, params, req);
  return results.length > 0 ? results[0] : null;
};

export const testConnection = async (): Promise<boolean> => {
  try {
    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query("SELECT NOW()");
      console.log("🟢 [DATABASE] Connection test successful");
      return true;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("🔴 [DATABASE] Connection test failed:", error.message);
    return false;
  }
};

export const closePool = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    pool = null;
    console.log("🔵 [DATABASE] Pool closed");
  }
};
