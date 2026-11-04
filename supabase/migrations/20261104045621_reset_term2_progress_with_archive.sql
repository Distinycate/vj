-- Legacy snapshot table preparation only. Previous draft reset is superseded.
-- Install assessment_season_atomic_reset, deploy code, then use the ADMIN reset button.
BEGIN;

CREATE TABLE IF NOT EXISTS public.semester_campaign_archives (
  semester text NOT NULL,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  captured_at timestamptz NOT NULL DEFAULT now(),
  learning_path jsonb NOT NULL,
  stage_progress jsonb NOT NULL,
  PRIMARY KEY (semester, student_id)
);
CREATE TABLE IF NOT EXISTS public.semester_campaign_resets (
  semester text PRIMARY KEY,
  reset_at timestamptz NOT NULL DEFAULT now(),
  student_count integer NOT NULL
);
ALTER TABLE public.semester_campaign_archives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semester_campaign_resets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.semester_campaign_archives FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.semester_campaign_resets FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.semester_campaign_archives TO service_role;
GRANT SELECT, INSERT ON public.semester_campaign_resets TO service_role;

-- No implicit live reset on migration installation.
COMMIT;
