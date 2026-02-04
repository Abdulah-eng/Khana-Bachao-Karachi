-- =============================================
-- FIX: Remove the trigger that's causing 500 error
-- Run this in Supabase SQL Editor
-- =============================================

-- Drop the problematic trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- We don't need this trigger anymore since the signup page
-- manually creates the profile after auth signup
