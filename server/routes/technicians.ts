import { RequestHandler } from "express";
import { Technician, ApiResponse } from "@shared/api";
import { log, logBusinessOperation } from "../middleware/logging";

// In-memory storage for demo purposes
const technicians = new Map<string, Technician>();

// Initialize with sample data
const initializeTechnicians = () => {
  if (technicians.size === 0) {
    const sampleTechnicians: Technician[] = [
      {
        id: 'tech_1',
        firstName: 'John',
        lastName: 'Smith',
        email: 'john@oilsync.com',
        phone: '(555) 123-4567',
        status: 'active',
        specializations: ['Oil Change', 'Filter Replacement'],
        rating: 4.8,
        totalJobs: 156,
        createdAt: '2024-01-15T00:00:00Z',
        updatedAt: '2024-01-15T00:00:00Z'
      },
      {
        id: 'tech_2',
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'sarah@oilsync.com',
        phone: '(555) 987-6543',
        status: 'busy',
        specializations: ['Oil Change', 'Maintenance'],
        rating: 4.9,
        totalJobs: 203,
        createdAt: '2024-01-10T00:00:00Z',
        updatedAt: '2024-01-15T00:00:00Z'
      },
      {
        id: 'tech_3',
        firstName: 'Mike',
        lastName: 'Rodriguez',
        email: 'mike@oilsync.com',
        phone: '(555) 456-7890',
        status: 'active',
        specializations: ['Oil Change', 'Synthetic Oil', 'Diesel Service'],
        rating: 4.7,
        totalJobs: 89,
        createdAt: '2024-02-01T00:00:00Z',
        updatedAt: '2024-02-01T00:00:00Z'
      }
    ];

    sampleTechnicians.forEach(tech => technicians.set(tech.id, tech));
    log('INFO', 'TECHNICIANS', 'Initialized sample technician data', { count: sampleTechnicians.length });
  }
};

export const handleGetTechnicians: RequestHandler = async (req, res) => {
  try {
    initializeTechnicians();
    
    const { status } = req.query;
    logBusinessOperation('FETCH_TECHNICIANS', 'Retrieving technicians list', { status }, req);
    
    let filteredTechnicians = Array.from(technicians.values());
    
    if (status) {
      filteredTechnicians = filteredTechnicians.filter(tech => tech.status === status);
    }

    // Sort by rating descending, then by total jobs
    filteredTechnicians.sort((a, b) => {
      if (b.rating !== a.rating) {
        return b.rating - a.rating;
      }
      return b.totalJobs - a.totalJobs;
    });

    log('INFO', 'TECHNICIANS', `Found ${filteredTechnicians.length} technicians`, { 
      total: technicians.size, 
      filtered: filteredTechnicians.length,
      status 
    }, req);

    res.json({
      success: true,
      message: "Technicians retrieved successfully",
      data: filteredTechnicians
    } as ApiResponse);

  } catch (error) {
    log('ERROR', 'TECHNICIANS', 'Failed to fetch technicians', { error: error.message }, req);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    } as ApiResponse);
  }
};

export const handleGetTechnician: RequestHandler = async (req, res) => {
  try {
    initializeTechnicians();
    
    const { id } = req.params;
    logBusinessOperation('FETCH_TECHNICIAN', `Retrieving technician ${id}`, undefined, req);
    
    const technician = technicians.get(id);
    
    if (!technician) {
      log('WARN', 'TECHNICIANS', `Technician not found: ${id}`, undefined, req);
      return res.status(404).json({
        success: false,
        message: "Technician not found"
      } as ApiResponse);
    }

    log('INFO', 'TECHNICIANS', `Found technician: ${technician.firstName} ${technician.lastName}`, { id }, req);

    res.json({
      success: true,
      message: "Technician retrieved successfully",
      data: technician
    } as ApiResponse);

  } catch (error) {
    log('ERROR', 'TECHNICIANS', 'Failed to fetch technician', { error: error.message }, req);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    } as ApiResponse);
  }
};

export const handleUpdateTechnicianStatus: RequestHandler = async (req, res) => {
  try {
    initializeTechnicians();
    
    const { id } = req.params;
    const { status } = req.body;
    
    logBusinessOperation('UPDATE_TECHNICIAN_STATUS', `Updating technician ${id} status to ${status}`, { id, status }, req);
    
    const technician = technicians.get(id);
    
    if (!technician) {
      log('WARN', 'TECHNICIANS', `Technician not found: ${id}`, undefined, req);
      return res.status(404).json({
        success: false,
        message: "Technician not found"
      } as ApiResponse);
    }

    if (!['active', 'inactive', 'busy'].includes(status)) {
      log('WARN', 'TECHNICIANS', `Invalid status: ${status}`, { id }, req);
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be 'active', 'inactive', or 'busy'"
      } as ApiResponse);
    }

    technician.status = status;
    technician.updatedAt = new Date().toISOString();
    technicians.set(id, technician);

    log('INFO', 'TECHNICIANS', `Updated technician status: ${technician.firstName} ${technician.lastName} -> ${status}`, { id }, req);

    res.json({
      success: true,
      message: "Technician status updated successfully",
      data: technician
    } as ApiResponse);

  } catch (error) {
    log('ERROR', 'TECHNICIANS', 'Failed to update technician status', { error: error.message }, req);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    } as ApiResponse);
  }
};

export const handleCreateTechnician: RequestHandler = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, specializations, hourlyRate } = req.body;
    
    logBusinessOperation('CREATE_TECHNICIAN', `Creating new technician: ${firstName} ${lastName}`, { email }, req);
    
    if (!firstName || !lastName || !email || !phone) {
      log('WARN', 'TECHNICIANS', 'Missing required fields for technician creation', { email }, req);
      return res.status(400).json({
        success: false,
        message: "First name, last name, email, and phone are required"
      } as ApiResponse);
    }

    // Check if email already exists
    const existingTechnician = Array.from(technicians.values()).find(tech => tech.email === email);
    if (existingTechnician) {
      log('WARN', 'TECHNICIANS', `Email already exists: ${email}`, undefined, req);
      return res.status(409).json({
        success: false,
        message: "Email already registered"
      } as ApiResponse);
    }

    const technicianId = `tech_${Date.now()}`;
    const newTechnician: Technician = {
      id: technicianId,
      firstName,
      lastName,
      email,
      phone,
      status: 'active',
      specializations: specializations || ['Oil Change'],
      rating: 0.0,
      totalJobs: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    technicians.set(technicianId, newTechnician);

    log('INFO', 'TECHNICIANS', `Created new technician: ${firstName} ${lastName}`, { id: technicianId, email }, req);

    res.status(201).json({
      success: true,
      message: "Technician created successfully",
      data: newTechnician
    } as ApiResponse);

  } catch (error) {
    log('ERROR', 'TECHNICIANS', 'Failed to create technician', { error: error.message }, req);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    } as ApiResponse);
  }
};

export const handleDeleteTechnician: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    
    logBusinessOperation('DELETE_TECHNICIAN', `Deleting technician ${id}`, { id }, req);
    
    const technician = technicians.get(id);
    
    if (!technician) {
      log('WARN', 'TECHNICIANS', `Technician not found: ${id}`, undefined, req);
      return res.status(404).json({
        success: false,
        message: "Technician not found"
      } as ApiResponse);
    }

    technicians.delete(id);

    log('INFO', 'TECHNICIANS', `Deleted technician: ${technician.firstName} ${technician.lastName}`, { id }, req);

    res.json({
      success: true,
      message: "Technician deleted successfully"
    } as ApiResponse);

  } catch (error) {
    log('ERROR', 'TECHNICIANS', 'Failed to delete technician', { error: error.message }, req);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    } as ApiResponse);
  }
};
