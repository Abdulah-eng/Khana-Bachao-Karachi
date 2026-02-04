-- =============================================
-- CHECK USER PROFILE DATA
-- Run this to see what's in your profile
-- =============================================

-- Check if your user exists in profiles table
SELECT 
    id,
    email,
    full_name,
    role,
    is_verified,
    created_at
FROM profiles
WHERE id = 'a87509e7-85b2-4187-99f4-8eea4fb562de';

-- If the above returns nothing, your profile doesn't exist
-- If it returns but role is NULL, we need to update it

-- Fix: Update your profile to have admin role
UPDATE profiles 
SET role = 'admin', 
    is_verified = true
WHERE id = 'a87509e7-85b2-4187-99f4-8eea4fb562de';

-- Verify the update
SELECT id, email, role, is_verified FROM profiles 
WHERE id = 'a87509e7-85b2-4187-99f4-8eea4fb562de';
