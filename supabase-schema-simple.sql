-- =============================================
-- SIMPLIFIED FOOD DONATION PLATFORM SCHEMA
-- Run this in Supabase SQL Editor
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. PROFILES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('donor', 'acceptor', 'admin')),
    
    -- Location data
    address TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    
    -- Acceptor-specific fields
    organization_name TEXT,
    welfare_id TEXT,
    is_verified BOOLEAN DEFAULT false,
    
    -- Gamification
    green_points INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 2. DONATIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS donations (
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

-- =============================================
-- 3. DONATION ACCEPTANCES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS donation_acceptances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    donation_id UUID NOT NULL REFERENCES donations(id) ON DELETE CASCADE,
    acceptor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    distance_km DOUBLE PRECISION,
    accepted_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled'))
);

-- =============================================
-- 4. NOTIFICATIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 5. AI INSIGHTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS ai_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    insight_type TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- DISABLE RLS (for testing - enable later)
-- =============================================
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE donations DISABLE ROW LEVEL SECURITY;
ALTER TABLE donation_acceptances DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights DISABLE ROW LEVEL SECURITY;

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_donations_donor ON donations(donor_id);
CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(status);
CREATE INDEX IF NOT EXISTS idx_donations_location ON donations(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_acceptances_donation ON donation_acceptances(donation_id);
CREATE INDEX IF NOT EXISTS idx_acceptances_acceptor ON donation_acceptances(acceptor_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

-- =============================================
-- FUNCTION: Auto-create profile on signup
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
        COALESCE(NEW.raw_user_meta_data->>'role', 'donor')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- SAMPLE DATA (Optional - for testing)
-- =============================================

-- Insert sample AI insights
INSERT INTO ai_insights (title, message, insight_type) VALUES
('High Demand Alert', 'High demand for Biryani in Lyari tonight.', 'demand'),
('Acceptance Pattern', 'Welfare centers in Gulshan are currently overloaded. Try Clifton centers.', 'pattern'),
('Pro Tip', 'Vegetarian food is being accepted 2x faster today!', 'tip')
ON CONFLICT DO NOTHING;

-- =============================================
-- DONE!
-- =============================================
-- Your database is now set up and ready to use.
-- RLS is DISABLED for testing. Enable it later for production.
