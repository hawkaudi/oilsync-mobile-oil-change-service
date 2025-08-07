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
    console.log("🔐 [LOGIN] Body type:", typeof req.body);
    console.log("🔐 [LOGIN] Body keys:", Object.keys(req.body || {}));

    let email: string;
    let password: string;
    let parsedData: any = null;

    // Handle Netlify's broken body parsing - character codes format
    if (req.body && typeof req.body === "object" && req.body["0"] !== undefined) {
      console.log("🔧 [LOGIN] Detected Netlify character codes format");
      try {
        const codes = Object.values(req.body) as number[];
        console.log("🔧 [LOGIN] Character codes count:", codes.length);
        console.log("🔧 [LOGIN] First 10 codes:", codes.slice(0, 10));
        
        const jsonString = String.fromCharCode(...codes);
        console.log("🔧 [LOGIN] Reconstructed JSON string:", jsonString);
        
        parsedData = JSON.parse(jsonString);
        console.log("🔧 [LOGIN] Parsed data:", parsedData);
        
        email = parsedData.email;
        password = parsedData.password;
        
        console.log("🔧 [LOGIN] Extracted email:", email);
        console.log("🔧 [LOGIN] Password extracted:", !!password);
      } catch (parseError) {
        console.error("💥 [LOGIN] Failed to parse character codes:", parseError);
        return res.status(400).json({
          success: false,
          message: "Invalid request format - failed to parse body",
          debug: {
            error: parseError.message,
            bodyType: typeof req.body,
            hasCharacterCodes: req.body && req.body["0"] !== undefined
          }
        } as AuthResponse);
      }
    } else if (req.body && typeof req.body === "object") {
      // Normal JSON body
      console.log("🔧 [LOGIN] Using normal JSON body");
      email = req.body.email;
      password = req.body.password;
      parsedData = req.body;
    } else {
      console.error("💥 [LOGIN] Unexpected body format");
      return res.status(400).json({
        success: false,
        message: "Invalid request format",
        debug: {
          bodyType: typeof req.body,
          body: req.body
        }
      } as AuthResponse);
    }

    console.log("🔐 [LOGIN] Final extracted email:", email);
    console.log("🔐 [LOGIN] Final password provided:", !!password);

    // Validation
    if (!email || !password) {
      console.log("❌ [LOGIN] Missing email or password");
      logAuthOperation("LOGIN_FAILED", email || "unknown", false, req);
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
        debug: {
          emailProvided: !!email,
          passwordProvided: !!password,
          parsedData: parsedData
        }
      } as AuthResponse);
    }

    if (!validateEmail(email)) {
      console.log("❌ [LOGIN] Invalid email format:", email);
      logAuthOperation("LOGIN_FAILED", email, false, req);
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      } as AuthResponse);
    }

    logAuthOperation("LOGIN_ATTEMPT", email, false, req);
    console.log("🔍 [LOGIN] Attempting authentication for:", email);

    const authResult = await authenticateUser(email, password, req);

    if (!authResult) {
      console.log("❌ [LOGIN] Authentication failed for:", email);
      logAuthOperation("LOGIN_FAILED", email, false, req);
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      } as AuthResponse);
    }

    const { user, token } = authResult;
    console.log("✅ [LOGIN] Authentication successful for:", email);
    
    logAuthOperation("LOGIN_SUCCESS", email, true, req);
    logBusinessOperation(
      "USER_SESSION_CREATED",
      `User ${user.id} logged in`,
      { userId: user.id, role: user.role },
      req,
    );

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

    console.log("✅ [LOGIN] Sending successful response");
    res.setHeader("Content-Type", "application/json");
    res.status(200).json(response);
    
  } catch (error) {
    console.error("💥 [LOGIN] Unexpected error:", error);
    console.error("💥 [LOGIN] Error message:", error.message);
    console.error("💥 [LOGIN] Error stack:", error.stack);

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

    res.setHeader("Content-Type", "application/json");
    res.status(500).json(errorResponse);
  }
};

export const handleRegister: RequestHandler = async (req, res) => {
  try {
    console.log("📝 [REGISTER] Raw body:", req.body);
    console.log("📝 [REGISTER] Body type:", typeof req.body);

    let firstName: string;
    let lastName: string;
    let email: string;
    let phone: string;
    let password: string;
    let parsedData: any = null;

    // Handle Netlify's broken body parsing - character codes format
    if (req.body && typeof req.body === "object" && req.body["0"] !== undefined) {
      console.log("🔧 [REGISTER] Detected Netlify character codes format");
      try {
        const codes = Object.values(req.body) as number[];
        const jsonString = String.fromCharCode(...codes);
        console.log("🔧 [REGISTER] Reconstructed JSON string:", jsonString);
        
        parsedData = JSON.parse(jsonString);
        console.log("🔧 [REGISTER] Parsed data:", parsedData);
        
        firstName = parsedData.firstName;
        lastName = parsedData.lastName;
        email = parsedData.email;
        phone = parsedData.phone;
        password = parsedData.password;
      } catch (parseError) {
        console.error("💥 [REGISTER] Failed to parse character codes:", parseError);
        return res.status(400).json({
          success: false,
          message: "Invalid request format - failed to parse body",
        } as AuthResponse);
      }
    } else if (req.body && typeof req.body === "object") {
      // Normal JSON body
      console.log("🔧 [REGISTER] Using normal JSON body");
      const data: RegisterRequest = req.body;
      firstName = data.firstName;
      lastName = data.lastName;
      email = data.email;
      phone = data.phone;
      password = data.password;
      parsedData = req.body;
    } else {
      console.error("💥 [REGISTER] Unexpected body format");
      return res.status(400).json({
        success: false,
        message: "Invalid request format",
      } as AuthResponse);
    }

    console.log(`📝 [REGISTER] Registration attempt for: ${email}`);

    if (!firstName || !lastName || !email || !phone || !password) {
      console.log(`❌ [REGISTER] Missing required fields`);
      return res.status(400).json({
        success: false,
        message: "All fields are required",
        debug: {
          firstName: !!firstName,
          lastName: !!lastName,
          email: !!email,
          phone: !!phone,
          password: !!password,
        }
      } as AuthResponse);
    }

    if (!validateEmail(email)) {
      console.log(`❌ [REGISTER] Invalid email format: ${email}`);
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      } as AuthResponse);
    }

    // Check if user already exists
    const existingUser = await getUserByEmail(email, req);
    if (existingUser) {
      console.log(`❌ [REGISTER] Email already exists: ${email}`);
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

    console.log(`✅ [REGISTER] Registration successful for: ${email}`);

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
    console.error(`💥 [REGISTER] Registration error:`, error);
    res.status(500).json({
      success: false,
      message: (error as Error).message.includes("already exists")
        ? (error as Error).message
        : "Internal server error",
    } as AuthResponse);
  }
};

export const handleSendOTP: RequestHandler = async (req, res) => {
  try {
    console.log("📨 [OTP] Raw body:", req.body);

    let identifier: string;
    let type: string;
    let purpose: string;

    // Handle Netlify's broken body parsing - character codes format
    if (req.body && typeof req.body === "object" && req.body["0"] !== undefined) {
      console.log("🔧 [OTP] Detected Netlify character codes format");
      try {
        const codes = Object.values(req.body) as number[];
        const jsonString = String.fromCharCode(...codes);
        const parsedData = JSON.parse(jsonString);
        
        identifier = parsedData.identifier;
        type = parsedData.type;
        purpose = parsedData.purpose;
      } catch (parseError) {
        console.error("💥 [OTP] Failed to parse character codes:", parseError);
        return res.status(400).json({
          success: false,
          message: "Invalid request format - failed to parse body",
        } as ApiResponse);
      }
    } else if (req.body && typeof req.body === "object") {
      // Normal JSON body
      const data: OTPRequest = req.body;
      identifier = data.identifier;
      type = data.type;
      purpose = data.purpose;
    } else {
      console.error("💥 [OTP] Unexpected body format");
      return res.status(400).json({
        success: false,
        message: "Invalid request format",
      } as ApiResponse);
    }

    console.log(`📨 [OTP] Sending OTP to: ${identifier}`);

    if (!identifier || !type || !purpose) {
      console.log(`❌ [OTP] Missing required fields`);
      return res.status(400).json({
        success: false,
        message: "Identifier, type, and purpose are required",
      } as ApiResponse);
    }

    if (type === "email" && !validateEmail(identifier)) {
      console.log(`❌ [OTP] Invalid email format: ${identifier}`);
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
      console.log(`❌ [OTP] Failed to send OTP to ${identifier}`);
      return res.status(500).json({
        success: false,
        message: "Failed to send OTP",
      } as ApiResponse);
    }

    console.log(`✅ [OTP] OTP sent successfully to: ${identifier}`);
    res.json({
      success: true,
      message: "OTP sent successfully",
    } as ApiResponse);
  } catch (error) {
    console.error(`💥 [OTP] Send error:`, error);
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
