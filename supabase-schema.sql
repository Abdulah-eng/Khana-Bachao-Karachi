-- Food Donation Platform - Supabase Database Schema
-- Run this script in your Supabase SQL Editor

-- Enable PostGIS extension for geolocation features
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create custom types
CREATE TYPE user_role AS ENUM ('donor', 'acceptor', 'admin');
CREATE TYPE donation_status AS ENUM ('available', 'accepted', 'completed', 'cancelled');
CREATE TYPE food_type AS ENUM ('vegetarian', 'non-vegetarian', 'vegan', 'mixed');

-- =====================================================
-- PROFILES TABLE (extends auth.users)
-- =====================================================
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'donor',
    phone TEXT,
    
    -- Location data
    address TEXT,
    city TEXT DEFAULT 'Karachi',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    location GEOGRAPHY(POINT, 4326), -- PostGIS geography type
    
    -- Acceptor-specific fields
    organization_name TEXT,
    welfare_id TEXT, -- For NGO verification
    is_verified BOOLEAN DEFAULT FALSE,
    
    -- Donor-specific fields
    green_points INTEGER DEFAULT 0,
    
    -- Preferences
    preferred_food_types food_type[],
    
    -- Metadata
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create spatial index for location queries
CREATE INDEX idx_profiles_location ON profiles USING GIST(location);
CREATE INDEX idx_profiles_role ON profiles(role);

-- =====================================================
-- DONATIONS TABLE
-- =====================================================
CREATE TABLE donations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    donor_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    
    -- Food details
    food_name TEXT NOT NULL,
    food_type food_type NOT NULL,
    quantity TEXT NOT NULL,
    description TEXT,
    
    -- Location
    pickup_address TEXT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    
    -- Timing
    available_from TIMESTAMPTZ DEFAULT NOW(),
    available_until TIMESTAMPTZ NOT NULL,
    
    -- AI Analysis
    ai_quality_score DECIMAL(3, 2), -- 0.00 to 1.00
    ai_category TEXT,
    ai_expiry_prediction TIMESTAMPTZ,
    image_url TEXT,
    
    -- Status
    status donation_status DEFAULT 'available',
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_donations_donor ON donations(donor_id);
CREATE INDEX idx_donations_status ON donations(status);
CREATE INDEX idx_donations_location ON donations USING GIST(location);
CREATE INDEX idx_donations_available ON donations(status, available_until) WHERE status = 'available';

-- =====================================================
-- DONATION_ACCEPTANCES TABLE
-- =====================================================
CREATE TABLE donation_acceptances (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    donation_id UUID REFERENCES donations(id) ON DELETE CASCADE NOT NULL,
    acceptor_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    
    -- Distance at time of acceptance
    distance_km DECIMAL(6, 2),
    
    -- Status tracking
    accepted_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    -- Feedback
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_acceptances_donation ON donation_acceptances(donation_id);
CREATE INDEX idx_acceptances_acceptor ON donation_acceptances(acceptor_id);
CREATE UNIQUE INDEX idx_one_acceptance_per_donation ON donation_acceptances(donation_id);

-- =====================================================
-- NOTIFICATIONS TABLE
-- =====================================================
CREATE TABLE notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    
    -- Notification content
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL, -- 'donation_nearby', 'donation_accepted', 'donation_completed', etc.
    
    -- Related entities
    donation_id UUID REFERENCES donations(id) ON DELETE CASCADE,
    
    -- Status
    is_read BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- =====================================================
-- ADMIN_LOGS TABLE
-- =====================================================
CREATE TABLE admin_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    action TEXT NOT NULL,
    target_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    details JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index
CREATE INDEX idx_admin_logs_admin ON admin_logs(admin_id);
CREATE INDEX idx_admin_logs_created ON admin_logs(created_at DESC);

-- =====================================================
-- AI_INSIGHTS TABLE (for storing AI-generated patterns)
-- =====================================================
CREATE TABLE ai_insights (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    insight_type TEXT NOT NULL, -- 'demand_pattern', 'acceptance_rate', 'popular_area', etc.
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB, -- Store structured data
    
    -- Validity period
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index
CREATE INDEX idx_ai_insights_active ON ai_insights(is_active, valid_until);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update location geography from lat/lng
CREATE OR REPLACE FUNCTION update_location_from_coordinates()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
        NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to find nearby acceptors
CREATE OR REPLACE FUNCTION find_nearby_acceptors(
    donor_lat DECIMAL,
    donor_lng DECIMAL,
    max_distance_km INTEGER DEFAULT 10
)
RETURNS TABLE (
    acceptor_id UUID,
    full_name TEXT,
    organization_name TEXT,
    distance_km DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.full_name,
        p.organization_name,
        ROUND(
            ST_Distance(
                ST_SetSRID(ST_MakePoint(donor_lng, donor_lat), 4326)::geography,
                p.location
            ) / 1000, 2
        ) AS distance_km
    FROM profiles p
    WHERE 
        p.role = 'acceptor' 
        AND p.is_verified = TRUE
        AND p.location IS NOT NULL
        AND ST_DWithin(
            ST_SetSRID(ST_MakePoint(donor_lng, donor_lat), 4326)::geography,
            p.location,
            max_distance_km * 1000
        )
    ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to create notification for nearby acceptors
CREATE OR REPLACE FUNCTION notify_nearby_acceptors()
RETURNS TRIGGER AS $$
DECLARE
    acceptor RECORD;
BEGIN
    -- Only notify when a new donation is created with 'available' status
    IF TG_OP = 'INSERT' AND NEW.status = 'available' THEN
        -- Find nearby acceptors and create notifications
        FOR acceptor IN 
            SELECT * FROM find_nearby_acceptors(NEW.latitude, NEW.longitude, 10)
        LOOP
            INSERT INTO notifications (user_id, title, message, type, donation_id)
            VALUES (
                acceptor.acceptor_id,
                'New Food Donation Nearby!',
                format('New %s donation available %.1f km away: %s', 
                    NEW.food_type, acceptor.distance_km, NEW.food_name),
                'donation_nearby',
                NEW.id
            );
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update donation status when accepted
CREATE OR REPLACE FUNCTION update_donation_on_acceptance()
RETURNS TRIGGER AS $$
BEGIN
    -- Update donation status to accepted
    UPDATE donations 
    SET status = 'accepted', updated_at = NOW()
    WHERE id = NEW.donation_id;
    
    -- Notify donor
    INSERT INTO notifications (user_id, title, message, type, donation_id)
    SELECT 
        d.donor_id,
        'Your Donation Was Accepted!',
        format('%s has accepted your donation: %s', p.full_name, d.food_name),
        'donation_accepted',
        d.id
    FROM donations d
    JOIN profiles p ON p.id = NEW.acceptor_id
    WHERE d.id = NEW.donation_id;
    
    -- Award green points to donor
    UPDATE profiles
    SET green_points = green_points + 100
    WHERE id = (SELECT donor_id FROM donations WHERE id = NEW.donation_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_donations_updated_at BEFORE UPDATE ON donations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Location update triggers
CREATE TRIGGER update_profile_location BEFORE INSERT OR UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_location_from_coordinates();

CREATE TRIGGER update_donation_location BEFORE INSERT OR UPDATE ON donations
    FOR EACH ROW EXECUTE FUNCTION update_location_from_coordinates();

-- Notification triggers
CREATE TRIGGER notify_acceptors_on_new_donation AFTER INSERT ON donations
    FOR EACH ROW EXECUTE FUNCTION notify_nearby_acceptors();

CREATE TRIGGER update_on_acceptance AFTER INSERT ON donation_acceptances
    FOR EACH ROW EXECUTE FUNCTION update_donation_on_acceptance();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE donation_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
    ON profiles FOR SELECT
    USING (true);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Donations policies
CREATE POLICY "Available donations are viewable by acceptors and admins"
    ON donations FOR SELECT
    USING (
        status = 'available' OR
        donor_id = auth.uid() OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('acceptor', 'admin'))
    );

CREATE POLICY "Donors can create donations"
    ON donations FOR INSERT
    WITH CHECK (
        donor_id = auth.uid() AND
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'donor')
    );

CREATE POLICY "Donors can update own donations"
    ON donations FOR UPDATE
    USING (donor_id = auth.uid());

CREATE POLICY "Donors can delete own donations"
    ON donations FOR DELETE
    USING (donor_id = auth.uid());

-- Donation acceptances policies
CREATE POLICY "Users can view their own acceptances"
    ON donation_acceptances FOR SELECT
    USING (
        acceptor_id = auth.uid() OR
        EXISTS (SELECT 1 FROM donations WHERE id = donation_id AND donor_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Acceptors can create acceptances"
    ON donation_acceptances FOR INSERT
    WITH CHECK (
        acceptor_id = auth.uid() AND
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'acceptor' AND is_verified = TRUE)
    );

-- Notifications policies
CREATE POLICY "Users can view own notifications"
    ON notifications FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE
    USING (user_id = auth.uid());

-- Admin logs policies
CREATE POLICY "Only admins can view admin logs"
    ON admin_logs FOR SELECT
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Only admins can create admin logs"
    ON admin_logs FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- AI insights policies
CREATE POLICY "AI insights are viewable by everyone"
    ON ai_insights FOR SELECT
    USING (is_active = TRUE);

CREATE POLICY "Only admins can manage AI insights"
    ON ai_insights FOR ALL
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- =====================================================
-- REALTIME SUBSCRIPTIONS
-- =====================================================

-- Enable realtime for tables that need it
ALTER PUBLICATION supabase_realtime ADD TABLE donations;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE donation_acceptances;

-- =====================================================
-- INITIAL DATA (Optional)
-- =====================================================

-- Insert some AI insights for demo
INSERT INTO ai_insights (insight_type, title, message, data) VALUES
('demand_pattern', 'High Demand Alert', 'High demand for Biryani in Lyari tonight.', '{"area": "Lyari", "food_type": "Biryani", "demand_level": "high"}'),
('acceptance_rate', 'Welfare Center Status', 'Welfare centers in Gulshan are currently overloaded. Try Clifton centers.', '{"overloaded_areas": ["Gulshan"], "recommended_areas": ["Clifton"]}'),
('food_preference', 'Pro-Tip', 'Vegetarian food is being accepted 2x faster today!', '{"food_type": "vegetarian", "acceptance_multiplier": 2}');

-- =====================================================
-- HELPFUL QUERIES FOR TESTING
-- =====================================================

-- Find donations near a location
-- SELECT * FROM donations 
-- WHERE status = 'available' 
-- AND ST_DWithin(
--     location,
--     ST_SetSRID(ST_MakePoint(67.0011, 24.8607), 4326)::geography,
--     10000  -- 10km in meters
-- );

-- Find nearby acceptors for a donor
-- SELECT * FROM find_nearby_acceptors(24.8607, 67.0011, 10);

-- Get user statistics
-- SELECT 
--     role,
--     COUNT(*) as user_count,
--     COUNT(CASE WHEN is_verified THEN 1 END) as verified_count
-- FROM profiles
-- GROUP BY role;
