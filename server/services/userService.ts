import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getDatabaseAdapter } from "../database/adapter";
import { log } from "../middleware/logging";
import { randomUUID } from "crypto";

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  password_hash: string;
  role: "customer" | "admin" | "technician";
  email_verified: boolean;
  phone_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateUserData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  role?: "customer" | "admin" | "technician";
}

export interface UserSession {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  user_agent?: string;
  ip_address?: string;
  created_at: string;
}

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_for_development";
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || "12");

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
};

export const comparePassword = async (
  password: string,
  hash: string,
): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const generateJWTToken = (userId: string): string => {
  const payload = { userId, iat: Date.now() };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
};

export const verifyJWTToken = (token: string): { userId: string } | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return { userId: decoded.userId };
  } catch (error) {
    return null;
  }
};

export const createUser = async (
  userData: CreateUserData,
  req?: any,
): Promise<User> => {
  const {
    firstName,
    lastName,
    email,
    phone,
    password,
    role = "customer",
  } = userData;

  log("INFO", "USER_SERVICE", `Creating user: ${email}`, { role }, req);

  // Check if user already exists
  const existingUser = await getUserByEmail(email, req);
  if (existingUser) {
    throw new Error("User with this email already exists");
  }

  const passwordHash = await hashPassword(password);

  const db = await getDatabaseAdapter();
  const userId = randomUUID();

  // Insert user
  await db.query(
    `INSERT INTO users (id, first_name, last_name, email, phone, password_hash, role, email_verified, phone_verified, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [
      userId,
      firstName,
      lastName,
      email,
      phone,
      passwordHash,
      role,
      false,
      false,
    ],
  );

  // Get the created user
  const result = await db.queryOne("SELECT * FROM users WHERE id = ?", [
    userId,
  ]);

  if (!result) {
    throw new Error("Failed to create user");
  }

  log(
    "INFO",
    "USER_SERVICE",
    `User created successfully: ${email}`,
    {
      userId: result.id,
      role: result.role,
    },
    req,
  );

  return result;
};

export const getUserByEmail = async (
  email: string,
  req?: any,
): Promise<User | null> => {
  const db = await getDatabaseAdapter();
  return db.queryOne("SELECT * FROM users WHERE email = ?", [email]);
};

export const getUserById = async (
  id: string,
  req?: any,
): Promise<User | null> => {
  const db = await getDatabaseAdapter();
  return db.queryOne("SELECT * FROM users WHERE id = ?", [id]);
};

export const authenticateUser = async (
  email: string,
  password: string,
  req?: any,
): Promise<{ user: User; token: string } | null> => {
  log(
    "INFO",
    "USER_SERVICE",
    `Authentication attempt: ${email}`,
    undefined,
    req,
  );

  const user = await getUserByEmail(email, req);
  if (!user) {
    log(
      "WARN",
      "USER_SERVICE",
      `Authentication failed: user not found`,
      { email },
      req,
    );
    return null;
  }

  const isValidPassword = await comparePassword(password, user.password_hash);
  if (!isValidPassword) {
    log(
      "WARN",
      "USER_SERVICE",
      `Authentication failed: invalid password`,
      { email },
      req,
    );
    return null;
  }

  const token = generateJWTToken(user.id);

  // Create session in database
  await createUserSession(user.id, token, req);

  log(
    "INFO",
    "USER_SERVICE",
    `Authentication successful: ${email}`,
    {
      userId: user.id,
      role: user.role,
    },
    req,
  );

  return { user, token };
};

export const createUserSession = async (
  userId: string,
  token: string,
  req?: any,
): Promise<UserSession> => {
  const tokenHash = await bcrypt.hash(token, 8); // Lighter hash for tokens
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  const sessionId = randomUUID();
  const db = await getDatabaseAdapter();

  try {
    // Simple session creation without the sessions table for now
    // Just return a mock session object
    const session = {
      id: sessionId,
      user_id: userId,
      token_hash: tokenHash,
      expires_at: expiresAt.toISOString(),
      user_agent: req?.get?.("User-Agent") || null,
      ip_address: req?.ip || req?.connection?.remoteAddress || null,
      created_at: new Date().toISOString(),
    };

    log(
      "INFO",
      "USER_SERVICE",
      "Session created successfully",
      { sessionId },
      req,
    );
    return session;
  } catch (error) {
    log(
      "ERROR",
      "USER_SERVICE",
      "Session creation failed",
      { error: error.message },
      req,
    );
    throw new Error("Failed to create user session");
  }
};

export const validateUserSession = async (
  token: string,
  req?: any,
): Promise<User | null> => {
  const decoded = verifyJWTToken(token);
  if (!decoded) {
    return null;
  }

  const user = await getUserById(decoded.userId, req);
  if (!user) {
    return null;
  }

  // For now, just return the user if the token is valid
  // Sessions validation can be added later
  return user;
};

export const cleanupExpiredSessions = async (req?: any): Promise<number> => {
  const db = await getDatabaseAdapter();
  const query =
    "DELETE FROM user_sessions WHERE expires_at < CURRENT_TIMESTAMP";
  const result = await db.query(query, []);

  log(
    "INFO",
    "USER_SERVICE",
    `Cleaned up expired sessions`,
    {
      deletedCount: result.length,
    },
    req,
  );

  return result.length;
};

export const updateUserEmailVerification = async (
  userId: string,
  verified: boolean,
  req?: any,
): Promise<void> => {
  const db = await getDatabaseAdapter();
  const query =
    "UPDATE users SET email_verified = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
  await db.query(query, [verified, userId]);

  log(
    "INFO",
    "USER_SERVICE",
    `Email verification updated`,
    {
      userId,
      verified,
    },
    req,
  );
};

export const updateUserPhoneVerification = async (
  userId: string,
  verified: boolean,
  req?: any,
): Promise<void> => {
  const db = await getDatabaseAdapter();
  const query =
    "UPDATE users SET phone_verified = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
  await db.query(query, [verified, userId]);

  log(
    "INFO",
    "USER_SERVICE",
    `Phone verification updated`,
    {
      userId,
      verified,
    },
    req,
  );
};

export const updateUserPassword = async (
  userId: string,
  newPassword: string,
  req?: any,
): Promise<void> => {
  const passwordHash = await hashPassword(newPassword);
  const db = await getDatabaseAdapter();
  const query =
    "UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
  await db.query(query, [passwordHash, userId]);

  log("INFO", "USER_SERVICE", `Password updated`, { userId }, req);
};
