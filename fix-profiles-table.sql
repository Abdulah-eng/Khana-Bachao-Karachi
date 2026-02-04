-- =============================================
-- FIX PROFILES TABLE - Add missing columns
-- Run this in Supabase SQL Editor
-- =============================================

-- Check current structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add role column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'role'
    ) THEN
        ALTER TABLE profiles ADD COLUMN role TEXT NOT NULL DEFAULT 'donor';
        ALTER TABLE profiles ADD CONSTRAINT check_role 
            CHECK (role IN ('donor', 'acceptor', 'admin'));
    END IF;
END $$;

-- Now update your user to be admin
UPDATE profiles 
SET role = 'admin', 
    is_verified = true
WHERE id = 'a87509e7-85b2-4187-99f4-8eea4fb562de';

-- Verify
SELECT id, email, full_name, role, is_verified 
FROM profiles 
WHERE id = 'a87509e7-85b2-4187-99f4-8eea4fb562de';
