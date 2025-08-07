import { RequestHandler } from "express";
import {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  OTPRequest,
  OTPVerifyRequest,
  ResetPasswordRequest,
  ApiResponse,
} from "@shared/api";
import {
  log,
  logAuthOperation,
  logBusinessOperation,
  logEmailService,
  logSMSService,
} from "../middleware/logging";
import {
  createUser,
  authenticateUser,
  getUserByEmail,
  updateUserPassword,
  User,
} from "../services/userService";
import { createOTP, verifyOTP, OTPCode } from "../services/otpService";

// Utility functions
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/;
  return phoneRegex.test(phone);
};

// Mock external services with enhanced logging
const sendEmailOTP = async (
  email: string,
  code: string,
  purpose: string,
  req?: any,
): Promise<boolean> => {
  try {
    // Log the attempt
    log(
      "INFO",
      "MAILTRAP",
      `Attempting to send OTP email for ${purpose}`,
      {
        email: email.replace(/(.{2}).*(@.*)/, "$1***$2"),
        purpose,
        codeLength: code.length,
        timestamp: new Date().toISOString(),
      },
      req,
    );

    // Production-ready email sending
    if (
      process.env.MAILTRAP_HOST &&
      process.env.MAILTRAP_USER &&
      process.env.MAILTRAP_PASS
    ) {
      // Production Mailtrap integration - logs will show in Netlify
      console.log(`📧 [PRODUCTION EMAIL] Sending to: ${email}`);
      console.log(
        `📧 [PRODUCTION EMAIL] Subject: Your OilSync verification code`,
      );
      console.log(`📧 [PRODUCTION EMAIL] Code: ${code}`);
      console.log(`📧 [PRODUCTION EMAIL] Purpose: ${purpose}`);
      console.log(
        `📧 [EMAIL BODY] HTML: <div><h2>Your OilSync Verification Code</h2><p>Your ${purpose.replace("_", " ")} verification code is: <strong style="font-size: 24px; color: #2563eb;">${code}</strong></p><p>This code expires in 5 minutes.</p><p>If you didn't request this code, please ignore this email.</p><p>Best regards,<br>OilSync Team</p></div>`,
      );

      // In real production, uncomment and install nodemailer:

      const nodemailer = require("nodemailer");
      const transporter = nodemailer.createTransport({
        host: process.env.MAILTRAP_HOST,
        port: parseInt(process.env.MAILTRAP_PORT) || 587,
        auth: {
          user: process.env.MAILTRAP_USER,
          pass: process.env.MAILTRAP_PASS,
        },
      });

      const emailResult = await transporter.sendMail({
        from: '"OilSync Support" <noreply@audinaryoil.com>',
        to: email,
        subject: `Your OilSync verification code`,
        html: `<div><h2>Your OilSync Verification Code</h2><p>Your ${purpose.replace("_", " ")} verification code is: <strong style="font-size: 24px; color: #2563eb;">${code}</strong></p><p>This code expires in 5 minutes.</p><p>If you didn't request this code, please ignore this email.</p><p>Best regards,<br>OilSync Team</p></div>`,
      });

      console.log(`✅ [EMAIL SENT] Message ID: ${emailResult.messageId}`);
      console.log(`✅ [EMAIL SENT] Response: ${emailResult.response}`);
    } else {
      console.log(`⚠️ [EMAIL CONFIG] Missing Mailtrap environment variables`);
      console.log(
        `⚠️ [EMAIL CONFIG] Set: MAILTRAP_HOST, MAILTRAP_USER, MAILTRAP_PASS, MAILTRAP_PORT`,
      );
      console.log(`📧 [DEV MODE] Email would be sent to: ${email}`);
      console.log(`📧 [DEV MODE] Verification code: ${code}`);
      console.log(`📧 [DEV MODE] Purpose: ${purpose}`);
    }

    const success = true; // Always return success for production logging

    logEmailService(
      "SEND_OTP",
      email,
      success,
      "MAILTRAP",
      {
        purpose,
        codeLength: code.length,
        messageId: `msg_${Date.now()}`,
      },
      req,
    );

    return success;
  } catch (error) {
    logEmailService(
      "SEND_OTP",
      email,
      false,
      "MAILTRAP",
      {
        purpose,
        error: error.message,
      },
      req,
    );
    return false;
  }
};

const sendSMSOTP = async (
  phone: string,
  code: string,
  purpose: string,
  req?: any,
): Promise<boolean> => {
  try {
    // Log the attempt
    log(
      "INFO",
      "TWILIO",
      `Attempting to send SMS OTP for ${purpose}`,
      {
        phone: phone.replace(/(\d{3}).*(\d{4})/, "$1***$2"),
        purpose,
        codeLength: code.length,
        timestamp: new Date().toISOString(),
      },
      req,
    );

    // Simulate SMS sending delay
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Real Twilio implementation
    let success = false;
    if (
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_PHONE_NUMBER
    ) {
      const twilio = require("twilio");
      const client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN,
      );

      const result = await client.messages.create({
        body: `Your OilSync verification code is: ${code}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone,
      });

      console.log(`✅ [SMS SENT] Message SID: ${result.sid}`);
      console.log(`✅ [SMS SENT] Status: ${result.status}`);
      success = result.status === "queued" || result.status === "sent";
    } else {
      console.log(`⚠️ [SMS CONFIG] Missing Twilio environment variables`);
      console.log(
        `⚠️ [SMS CONFIG] Set: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER`,
      );
      console.log(`📱 [DEV MODE] SMS would be sent to: ${phone}`);
      console.log(`📱 [DEV MODE] Verification code: ${code}`);
      success = true; // Default to success in dev mode
    }

    logSMSService(
      "SEND_OTP",
      phone,
      success,
      "TWILIO",
      {
        purpose,
        codeLength: code.length,
        messageId: `sms_${Date.now()}`,
      },
      req,
    );

    return success;
  } catch (error) {
    logSMSService(
      "SEND_OTP",
      phone,
      false,
      "TWILIO",
      {
        purpose,
        error: error.message,
      },
      req,
    );
    return false;
  }
};

export const handleLogin: RequestHandler = async (req, res) => {
  try {
    console.log("🔐 [LOGIN] Raw body:", req.body);

    let email: string;
    let password: string;

    // Handle Netlify's broken body parsing
    if (req.body && typeof req.body === "object" && req.body["0"]) {
      console.log("🔧 [LOGIN] Converting character codes...");
      const codes = Object.values(req.body) as number[];
      const jsonString = String.fromCharCode(...codes);
      console.log("🔧 [LOGIN] JSON string:", jsonString);
      const parsed = JSON.parse(jsonString);
      email = parsed.email;
      password = parsed.password;
    } else {
      email = req.body.email;
      password = req.body.password;
    }

    console.log("🔐 [LOGIN] Email:", email);

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    logAuthOperation("LOGIN_ATTEMPT", email, false, req);

    console.log("🔍 [NETLIFY_DEBUG] Parsed email:", email);
    console.log("🔍 [NETLIFY_DEBUG] Password provided:", !!password);

    if (!email || !password) {
      logAuthOperation("LOGIN_FAILED", email || "unknown", false, req);
      log("WARN", "AUTH", "Login failed: Missing credentials", undefined, req);
      console.log("❌ [NETLIFY_DEBUG] Missing credentials, returning 400");
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      } as AuthResponse);
    }

    if (!validateEmail(email)) {
      logAuthOperation("LOGIN_FAILED", email, false, req);
      log("WARN", "AUTH", "Login failed: Invalid email format", { email }, req);
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      } as AuthResponse);
    }

    console.log("🔍 [NETLIFY_DEBUG] Attempting authentication for:", email);
    const authResult = await authenticateUser(email, password, req);

    if (!authResult) {
      logAuthOperation("LOGIN_FAILED", email, false, req);
      log("WARN", "AUTH", "Login failed: Invalid credentials", { email }, req);
      console.log("❌ [NETLIFY_DEBUG] Authentication failed, returning 401");
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      } as AuthResponse);
    }

    const { user, token } = authResult;
    logAuthOperation("LOGIN_SUCCESS", email, true, req);
    logBusinessOperation(
      "USER_SESSION_CREATED",
      `User ${user.id} logged in`,
      { userId: user.id, role: user.role },
      req,
    );

    console.log(
      "✅ [NETLIFY_DEBUG] Authentication successful, preparing response",
    );
    console.log("✅ [NETLIFY_DEBUG] User data:", {
      id: user.id,
      email: user.email,
      role: user.role,
    });

    const response = {
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        emailVerified: user.email_verified,
        phoneVerified: user.phone_verified,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
    } as AuthResponse;

    console.log("✅ [NETLIFY_DEBUG] Response object:", response);
    console.log("✅ [NETLIFY_DEBUG] Sending JSON response with status 200");

    // Ensure proper JSON response
    res.setHeader("Content-Type", "application/json");
    res.status(200).json(response);
  } catch (error) {
    console.error("💥 [NETLIFY_DEBUG] Login error caught:", error);
    console.error("💥 [NETLIFY_DEBUG] Error message:", error.message);
    console.error("💥 [NETLIFY_DEBUG] Error stack:", error.stack);

    log(
      "ERROR",
      "AUTH",
      "Login error",
      { error: error.message, stack: error.stack },
      req,
    );

    const errorResponse = {
      success: false,
      message: "Internal server error",
      debug: {
        error: error.message,
        timestamp: new Date().toISOString(),
      },
    } as AuthResponse;

    console.error("💥 [NETLIFY_DEBUG] Sending error response:", errorResponse);
    res.setHeader("Content-Type", "application/json");
    res.status(500).json(errorResponse);
  }
};

export const handleRegister: RequestHandler = async (req, res) => {
  try {
    console.log(`[AUTH] Registration attempt for: ${req.body.email}`);

    const { firstName, lastName, email, phone, password }: RegisterRequest =
      req.body;

    if (!firstName || !lastName || !email || !phone || !password) {
      console.log(`[AUTH] Registration failed: Missing required fields`);
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      } as AuthResponse);
    }

    if (!validateEmail(email)) {
      console.log(`[AUTH] Registration failed: Invalid email format`);
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      } as AuthResponse);
    }

    // Check if user already exists
    const existingUser = await getUserByEmail(email, req);
    if (existingUser) {
      console.log(`[AUTH] Registration failed: Email already exists`);
      return res.status(409).json({
        success: false,
        message: "Email already registered",
      } as AuthResponse);
    }

    // Create user in database
    const user = await createUser(
      {
        firstName,
        lastName,
        email,
        phone,
        password,
        role: "customer",
      },
      req,
    );

    console.log(`[AUTH] Registration successful for: ${email}`);

    // Authenticate the newly created user to get a token
    const authResult = await authenticateUser(email, password, req);
    if (!authResult) {
      throw new Error("Failed to authenticate newly created user");
    }

    const { token } = authResult;

    res.status(201).json({
      success: true,
      message: "Registration successful",
      token,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        emailVerified: user.email_verified,
        phoneVerified: user.phone_verified,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
    } as AuthResponse);
  } catch (error) {
    console.error(`[AUTH] Registration error:`, error);
    res.status(500).json({
      success: false,
      message: error.message.includes("already exists")
        ? error.message
        : "Internal server error",
    } as AuthResponse);
  }
};

export const handleSendOTP: RequestHandler = async (req, res) => {
  try {
    console.log(`[OTP] Sending OTP to: ${req.body.identifier}`);

    const { identifier, type, purpose }: OTPRequest = req.body;

    if (!identifier || !type || !purpose) {
      console.log(`[OTP] Failed: Missing required fields`);
      return res.status(400).json({
        success: false,
        message: "Identifier, type, and purpose are required",
      } as ApiResponse);
    }

    if (type === "email" && !validateEmail(identifier)) {
      console.log(`[OTP] Failed: Invalid email format`);
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      } as ApiResponse);
    }

    // Create OTP in database
    const { code: otpCode } = await createOTP(
      identifier,
      purpose as OTPCode["purpose"],
      req,
    );

    let sent = false;
    if (type === "email") {
      sent = await sendEmailOTP(identifier, otpCode, purpose, req);
    } else if (type === "sms") {
      sent = await sendSMSOTP(identifier, otpCode, purpose, req);
    }

    if (!sent) {
      console.log(`[OTP] Failed to send OTP to ${identifier}`);
      return res.status(500).json({
        success: false,
        message: "Failed to send OTP",
      } as ApiResponse);
    }

    console.log(`[OTP] OTP sent successfully to: ${identifier}`);
    res.json({
      success: true,
      message: "OTP sent successfully",
    } as ApiResponse);
  } catch (error) {
    console.error(`[OTP] Send error:`, error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    } as ApiResponse);
  }
};

export const handleVerifyOTP: RequestHandler = async (req, res) => {
  try {
    console.log(`[OTP] Verifying OTP for: ${req.body.identifier}`);

    const { identifier, code, purpose }: OTPVerifyRequest = req.body;

    if (!identifier || !code || !purpose) {
      console.log(`[OTP] Verification failed: Missing required fields`);
      return res.status(400).json({
        success: false,
        message: "Identifier, code, and purpose are required",
      } as ApiResponse);
    }

    // Verify OTP using database service
    const verification = await verifyOTP(
      identifier,
      code,
      purpose as OTPCode["purpose"],
      req,
    );

    if (!verification.valid) {
      console.log(
        `[OTP] Verification failed for ${identifier}: ${verification.message}`,
      );
      return res.status(400).json({
        success: false,
        message: verification.message,
      } as ApiResponse);
    }

    console.log(`[OTP] Verification successful for: ${identifier}`);

    res.json({
      success: true,
      message: verification.message,
    } as ApiResponse);
  } catch (error) {
    console.error(`[OTP] Verification error:`, error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    } as ApiResponse);
  }
};

export const handleResetPassword: RequestHandler = async (req, res) => {
  try {
    console.log(`[AUTH] Password reset for: ${req.body.identifier}`);

    const { identifier, newPassword, otpCode }: ResetPasswordRequest = req.body;

    if (!identifier || !newPassword || !otpCode) {
      console.log(`[AUTH] Password reset failed: Missing required fields`);
      return res.status(400).json({
        success: false,
        message: "Identifier, new password, and OTP code are required",
      } as ApiResponse);
    }

    // Verify OTP first
    const verification = await verifyOTP(
      identifier,
      otpCode,
      "reset_password",
      req,
    );
    if (!verification.valid) {
      console.log(`[AUTH] Password reset failed: ${verification.message}`);
      return res.status(400).json({
        success: false,
        message: verification.message,
      } as ApiResponse);
    }

    // Find user by email
    const user = await getUserByEmail(identifier, req);
    if (!user) {
      console.log(`[AUTH] Password reset failed: User not found`);
      return res.status(404).json({
        success: false,
        message: "User not found",
      } as ApiResponse);
    }

    // Update password in database
    await updateUserPassword(user.id, newPassword, req);

    console.log(`[AUTH] Password reset successful for: ${identifier}`);
    res.json({
      success: true,
      message: "Password reset successful",
    } as ApiResponse);
  } catch (error) {
    console.error(`[AUTH] Password reset error:`, error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    } as ApiResponse);
  }
};
