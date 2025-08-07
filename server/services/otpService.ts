import { executeQuery, executeQuerySingle } from "../database/connection";
import { log } from "../middleware/logging";

export interface OTPCode {
  id: string;
  identifier: string;
  code: string;
  purpose:
    | "login"
    | "register"
    | "reset_password"
    | "verify_email"
    | "verify_phone";
  expires_at: string;
  attempts: number;
  is_used: boolean;
  created_at: string;
}

export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const createOTP = async (
  identifier: string,
  purpose: OTPCode["purpose"],
  req?: any,
): Promise<{ code: string; expiresAt: Date }> => {
  const code = generateOTP();
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 5); // 5 minutes expiration

  log(
    "INFO",
    "OTP_SERVICE",
    `Creating OTP for ${purpose}`,
    {
      identifier: identifier.replace(/(.{2}).*(@.*)/, "$1***$2"),
      purpose,
      expiresIn: "5 minutes",
    },
    req,
  );

  // Remove any existing OTP for this identifier and purpose
  await deleteOTP(identifier, purpose, req);

  const query = `
    INSERT INTO otp_codes (identifier, code, purpose, expires_at)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;

  const params = [identifier, code, purpose, expiresAt.toISOString()];
  const result = await executeQuerySingle<OTPCode>(query, params, req);

  if (!result) {
    throw new Error("Failed to create OTP code");
  }

  log(
    "INFO",
    "OTP_SERVICE",
    `OTP created successfully`,
    {
      identifier: identifier.replace(/(.{2}).*(@.*)/, "$1***$2"),
      purpose,
      otpId: result.id,
    },
    req,
  );

  return { code, expiresAt };
};

export const verifyOTP = async (
  identifier: string,
  code: string,
  purpose: OTPCode["purpose"],
  req?: any,
): Promise<{ valid: boolean; message: string }> => {
  log(
    "INFO",
    "OTP_SERVICE",
    `Verifying OTP for ${purpose}`,
    {
      identifier: identifier.replace(/(.{2}).*(@.*)/, "$1***$2"),
      purpose,
    },
    req,
  );

  const query = `
    SELECT * FROM otp_codes 
    WHERE identifier = $1 AND purpose = $2 AND is_used = FALSE
    ORDER BY created_at DESC
    LIMIT 1
  `;

  const otpRecord = await executeQuerySingle<OTPCode>(
    query,
    [identifier, purpose],
    req,
  );

  if (!otpRecord) {
    log(
      "WARN",
      "OTP_SERVICE",
      "OTP verification failed: no OTP found",
      {
        identifier: identifier.replace(/(.{2}).*(@.*)/, "$1***$2"),
        purpose,
      },
      req,
    );
    return { valid: false, message: "No OTP found or OTP expired" };
  }

  // Check if expired
  if (new Date() > new Date(otpRecord.expires_at)) {
    log(
      "WARN",
      "OTP_SERVICE",
      "OTP verification failed: expired",
      {
        identifier: identifier.replace(/(.{2}).*(@.*)/, "$1***$2"),
        purpose,
        expiredAt: otpRecord.expires_at,
      },
      req,
    );

    // Clean up expired OTP
    await deleteOTPById(otpRecord.id, req);
    return { valid: false, message: "OTP expired" };
  }

  // Check attempt limit
  if (otpRecord.attempts >= 3) {
    log(
      "WARN",
      "OTP_SERVICE",
      "OTP verification failed: too many attempts",
      {
        identifier: identifier.replace(/(.{2}).*(@.*)/, "$1***$2"),
        purpose,
        attempts: otpRecord.attempts,
      },
      req,
    );

    // Clean up OTP after too many attempts
    await deleteOTPById(otpRecord.id, req);
    return { valid: false, message: "Too many failed attempts" };
  }

  // Check code
  if (otpRecord.code !== code) {
    log(
      "WARN",
      "OTP_SERVICE",
      "OTP verification failed: invalid code",
      {
        identifier: identifier.replace(/(.{2}).*(@.*)/, "$1***$2"),
        purpose,
      },
      req,
    );

    // Increment attempts
    await incrementOTPAttempts(otpRecord.id, req);
    return { valid: false, message: "Invalid OTP code" };
  }

  // Mark as used
  await markOTPAsUsed(otpRecord.id, req);

  log(
    "INFO",
    "OTP_SERVICE",
    "OTP verification successful",
    {
      identifier: identifier.replace(/(.{2}).*(@.*)/, "$1***$2"),
      purpose,
      otpId: otpRecord.id,
    },
    req,
  );

  return { valid: true, message: "OTP verified successfully" };
};

export const deleteOTP = async (
  identifier: string,
  purpose: OTPCode["purpose"],
  req?: any,
): Promise<void> => {
  const query = "DELETE FROM otp_codes WHERE identifier = $1 AND purpose = $2";
  await executeQuery(query, [identifier, purpose], req);
};

export const deleteOTPById = async (id: string, req?: any): Promise<void> => {
  const query = "DELETE FROM otp_codes WHERE id = $1";
  await executeQuery(query, [id], req);
};

export const markOTPAsUsed = async (id: string, req?: any): Promise<void> => {
  const query = "UPDATE otp_codes SET is_used = TRUE WHERE id = $1";
  await executeQuery(query, [id], req);
};

export const incrementOTPAttempts = async (
  id: string,
  req?: any,
): Promise<void> => {
  const query = "UPDATE otp_codes SET attempts = attempts + 1 WHERE id = $1";
  await executeQuery(query, [id], req);
};

export const cleanupExpiredOTPs = async (req?: any): Promise<number> => {
  const query = "DELETE FROM otp_codes WHERE expires_at < NOW()";
  const result = await executeQuery(query, [], req);

  log(
    "INFO",
    "OTP_SERVICE",
    "Cleaned up expired OTPs",
    {
      deletedCount: result.length,
    },
    req,
  );

  return result.length;
};

export const getOTPStats = async (
  req?: any,
): Promise<{
  total: number;
  expired: number;
  used: number;
  active: number;
}> => {
  const queries = [
    "SELECT COUNT(*) as count FROM otp_codes",
    "SELECT COUNT(*) as count FROM otp_codes WHERE expires_at < NOW()",
    "SELECT COUNT(*) as count FROM otp_codes WHERE is_used = TRUE",
    "SELECT COUNT(*) as count FROM otp_codes WHERE expires_at > NOW() AND is_used = FALSE",
  ];

  const [total, expired, used, active] = await Promise.all(
    queries.map((query) =>
      executeQuerySingle<{ count: string }>(query, [], req),
    ),
  );

  return {
    total: parseInt(total?.count || "0"),
    expired: parseInt(expired?.count || "0"),
    used: parseInt(used?.count || "0"),
    active: parseInt(active?.count || "0"),
  };
};
