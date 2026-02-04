-- =============================================
-- QUICK FIX: Create Admin Profile
-- Run this AFTER running supabase-schema-simple.sql
-- =============================================

-- First, check if profiles table exists
-- If you get an error, run supabase-schema-simple.sql first!

-- Insert admin profile for your user
-- Replace the UUID with your actual user ID from auth.users
INSERT INTO profiles (
    id,
    email,
    full_name,
    role,
    phone,
    address,
    latitude,
    longitude,
    is_verified,
    green_points
) VALUES (
    'a87509e7-85b2-4187-99f4-8eea4fb562de'::uuid,  -- Your user ID
    'admin@fooddonation.com',  -- Replace with your actual email
    'Admin User',
    'admin',
    '+92-XXX-XXXXXXX',
    'Karachi, Pakistan',
    24.8607,  -- Karachi coordinates
    67.0011,
    true,
    0
)
ON CONFLICT (id) 
DO UPDATE SET 
    role = 'admin',
    is_verified = true;

-- Verify the insert worked
SELECT id, email, full_name, role FROM profiles WHERE id = 'a87509e7-85b2-4187-99f4-8eea4fb562de';
