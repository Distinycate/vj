-- Script to retroactively execute THIEF_RANDOM cards that were manually approved by teachers
-- Paste this script in the Supabase SQL Editor and hit "Run"

DO $$
DECLARE
    v_random_card_id uuid;
    v_log record;
    v_result jsonb;
    v_count integer := 0;
BEGIN
    -- 1. Get the ID of the THIEF_RANDOM card
    SELECT id INTO v_random_card_id FROM public.cards WHERE card_code = 'THIEF_RANDOM' LIMIT 1;
    
    IF v_random_card_id IS NULL THEN
        RAISE EXCEPTION 'THIEF_RANDOM card not found in database.';
    END IF;

    -- 2. Find all card_logs that were RESOLVED (approved) for THIEF_RANDOM but not processed retroactively
    FOR v_log IN 
        SELECT cl.id, cl.attacker_id
        FROM public.card_logs cl
        WHERE cl.played_card_id = v_random_card_id
          AND cl.status = 'RESOLVED'
          AND (cl.metadata->>'processed_retroactively') IS NULL
    LOOP
        -- The teacher's approval already deducted 1 from the attacker's inventory.
        -- We must temporarily give it back so `execute_random_thief` can consume it properly.
        UPDATE public.card_inventory
        SET quantity = quantity + 1
        WHERE student_id = v_log.attacker_id AND card_id = v_random_card_id;
        
        IF NOT FOUND THEN
            INSERT INTO public.card_inventory (student_id, card_id, quantity, reserved_quantity)
            VALUES (v_log.attacker_id, v_random_card_id, 1, 0);
        END IF;

        -- 3. Execute the random steal logic
        BEGIN
            v_result := public.execute_random_thief(v_log.attacker_id, v_random_card_id);
            
            IF v_result->>'success' = 'true' THEN
                -- Mark as processed and save the result in metadata
                UPDATE public.card_logs 
                SET metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('processed_retroactively', true, 'retro_result', v_result)
                WHERE id = v_log.id;
                
                v_count := v_count + 1;
            ELSE
                -- If it failed (e.g., no eligible targets), we remove the card we just gave back
                -- so the student doesn't incorrectly get a free card.
                UPDATE public.card_inventory
                SET quantity = quantity - 1
                WHERE student_id = v_log.attacker_id AND card_id = v_random_card_id;
                
                -- Mark as processed with the failure reason
                UPDATE public.card_logs 
                SET metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('processed_retroactively', true, 'retro_result', v_result)
                WHERE id = v_log.id;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            -- In case of SQL exception (e.g. THIEF_CARD_NOT_AVAILABLE), revert the card addition
            UPDATE public.card_inventory
            SET quantity = quantity - 1
            WHERE student_id = v_log.attacker_id AND card_id = v_random_card_id;
            
            -- Log the error in metadata so we don't retry forever
            UPDATE public.card_logs 
            SET metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('processed_retroactively', true, 'retro_error', SQLERRM)
            WHERE id = v_log.id;
        END;
    END LOOP;

    RAISE NOTICE 'Retroactively processed % THIEF_RANDOM card logs successfully.', v_count;
END;
$$;
