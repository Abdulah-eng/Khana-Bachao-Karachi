-- Migration: Update find_nearby_acceptors to include preference matching logic
-- This will prioritize users who have matching food preferences
-- Note: 'preferred_food_types' is an array of food_type enum

DROP FUNCTION IF EXISTS find_nearby_acceptors(DECIMAL, DECIMAL, INTEGER);

CREATE OR REPLACE FUNCTION find_nearby_acceptors(
    donor_lat DECIMAL,
    donor_lng DECIMAL,
    max_distance_km INTEGER DEFAULT 10,
    donation_food_type food_type DEFAULT NULL -- Optional: pass the food type being donated
)
RETURNS TABLE (
    acceptor_id UUID,
    full_name TEXT,
    organization_name TEXT,
    distance_km DECIMAL,
    is_preferred_match BOOLEAN
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
        ) AS distance_km,
        -- Check if donation food type matches user preferences (if preferences exist and food type is provided)
        CASE 
            WHEN donation_food_type IS NOT NULL AND p.preferred_food_types IS NOT NULL THEN
                donation_food_type = ANY(p.preferred_food_types)
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
    -- Order by: Preferred match first, then distance
    ORDER BY 
        (CASE 
            WHEN donation_food_type IS NOT NULL AND p.preferred_food_types IS NOT NULL THEN
                donation_food_type = ANY(p.preferred_food_types)
            ELSE FALSE
        END) DESC,
        distance_km ASC;
END;
$$ LANGUAGE plpgsql;

-- Update the notification trigger to pass the food type
CREATE OR REPLACE FUNCTION notify_nearby_acceptors()
RETURNS TRIGGER AS $$
DECLARE
    acceptor RECORD;
    score_text TEXT;
BEGIN
    -- Only notify when a new donation is created with 'available' status
    IF TG_OP = 'INSERT' AND NEW.status = 'available' THEN
        -- Find nearby acceptors (passing the food type!)
        FOR acceptor IN 
            SELECT * FROM find_nearby_acceptors(NEW.latitude, NEW.longitude, 10, NEW.food_type)
        LOOP
            -- Create notification
            -- If it's a preferred match, maybe highlight it?
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
