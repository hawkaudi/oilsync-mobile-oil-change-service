import { RequestHandler } from "express";
import { ApiResponse } from "@shared/api";
import { log } from "../middleware/logging";

export const handleGetLastOTP: RequestHandler = async (req, res) => {
  try {
    // This is only for development to help users get OTP codes
    if (process.env.NODE_ENV === "production") {
      return res.status(404).json({
        success: false,
        message: "Not available in production",
      });
    }

    log("INFO", "DEV", "OTP lookup requested", undefined, req);

    // In development, we'll show the last generated OTP from logs
    res.json({
      success: true,
      message: "Check the server logs or Netlify function logs for OTP codes",
      data: {
        instructions: [
          "1. For Netlify: Go to your site dashboard → Functions → View logs",
          "2. Look for lines containing '📧 [DEV MODE] Verification code:'",
          "3. Or check the browser console after sending OTP",
          "4. In production, check your Mailtrap inbox for emails",
        ],
        environment: process.env.NODE_ENV || "development",
        emailConfigured: !!(
          process.env.MAILTRAP_HOST &&
          process.env.MAILTRAP_USER &&
          process.env.MAILTRAP_PASS
        ),
      },
    } as ApiResponse);
  } catch (error) {
    log("ERROR", "DEV", "OTP lookup error", { error: error.message }, req);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    } as ApiResponse);
  }
};

export const handleShowConfig: RequestHandler = async (req, res) => {
  try {
    log("INFO", "DEV", "Configuration check requested", undefined, req);

    const config = {
      environment: process.env.NODE_ENV || "development",
      email: {
        configured: !!(
          process.env.MAILTRAP_HOST &&
          process.env.MAILTRAP_USER &&
          process.env.MAILTRAP_PASS
        ),
        host: process.env.MAILTRAP_HOST ? "✅ Set" : "❌ Missing",
        user: process.env.MAILTRAP_USER ? "✅ Set" : "❌ Missing",
        pass: process.env.MAILTRAP_PASS ? "✅ Set" : "❌ Missing",
        port: process.env.MAILTRAP_PORT || "587 (default)",
      },
      sms: {
        configured: !!(
          process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
        ),
        accountSid: process.env.TWILIO_ACCOUNT_SID ? "✅ Set" : "❌ Missing",
        authToken: process.env.TWILIO_AUTH_TOKEN ? "✅ Set" : "❌ Missing",
        phoneNumber: process.env.TWILIO_PHONE_NUMBER ? "✅ Set" : "❌ Missing",
      },
      database: {
        configured: !!process.env.DATABASE_URL,
        url: process.env.DATABASE_URL ? "✅ Set" : "❌ Missing",
        isPlaceholder: process.env.DATABASE_URL?.includes("npg_your_password")
          ? "⚠️ Placeholder URL - Replace with real Neon URL"
          : "✅ Real URL",
        ready:
          !!process.env.DATABASE_URL &&
          !process.env.DATABASE_URL?.includes("npg_your_password"),
      },
      auth: {
        jwtSecret: process.env.JWT_SECRET ? "✅ Set" : "❌ Missing",
        bcryptRounds: process.env.BCRYPT_ROUNDS || "12 (default)",
      },
    };

    res.json({
      success: true,
      message: "Configuration status",
      data: config,
    } as ApiResponse);
  } catch (error) {
    log(
      "ERROR",
      "DEV",
      "Configuration check error",
      { error: error.message },
      req,
    );
    res.status(500).json({
      success: false,
      message: "Internal server error",
    } as ApiResponse);
  }
};
