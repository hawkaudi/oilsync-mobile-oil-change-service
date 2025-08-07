import { getDatabaseAdapter } from "../database/adapter";
import { log } from "../middleware/logging";

export interface VehicleMake {
  id: string;
  name: string;
  country: string;
  is_active: boolean;
}

export interface VehicleModel {
  id: string;
  make_id: string;
  name: string;
  year_start: number;
  year_end?: number;
  body_type: string;
  engine_type: string;
  is_active: boolean;
}

export interface VehicleVariant {
  id: string;
  model_id: string;
  trim_level: string;
  engine_size: string;
  transmission: string;
  drivetrain: string;
  year: number;
}

// Comprehensive VIN decoder for Audi, VW, Porsche (VAG Group)
export const decodeVAGVIN = (
  vin: string,
): {
  make: string;
  model: string;
  year: string;
  engine?: string;
  transmission?: string;
} | null => {
  if (vin.length !== 17) return null;

  // World Manufacturer Identifier (WMI) - first 3 characters
  const wmi = vin.substring(0, 3);

  // VAG Group manufacturer codes
  const manufacturers: { [key: string]: string } = {
    // Volkswagen
    WVW: "Volkswagen",
    "1VW": "Volkswagen",
    "3VW": "Volkswagen",
    WV1: "Volkswagen Commercial",
    WV2: "Volkswagen Commercial",

    // Audi
    WAU: "Audi",
    TRU: "Audi",
    WA1: "Audi",

    // Porsche
    WP0: "Porsche",
    WP1: "Porsche",
    "1PM": "Porsche",
  };

  const make = manufacturers[wmi];
  if (!make) return null;

  // Vehicle Descriptor Section (VDS) - positions 4-9
  const modelCode = vin.substring(3, 6);
  const year = getYearFromVIN(vin.charAt(9));

  // Decode model based on manufacturer and model code
  let model = "Unknown";

  if (make.includes("Volkswagen")) {
    const vwModels: { [key: string]: string } = {
      "5K1": "Golf",
      "1K1": "Golf",
      AV2: "Golf",
      "1T1": "Touran",
      "1T3": "Touran",
      "321": "Jetta",
      "163": "Jetta",
      "1B3": "Passat",
      "3C2": "Passat",
      "5N1": "Tiguan",
      "5N2": "Tiguan",
    };
    model = vwModels[modelCode] || "Unknown VW Model";
  } else if (make === "Audi") {
    const audiModels: { [key: string]: string } = {
      "8V1": "A3",
      "8V3": "A3 Sportback",
      "8W2": "A4",
      "8W5": "A4 Avant",
      F53: "A5",
      F5A: "A5 Sportback",
      "8U3": "Q3",
      "8UB": "Q3",
      FY3: "Q5",
      FYB: "Q5",
    };
    model = audiModels[modelCode] || "Unknown Audi Model";
  } else if (make === "Porsche") {
    const porscheModels: { [key: string]: string } = {
      "911": "911",
      "997": "911",
      "991": "911",
      "992": "911",
      E2A: "Cayenne",
      E2B: "Cayenne",
      E3A: "Cayenne",
      E3B: "Cayenne",
      "95B": "Macan",
    };
    model = porscheModels[modelCode] || "Unknown Porsche Model";
  }

  return {
    make,
    model,
    year: year.toString(),
  };
};

// Helper function to decode year from VIN
const getYearFromVIN = (yearChar: string): number => {
  const yearMap: { [key: string]: number } = {
    A: 2010,
    B: 2011,
    C: 2012,
    D: 2013,
    E: 2014,
    F: 2015,
    G: 2016,
    H: 2017,
    J: 2018,
    K: 2019,
    L: 2020,
    M: 2021,
    N: 2022,
    P: 2023,
    R: 2024,
    S: 2025,
  };

  return yearMap[yearChar] || new Date().getFullYear();
};

// Database functions using the adapter
export const getVehicleMakes = async (req?: any): Promise<VehicleMake[]> => {
  try {
    log(
      "DEBUG",
      "VEHICLE_SERVICE",
      "Fetching vehicle makes from database",
      {},
      req,
    );

    const db = await getDatabaseAdapter();
    const makes = await db.query(
      "SELECT * FROM vehicle_makes WHERE is_active = true ORDER BY name",
    );

    log(
      "DEBUG",
      "VEHICLE_SERVICE",
      `Successfully fetched ${makes.length} vehicle makes`,
      {
        count: makes.length,
        dbType: db.type,
      },
      req,
    );

    return makes.map((make) => ({
      id: make.id,
      name: make.name,
      country: make.country,
      is_active: make.is_active,
    }));
  } catch (error) {
    log(
      "ERROR",
      "VEHICLE_SERVICE",
      "Failed to fetch vehicle makes",
      {
        error: error.message,
        stack: error.stack,
      },
      req,
    );
    throw new Error(`Failed to fetch vehicle makes: ${error.message}`);
  }
};

export const getVehicleModelsByMake = async (
  makeId: string,
  req?: any,
): Promise<VehicleModel[]> => {
  try {
    log(
      "DEBUG",
      "VEHICLE_SERVICE",
      "Fetching vehicle models by make",
      { makeId },
      req,
    );

    const db = await getDatabaseAdapter();
    const models = await db.query(
      "SELECT * FROM vehicle_models WHERE make_id = ? AND is_active = true ORDER BY name",
      [makeId],
    );

    log(
      "DEBUG",
      "VEHICLE_SERVICE",
      `Successfully fetched ${models.length} models for make ${makeId}`,
      {
        makeId,
        count: models.length,
        dbType: db.type,
      },
      req,
    );

    return models.map((model) => ({
      id: model.id,
      make_id: model.make_id,
      name: model.name,
      year_start: model.year_start,
      year_end: model.year_end,
      body_type: model.body_type,
      engine_type: model.engine_type,
      is_active: model.is_active,
    }));
  } catch (error) {
    log(
      "ERROR",
      "VEHICLE_SERVICE",
      "Failed to fetch vehicle models",
      {
        makeId,
        error: error.message,
      },
      req,
    );
    throw new Error(`Failed to fetch vehicle models: ${error.message}`);
  }
};

export const getVehicleVariantsByModel = async (
  modelId: string,
  req?: any,
): Promise<VehicleVariant[]> => {
  try {
    log(
      "DEBUG",
      "VEHICLE_SERVICE",
      "Fetching vehicle variants by model",
      { modelId },
      req,
    );

    const db = await getDatabaseAdapter();
    const variants = await db.query(
      "SELECT * FROM vehicle_variants WHERE model_id = ? ORDER BY year DESC, trim_level",
      [modelId],
    );

    log(
      "DEBUG",
      "VEHICLE_SERVICE",
      `Successfully fetched ${variants.length} variants for model ${modelId}`,
      {
        modelId,
        count: variants.length,
        dbType: db.type,
      },
      req,
    );

    return variants;
  } catch (error) {
    log(
      "ERROR",
      "VEHICLE_SERVICE",
      "Failed to fetch vehicle variants",
      {
        modelId,
        error: error.message,
      },
      req,
    );
    throw new Error(`Failed to fetch vehicle variants: ${error.message}`);
  }
};

export const testDatabaseConnection = async (
  req?: any,
): Promise<{
  success: boolean;
  dbType: string;
  message: string;
  error?: string;
}> => {
  try {
    const db = await getDatabaseAdapter();
    await db.query("SELECT 1");

    return {
      success: true,
      dbType: db.type,
      message: `Database connection successful (${db.type})`,
    };
  } catch (error) {
    return {
      success: false,
      dbType: "unknown",
      message: "Database connection failed",
      error: error.message,
    };
  }
};
