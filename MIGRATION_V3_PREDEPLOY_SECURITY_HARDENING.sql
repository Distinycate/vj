-- MIGRATION_V3_PREDEPLOY_SECURITY_HARDENING.sql
-- Hardens the search_path of public.record_word_attempt_v2 to prevent search_path manipulation attacks.

ALTER FUNCTION public.record_word_attempt_v2(
    uuid,       -- p_student_id
    uuid,       -- p_stage_attempt_id
    uuid,       -- p_word_id
    boolean,    -- p_is_correct
    integer,    -- p_response_time_ms
    timestamptz -- p_now
) SET search_path = pg_catalog, public;
