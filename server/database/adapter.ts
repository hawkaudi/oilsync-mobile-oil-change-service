import { Pool } from "pg";
import { log } from "../middleware/logging";
import fs from "fs";
import path from "path";

// Database type
type DatabaseType = "postgresql" | "sqlite";

// Abstract database interface
export interface DatabaseAdapter {
  query(sql: string, params?: any[]): Promise<any[]>;
  queryOne(sql: string, params?: any[]): Promise<any | null>;
  close(): Promise<void>;
  type: DatabaseType;
}

// PostgreSQL adapter
class PostgreSQLAdapter implements DatabaseAdapter {
  private pool: Pool;
  public type: DatabaseType = "postgresql";

  private initialized = false;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false }, // Neon requires SSL
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    this.pool.on("error", (err) => {
      console.error(
        "🔴 [DATABASE] PostgreSQL unexpected error on idle client",
        err,
      );
    });
  }

  private async initializeTables(): Promise<void> {
    if (this.initialized) return;

    this.initialized = true; // Set immediately to prevent recursion
    console.log("🔧 [DATABASE] Initializing PostgreSQL tables for Neon...");

    // Create users table
    await this.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(50),
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'customer',
        email_verified BOOLEAN DEFAULT FALSE,
        phone_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create user_sessions table
    await this.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        token_hash VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        user_agent TEXT,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create OTP codes table
    await this.query(`
      CREATE TABLE IF NOT EXISTS otp_codes (
        id VARCHAR(255) PRIMARY KEY,
        identifier VARCHAR(255) NOT NULL,
        code VARCHAR(10) NOT NULL,
        purpose VARCHAR(50) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        attempts INTEGER DEFAULT 0,
        is_used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create vehicle tables
    await this.query(`
      CREATE TABLE IF NOT EXISTS vehicle_makes (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        country VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE
      )
    `);

    await this.query(`
      CREATE TABLE IF NOT EXISTS vehicle_models (
        id VARCHAR(255) PRIMARY KEY,
        make_id VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        year_start INTEGER NOT NULL,
        year_end INTEGER,
        body_type VARCHAR(255) NOT NULL,
        engine_type VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE
      )
    `);

    // Check if we need to seed data
    const makesCount = await this.rawQuery(
      "SELECT COUNT(*) as count FROM vehicle_makes",
    );
    if (parseInt(makesCount.rows[0].count) === 0) {
      await this.seedVehicleData();
    }

    console.log("✅ [DATABASE] PostgreSQL tables initialized successfully");
  }

  private async seedVehicleData(): Promise<void> {
    console.log("🌱 [DATABASE] Seeding vehicle data...");

    // Insert vehicle makes
    const makes = [
      ["audi", "Audi", "Germany"],
      ["volkswagen", "Volkswagen", "Germany"],
      ["porsche", "Porsche", "Germany"],
    ];

    for (const [id, name, country] of makes) {
      await this.rawQuery(
        `
        INSERT INTO vehicle_makes (id, name, country, is_active)
        VALUES ($1, $2, $3, true)
        ON CONFLICT (id) DO NOTHING
      `,
        [id, name, country],
      );
    }

    // Insert vehicle models
    const models = [
      ["audi-a3", "audi", "A3", 2015, "Sedan", "Gasoline"],
      ["audi-a4", "audi", "A4", 2017, "Sedan", "Gasoline"],
      ["audi-a5", "audi", "A5", 2018, "Coupe", "Gasoline"],
      ["audi-q3", "audi", "Q3", 2019, "SUV", "Gasoline"],
      ["audi-q5", "audi", "Q5", 2018, "SUV", "Gasoline"],
      ["vw-golf", "volkswagen", "Golf", 2015, "Hatchback", "Gasoline"],
      ["vw-jetta", "volkswagen", "Jetta", 2019, "Sedan", "Gasoline"],
      ["vw-tiguan", "volkswagen", "Tiguan", 2018, "SUV", "Gasoline"],
      ["porsche-911", "porsche", "911", 2016, "Coupe", "Gasoline"],
      ["porsche-cayenne", "porsche", "Cayenne", 2018, "SUV", "Gasoline"],
      ["porsche-macan", "porsche", "Macan", 2015, "SUV", "Gasoline"],
    ];

    for (const [
      id,
      make_id,
      name,
      year_start,
      body_type,
      engine_type,
    ] of models) {
      await this.rawQuery(
        `
        INSERT INTO vehicle_models (id, make_id, name, year_start, body_type, engine_type, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, true)
        ON CONFLICT (id) DO NOTHING
      `,
        [id, make_id, name, year_start, body_type, engine_type],
      );
    }

    console.log("✅ [DATABASE] Vehicle data seeded successfully");
  }

  private async rawQuery(sql: string, params: any[] = []): Promise<any> {
    const client = await this.pool.connect();
    try {
      return await client.query(sql, params);
    } finally {
      client.release();
    }
  }

  async query(sql: string, params: any[] = []): Promise<any[]> {
    await this.initializeTables();

    const client = await this.pool.connect();
    try {
      const result = await client.query(sql, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async queryOne(sql: string, params: any[] = []): Promise<any | null> {
    const results = await this.query(sql, params);
    return results.length > 0 ? results[0] : null;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

// In-memory storage adapter (for development)
class MemoryAdapter implements DatabaseAdapter {
  private data: { [tableName: string]: any[] } = {};
  public type: DatabaseType = "sqlite";

  constructor() {
    this.initializeData();
  }

  private initializeData(): void {
    // Initialize with vehicle data
    this.data.vehicle_makes = [
      { id: "audi", name: "Audi", country: "Germany", is_active: true },
      {
        id: "volkswagen",
        name: "Volkswagen",
        country: "Germany",
        is_active: true,
      },
      { id: "porsche", name: "Porsche", country: "Germany", is_active: true },
    ];

    this.data.vehicle_models = [
      {
        id: "audi-a3",
        make_id: "audi",
        name: "A3",
        year_start: 2015,
        body_type: "Sedan",
        engine_type: "Gasoline",
        is_active: true,
      },
      {
        id: "audi-a4",
        make_id: "audi",
        name: "A4",
        year_start: 2017,
        body_type: "Sedan",
        engine_type: "Gasoline",
        is_active: true,
      },
      {
        id: "audi-a5",
        make_id: "audi",
        name: "A5",
        year_start: 2018,
        body_type: "Coupe",
        engine_type: "Gasoline",
        is_active: true,
      },
      {
        id: "audi-q3",
        make_id: "audi",
        name: "Q3",
        year_start: 2019,
        body_type: "SUV",
        engine_type: "Gasoline",
        is_active: true,
      },
      {
        id: "audi-q5",
        make_id: "audi",
        name: "Q5",
        year_start: 2018,
        body_type: "SUV",
        engine_type: "Gasoline",
        is_active: true,
      },
      {
        id: "vw-golf",
        make_id: "volkswagen",
        name: "Golf",
        year_start: 2015,
        body_type: "Hatchback",
        engine_type: "Gasoline",
        is_active: true,
      },
      {
        id: "vw-jetta",
        make_id: "volkswagen",
        name: "Jetta",
        year_start: 2019,
        body_type: "Sedan",
        engine_type: "Gasoline",
        is_active: true,
      },
      {
        id: "vw-tiguan",
        make_id: "volkswagen",
        name: "Tiguan",
        year_start: 2018,
        body_type: "SUV",
        engine_type: "Gasoline",
        is_active: true,
      },
      {
        id: "porsche-911",
        make_id: "porsche",
        name: "911",
        year_start: 2016,
        body_type: "Coupe",
        engine_type: "Gasoline",
        is_active: true,
      },
      {
        id: "porsche-cayenne",
        make_id: "porsche",
        name: "Cayenne",
        year_start: 2018,
        body_type: "SUV",
        engine_type: "Gasoline",
        is_active: true,
      },
      {
        id: "porsche-macan",
        make_id: "porsche",
        name: "Macan",
        year_start: 2015,
        body_type: "SUV",
        engine_type: "Gasoline",
        is_active: true,
      },
    ];

    // Add a test user for login testing (password: "test123")
    this.data.users = [
      {
        id: "test-user-1",
        first_name: "Test",
        last_name: "User",
        email: "test@test.com",
        phone: "5551234567",
        password_hash:
          "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeGuftXBqjGJCJEg6", // test123
        role: "customer",
        email_verified: true,
        phone_verified: true,
        created_at: "2025-01-01T00:00:00.000Z",
        updated_at: "2025-01-01T00:00:00.000Z",
      },
    ];

    // Initialize empty tables for other data
    this.data.user_sessions = [];
    this.data.otp_codes = [];

    console.log("🟢 [DATABASE] Test user available:", {
      email: "test@test.com",
      password: "test123",
      role: "customer",
    });

    console.log(
      "🟢 [DATABASE] In-memory storage initialized with vehicle data",
    );
  }

  async query(sql: string, params: any[] = []): Promise<any[]> {
    try {
      // Simple SQL parsing for basic operations
      const sqlLower = sql.toLowerCase().trim();

      if (sqlLower.startsWith("select")) {
        return this.handleSelect(sql, params);
      } else if (sqlLower.startsWith("insert")) {
        return this.handleInsert(sql, params);
      } else if (sqlLower.startsWith("update")) {
        return this.handleUpdate(sql, params);
      } else if (sqlLower === "select 1") {
        return [{ "1": 1 }];
      }

      return [];
    } catch (error) {
      console.error("Memory query error:", error);
      throw error;
    }
  }

  private handleSelect(sql: string, params: any[] = []): any[] {
    // Extract table name
    const tableMatch = sql.match(/from\s+(\w+)/i);
    if (!tableMatch) return [];

    const tableName = tableMatch[1];
    const data = this.data[tableName] || [];

    // Handle WHERE clauses for common patterns
    if (sql.includes("WHERE")) {
      if (sql.includes("is_active = true") || sql.includes("is_active = ?")) {
        return data.filter((row) => row.is_active === true);
      }
      if (sql.includes("make_id = ?") && params.length > 0) {
        return data.filter((row) => row.make_id === params[0]);
      }
      if (sql.includes("email = ?") && params.length > 0) {
        return data.filter((row) => row.email === params[0]);
      }
      if (sql.includes("id = ?") && params.length > 0) {
        return data.filter((row) => row.id === params[0]);
      }
      if (sql.includes("user_id = ?") && params.length > 0) {
        return data.filter((row) => row.user_id === params[0]);
      }
      if (sql.includes("expires_at >")) {
        const now = new Date().toISOString();
        return data.filter((row) => row.expires_at > now);
      }
    }

    return data;
  }

  private handleInsert(sql: string, params: any[] = []): any[] {
    // Extract table name
    const tableMatch = sql.match(/into\s+(\w+)/i);
    if (!tableMatch) return [];

    const tableName = tableMatch[1];
    if (!this.data[tableName]) {
      this.data[tableName] = [];
    }

    // Handle users table
    if (tableName === "users" && params.length >= 7) {
      const user = {
        id: params[0],
        first_name: params[1],
        last_name: params[2],
        email: params[3],
        phone: params[4],
        password_hash: params[5],
        role: params[6],
        email_verified: false,
        phone_verified: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.data[tableName].push(user);
    }

    // Handle user_sessions table
    if (tableName === "user_sessions" && params.length >= 6) {
      const session = {
        id: params[0],
        user_id: params[1],
        token_hash: params[2],
        expires_at: params[3],
        user_agent: params[4],
        ip_address: params[5],
        created_at: new Date().toISOString(),
      };
      this.data[tableName].push(session);
    }

    // Handle otp_codes table
    if (tableName === "otp_codes" && params.length >= 4) {
      const otp = {
        id: params[0],
        identifier: params[1],
        code: params[2],
        purpose: params[3],
        expires_at: params[4],
        attempts: 0,
        is_used: false,
        created_at: new Date().toISOString(),
      };
      this.data[tableName].push(otp);
    }

    return [];
  }

  private handleUpdate(sql: string, params: any[] = []): any[] {
    // Extract table name
    const tableMatch = sql.match(/update\s+(\w+)/i);
    if (!tableMatch) return [];

    const tableName = tableMatch[1];
    const data = this.data[tableName] || [];

    if (sql.includes("email_verified = ?") && params.length >= 2) {
      const verified = params[0];
      const id = params[1];
      const user = data.find((u) => u.id === id);
      if (user) {
        user.email_verified = verified;
        user.updated_at = new Date().toISOString();
      }
    }

    if (sql.includes("phone_verified = ?") && params.length >= 2) {
      const verified = params[0];
      const id = params[1];
      const user = data.find((u) => u.id === id);
      if (user) {
        user.phone_verified = verified;
        user.updated_at = new Date().toISOString();
      }
    }

    if (sql.includes("password_hash = ?") && params.length >= 2) {
      const passwordHash = params[0];
      const id = params[1];
      const user = data.find((u) => u.id === id);
      if (user) {
        user.password_hash = passwordHash;
        user.updated_at = new Date().toISOString();
      }
    }

    return [];
  }

  async queryOne(sql: string, params: any[] = []): Promise<any | null> {
    const results = await this.query(sql, params);
    return results.length > 0 ? results[0] : null;
  }

  async close(): Promise<void> {
    // Nothing to close for in-memory storage
  }
}

// Database factory
let dbAdapter: DatabaseAdapter | null = null;

export const getDatabaseAdapter = async (): Promise<DatabaseAdapter> => {
  if (dbAdapter) {
    return dbAdapter;
  }

  const databaseUrl = process.env.DATABASE_URL;

  console.log("🔍 [NETLIFY_DEBUG] Initializing database adapter");
  console.log("🔍 [NETLIFY_DEBUG] DATABASE_URL exists:", !!databaseUrl);
  console.log(
    "🔍 [NETLIFY_DEBUG] DATABASE_URL starts with postgresql://:",
    databaseUrl && databaseUrl.startsWith("postgresql://"),
  );

  if (databaseUrl && databaseUrl.startsWith("postgresql://")) {
    try {
      console.log("🔍 [NETLIFY_DEBUG] Attempting PostgreSQL connection");
      dbAdapter = new PostgreSQLAdapter(databaseUrl);
      // Test the connection
      await dbAdapter.query("SELECT NOW()");
      console.log("🟢 [DATABASE] PostgreSQL adapter initialized successfully");
      console.log("🟢 [NETLIFY_DEBUG] PostgreSQL connection successful");
      return dbAdapter;
    } catch (error) {
      console.warn(
        "🟡 [DATABASE] PostgreSQL connection failed, falling back to SQLite:",
        error.message,
      );
      console.warn("🟡 [NETLIFY_DEBUG] PostgreSQL error:", error);
    }
  } else {
    console.log(
      "🔍 [NETLIFY_DEBUG] No valid PostgreSQL URL, using in-memory database",
    );
  }

  // Fallback to in-memory storage for development
  console.log("🔍 [NETLIFY_DEBUG] Initializing in-memory database");
  dbAdapter = new MemoryAdapter();
  await dbAdapter.query("SELECT 1"); // Test query to initialize
  console.log("🟢 [DATABASE] In-memory adapter initialized successfully");
  console.log("🟢 [NETLIFY_DEBUG] In-memory database ready");
  return dbAdapter;
};

export const closeDatabase = async (): Promise<void> => {
  if (dbAdapter) {
    await dbAdapter.close();
    dbAdapter = null;
  }
};
