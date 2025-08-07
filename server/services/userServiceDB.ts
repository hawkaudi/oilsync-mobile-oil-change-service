import { getDatabaseAdapter } from "../database/adapter";
import { log } from "../middleware/logging";

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export const getUserById = async (
  userId: string,
  req?: any,
): Promise<UserProfile | null> => {
  try {
    log("DEBUG", "USER_SERVICE", "Fetching user by ID", { userId }, req);

    const db = await getDatabaseAdapter();
    const user = await db.queryOne("SELECT * FROM users WHERE id = ?", [
      userId,
    ]);

    if (!user) {
      log("DEBUG", "USER_SERVICE", "User not found", { userId }, req);
      return null;
    }

    log(
      "DEBUG",
      "USER_SERVICE",
      "User fetched successfully",
      {
        userId,
        email: user.email,
        emailVerified: user.email_verified,
        phoneVerified: user.phone_verified,
      },
      req,
    );

    return {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      emailVerified: Boolean(user.email_verified),
      phoneVerified: Boolean(user.phone_verified),
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  } catch (error) {
    log(
      "ERROR",
      "USER_SERVICE",
      "Failed to fetch user",
      {
        userId,
        error: error.message,
      },
      req,
    );
    throw new Error(`Failed to fetch user: ${error.message}`);
  }
};

export const getUserByEmail = async (
  email: string,
  req?: any,
): Promise<UserProfile | null> => {
  try {
    log("DEBUG", "USER_SERVICE", "Fetching user by email", { email }, req);

    const db = await getDatabaseAdapter();
    const user = await db.queryOne("SELECT * FROM users WHERE email = ?", [
      email,
    ]);

    if (!user) {
      log("DEBUG", "USER_SERVICE", "User not found", { email }, req);
      return null;
    }

    return {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      emailVerified: Boolean(user.email_verified),
      phoneVerified: Boolean(user.phone_verified),
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  } catch (error) {
    log(
      "ERROR",
      "USER_SERVICE",
      "Failed to fetch user by email",
      {
        email,
        error: error.message,
      },
      req,
    );
    throw new Error(`Failed to fetch user: ${error.message}`);
  }
};

export const updateEmailVerification = async (
  userId: string,
  verified: boolean = true,
  req?: any,
): Promise<UserProfile | null> => {
  try {
    log(
      "DEBUG",
      "USER_SERVICE",
      "Updating email verification status",
      {
        userId,
        verified,
      },
      req,
    );

    const db = await getDatabaseAdapter();

    await db.query(
      "UPDATE users SET email_verified = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [verified, userId],
    );

    const updatedUser = await getUserById(userId, req);

    log(
      "INFO",
      "USER_SERVICE",
      "Email verification status updated",
      {
        userId,
        verified,
        success: !!updatedUser,
      },
      req,
    );

    return updatedUser;
  } catch (error) {
    log(
      "ERROR",
      "USER_SERVICE",
      "Failed to update email verification",
      {
        userId,
        verified,
        error: error.message,
      },
      req,
    );
    throw new Error(`Failed to update email verification: ${error.message}`);
  }
};

export const updatePhoneVerification = async (
  userId: string,
  verified: boolean = true,
  req?: any,
): Promise<UserProfile | null> => {
  try {
    log(
      "DEBUG",
      "USER_SERVICE",
      "Updating phone verification status",
      {
        userId,
        verified,
      },
      req,
    );

    const db = await getDatabaseAdapter();

    await db.query(
      "UPDATE users SET phone_verified = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [verified, userId],
    );

    const updatedUser = await getUserById(userId, req);

    log(
      "INFO",
      "USER_SERVICE",
      "Phone verification status updated",
      {
        userId,
        verified,
        success: !!updatedUser,
      },
      req,
    );

    return updatedUser;
  } catch (error) {
    log(
      "ERROR",
      "USER_SERVICE",
      "Failed to update phone verification",
      {
        userId,
        verified,
        error: error.message,
      },
      req,
    );
    throw new Error(`Failed to update phone verification: ${error.message}`);
  }
};

export const createUser = async (
  userData: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    passwordHash: string;
    role?: string;
  },
  req?: any,
): Promise<UserProfile> => {
  try {
    log(
      "DEBUG",
      "USER_SERVICE",
      "Creating new user",
      {
        email: userData.email,
        role: userData.role || "customer",
      },
      req,
    );

    const db = await getDatabaseAdapter();

    await db.query(
      `INSERT INTO users (id, first_name, last_name, email, phone, password_hash, role, email_verified, phone_verified, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, false, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        userData.id,
        userData.firstName,
        userData.lastName,
        userData.email,
        userData.phone,
        userData.passwordHash,
        userData.role || "customer",
      ],
    );

    const newUser = await getUserById(userData.id, req);

    log(
      "INFO",
      "USER_SERVICE",
      "User created successfully",
      {
        userId: userData.id,
        email: userData.email,
      },
      req,
    );

    return newUser!;
  } catch (error) {
    log(
      "ERROR",
      "USER_SERVICE",
      "Failed to create user",
      {
        email: userData.email,
        error: error.message,
      },
      req,
    );
    throw new Error(`Failed to create user: ${error.message}`);
  }
};

export const testDatabaseConnection = async (
  req?: any,
): Promise<{
  success: boolean;
  dbType: string;
  message: string;
  userCount?: number;
  error?: string;
}> => {
  try {
    const db = await getDatabaseAdapter();

    // Test query
    await db.query("SELECT 1");

    // Count users
    const result = await db.queryOne("SELECT COUNT(*) as count FROM users");
    const userCount = result?.count || 0;

    return {
      success: true,
      dbType: db.type,
      message: `Database connection successful (${db.type})`,
      userCount,
    };
  } catch (error) {
    return {
      success: false,
      dbType: "unknown",
      message: "Database connection failed",
      error: error.message,
    };
  }
};
