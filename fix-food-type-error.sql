-- Fix for "type food_type does not exist" error
-- Run this entire script in Supabase SQL Editor

-- 1. Safely create the type if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'food_type') THEN
        CREATE TYPE food_type AS ENUM ('vegetarian', 'non-vegetarian', 'vegan', 'mixed');
    END IF;
END
$$;

-- 2. Pass donation_food_type as TEXT to avoid signature issues, then cast it
DROP FUNCTION IF EXISTS find_nearby_acceptors(DECIMAL, DECIMAL, INTEGER);
DROP FUNCTION IF EXISTS find_nearby_acceptors(DECIMAL, DECIMAL, INTEGER, food_type);

CREATE OR REPLACE FUNCTION find_nearby_acceptors(
    donor_lat DECIMAL,
    donor_lng DECIMAL,
    max_distance_km INTEGER DEFAULT 10,
    donation_food_type_text TEXT DEFAULT NULL -- Changed to TEXT for better compatibility
)
RETURNS TABLE (
    acceptor_id UUID,
    full_name TEXT,
    organization_name TEXT,
    distance_km DECIMAL,
    is_preferred_match BOOLEAN
) AS $$
DECLARE
    target_food_type food_type;
BEGIN
    -- Try to cast the text to food_type, default to NULL if invalid
    BEGIN
        target_food_type := donation_food_type_text::food_type;
    EXCEPTION WHEN OTHERS THEN
        target_food_type := NULL;
    END;

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
        ) AS distance_km,
        -- Check if donation food type matches user preferences
        CASE 
            WHEN target_food_type IS NOT NULL AND p.preferred_food_types IS NOT NULL THEN
                target_food_type = ANY(p.preferred_food_types)
            ELSE FALSE
        END AS is_preferred_match
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
    ORDER BY 
        is_preferred_match DESC,
        distance_km ASC;
END;
$$ LANGUAGE plpgsql;

-- 3. Update the notification trigger
CREATE OR REPLACE FUNCTION notify_nearby_acceptors()
RETURNS TRIGGER AS $$
DECLARE
    acceptor RECORD;
    score_text TEXT;
    food_type_str TEXT;
BEGIN
    -- Only notify when a new donation is created with 'available' status
    IF TG_OP = 'INSERT' AND NEW.status = 'available' THEN
        
        -- Convert the enum to text safely
        food_type_str := NEW.food_type::text;

        -- Find nearby acceptors
        FOR acceptor IN 
            SELECT * FROM find_nearby_acceptors(NEW.latitude, NEW.longitude, 10, food_type_str)
        LOOP
            IF acceptor.is_preferred_match THEN
                 score_text := ' (Matches your preferences!)';
            ELSE
                 score_text := '';
            END IF;

            INSERT INTO notifications (user_id, title, message, type, donation_id)
            VALUES (
                acceptor.acceptor_id,
                'New Food Donation Nearby!',
                format('New %s donation available %.1f km away: %s%s', 
                    NEW.food_type, acceptor.distance_km, NEW.food_name, score_text),
                'donation_nearby',
                NEW.id
            );
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
