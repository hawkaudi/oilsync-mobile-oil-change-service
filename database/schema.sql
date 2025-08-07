-- OilSync Database Schema for Neon PostgreSQL
-- This file contains the complete database schema for the OilSync application

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table (customers, admins, technicians)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('customer', 'admin', 'technician')),
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vehicles table
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vin VARCHAR(17), -- Optional, some customers may not provide VIN
    make VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INTEGER NOT NULL CHECK (year >= 1900 AND year <= 2100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Technicians additional info table
CREATE TABLE technicians (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'busy')),
    specializations TEXT[], -- Array of specializations
    rating DECIMAL(2,1) DEFAULT 0.0 CHECK (rating >= 0.0 AND rating <= 5.0),
    total_jobs INTEGER DEFAULT 0,
    hourly_rate DECIMAL(8,2),
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Services table
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    base_price DECIMAL(8,2) NOT NULL,
    estimated_duration INTEGER NOT NULL, -- in minutes
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bookings table
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES users(id),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id),
    technician_id UUID REFERENCES technicians(id),
    service_id UUID REFERENCES services(id),
    service_address TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')),
    scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_date TIMESTAMP WITH TIME ZONE,
    estimated_duration INTEGER NOT NULL DEFAULT 60, -- in minutes
    actual_duration INTEGER, -- in minutes, filled after completion
    price DECIMAL(8,2) NOT NULL,
    notes TEXT,
    customer_notes TEXT, -- Notes from customer
    technician_notes TEXT, -- Notes from technician
    cancellation_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- OTP codes table for phone/email verification
CREATE TABLE otp_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identifier VARCHAR(255) NOT NULL, -- email or phone
    code VARCHAR(10) NOT NULL,
    purpose VARCHAR(50) NOT NULL CHECK (purpose IN ('login', 'register', 'reset_password', 'verify_email', 'verify_phone')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    attempts INTEGER DEFAULT 0,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User sessions table (for token management)
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    user_agent TEXT,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payments table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id),
    amount DECIMAL(8,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
    payment_method VARCHAR(50), -- 'card', 'cash', 'digital_wallet', etc.
    transaction_id VARCHAR(255), -- External payment processor transaction ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reviews table
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id),
    customer_id UUID NOT NULL REFERENCES users(id),
    technician_id UUID NOT NULL REFERENCES technicians(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'booking_confirmed', 'booking_reminder', 'payment_received', etc.
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit log table for tracking changes
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    old_values JSONB,
    new_values JSONB,
    user_id UUID REFERENCES users(id),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_vehicles_customer_id ON vehicles(customer_id);
CREATE INDEX idx_vehicles_vin ON vehicles(vin);
CREATE INDEX idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX idx_bookings_technician_id ON bookings(technician_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_scheduled_date ON bookings(scheduled_date);
CREATE INDEX idx_otp_codes_identifier_purpose ON otp_codes(identifier, purpose);
CREATE INDEX idx_otp_codes_expires_at ON otp_codes(expires_at);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_payments_booking_id ON payments(booking_id);
CREATE INDEX idx_reviews_booking_id ON reviews(booking_id);
CREATE INDEX idx_reviews_technician_id ON reviews(technician_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_technicians_updated_at BEFORE UPDATE ON technicians FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Vehicle Management Tables for enhanced vehicle tracking
-- Vehicle Makes table
CREATE TABLE IF NOT EXISTS vehicle_makes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    country VARCHAR(50) NOT NULL,
    logo_url VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vehicle Models table
CREATE TABLE IF NOT EXISTS vehicle_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    make_id UUID NOT NULL REFERENCES vehicle_makes(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    year_start INTEGER NOT NULL CHECK (year_start >= 1900 AND year_start <= 2100),
    year_end INTEGER CHECK (year_end >= year_start AND year_end <= 2100),
    body_type VARCHAR(50) NOT NULL, -- Sedan, SUV, Hatchback, Coupe, Convertible, Truck, etc.
    engine_type VARCHAR(50) NOT NULL, -- Gasoline, Diesel, Electric, Hybrid, etc.
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(make_id, name)
);

-- Vehicle Variants table (specific configurations of models)
CREATE TABLE IF NOT EXISTS vehicle_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_id UUID NOT NULL REFERENCES vehicle_models(id) ON DELETE CASCADE,
    trim_level VARCHAR(100) NOT NULL, -- Base, Premium, Sport, etc.
    engine_size VARCHAR(20), -- 2.0L, 3.0L, etc.
    transmission VARCHAR(50), -- Manual, Automatic, CVT, etc.
    drivetrain VARCHAR(20), -- FWD, RWD, AWD, 4WD
    year INTEGER NOT NULL CHECK (year >= 1900 AND year <= 2100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- VIN Patterns table for enhanced VIN decoding
CREATE TABLE IF NOT EXISTS vin_patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wmi_code VARCHAR(3) NOT NULL, -- World Manufacturer Identifier
    make_id UUID NOT NULL REFERENCES vehicle_makes(id),
    model_id UUID REFERENCES vehicle_models(id),
    pattern VARCHAR(17), -- VIN pattern for specific models
    year_range_start INTEGER,
    year_range_end INTEGER,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Service Pricing table (pricing by vehicle category)
CREATE TABLE IF NOT EXISTS service_pricing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    make_id UUID REFERENCES vehicle_makes(id),
    body_type VARCHAR(50),
    engine_type VARCHAR(50),
    base_price DECIMAL(8,2) NOT NULL,
    luxury_surcharge DECIMAL(8,2) DEFAULT 0,
    electric_discount DECIMAL(8,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vehicle table indexes
CREATE INDEX IF NOT EXISTS idx_vehicle_models_make_id ON vehicle_models(make_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_variants_model_id ON vehicle_variants(model_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_variants_year ON vehicle_variants(year);
CREATE INDEX IF NOT EXISTS idx_vin_patterns_wmi ON vin_patterns(wmi_code);
CREATE INDEX IF NOT EXISTS idx_service_pricing_make ON service_pricing(make_id);

-- Vehicle table triggers
CREATE TRIGGER update_vehicle_makes_updated_at BEFORE UPDATE ON vehicle_makes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vehicle_models_updated_at BEFORE UPDATE ON vehicle_models FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_service_pricing_updated_at BEFORE UPDATE ON service_pricing FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default services
INSERT INTO services (name, description, base_price, estimated_duration) VALUES
('Standard Oil Change', 'Change engine oil with conventional motor oil', 39.99, 30),
('Synthetic Oil Change', 'Change engine oil with full synthetic motor oil', 59.99, 30),
('Oil & Filter Change', 'Change engine oil and oil filter', 49.99, 45),
('Premium Service', 'Oil change, filter change, and basic inspection', 79.99, 60),
('Diesel Oil Change', 'Specialized oil change for diesel engines', 69.99, 45);

-- Insert sample admin user (password: admin123)
INSERT INTO users (first_name, last_name, email, phone, password_hash, role, email_verified) VALUES
('Admin', 'User', 'admin@oilsync.com', '(555) 000-0000', crypt('admin123', gen_salt('bf')), 'admin', TRUE);

-- Insert sample technicians
INSERT INTO users (first_name, last_name, email, phone, password_hash, role, email_verified) VALUES
('John', 'Smith', 'john@oilsync.com', '(555) 123-4567', crypt('tech123', gen_salt('bf')), 'technician', TRUE),
('Sarah', 'Johnson', 'sarah@oilsync.com', '(555) 987-6543', crypt('tech123', gen_salt('bf')), 'technician', TRUE);

-- Insert technician details
INSERT INTO technicians (id, specializations, rating, total_jobs, hourly_rate, bio)
SELECT 
    u.id,
    ARRAY['Oil Change', 'Filter Replacement', 'Basic Maintenance'],
    4.8,
    156,
    25.00,
    'Experienced automotive technician with 5+ years in mobile service.'
FROM users u WHERE u.email = 'john@oilsync.com';

INSERT INTO technicians (id, specializations, rating, total_jobs, hourly_rate, bio)
SELECT 
    u.id,
    ARRAY['Oil Change', 'Synthetic Oil', 'Diesel Service'],
    4.9,
    203,
    28.00,
    'Certified technician specializing in modern vehicle maintenance.'
FROM users u WHERE u.email = 'sarah@oilsync.com';

-- Create a view for booking details with related information
CREATE VIEW booking_details AS
SELECT 
    b.id,
    b.status,
    b.scheduled_date,
    b.completed_date,
    b.price,
    b.service_address,
    b.notes,
    b.customer_notes,
    b.technician_notes,
    -- Customer info
    c.first_name as customer_first_name,
    c.last_name as customer_last_name,
    c.email as customer_email,
    c.phone as customer_phone,
    -- Vehicle info
    v.make as vehicle_make,
    v.model as vehicle_model,
    v.year as vehicle_year,
    v.vin as vehicle_vin,
    -- Technician info
    t.first_name as technician_first_name,
    t.last_name as technician_last_name,
    t.email as technician_email,
    tech.rating as technician_rating,
    -- Service info
    s.name as service_name,
    s.description as service_description,
    b.created_at,
    b.updated_at
FROM bookings b
JOIN users c ON b.customer_id = c.id
JOIN vehicles v ON b.vehicle_id = v.id
LEFT JOIN technicians tech ON b.technician_id = tech.id
LEFT JOIN users t ON tech.id = t.id
LEFT JOIN services s ON b.service_id = s.id;

-- Function to clean up expired OTP codes
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void AS $$
BEGIN
    DELETE FROM otp_codes WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM user_sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE users IS 'All users including customers, technicians, and admins';
COMMENT ON TABLE vehicles IS 'Customer vehicles with make, model, year, and optional VIN';
COMMENT ON TABLE technicians IS 'Additional information for technician users';
COMMENT ON TABLE services IS 'Available services with pricing and duration';
COMMENT ON TABLE bookings IS 'Service bookings and appointments';
COMMENT ON TABLE otp_codes IS 'One-time passwords for verification';
COMMENT ON TABLE user_sessions IS 'User authentication sessions';
COMMENT ON TABLE payments IS 'Payment transactions';
COMMENT ON TABLE reviews IS 'Customer reviews and ratings';
COMMENT ON TABLE notifications IS 'User notifications';
COMMENT ON TABLE audit_logs IS 'Audit trail for all database changes';
