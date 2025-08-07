/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

/**
 * Example response type for /api/demo
 */
export interface DemoResponse {
  message: string;
}

// Authentication Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: User;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: 'customer' | 'admin' | 'technician';
  createdAt: string;
  updatedAt: string;
}

export interface OTPRequest {
  identifier: string; // email or phone
  type: 'email' | 'sms';
  purpose: 'login' | 'register' | 'reset_password';
}

export interface OTPVerifyRequest {
  identifier: string;
  code: string;
  purpose: 'login' | 'register' | 'reset_password';
}

export interface ResetPasswordRequest {
  identifier: string;
  newPassword: string;
  otpCode: string;
}

// Booking Types
export interface BookingRequest {
  vehicleInfo: {
    vin?: string;
    make?: string;
    model?: string;
    year?: string;
  };
  serviceAddress: string;
  customerInfo: {
    phone: string;
    email: string;
  };
  notes?: string;
  preferredDate?: string;
  preferredTime?: string;
}

export interface Booking {
  id: string;
  customerId: string;
  vehicleId: string;
  technicianId?: string;
  serviceAddress: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  scheduledDate: string;
  completedDate?: string;
  notes?: string;
  estimatedDuration: number; // in minutes
  price: number;
  createdAt: string;
  updatedAt: string;
}

export interface Vehicle {
  id: string;
  vin?: string;
  make: string;
  model: string;
  year: string;
  customerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Technician {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive' | 'busy';
  specializations: string[];
  rating: number;
  totalJobs: number;
  createdAt: string;
  updatedAt: string;
}

// Admin Types
export interface AdminDashboardData {
  todayBookings: Booking[];
  pendingBookings: Booking[];
  technicians: Technician[];
  recentCustomers: User[];
  stats: {
    totalBookings: number;
    completedToday: number;
    revenue: number;
    activeCustomers: number;
  };
}

export interface AssignTechnicianRequest {
  bookingId: string;
  technicianId: string;
}

// API Response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}
