import { RequestHandler } from "express";
import {
  getUserById,
  getUserByEmail,
  updateEmailVerification,
  updatePhoneVerification,
  testDatabaseConnection,
} from "../services/userServiceDB";
import { log } from "../middleware/logging";

export const handleGetUserProfile: RequestHandler = async (req, res) => {
  const userId = req.headers["x-user-id"] as string;
  const userEmail = req.headers["x-user-email"] as string;

  log(
    "INFO",
    "PROFILE",
    "Fetching user profile",
    {
      userId: userId ? "provided" : "missing",
      userEmail: userEmail ? "provided" : "missing",
    },
    req,
  );

  res.setHeader("Content-Type", "application/json");

  if (!userId && !userEmail) {
    log("WARN", "PROFILE", "Missing user identification", {}, req);
    return res.status(400).json({
      success: false,
      message: "User ID or email is required in headers",
    });
  }

  try {
    let user;

    if (userId) {
      user = await getUserById(userId, req);
    } else if (userEmail) {
      user = await getUserByEmail(userEmail, req);
    }

    if (!user) {
      log("WARN", "PROFILE", "User not found", { userId, userEmail }, req);
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    log(
      "INFO",
      "PROFILE",
      "User profile fetched successfully",
      {
        userId: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
      },
      req,
    );

    res.json({
      success: true,
      user: user,
      message: "Profile fetched successfully",
    });
  } catch (error) {
    log(
      "ERROR",
      "PROFILE",
      "Failed to fetch user profile",
      {
        userId,
        userEmail,
        error: error.message,
      },
      req,
    );

    res.status(500).json({
      success: false,
      message: "Failed to fetch user profile",
      error: error.message,
    });
  }
};

export const handleUpdateVerificationStatus: RequestHandler = async (
  req,
  res,
) => {
  const { userId, type, verified } = req.body;

  log(
    "INFO",
    "PROFILE",
    "Updating verification status",
    {
      userId,
      type,
      verified,
    },
    req,
  );

  res.setHeader("Content-Type", "application/json");

  if (!userId || !type) {
    log(
      "WARN",
      "PROFILE",
      "Missing required parameters",
      { userId, type },
      req,
    );
    return res.status(400).json({
      success: false,
      message: "userId and type (email|phone) are required",
    });
  }

  if (!["email", "phone"].includes(type)) {
    log("WARN", "PROFILE", "Invalid verification type", { type }, req);
    return res.status(400).json({
      success: false,
      message: "type must be 'email' or 'phone'",
    });
  }

  try {
    let updatedUser;

    if (type === "email") {
      updatedUser = await updateEmailVerification(
        userId,
        verified ?? true,
        req,
      );
    } else if (type === "phone") {
      updatedUser = await updatePhoneVerification(
        userId,
        verified ?? true,
        req,
      );
    }

    if (!updatedUser) {
      log(
        "WARN",
        "PROFILE",
        "User not found during verification update",
        { userId },
        req,
      );
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    log(
      "INFO",
      "PROFILE",
      "Verification status updated successfully",
      {
        userId,
        type,
        verified,
        emailVerified: updatedUser.emailVerified,
        phoneVerified: updatedUser.phoneVerified,
      },
      req,
    );

    res.json({
      success: true,
      user: updatedUser,
      message: `${type} verification status updated successfully`,
    });
  } catch (error) {
    log(
      "ERROR",
      "PROFILE",
      "Failed to update verification status",
      {
        userId,
        type,
        verified,
        error: error.message,
      },
      req,
    );

    res.status(500).json({
      success: false,
      message: "Failed to update verification status",
      error: error.message,
    });
  }
};

export const handleTestProfileAPI: RequestHandler = async (req, res) => {
  log("DEBUG", "PROFILE", "Test endpoint called", {}, req);
  res.setHeader("Content-Type", "application/json");

  try {
    const connectionTest = await testDatabaseConnection(req);

    if (connectionTest.success) {
      log(
        "INFO",
        "PROFILE",
        "Database test successful",
        {
          dbType: connectionTest.dbType,
          userCount: connectionTest.userCount,
        },
        req,
      );

      res.json({
        success: true,
        message: "Profile API working correctly",
        database: connectionTest,
        timestamp: new Date().toISOString(),
      });
    } else {
      log(
        "WARN",
        "PROFILE",
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
      "PROFILE",
      "Test endpoint error",
      {
        error: error.message,
      },
      req,
    );

    res.json({
      success: false,
      message: "Profile API test failed",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};
