import { Request, Response, NextFunction } from "express";

// Custom logging interface for structured logs
interface LogEntry {
  timestamp: string;
  level: "INFO" | "WARN" | "ERROR" | "DEBUG";
  service: string;
  message: string;
  metadata?: any;
  requestId?: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
}

// Generate unique request ID
const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Enhanced logging function
export const log = (
  level: LogEntry["level"],
  service: string,
  message: string,
  metadata?: any,
  req?: Request,
) => {
  const logEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    service,
    message,
    metadata,
    requestId: req?.requestId,
    userId: req?.user?.id, // Assuming user is attached to request after auth
    ip: req?.ip || req?.connection?.remoteAddress,
    userAgent: req?.get("User-Agent"),
  };

  // Console logging with colors for development
  const colors = {
    INFO: "\x1b[36m", // Cyan
    WARN: "\x1b[33m", // Yellow
    ERROR: "\x1b[31m", // Red
    DEBUG: "\x1b[90m", // Gray
    RESET: "\x1b[0m",
  };

  const colorCode = colors[level] || colors.RESET;
  const logMessage = `${colorCode}[${logEntry.timestamp}] ${level} [${service}] ${message}${colors.RESET}`;

  if (metadata) {
    console.log(logMessage, JSON.stringify(metadata, null, 2));
  } else {
    console.log(logMessage);
  }

  // Always send to external logger (Netlify needs this for all environments)
  sendToExternalLogger(logEntry);
};

// Middleware to add request ID and logging
export const requestLoggingMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Add request ID
  req.requestId = generateRequestId();

  // Log incoming request
  log(
    "INFO",
    "HTTP",
    `${req.method} ${req.path}`,
    {
      query: req.query,
      body:
        req.method !== "GET" && req.body && Object.keys(req.body).length > 0
          ? sanitizeBody(req.body)
          : undefined,
    },
    req,
  );

  // Log response when request completes
  const originalSend = res.send;
  res.send = function (data) {
    log(
      "INFO",
      "HTTP",
      `${req.method} ${req.path} - ${res.statusCode}`,
      {
        statusCode: res.statusCode,
        responseTime: Date.now() - req.startTime,
      },
      req,
    );
    return originalSend.call(this, data);
  };

  // Add start time for response time calculation
  req.startTime = Date.now();

  next();
};

// Error handling middleware
export const errorHandlingMiddleware = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  log(
    "ERROR",
    "HTTP",
    `Unhandled error: ${error.message}`,
    {
      stack: error.stack,
      path: req.path,
      method: req.method,
      body: sanitizeBody(req.body),
    },
    req,
  );

  // Don't expose internal errors in production
  const message =
    process.env.NODE_ENV === "production"
      ? "Internal server error"
      : error.message;

  res.status(500).json({
    success: false,
    message,
    requestId: req.requestId,
  });
};

// Sanitize request body for logging (remove sensitive information)
const sanitizeBody = (body: any): any => {
  if (!body || typeof body !== "object") return body;

  const sensitiveFields = [
    "password",
    "token",
    "authorization",
    "secret",
    "key",
  ];
  const sanitized = { ...body };

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = "[REDACTED]";
    }
  }

  return sanitized;
};

// Send logs to external service (Netlify optimized)
const sendToExternalLogger = (logEntry: LogEntry) => {
  // For Netlify Functions, ensure all logs go to stdout/stderr for proper capture
  if (process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    // Use different console methods based on log level for better filtering in Netlify
    switch (logEntry.level) {
      case "ERROR":
        console.error(
          `🔴 [${logEntry.service}] ${logEntry.message}`,
          JSON.stringify({
            timestamp: logEntry.timestamp,
            metadata: logEntry.metadata,
            requestId: logEntry.requestId,
            userId: logEntry.userId,
          }),
        );
        break;
      case "WARN":
        console.warn(
          `🟡 [${logEntry.service}] ${logEntry.message}`,
          JSON.stringify({
            timestamp: logEntry.timestamp,
            metadata: logEntry.metadata,
            requestId: logEntry.requestId,
          }),
        );
        break;
      case "INFO":
        console.info(
          `🔵 [${logEntry.service}] ${logEntry.message}`,
          JSON.stringify({
            timestamp: logEntry.timestamp,
            metadata: logEntry.metadata,
            requestId: logEntry.requestId,
          }),
        );
        break;
      case "DEBUG":
        console.debug(
          `⚪ [${logEntry.service}] ${logEntry.message}`,
          JSON.stringify({
            timestamp: logEntry.timestamp,
            metadata: logEntry.metadata,
          }),
        );
        break;
    }
  }
};

// Database operation logging helper
export const logDatabaseOperation = (
  operation: string,
  table: string,
  metadata?: any,
  req?: Request,
) => {
  log("DEBUG", "DATABASE", `${operation} on ${table}`, metadata, req);
};

// Authentication operation logging helper
export const logAuthOperation = (
  operation: string,
  identifier: string,
  success: boolean,
  req?: Request,
) => {
  const level = success ? "INFO" : "WARN";
  log(
    level,
    "AUTH",
    `${operation} for ${identifier}: ${success ? "SUCCESS" : "FAILED"}`,
    undefined,
    req,
  );
};

// Business logic operation logging helper
export const logBusinessOperation = (
  operation: string,
  details: string,
  metadata?: any,
  req?: Request,
) => {
  log("INFO", "BUSINESS", `${operation}: ${details}`, metadata, req);
};

// Performance monitoring helper
export const logPerformance = (
  operation: string,
  duration: number,
  req?: Request,
) => {
  const level = duration > 1000 ? "WARN" : "INFO"; // Warn if operation takes more than 1 second
  log(
    level,
    "PERFORMANCE",
    `${operation} completed in ${duration}ms`,
    undefined,
    req,
  );
};

// Service-specific logging helpers
export const logDatabaseAction = (
  operation: string,
  table: string,
  success: boolean,
  metadata?: any,
  req?: Request,
) => {
  const level = success ? "INFO" : "ERROR";
  log(
    level,
    "DATABASE",
    `${operation} ${table}: ${success ? "SUCCESS" : "FAILED"}`,
    {
      operation,
      table,
      success,
      ...metadata,
    },
    req,
  );
};

export const logEmailService = (
  action: string,
  recipient: string,
  success: boolean,
  provider: string = "MAILTRAP",
  metadata?: any,
  req?: Request,
) => {
  const level = success ? "INFO" : "ERROR";
  log(
    level,
    provider,
    `${action} to ${recipient}: ${success ? "SUCCESS" : "FAILED"}`,
    {
      action,
      recipient: recipient.replace(/(.{2}).*(@.*)/, "$1***$2"), // Mask email for privacy
      success,
      provider,
      ...metadata,
    },
    req,
  );
};

export const logSMSService = (
  action: string,
  phoneNumber: string,
  success: boolean,
  provider: string = "TWILIO",
  metadata?: any,
  req?: Request,
) => {
  const level = success ? "INFO" : "ERROR";
  log(
    level,
    provider,
    `${action} to ${phoneNumber}: ${success ? "SUCCESS" : "FAILED"}`,
    {
      action,
      phoneNumber: phoneNumber.replace(/(\d{3}).*(\d{4})/, "$1***$2"), // Mask phone for privacy
      success,
      provider,
      ...metadata,
    },
    req,
  );
};

export const logServiceHealth = (
  service: string,
  healthy: boolean,
  metadata?: any,
  req?: Request,
) => {
  const level = healthy ? "INFO" : "ERROR";
  log(
    level,
    "HEALTH",
    `${service} health check: ${healthy ? "HEALTHY" : "UNHEALTHY"}`,
    {
      service,
      healthy,
      ...metadata,
    },
    req,
  );
};

export const logAPICall = (
  endpoint: string,
  method: string,
  statusCode: number,
  duration: number,
  req?: Request,
) => {
  const level = statusCode >= 400 ? "WARN" : "INFO";
  log(
    level,
    "API",
    `${method} ${endpoint} - ${statusCode} (${duration}ms)`,
    {
      endpoint,
      method,
      statusCode,
      duration,
    },
    req,
  );
};

// Export types for use in other files
export type { LogEntry };

// Declare global types for Express Request
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      startTime?: number;
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}
