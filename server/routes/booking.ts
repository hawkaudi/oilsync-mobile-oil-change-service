import { RequestHandler } from "express";
import { BookingRequest, Booking, Vehicle, ApiResponse } from "@shared/api";
import {
  log,
  logBusinessOperation,
  logDatabaseAction,
} from "../middleware/logging";
import { executeQuery, executeQuerySingle } from "../database/connection";
import { getUserByEmail } from "../services/userService";
import { decodeVAGVIN } from "../services/vehicleService";

// Utility functions
const generateId = (prefix: string): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const calculatePrice = (make: string, model: string, year: string): number => {
  // Basic pricing logic - in real app, this would be more sophisticated
  const basePrice = 59.99;
  const currentYear = new Date().getFullYear();
  const vehicleAge = currentYear - parseInt(year);

  // Luxury cars cost more
  const luxuryBrands = ["bmw", "mercedes", "audi", "lexus", "acura"];
  const isLuxury = luxuryBrands.includes(make.toLowerCase());

  let price = basePrice;
  if (isLuxury) price += 20;
  if (vehicleAge < 3) price += 10; // Newer cars

  return Math.round(price * 100) / 100; // Round to 2 decimal places
};

const decodeVIN = (
  vin: string,
): { make: string; model: string; year: string } | null => {
  if (vin.length !== 17) return null;

  // Try VAG Group VIN decoder first (Audi, VW, Porsche)
  const vagResult = decodeVAGVIN(vin);
  if (vagResult) {
    return vagResult;
  }

  // Fallback to other manufacturer patterns
  const wmi = vin.substring(0, 3);
  const otherManufacturers: {
    [key: string]: { make: string; defaultModel: string };
  } = {
    // BMW
    WBA: { make: "BMW", defaultModel: "3 Series" },
    WBS: { make: "BMW", defaultModel: "M Series" },
    WBY: { make: "BMW", defaultModel: "X Series" },
    // Mercedes-Benz
    WDD: { make: "Mercedes-Benz", defaultModel: "C-Class" },
    WDC: { make: "Mercedes-Benz", defaultModel: "E-Class" },
    WDB: { make: "Mercedes-Benz", defaultModel: "S-Class" },
    // Toyota
    JTD: { make: "Toyota", defaultModel: "Camry" },
    JTN: { make: "Toyota", defaultModel: "Corolla" },
    "4T1": { make: "Toyota", defaultModel: "Camry" },
    // Honda
    "1HG": { make: "Honda", defaultModel: "Civic" },
    JHM: { make: "Honda", defaultModel: "Accord" },
    "2HG": { make: "Honda", defaultModel: "Civic" },
    // Ford
    "1FA": { make: "Ford", defaultModel: "Focus" },
    "1FT": { make: "Ford", defaultModel: "F-150" },
    "1FM": { make: "Ford", defaultModel: "Explorer" },
    // Chevrolet
    "1G1": { make: "Chevrolet", defaultModel: "Cruze" },
    "1GC": { make: "Chevrolet", defaultModel: "Silverado" },
    "1GN": { make: "Chevrolet", defaultModel: "Tahoe" },
    // Nissan
    "1N4": { make: "Nissan", defaultModel: "Altima" },
    JN1: { make: "Nissan", defaultModel: "Sentra" },
    JN8: { make: "Nissan", defaultModel: "Rogue" },
  };

  const manufacturer = otherManufacturers[wmi];
  if (manufacturer) {
    // Simple year decoding for position 10
    const yearChar = vin.charAt(9);
    const yearCodes: { [key: string]: number } = {
      A: 2010,
      B: 2011,
      C: 2012,
      D: 2013,
      E: 2014,
      F: 2015,
      G: 2016,
      H: 2017,
      J: 2018,
      K: 2019,
      L: 2020,
      M: 2021,
      N: 2022,
      P: 2023,
      R: 2024,
      S: 2025,
      T: 2026,
      V: 2027,
      W: 2028,
      X: 2029,
      Y: 2030,
      Z: 2031,
      "1": 2001,
      "2": 2002,
      "3": 2003,
      "4": 2004,
      "5": 2005,
      "6": 2006,
      "7": 2007,
      "8": 2008,
      "9": 2009,
    };

    const year = yearCodes[yearChar] || 2020;

    return {
      make: manufacturer.make,
      model: manufacturer.defaultModel,
      year: year.toString(),
    };
  }

  // Ultimate fallback - return null to indicate unknown VIN
  return null;
};

export const handleCreateBooking: RequestHandler = async (req, res) => {
  try {
    console.log(`[BOOKING] Creating new booking`);

    const bookingData: BookingRequest = req.body;

    if (
      !bookingData.serviceAddress ||
      !bookingData.customerInfo.email ||
      !bookingData.customerInfo.phone
    ) {
      console.log(`[BOOKING] Failed: Missing required fields`);
      return res.status(400).json({
        success: false,
        message: "Service address, email, and phone are required",
      } as ApiResponse);
    }

    let vehicleInfo = bookingData.vehicleInfo;

    // If VIN is provided, decode it
    if (vehicleInfo.vin) {
      const decodedVehicle = decodeVIN(vehicleInfo.vin);
      if (decodedVehicle) {
        vehicleInfo = {
          vin: vehicleInfo.vin,
          make: decodedVehicle.make,
          model: decodedVehicle.model,
          year: decodedVehicle.year,
        };
        console.log(
          `[BOOKING] VIN decoded: ${vehicleInfo.make} ${vehicleInfo.model} ${vehicleInfo.year}`,
        );
      } else {
        console.log(`[BOOKING] Failed: Invalid VIN format`);
        return res.status(400).json({
          success: false,
          message: "Invalid VIN format",
        } as ApiResponse);
      }
    }

    if (!vehicleInfo.make || !vehicleInfo.model || !vehicleInfo.year) {
      console.log(`[BOOKING] Failed: Missing vehicle information`);
      return res.status(400).json({
        success: false,
        message: "Vehicle make, model, and year are required",
      } as ApiResponse);
    }

    // Get customer by email
    const customer = await getUserByEmail(bookingData.customerInfo.email, req);
    const customerId = customer?.id || null;

    // Create or find vehicle in database
    let vehicle;
    if (vehicleInfo.vin) {
      // Check if vehicle with this VIN already exists
      vehicle = await executeQuerySingle<any>(
        "SELECT * FROM vehicles WHERE vin = $1",
        [vehicleInfo.vin],
        req,
      );
    }

    if (!vehicle) {
      // Create new vehicle
      const vehicleQuery = `
        INSERT INTO vehicles (customer_id, vin, make, model, year)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      const vehicleParams = [
        customerId,
        vehicleInfo.vin || null,
        vehicleInfo.make,
        vehicleInfo.model,
        parseInt(vehicleInfo.year),
      ];

      try {
        vehicle = await executeQuerySingle<any>(
          vehicleQuery,
          vehicleParams,
          req,
        );
        logDatabaseAction(
          "INSERT",
          "vehicles",
          true,
          {
            vehicleId: vehicle.id,
            make: vehicleInfo.make,
            model: vehicleInfo.model,
            year: vehicleInfo.year,
            hasVin: !!vehicleInfo.vin,
          },
          req,
        );
      } catch (error) {
        logDatabaseAction(
          "INSERT",
          "vehicles",
          false,
          { error: error.message },
          req,
        );
        throw error;
      }
    }

    // Calculate pricing
    const price = calculatePrice(
      vehicleInfo.make,
      vehicleInfo.model,
      vehicleInfo.year,
    );

    // Create booking in database
    const scheduledDate =
      bookingData.preferredDate ||
      new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // Default to tomorrow

    const bookingQuery = `
      INSERT INTO bookings (customer_id, vehicle_id, service_address, status, scheduled_date, notes, estimated_duration, price, customer_notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    const bookingParams = [
      customerId,
      vehicle.id,
      bookingData.serviceAddress,
      "pending",
      scheduledDate,
      bookingData.notes || null,
      60, // 1 hour default
      price,
      bookingData.notes || null,
    ];

    let booking;
    try {
      booking = await executeQuerySingle<any>(bookingQuery, bookingParams, req);
      logDatabaseAction(
        "INSERT",
        "bookings",
        true,
        {
          bookingId: booking.id,
          customerId: booking.customer_id,
          vehicleId: vehicle.id,
          price,
          status: booking.status,
          scheduledDate: booking.scheduled_date,
        },
        req,
      );
    } catch (error) {
      logDatabaseAction(
        "INSERT",
        "bookings",
        false,
        { error: error.message },
        req,
      );
      throw error;
    }

    log(
      "INFO",
      "BOOKING",
      `Created successfully: ${booking.id} for ${vehicleInfo.make} ${vehicleInfo.model}`,
      {
        bookingId: booking.id,
        vehicle: `${vehicleInfo.make} ${vehicleInfo.model} ${vehicleInfo.year}`,
        price,
        serviceAddress: bookingData.serviceAddress,
      },
      req,
    );

    // Convert database response to expected format
    const bookingResponse = {
      id: booking.id,
      customerId: booking.customer_id,
      vehicleId: booking.vehicle_id,
      serviceAddress: booking.service_address,
      status: booking.status,
      scheduledDate: booking.scheduled_date,
      notes: booking.notes,
      estimatedDuration: booking.estimated_duration,
      price: booking.price,
      createdAt: booking.created_at,
      updatedAt: booking.updated_at,
    };

    const vehicleResponse = {
      id: vehicle.id,
      vin: vehicle.vin,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year.toString(),
      customerId: vehicle.customer_id,
      createdAt: vehicle.created_at,
      updatedAt: vehicle.updated_at,
    };

    res.status(201).json({
      success: true,
      message: "Booking created successfully",
      data: {
        booking: bookingResponse,
        vehicle: vehicleResponse,
      },
    } as ApiResponse);
  } catch (error) {
    console.error(`[BOOKING] Creation error:`, error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    } as ApiResponse);
  }
};

export const handleGetBookings: RequestHandler = async (req, res) => {
  try {
    const { status, customerId } = req.query;

    let query = `
      SELECT
        b.*,
        v.make, v.model, v.year, v.vin,
        u.first_name, u.last_name, u.email, u.phone
      FROM bookings b
      LEFT JOIN vehicles v ON b.vehicle_id = v.id
      LEFT JOIN users u ON b.customer_id = u.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      query += ` AND b.status = $${paramCount}`;
      params.push(status);
    }

    if (customerId) {
      paramCount++;
      query += ` AND b.customer_id = $${paramCount}`;
      params.push(customerId);
    }

    query += ` ORDER BY b.created_at DESC`;

    const bookingsData = await executeQuery<any>(query, params, req);

    logDatabaseAction(
      "SELECT",
      "bookings",
      true,
      {
        totalRecords: bookingsData.length,
        filters: { status, customerId },
      },
      req,
    );

    // Convert database response to expected format
    const formattedBookings = bookingsData.map((booking) => ({
      id: booking.id,
      customerId: booking.customer_id,
      vehicleId: booking.vehicle_id,
      serviceAddress: booking.service_address,
      status: booking.status,
      scheduledDate: booking.scheduled_date,
      notes: booking.notes,
      estimatedDuration: booking.estimated_duration,
      price: booking.price,
      createdAt: booking.created_at,
      updatedAt: booking.updated_at,
      vehicle: {
        id: booking.vehicle_id,
        make: booking.make,
        model: booking.model,
        year: booking.year?.toString(),
        vin: booking.vin,
      },
      customer: {
        firstName: booking.first_name,
        lastName: booking.last_name,
        email: booking.email,
        phone: booking.phone,
      },
    }));

    log(
      "INFO",
      "BOOKING",
      `Found ${formattedBookings.length} bookings`,
      {
        total: formattedBookings.length,
        filters: { status, customerId },
      },
      req,
    );

    res.json({
      success: true,
      message: "Bookings retrieved successfully",
      data: formattedBookings,
    } as ApiResponse);
  } catch (error) {
    console.error(`[BOOKING] Fetch error:`, error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    } as ApiResponse);
  }
};

export const handleGetBooking: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[BOOKING] Fetching booking: ${id}`);

    const query = `
      SELECT
        b.*,
        v.make, v.model, v.year, v.vin, v.customer_id as vehicle_customer_id,
        u.first_name, u.last_name, u.email, u.phone
      FROM bookings b
      LEFT JOIN vehicles v ON b.vehicle_id = v.id
      LEFT JOIN users u ON b.customer_id = u.id
      WHERE b.id = $1
    `;

    const booking = await executeQuerySingle<any>(query, [id], req);

    if (!booking) {
      console.log(`[BOOKING] Not found: ${id}`);
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      } as ApiResponse);
    }

    console.log(`[BOOKING] Found booking: ${id}`);

    // Convert database response to expected format
    const bookingResponse = {
      id: booking.id,
      customerId: booking.customer_id,
      vehicleId: booking.vehicle_id,
      serviceAddress: booking.service_address,
      status: booking.status,
      scheduledDate: booking.scheduled_date,
      notes: booking.notes,
      estimatedDuration: booking.estimated_duration,
      price: booking.price,
      createdAt: booking.created_at,
      updatedAt: booking.updated_at,
    };

    const vehicleResponse = {
      id: booking.vehicle_id,
      make: booking.make,
      model: booking.model,
      year: booking.year?.toString(),
      vin: booking.vin,
      customerId: booking.vehicle_customer_id,
    };

    const customerResponse = {
      firstName: booking.first_name,
      lastName: booking.last_name,
      email: booking.email,
      phone: booking.phone,
    };

    res.json({
      success: true,
      message: "Booking retrieved successfully",
      data: {
        booking: bookingResponse,
        vehicle: vehicleResponse,
        customer: customerResponse,
      },
    } as ApiResponse);
  } catch (error) {
    console.error(`[BOOKING] Fetch error:`, error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    } as ApiResponse);
  }
};

export const handleUpdateBookingStatus: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, technicianId } = req.body;

    console.log(`[BOOKING] Updating booking ${id} status to: ${status}`);

    // Check if booking exists
    const existingBooking = await executeQuerySingle<any>(
      "SELECT * FROM bookings WHERE id = $1",
      [id],
      req,
    );

    if (!existingBooking) {
      console.log(`[BOOKING] Not found: ${id}`);
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      } as ApiResponse);
    }

    // Build update query dynamically
    let query = "UPDATE bookings SET status = $1, updated_at = NOW()";
    const params = [status];
    let paramCount = 1;

    if (technicianId) {
      paramCount++;
      query += `, technician_id = $${paramCount}`;
      params.push(technicianId);
    }

    if (status === "completed") {
      paramCount++;
      query += `, completed_date = $${paramCount}`;
      params.push(new Date().toISOString());
    }

    paramCount++;
    query += ` WHERE id = $${paramCount} RETURNING *`;
    params.push(id);

    const updatedBooking = await executeQuerySingle<any>(query, params, req);

    console.log(`[BOOKING] Updated successfully: ${id}`);

    // Convert database response to expected format
    const bookingResponse = {
      id: updatedBooking.id,
      customerId: updatedBooking.customer_id,
      vehicleId: updatedBooking.vehicle_id,
      serviceAddress: updatedBooking.service_address,
      status: updatedBooking.status,
      scheduledDate: updatedBooking.scheduled_date,
      completedDate: updatedBooking.completed_date,
      notes: updatedBooking.notes,
      estimatedDuration: updatedBooking.estimated_duration,
      price: updatedBooking.price,
      technicianId: updatedBooking.technician_id,
      createdAt: updatedBooking.created_at,
      updatedAt: updatedBooking.updated_at,
    };

    res.json({
      success: true,
      message: "Booking updated successfully",
      data: bookingResponse,
    } as ApiResponse);
  } catch (error) {
    console.error(`[BOOKING] Update error:`, error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    } as ApiResponse);
  }
};

export const handleCancelBooking: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[BOOKING] Cancelling booking: ${id}`);

    // Check if booking exists and get current status
    const booking = await executeQuerySingle<any>(
      "SELECT * FROM bookings WHERE id = $1",
      [id],
      req,
    );

    if (!booking) {
      console.log(`[BOOKING] Not found: ${id}`);
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      } as ApiResponse);
    }

    if (booking.status === "in_progress" || booking.status === "completed") {
      console.log(
        `[BOOKING] Cannot cancel booking in progress or completed: ${id}`,
      );
      return res.status(400).json({
        success: false,
        message: "Cannot cancel booking that is in progress or completed",
      } as ApiResponse);
    }

    // Update booking status to cancelled
    const updatedBooking = await executeQuerySingle<any>(
      "UPDATE bookings SET status = 'cancelled', updated_at = NOW() WHERE id = $1 RETURNING *",
      [id],
      req,
    );

    console.log(`[BOOKING] Cancelled successfully: ${id}`);

    // Convert database response to expected format
    const bookingResponse = {
      id: updatedBooking.id,
      customerId: updatedBooking.customer_id,
      vehicleId: updatedBooking.vehicle_id,
      serviceAddress: updatedBooking.service_address,
      status: updatedBooking.status,
      scheduledDate: updatedBooking.scheduled_date,
      notes: updatedBooking.notes,
      estimatedDuration: updatedBooking.estimated_duration,
      price: updatedBooking.price,
      createdAt: updatedBooking.created_at,
      updatedAt: updatedBooking.updated_at,
    };

    res.json({
      success: true,
      message: "Booking cancelled successfully",
      data: bookingResponse,
    } as ApiResponse);
  } catch (error) {
    console.error(`[BOOKING] Cancel error:`, error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    } as ApiResponse);
  }
};
