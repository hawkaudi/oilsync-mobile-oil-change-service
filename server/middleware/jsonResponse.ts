import { Request, Response, NextFunction } from "express";

// Middleware to ensure all API responses are proper JSON format
export const ensureJsonResponse = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const originalJson = res.json;
  const originalSend = res.send;

  // Override res.json to add debugging
  res.json = function (obj: any) {
    console.log(
      `🔍 [NETLIFY_DEBUG] API Response for ${req.method} ${req.path}:`,
    );
    console.log(`🔍 [NETLIFY_DEBUG] Status: ${res.statusCode}`);
    console.log(`🔍 [NETLIFY_DEBUG] Response type: ${typeof obj}`);
    console.log(`🔍 [NETLIFY_DEBUG] Response data:`, obj);

    // Ensure Content-Type is set correctly
    res.setHeader("Content-Type", "application/json; charset=utf-8");

    try {
      const jsonString = JSON.stringify(obj);
      console.log(
        `🔍 [NETLIFY_DEBUG] JSON string length: ${jsonString.length}`,
      );
      console.log(
        `🔍 [NETLIFY_DEBUG] JSON valid: ${jsonString.startsWith("{") || jsonString.startsWith("[")}`,
      );

      return originalJson.call(this, obj);
    } catch (error) {
      console.error(`💥 [NETLIFY_DEBUG] JSON stringify error:`, error);
      console.error(`💥 [NETLIFY_DEBUG] Object that failed:`, obj);

      // Fallback to error response
      return originalJson.call(this, {
        success: false,
        message: "JSON serialization error",
        error: error.message,
      });
    }
  };

  // Override res.send to detect non-JSON responses
  res.send = function (data: any) {
    if (req.path.startsWith("/api/") || req.path.startsWith("/auth/")) {
      console.log(
        `⚠️ [NETLIFY_DEBUG] res.send() called for API route ${req.path}`,
      );
      console.log(`⚠️ [NETLIFY_DEBUG] Data type: ${typeof data}`);
      console.log(`⚠️ [NETLIFY_DEBUG] Data:`, data);

      // If it's not JSON, log a warning
      if (
        typeof data === "string" &&
        !data.startsWith("{") &&
        !data.startsWith("[")
      ) {
        console.warn(
          `⚠️ [NETLIFY_DEBUG] Non-JSON response detected for API route!`,
        );
        console.warn(
          `⚠️ [NETLIFY_DEBUG] This might cause JSON.parse errors on the client`,
        );
      }
    }

    return originalSend.call(this, data);
  };

  next();
};

// Error handler for JSON parsing errors
export const handleJsonParseErrors = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  console.error(`💥 [NETLIFY_DEBUG] Request error caught:`, error);
  console.error(`💥 [NETLIFY_DEBUG] Request path:`, req.path);
  console.error(`💥 [NETLIFY_DEBUG] Request method:`, req.method);
  console.error(`💥 [NETLIFY_DEBUG] Request headers:`, req.headers);
  console.error(`💥 [NETLIFY_DEBUG] Request body:`, req.body);

  if (error instanceof SyntaxError && "body" in error) {
    console.error(`💥 [NETLIFY_DEBUG] JSON parse error in request body`);
    return res.status(400).json({
      success: false,
      message: "Invalid JSON in request body",
      error: error.message,
    });
  }

  // Generic error response
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: error.message,
    debug: {
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString(),
    },
  });
};
