import { RequestHandler } from "express";
import { ApiResponse } from "@shared/api";
import {
  log,
  logServiceHealth,
  logEmailService,
  logSMSService,
  logDatabaseAction,
} from "../middleware/logging";
import { testConnection } from "../database/connection";

interface HealthCheckResult {
  service: string;
  status: "healthy" | "unhealthy" | "degraded";
  responseTime: number;
  message: string;
  details?: any;
}

interface HealthCheckResponse {
  overall: "healthy" | "unhealthy" | "degraded";
  timestamp: string;
  services: HealthCheckResult[];
  environment: string;
  version: string;
}

// Real database health check
const checkDatabaseHealth = async (req?: any): Promise<HealthCheckResult> => {
  const startTime = Date.now();

  try {
    // Test actual database connection
    const isHealthy = await testConnection();
    const responseTime = Date.now() - startTime;

    if (isHealthy) {
      logDatabaseAction(
        "HEALTH_CHECK",
        "connection",
        true,
        { responseTime },
        req,
      );
      logServiceHealth(
        "DATABASE",
        true,
        {
          connectionPool: "active",
          responseTime,
          provider: "NEON",
        },
        req,
      );

      return {
        service: "database",
        status: "healthy",
        responseTime,
        message: "Database connection successful",
        details: {
          provider: "Neon PostgreSQL",
          connectionPool: "active",
          lastQuery: new Date().toISOString(),
          configured: !!process.env.DATABASE_URL,
        },
      };
    } else {
      logDatabaseAction(
        "HEALTH_CHECK",
        "connection",
        false,
        { responseTime },
        req,
      );
      logServiceHealth(
        "DATABASE",
        false,
        {
          error: "Connection failed",
          responseTime,
        },
        req,
      );

      return {
        service: "database",
        status: "unhealthy",
        responseTime,
        message: "Database connection failed",
        details: {
          error: "Connection failed",
          provider: "Neon PostgreSQL",
          configured: !!process.env.DATABASE_URL,
        },
      };
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    logDatabaseAction(
      "HEALTH_CHECK",
      "connection",
      false,
      { error: error.message },
      req,
    );

    return {
      service: "database",
      status: "unhealthy",
      responseTime,
      message: `Database error: ${error.message}`,
      details: {
        error: error.message,
        configured: !!process.env.DATABASE_URL,
      },
    };
  }
};

// Mock email service health check
const checkEmailHealth = async (req?: any): Promise<HealthCheckResult> => {
  const startTime = Date.now();

  try {
    // Simulate Mailtrap API check
    await new Promise((resolve) =>
      setTimeout(resolve, Math.random() * 200 + 100),
    );

    const isHealthy = Math.random() > 0.02; // 98% healthy
    const responseTime = Date.now() - startTime;

    if (isHealthy) {
      logEmailService(
        "HEALTH_CHECK",
        "service@oilsync.com",
        true,
        "MAILTRAP",
        {
          responseTime,
          apiStatus: "operational",
        },
        req,
      );

      return {
        service: "email",
        status: "healthy",
        responseTime,
        message: "Email service operational",
        details: {
          provider: "Mailtrap",
          apiStatus: "operational",
          lastEmailSent: new Date(
            Date.now() - Math.random() * 3600000,
          ).toISOString(),
        },
      };
    } else {
      logEmailService(
        "HEALTH_CHECK",
        "service@oilsync.com",
        false,
        "MAILTRAP",
        {
          responseTime,
          error: "API rate limit exceeded",
        },
        req,
      );

      return {
        service: "email",
        status: "degraded",
        responseTime,
        message: "Email service experiencing issues",
        details: {
          provider: "Mailtrap",
          error: "API rate limit exceeded",
        },
      };
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    logEmailService(
      "HEALTH_CHECK",
      "service@oilsync.com",
      false,
      "MAILTRAP",
      { error: error.message },
      req,
    );

    return {
      service: "email",
      status: "unhealthy",
      responseTime,
      message: `Email service error: ${error.message}`,
    };
  }
};

// Mock SMS service health check
const checkSMSHealth = async (req?: any): Promise<HealthCheckResult> => {
  const startTime = Date.now();

  try {
    // Simulate Twilio API check
    await new Promise((resolve) =>
      setTimeout(resolve, Math.random() * 150 + 75),
    );

    const isHealthy = Math.random() > 0.03; // 97% healthy
    const responseTime = Date.now() - startTime;

    if (isHealthy) {
      logSMSService(
        "HEALTH_CHECK",
        "+15551234567",
        true,
        "TWILIO",
        {
          responseTime,
          accountStatus: "active",
        },
        req,
      );

      return {
        service: "sms",
        status: "healthy",
        responseTime,
        message: "SMS service operational",
        details: {
          provider: "Twilio",
          accountStatus: "active",
          lastSMSSent: new Date(
            Date.now() - Math.random() * 7200000,
          ).toISOString(),
        },
      };
    } else {
      logSMSService(
        "HEALTH_CHECK",
        "+15551234567",
        false,
        "TWILIO",
        {
          responseTime,
          error: "Account verification required",
        },
        req,
      );

      return {
        service: "sms",
        status: "degraded",
        responseTime,
        message: "SMS service needs attention",
        details: {
          provider: "Twilio",
          error: "Account verification required",
        },
      };
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    logSMSService(
      "HEALTH_CHECK",
      "+15551234567",
      false,
      "TWILIO",
      { error: error.message },
      req,
    );

    return {
      service: "sms",
      status: "unhealthy",
      responseTime,
      message: `SMS service error: ${error.message}`,
    };
  }
};

export const handleHealthCheck: RequestHandler = async (req, res) => {
  const startTime = Date.now();

  try {
    log(
      "INFO",
      "HEALTH",
      "Starting comprehensive health check",
      {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development",
      },
      req,
    );

    // Run all health checks in parallel
    const [databaseHealth, emailHealth, smsHealth] = await Promise.all([
      checkDatabaseHealth(req),
      checkEmailHealth(req),
      checkSMSHealth(req),
    ]);

    const services = [databaseHealth, emailHealth, smsHealth];

    // Determine overall health
    const hasUnhealthy = services.some((s) => s.status === "unhealthy");
    const hasDegraded = services.some((s) => s.status === "degraded");

    let overall: "healthy" | "unhealthy" | "degraded";
    if (hasUnhealthy) {
      overall = "unhealthy";
    } else if (hasDegraded) {
      overall = "degraded";
    } else {
      overall = "healthy";
    }

    const totalTime = Date.now() - startTime;

    const healthResponse: HealthCheckResponse = {
      overall,
      timestamp: new Date().toISOString(),
      services,
      environment: process.env.NODE_ENV || "development",
      version: process.env.npm_package_version || "1.0.0",
    };

    log(
      "INFO",
      "HEALTH",
      `Health check completed: ${overall}`,
      {
        overall,
        totalTime,
        serviceCount: services.length,
        healthyServices: services.filter((s) => s.status === "healthy").length,
        degradedServices: services.filter((s) => s.status === "degraded")
          .length,
        unhealthyServices: services.filter((s) => s.status === "unhealthy")
          .length,
      },
      req,
    );

    // Set appropriate HTTP status based on health
    const statusCode =
      overall === "healthy" ? 200 : overall === "degraded" ? 200 : 503;

    res.status(statusCode).json({
      success: overall !== "unhealthy",
      message: `System health: ${overall}`,
      data: healthResponse,
    } as ApiResponse);
  } catch (error) {
    const totalTime = Date.now() - startTime;
    log(
      "ERROR",
      "HEALTH",
      "Health check failed",
      {
        error: error.message,
        totalTime,
      },
      req,
    );

    res.status(500).json({
      success: false,
      message: "Health check failed",
      data: {
        overall: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error.message,
        environment: process.env.NODE_ENV || "development",
      },
    } as ApiResponse);
  }
};

export const handleQuickHealthCheck: RequestHandler = async (req, res) => {
  log("INFO", "HEALTH", "Quick health check requested", undefined, req);

  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
    version: process.env.npm_package_version || "1.0.0",
    message: "Service is running",
  });
};
