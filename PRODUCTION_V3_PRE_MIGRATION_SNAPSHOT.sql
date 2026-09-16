-- PRODUCTION_V3_PRE_MIGRATION_SNAPSHOT.sql
-- Takes a read-only snapshot of critical business metrics prior to V3 deployment.
-- Used to mathematically verify that the migration script itself does not arbitrarily
-- mint, destroy, or drop user currency, experience, or history.

DO $$
DECLARE
    v_results jsonb := '[]'::jsonb;
    v_count bigint;
    v_sum bigint;
BEGIN
    -- 1. Total Students
    SELECT count(*) INTO v_count FROM public.students;
    v_results := v_results || jsonb_build_object('metric', 'students_count', 'value', v_count);
    
    -- 2. Total Learning Paths
    SELECT count(*) INTO v_count FROM public.learning_paths;
    v_results := v_results || jsonb_build_object('metric', 'learning_paths_count', 'value', v_count);

    -- 3. Total Coins System-wide
    SELECT COALESCE(sum(coins), 0) INTO v_sum FROM public.learning_paths;
    v_results := v_results || jsonb_build_object('metric', 'sum_coins', 'value', v_sum);

    -- 4. Total EXP System-wide
    SELECT COALESCE(sum(total_exp), 0) INTO v_sum FROM public.learning_paths;
    v_results := v_results || jsonb_build_object('metric', 'sum_total_exp', 'value', v_sum);

    -- 5. Total Stage Results
    SELECT count(*) INTO v_count FROM public.stage_results;
    v_results := v_results || jsonb_build_object('metric', 'stage_results_count', 'value', v_count);

    -- 6. Total Stage Attempts
    SELECT count(*) INTO v_count FROM public.stage_attempts;
    v_results := v_results || jsonb_build_object('metric', 'stage_attempts_count', 'value', v_count);

    -- 7. Total Word Attempt History (Telemetry)
    SELECT count(*) INTO v_count FROM public.word_attempt_history;
    v_results := v_results || jsonb_build_object('metric', 'word_attempt_history_count', 'value', v_count);

    -- 8. Total Economy Transactions
    SELECT count(*) INTO v_count FROM public.economy_transactions;
    v_results := v_results || jsonb_build_object('metric', 'economy_transactions_count', 'value', v_count);

    PERFORM set_config('vj.snapshot', v_results::text, false);
END $$;

SELECT metric, value
FROM jsonb_to_recordset(current_setting('vj.snapshot', true)::jsonb) 
AS x(metric text, value bigint)
ORDER BY metric;
