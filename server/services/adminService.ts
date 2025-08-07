import { executeQuery, executeQuerySingle } from "../database/connection";
import {
  createUser,
  getUserByEmail,
  updateUserEmailVerification,
  User,
} from "./userService";
import { log } from "../middleware/logging";

export const createAdminAccount = async (
  email: string = "admin@oilsync.com",
  password: string = "admin123",
  req?: any,
): Promise<User> => {
  log("INFO", "ADMIN_SERVICE", "Creating admin account", { email }, req);

  // Check if admin already exists
  const existingAdmin = await getUserByEmail(email, req);
  if (existingAdmin) {
    log(
      "INFO",
      "ADMIN_SERVICE",
      "Admin account already exists",
      { email },
      req,
    );
    return existingAdmin;
  }

  // Create admin user
  const adminUser = await createUser(
    {
      firstName: "Admin",
      lastName: "User",
      email,
      phone: "(555) 000-0000",
      password,
      role: "admin",
    },
    req,
  );

  // Mark admin email as verified
  await updateUserEmailVerification(adminUser.id, true, req);

  log(
    "INFO",
    "ADMIN_SERVICE",
    "Admin account created successfully",
    {
      userId: adminUser.id,
      email: adminUser.email,
    },
    req,
  );

  return adminUser;
};

export const seedDefaultAccounts = async (req?: any): Promise<void> => {
  try {
    log("INFO", "ADMIN_SERVICE", "Seeding default accounts", undefined, req);

    // Create admin account
    await createAdminAccount("admin@oilsync.com", "admin123", req);

    // Create default technicians
    const existingTech1 = await getUserByEmail("john@oilsync.com", req);
    if (!existingTech1) {
      const tech1 = await createUser(
        {
          firstName: "John",
          lastName: "Smith",
          email: "john@oilsync.com",
          phone: "(555) 123-4567",
          password: "tech123",
          role: "technician",
        },
        req,
      );

      await updateUserEmailVerification(tech1.id, true, req);

      // Add technician details
      await executeQuery(
        `
        INSERT INTO technicians (id, specializations, rating, total_jobs, hourly_rate, bio)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO NOTHING
      `,
        [
          tech1.id,
          ["Oil Change", "Filter Replacement", "Basic Maintenance"],
          4.8,
          156,
          25.0,
          "Experienced automotive technician with 5+ years in mobile service.",
        ],
        req,
      );
    }

    const existingTech2 = await getUserByEmail("sarah@oilsync.com", req);
    if (!existingTech2) {
      const tech2 = await createUser(
        {
          firstName: "Sarah",
          lastName: "Johnson",
          email: "sarah@oilsync.com",
          phone: "(555) 987-6543",
          password: "tech123",
          role: "technician",
        },
        req,
      );

      await updateUserEmailVerification(tech2.id, true, req);

      // Add technician details
      await executeQuery(
        `
        INSERT INTO technicians (id, specializations, rating, total_jobs, hourly_rate, bio)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO NOTHING
      `,
        [
          tech2.id,
          ["Oil Change", "Synthetic Oil", "Diesel Service"],
          4.9,
          203,
          28.0,
          "Certified technician specializing in modern vehicle maintenance.",
        ],
        req,
      );
    }

    log(
      "INFO",
      "ADMIN_SERVICE",
      "Default accounts seeded successfully",
      undefined,
      req,
    );
  } catch (error) {
    log(
      "ERROR",
      "ADMIN_SERVICE",
      "Failed to seed default accounts",
      {
        error: error.message,
      },
      req,
    );
    throw error;
  }
};

export const getAllUsers = async (req?: any): Promise<User[]> => {
  const query = `
    SELECT id, first_name, last_name, email, phone, role, email_verified, phone_verified, created_at, updated_at
    FROM users
    ORDER BY created_at DESC
  `;

  return executeQuery<User>(query, [], req);
};

export const getUserStats = async (
  req?: any,
): Promise<{
  totalUsers: number;
  customers: number;
  technicians: number;
  admins: number;
  verified: number;
  unverified: number;
}> => {
  const queries = [
    "SELECT COUNT(*) as count FROM users",
    "SELECT COUNT(*) as count FROM users WHERE role = $1",
    "SELECT COUNT(*) as count FROM users WHERE role = $1",
    "SELECT COUNT(*) as count FROM users WHERE role = $1",
    "SELECT COUNT(*) as count FROM users WHERE email_verified = true",
    "SELECT COUNT(*) as count FROM users WHERE email_verified = false",
  ];

  const [total, customers, technicians, admins, verified, unverified] =
    await Promise.all([
      executeQuerySingle<{ count: string }>(queries[0], [], req),
      executeQuerySingle<{ count: string }>(queries[1], ["customer"], req),
      executeQuerySingle<{ count: string }>(queries[2], ["technician"], req),
      executeQuerySingle<{ count: string }>(queries[3], ["admin"], req),
      executeQuerySingle<{ count: string }>(queries[4], [], req),
      executeQuerySingle<{ count: string }>(queries[5], [], req),
    ]);

  return {
    totalUsers: parseInt(total?.count || "0"),
    customers: parseInt(customers?.count || "0"),
    technicians: parseInt(technicians?.count || "0"),
    admins: parseInt(admins?.count || "0"),
    verified: parseInt(verified?.count || "0"),
    unverified: parseInt(unverified?.count || "0"),
  };
};
