import "dotenv/config";
import express from "express";
import cors from "cors";
import {
  requestLoggingMiddleware,
  errorHandlingMiddleware,
  log,
} from "./middleware/logging";
import {
  ensureJsonResponse,
  handleJsonParseErrors,
} from "./middleware/jsonResponse";
import { handleDemo } from "./routes/demo";
import {
  handleLogin,
  handleRegister,
  handleSendOTP,
  handleVerifyOTP,
  handleResetPassword,
} from "./routes/auth";
import {
  handleCreateBooking,
  handleGetBookings,
  handleGetBooking,
  handleUpdateBookingStatus,
  handleCancelBooking,
} from "./routes/booking";
import {
  handleGetTechnicians,
  handleGetTechnician,
  handleUpdateTechnicianStatus,
  handleCreateTechnician,
  handleDeleteTechnician,
} from "./routes/technicians";
import { handleHealthCheck, handleQuickHealthCheck } from "./routes/health";
import { handleTestServices, handleTestLogs } from "./routes/test";
import { handleGetLastOTP, handleShowConfig } from "./routes/dev";
import {
  handleVerifyEmail,
  handleVerifyPhone,
  handleSeedAccounts,
} from "./routes/emailVerification";
import {
  handleGetVehicleMakes,
  handleGetVehicleModels,
  handleGetVehicleVariants,
  handleTestVehicleAPI,
} from "./routes/vehicles";
import {
  handleGetUserProfile,
  handleUpdateVerificationStatus,
  handleTestProfileAPI,
} from "./routes/profile";

export function createServer() {
  const app = express();

  // Logging middleware (must be first)
  app.use(requestLoggingMiddleware);

  // CORS and body parsing middleware
  app.use(cors());
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // JSON response debugging middleware (after body parsing)
  app.use(ensureJsonResponse);

  // Log server startup
  log("INFO", "SERVER", "OilSync server starting up", {
    nodeEnv: process.env.NODE_ENV || "development",
    version: process.env.npm_package_version || "1.0.0",
  });

  // Example API routes
  app.get("/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/demo", handleDemo);

  // Authentication routes
  app.get("/auth/test", (_req, res) => {
    res.json({ success: true, message: "Auth routes working" });
  });
  app.post("/auth/test-body", (req, res) => {
    console.log("📝 [TEST] Body test endpoint hit");
    console.log("📝 [TEST] Body type:", typeof req.body);
    console.log("📝 [TEST] Body:", req.body);
    res.json({
      success: true,
      receivedBody: req.body,
      bodyType: typeof req.body,
    });
  });
  app.post("/auth/login", handleLogin);
  app.post("/auth/register", handleRegister);
  app.post("/auth/send-otp", handleSendOTP);
  app.post("/auth/verify-otp", handleVerifyOTP);
  app.post("/auth/reset-password", handleResetPassword);

  // Booking routes
  app.post("/bookings", handleCreateBooking);
  app.get("/bookings", handleGetBookings);
  app.get("/bookings/:id", handleGetBooking);
  app.patch("/bookings/:id/status", handleUpdateBookingStatus);
  app.delete("/bookings/:id", handleCancelBooking);

  // Technician routes
  app.get("/technicians", handleGetTechnicians);
  app.get("/technicians/:id", handleGetTechnician);
  app.post("/technicians", handleCreateTechnician);
  app.patch("/technicians/:id/status", handleUpdateTechnicianStatus);
  app.delete("/technicians/:id", handleDeleteTechnician);

  // Health check endpoints
  app.get("/health", handleQuickHealthCheck);
  app.get("/health/detailed", handleHealthCheck);
  app.get("/health/services", handleHealthCheck);

  // Test endpoints for logging verification
  app.get("/test/services", handleTestServices);
  app.get("/test/logs", handleTestLogs);

  // Development helper endpoints
  app.get("/dev/otp", handleGetLastOTP);
  app.get("/dev/config", handleShowConfig);

  // Email verification and admin setup
  app.post("/auth/verify-email", handleVerifyEmail);
  app.post("/auth/verify-phone", handleVerifyPhone);
  app.post("/admin/seed-accounts", handleSeedAccounts);

  // Vehicle management endpoints (database-backed)
  app.get("/vehicles/test", handleTestVehicleAPI);
  app.get("/vehicles/makes", handleGetVehicleMakes);
  app.get("/vehicles/models/:makeId", handleGetVehicleModels);
  app.get("/vehicles/variants/:modelId", handleGetVehicleVariants);

  // Profile management endpoints (database-backed)
  app.get("/profile/test", handleTestProfileAPI);
  app.get("/profile", handleGetUserProfile);
  app.post("/profile/verification", handleUpdateVerificationStatus);

  // JSON parsing error handling
  app.use(handleJsonParseErrors);

  // Error handling middleware (must be last)
  app.use(errorHandlingMiddleware);

  // List all registered routes for debugging
  console.log("[ROUTES] Registered database-backed routes:");
  console.log("  Vehicle routes:");
  console.log("    GET /vehicles/test");
  console.log("    GET /vehicles/makes");
  console.log("    GET /vehicles/models/:makeId");
  console.log("    GET /vehicles/variants/:modelId");
  console.log("  Profile routes:");
  console.log("    GET /profile/test");
  console.log("    GET /profile");
  console.log("    POST /profile/verification");

  log("INFO", "SERVER", "All routes and middleware configured");

  return app;
}
