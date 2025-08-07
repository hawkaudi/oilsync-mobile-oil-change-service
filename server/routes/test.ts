import { RequestHandler } from "express";
import { ApiResponse } from "@shared/api";
import {
  log,
  logEmailService,
  logSMSService,
  logDatabaseAction,
  logBusinessOperation,
} from "../middleware/logging";

export const handleTestServices: RequestHandler = async (req, res) => {
  try {
    log(
      "INFO",
      "TEST",
      "Starting service test sequence",
      {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development",
      },
      req,
    );

    const results = [];

    // Test Database Operations
    log("INFO", "TEST", "Testing database operations", undefined, req);

    // Simulate database operations
    logDatabaseAction(
      "SELECT",
      "users",
      true,
      {
        query: "SELECT * FROM users WHERE role = $1",
        params: ["customer"],
        rowCount: 42,
        executionTime: 23,
      },
      req,
    );

    logDatabaseAction(
      "INSERT",
      "bookings",
      true,
      {
        bookingId: "test_booking_123",
        customerId: "test_customer_456",
        vehicleId: "test_vehicle_789",
        status: "pending",
      },
      req,
    );

    logDatabaseAction(
      "UPDATE",
      "technicians",
      true,
      {
        technicianId: "tech_123",
        field: "status",
        oldValue: "active",
        newValue: "busy",
      },
      req,
    );

    results.push({
      service: "database",
      status: "tested",
      operations: ["SELECT", "INSERT", "UPDATE"],
    });

    // Test Email Service
    log("INFO", "TEST", "Testing email service", undefined, req);

    logEmailService(
      "SEND_WELCOME",
      "test@example.com",
      true,
      "MAILTRAP",
      {
        templateId: "welcome_template_v2",
        messageId: "msg_" + Date.now(),
        deliveryTime: 150,
      },
      req,
    );

    logEmailService(
      "SEND_OTP",
      "user@example.com",
      true,
      "MAILTRAP",
      {
        purpose: "password_reset",
        codeLength: 6,
        expiresIn: 300,
        messageId: "otp_" + Date.now(),
      },
      req,
    );

    // Simulate occasional failure
    logEmailService(
      "SEND_NOTIFICATION",
      "invalid@domain",
      false,
      "MAILTRAP",
      {
        error: "Invalid email address",
        attemptCount: 3,
      },
      req,
    );

    results.push({
      service: "email",
      status: "tested",
      operations: ["SEND_WELCOME", "SEND_OTP", "SEND_NOTIFICATION"],
    });

    // Test SMS Service
    log("INFO", "TEST", "Testing SMS service", undefined, req);

    logSMSService(
      "SEND_OTP",
      "+15551234567",
      true,
      "TWILIO",
      {
        purpose: "login_verification",
        codeLength: 6,
        messageId: "sms_" + Date.now(),
        deliveryTime: 250,
      },
      req,
    );

    logSMSService(
      "SEND_REMINDER",
      "+15559876543",
      true,
      "TWILIO",
      {
        appointmentId: "booking_456",
        scheduledTime: "2024-08-05T10:00:00Z",
        messageId: "reminder_" + Date.now(),
      },
      req,
    );

    // Simulate failure
    logSMSService(
      "SEND_OTP",
      "+1555000000",
      false,
      "TWILIO",
      {
        error: "Invalid phone number format",
        errorCode: 21211,
      },
      req,
    );

    results.push({
      service: "sms",
      status: "tested",
      operations: ["SEND_OTP", "SEND_REMINDER"],
    });

    // Test Business Operations
    log("INFO", "TEST", "Testing business operations", undefined, req);

    logBusinessOperation(
      "BOOKING_CREATED",
      "New booking from customer",
      {
        bookingId: "booking_789",
        customerId: "customer_123",
        serviceType: "oil_change",
        vehicleInfo: { make: "Honda", model: "Civic", year: "2022" },
      },
      req,
    );

    logBusinessOperation(
      "TECHNICIAN_ASSIGNED",
      "Technician assigned to booking",
      {
        bookingId: "booking_789",
        technicianId: "tech_456",
        technicianName: "John Smith",
        estimatedArrival: "2024-08-05T14:30:00Z",
      },
      req,
    );

    logBusinessOperation(
      "PAYMENT_PROCESSED",
      "Payment successfully processed",
      {
        bookingId: "booking_789",
        amount: 79.99,
        currency: "USD",
        paymentMethod: "credit_card",
        transactionId: "txn_" + Date.now(),
      },
      req,
    );

    results.push({
      service: "business",
      status: "tested",
      operations: [
        "BOOKING_CREATED",
        "TECHNICIAN_ASSIGNED",
        "PAYMENT_PROCESSED",
      ],
    });

    // Log test completion
    log(
      "INFO",
      "TEST",
      "Service test sequence completed successfully",
      {
        totalServices: results.length,
        timestamp: new Date().toISOString(),
        duration: Math.random() * 1000 + 500, // Simulate duration
      },
      req,
    );

    res.json({
      success: true,
      message: "Service tests completed successfully",
      data: {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development",
        results,
        summary: {
          totalServices: results.length,
          allPassed: true,
          logEntriesGenerated: 15,
        },
      },
    } as ApiResponse);
  } catch (error) {
    log(
      "ERROR",
      "TEST",
      "Service test sequence failed",
      {
        error: error.message,
        stack: error.stack,
      },
      req,
    );

    res.status(500).json({
      success: false,
      message: "Service tests failed",
      error: error.message,
    } as ApiResponse);
  }
};

export const handleTestLogs: RequestHandler = async (req, res) => {
  try {
    log("INFO", "TEST", "Testing all log levels", undefined, req);
    log("DEBUG", "TEST", "This is a debug message", { debugData: "test" }, req);
    log(
      "WARN",
      "TEST",
      "This is a warning message",
      { warningReason: "test condition" },
      req,
    );
    log(
      "ERROR",
      "TEST",
      "This is an error message",
      { errorCode: "TEST_ERROR" },
      req,
    );

    res.json({
      success: true,
      message: "Log test completed",
      data: {
        levels: ["INFO", "DEBUG", "WARN", "ERROR"],
        timestamp: new Date().toISOString(),
      },
    } as ApiResponse);
  } catch (error) {
    log("ERROR", "TEST", "Log test failed", { error: error.message }, req);
    res.status(500).json({
      success: false,
      message: "Log test failed",
    } as ApiResponse);
  }
};
