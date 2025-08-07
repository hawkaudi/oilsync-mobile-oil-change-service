import { RequestHandler } from "express";
import { ApiResponse, AuthResponse } from "@shared/api";
import { verifyOTP } from "../services/otpService";
import { getUserByEmail } from "../services/userService";
import { executeQuery } from "../database/connection";
import { seedDefaultAccounts } from "../services/adminService";

export const handleVerifyEmail: RequestHandler = async (req, res) => {
  try {
    console.log(`[AUTH] Email verification for: ${req.body.identifier}`);

    const { identifier, otpCode } = req.body;

    if (!identifier || !otpCode) {
      console.log(`[AUTH] Email verification failed: Missing required fields`);
      return res.status(400).json({
        success: false,
        message: "Email and OTP code are required",
      } as ApiResponse);
    }

    // Verify OTP first
    const verification = await verifyOTP(
      identifier,
      otpCode,
      "verify_email",
      req,
    );
    if (!verification.valid) {
      console.log(`[AUTH] Email verification failed: ${verification.message}`);
      return res.status(400).json({
        success: false,
        message: verification.message,
      } as ApiResponse);
    }

    // Find user by email
    const user = await getUserByEmail(identifier, req);
    if (!user) {
      console.log(`[AUTH] Email verification failed: User not found`);
      return res.status(404).json({
        success: false,
        message: "User not found",
      } as ApiResponse);
    }

    // Update email verification status
    await executeQuery(
      "UPDATE users SET email_verified = true, updated_at = NOW() WHERE id = $1",
      [user.id],
      req,
    );

    console.log(`[AUTH] Email verification successful for: ${identifier}`);
    res.json({
      success: true,
      message: "Email verified successfully",
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        emailVerified: true,
        phoneVerified: user.phone_verified,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
    } as AuthResponse);
  } catch (error) {
    console.error(`[AUTH] Email verification error:`, error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    } as ApiResponse);
  }
};

export const handleVerifyPhone: RequestHandler = async (req, res) => {
  try {
    console.log(`[AUTH] Phone verification for: ${req.body.identifier}`);

    const { identifier, otpCode } = req.body;

    if (!identifier || !otpCode) {
      console.log(`[AUTH] Phone verification failed: Missing required fields`);
      return res.status(400).json({
        success: false,
        message: "Phone number and OTP code are required",
      } as ApiResponse);
    }

    // Verify OTP first
    const verification = await verifyOTP(
      identifier,
      otpCode,
      "verify_phone",
      req,
    );
    if (!verification.valid) {
      console.log(`[AUTH] Phone verification failed: ${verification.message}`);
      return res.status(400).json({
        success: false,
        message: verification.message,
      } as ApiResponse);
    }

    // Find user by phone number
    const user = await executeQuery(
      "SELECT * FROM users WHERE phone = $1",
      [identifier],
      req,
    );

    if (!user || user.length === 0) {
      console.log(`[AUTH] Phone verification failed: User not found`);
      return res.status(404).json({
        success: false,
        message: "User not found",
      } as ApiResponse);
    }

    const userData = user[0];

    // Update phone verification status
    await executeQuery(
      "UPDATE users SET phone_verified = true, updated_at = NOW() WHERE id = $1",
      [userData.id],
      req,
    );

    console.log(`[AUTH] Phone verification successful for: ${identifier}`);
    res.json({
      success: true,
      message: "Phone verified successfully",
      user: {
        id: userData.id,
        firstName: userData.first_name,
        lastName: userData.last_name,
        email: userData.email,
        phone: userData.phone,
        role: userData.role,
        emailVerified: userData.email_verified,
        phoneVerified: true,
        createdAt: userData.created_at,
        updatedAt: userData.updated_at,
      },
    } as AuthResponse);
  } catch (error) {
    console.error(`[AUTH] Phone verification error:`, error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    } as ApiResponse);
  }
};

export const handleSeedAccounts: RequestHandler = async (req, res) => {
  try {
    console.log(`[ADMIN] Seeding default accounts`);

    await seedDefaultAccounts(req);

    res.json({
      success: true,
      message: "Default accounts seeded successfully",
      data: {
        admin: "admin@oilsync.com (password: admin123)",
        technicians: [
          "john@oilsync.com (password: tech123)",
          "sarah@oilsync.com (password: tech123)",
        ],
      },
    } as ApiResponse);
  } catch (error) {
    console.error(`[ADMIN] Seed error:`, error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    } as ApiResponse);
  }
};
