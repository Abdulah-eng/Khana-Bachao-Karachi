-- =============================================
-- CLEANUP: Remove all old triggers and functions
-- Run this in Supabase SQL Editor
-- =============================================

-- Drop all triggers
DROP TRIGGER IF EXISTS notify_acceptors_on_new_donation ON donations;
DROP TRIGGER IF EXISTS update_on_acceptance ON donation_acceptances;
DROP TRIGGER IF EXISTS update_profile_location ON profiles;
DROP TRIGGER IF EXISTS update_donation_location ON donations;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_donations_updated_at ON donations;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop all functions
DROP FUNCTION IF EXISTS notify_nearby_acceptors() CASCADE;
DROP FUNCTION IF EXISTS update_donation_on_acceptance() CASCADE;
DROP FUNCTION IF EXISTS update_location_from_coordinates() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS find_nearby_acceptors(DECIMAL, DECIMAL, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Drop PostGIS-related columns if they exist
ALTER TABLE profiles DROP COLUMN IF EXISTS location CASCADE;
ALTER TABLE donations DROP COLUMN IF EXISTS location CASCADE;

-- Drop custom types if they exist
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS donation_status CASCADE;
DROP TYPE IF EXISTS food_type CASCADE;

-- Success message
SELECT 'All old triggers and functions removed successfully!' AS status;
