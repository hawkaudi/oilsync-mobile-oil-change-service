import { RequestHandler } from "express";
import {
  getVehicleMakes,
  getVehicleModelsByMake,
  getVehicleVariantsByModel,
  testDatabaseConnection,
} from "../services/vehicleService";
import { log } from "../middleware/logging";

export const handleTestVehicleAPI: RequestHandler = async (req, res) => {
  log("DEBUG", "VEHICLE", "Test endpoint called", {}, req);
  res.setHeader("Content-Type", "application/json");

  try {
    const connectionTest = await testDatabaseConnection(req);

    if (connectionTest.success) {
      log(
        "INFO",
        "VEHICLE",
        "Database test successful",
        {
          dbType: connectionTest.dbType,
        },
        req,
      );

      res.json({
        success: true,
        message: "Vehicle API working correctly",
        database: connectionTest,
        timestamp: new Date().toISOString(),
      });
    } else {
      log(
        "WARN",
        "VEHICLE",
        "Database test failed",
        {
          error: connectionTest.error,
        },
        req,
      );

      res.json({
        success: false,
        message: "Database connection failed",
        database: connectionTest,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    log(
      "ERROR",
      "VEHICLE",
      "Test endpoint error",
      {
        error: error.message,
      },
      req,
    );

    res.json({
      success: false,
      message: "Vehicle API test failed",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

export const handleGetVehicleMakes: RequestHandler = async (req, res) => {
  log("INFO", "VEHICLE", "Fetching vehicle makes", {}, req);
  res.setHeader("Content-Type", "application/json");

  try {
    const makes = await getVehicleMakes(req);

    log(
      "INFO",
      "VEHICLE",
      "Vehicle makes fetched successfully",
      {
        count: makes.length,
      },
      req,
    );

    res.json({
      success: true,
      data: makes,
      message: `Found ${makes.length} vehicle makes`,
    });
  } catch (error) {
    log(
      "ERROR",
      "VEHICLE",
      "Failed to fetch vehicle makes",
      {
        error: error.message,
        stack: error.stack,
      },
      req,
    );

    res.json({
      success: false,
      message: "Failed to fetch vehicle makes",
      error: error.message,
      data: [],
    });
  }
};

export const handleGetVehicleModels: RequestHandler = async (req, res) => {
  const { makeId } = req.params;

  log("INFO", "VEHICLE", "Fetching vehicle models", { makeId }, req);
  res.setHeader("Content-Type", "application/json");

  if (!makeId) {
    log("WARN", "VEHICLE", "Missing makeId parameter", {}, req);
    return res.status(400).json({
      success: false,
      message: "makeId parameter is required",
      data: [],
    });
  }

  try {
    const models = await getVehicleModelsByMake(makeId, req);

    log(
      "INFO",
      "VEHICLE",
      "Vehicle models fetched successfully",
      {
        makeId,
        count: models.length,
      },
      req,
    );

    res.json({
      success: true,
      data: models,
      message: `Found ${models.length} models for ${makeId}`,
    });
  } catch (error) {
    log(
      "ERROR",
      "VEHICLE",
      "Failed to fetch vehicle models",
      {
        makeId,
        error: error.message,
      },
      req,
    );

    res.json({
      success: false,
      message: "Failed to fetch vehicle models",
      error: error.message,
      data: [],
    });
  }
};

export const handleGetVehicleVariants: RequestHandler = async (req, res) => {
  const { modelId } = req.params;

  log("INFO", "VEHICLE", "Fetching vehicle variants", { modelId }, req);
  res.setHeader("Content-Type", "application/json");

  if (!modelId) {
    log("WARN", "VEHICLE", "Missing modelId parameter", {}, req);
    return res.status(400).json({
      success: false,
      message: "modelId parameter is required",
      data: [],
    });
  }

  try {
    const variants = await getVehicleVariantsByModel(modelId, req);

    log(
      "INFO",
      "VEHICLE",
      "Vehicle variants fetched successfully",
      {
        modelId,
        count: variants.length,
      },
      req,
    );

    res.json({
      success: true,
      data: variants,
      message: `Found ${variants.length} variants for ${modelId}`,
    });
  } catch (error) {
    log(
      "ERROR",
      "VEHICLE",
      "Failed to fetch vehicle variants",
      {
        modelId,
        error: error.message,
      },
      req,
    );

    res.json({
      success: false,
      message: "Failed to fetch vehicle variants",
      error: error.message,
      data: [],
    });
  }
};
