-- =============================================
-- CHECK AND FIX DONATIONS TABLE STRUCTURE
-- Run this in Supabase SQL Editor
-- =============================================

-- First, let's see what columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'donations' 
ORDER BY ordinal_position;

-- If food_type column is missing or wrong type, fix it:
-- (Run this part only if needed based on above results)

-- Add food_type column if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'donations' AND column_name = 'food_type'
    ) THEN
        ALTER TABLE donations ADD COLUMN food_type TEXT NOT NULL DEFAULT 'vegetarian';
        ALTER TABLE donations ADD CONSTRAINT check_food_type 
            CHECK (food_type IN ('vegetarian', 'non-vegetarian', 'vegan', 'mixed'));
    END IF;
END $$;

-- Verify the fix
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'donations' AND column_name = 'food_type';
