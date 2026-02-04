-- =============================================
-- COMPLETE FIX: Recreate donations table properly
-- Run this in Supabase SQL Editor
-- =============================================

-- Step 1: Drop and recreate donations table with correct structure
DROP TABLE IF EXISTS donations CASCADE;

CREATE TABLE donations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    donor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Food details
    food_name TEXT NOT NULL,
    food_type TEXT NOT NULL CHECK (food_type IN ('vegetarian', 'non-vegetarian', 'vegan', 'mixed')),
    quantity TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    
    -- Pickup details
    pickup_address TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    available_until TIMESTAMPTZ NOT NULL,
    
    -- AI metadata
    ai_quality_score DOUBLE PRECISION,
    ai_category TEXT,
    ai_expiry_prediction TIMESTAMPTZ,
    
    -- Status
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'accepted', 'completed', 'cancelled')),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Recreate indexes
CREATE INDEX idx_donations_donor ON donations(donor_id);
CREATE INDEX idx_donations_status ON donations(status);
CREATE INDEX idx_donations_location ON donations(latitude, longitude);

-- Step 3: Disable RLS for testing
ALTER TABLE donations DISABLE ROW LEVEL SECURITY;

-- Step 4: Also fix donation_acceptances table
DROP TABLE IF EXISTS donation_acceptances CASCADE;

CREATE TABLE donation_acceptances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    donation_id UUID NOT NULL REFERENCES donations(id) ON DELETE CASCADE,
    acceptor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    distance_km DOUBLE PRECISION,
    accepted_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled'))
);

CREATE INDEX idx_acceptances_donation ON donation_acceptances(donation_id);
CREATE INDEX idx_acceptances_acceptor ON donation_acceptances(acceptor_id);

ALTER TABLE donation_acceptances DISABLE ROW LEVEL SECURITY;

-- Success!
SELECT 'Donations table recreated successfully!' AS status;
