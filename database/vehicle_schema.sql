-- Vehicle Database Schema for OilSync
-- Comprehensive vehicle make, model, and variant tracking

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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_vehicle_models_make_id ON vehicle_models(make_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_variants_model_id ON vehicle_variants(model_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_variants_year ON vehicle_variants(year);
CREATE INDEX IF NOT EXISTS idx_vin_patterns_wmi ON vin_patterns(wmi_code);
CREATE INDEX IF NOT EXISTS idx_service_pricing_make ON service_pricing(make_id);

-- Insert some initial VIN patterns for VAG Group
INSERT INTO vin_patterns (wmi_code, make_id, description) VALUES
-- Volkswagen WMI codes
('WVW', (SELECT id FROM vehicle_makes WHERE name = 'Volkswagen'), 'Volkswagen Germany'),
('1VW', (SELECT id FROM vehicle_makes WHERE name = 'Volkswagen'), 'Volkswagen USA'),
('3VW', (SELECT id FROM vehicle_makes WHERE name = 'Volkswagen'), 'Volkswagen Mexico'),
('9BW', (SELECT id FROM vehicle_makes WHERE name = 'Volkswagen'), 'Volkswagen Brazil'),
-- Audi WMI codes  
('WAU', (SELECT id FROM vehicle_makes WHERE name = 'Audi'), 'Audi Germany'),
('WA1', (SELECT id FROM vehicle_makes WHERE name = 'Audi'), 'Audi Germany Alternative'),
('TRU', (SELECT id FROM vehicle_makes WHERE name = 'Audi'), 'Audi Hungary'),
-- Porsche WMI codes
('WP0', (SELECT id FROM vehicle_makes WHERE name = 'Porsche'), 'Porsche Germany'),
('WP1', (SELECT id FROM vehicle_makes WHERE name = 'Porsche'), 'Porsche Germany Alternative')
ON CONFLICT DO NOTHING;

-- Insert base service pricing
INSERT INTO service_pricing (make_id, body_type, engine_type, base_price, luxury_surcharge) VALUES
-- Audi pricing (luxury surcharge)
((SELECT id FROM vehicle_makes WHERE name = 'Audi'), 'Sedan', 'Gasoline', 79.99, 20.00),
((SELECT id FROM vehicle_makes WHERE name = 'Audi'), 'SUV', 'Gasoline', 89.99, 20.00),
((SELECT id FROM vehicle_makes WHERE name = 'Audi'), 'Coupe', 'Gasoline', 84.99, 20.00),
-- Volkswagen pricing (standard)
((SELECT id FROM vehicle_makes WHERE name = 'Volkswagen'), 'Sedan', 'Gasoline', 69.99, 0),
((SELECT id FROM vehicle_makes WHERE name = 'Volkswagen'), 'SUV', 'Gasoline', 74.99, 0),
((SELECT id FROM vehicle_makes WHERE name = 'Volkswagen'), 'Hatchback', 'Gasoline', 64.99, 0),
-- Porsche pricing (premium luxury)
((SELECT id FROM vehicle_makes WHERE name = 'Porsche'), 'Coupe', 'Gasoline', 99.99, 40.00),
((SELECT id FROM vehicle_makes WHERE name = 'Porsche'), 'SUV', 'Gasoline', 109.99, 40.00),
((SELECT id FROM vehicle_makes WHERE name = 'Porsche'), 'Sedan', 'Gasoline', 104.99, 40.00)
ON CONFLICT DO NOTHING;

-- Add triggers to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_vehicle_makes_updated_at BEFORE UPDATE ON vehicle_makes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vehicle_models_updated_at BEFORE UPDATE ON vehicle_models FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_service_pricing_updated_at BEFORE UPDATE ON service_pricing FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
