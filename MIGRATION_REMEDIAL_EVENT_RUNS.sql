-- MIGRATION_REMEDIAL_EVENT_RUNS.sql
-- Vocab Journey: Remedial Event Runs and Participant Progress Tracking
-- Simple, robust, fixed-content event architecture

CREATE TABLE IF NOT EXISTS public.event_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id text NOT NULL,
  title text NOT NULL,
  classroom_id uuid REFERENCES public.classrooms(id) ON DELETE SET NULL,
  grade_level text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'upcoming', 'active', 'closed')),
  created_by uuid REFERENCES public.teachers(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.event_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_run_id uuid NOT NULL REFERENCES public.event_runs(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  original_score numeric,
  target_stages int NOT NULL DEFAULT 15,
  completed_stages int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'passed')),
  total_attempts int NOT NULL DEFAULT 0,
  completed_at timestamptz,
  teacher_seen boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(event_run_id, student_id)
);

CREATE TABLE IF NOT EXISTS public.event_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_run_id uuid NOT NULL REFERENCES public.event_runs(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  stage_number int NOT NULL,
  best_score int NOT NULL DEFAULT 0,
  attempts int NOT NULL DEFAULT 0,
  passed boolean NOT NULL DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(event_run_id, student_id, stage_number)
);

CREATE INDEX IF NOT EXISTS idx_event_runs_status ON public.event_runs(status);
CREATE INDEX IF NOT EXISTS idx_event_participants_student ON public.event_participants(student_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_run ON public.event_participants(event_run_id);
CREATE INDEX IF NOT EXISTS idx_event_progress_lookup ON public.event_progress(event_run_id, student_id, stage_number);

-- RLS
ALTER TABLE public.event_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow service_role all on event_runs" ON public.event_runs;
CREATE POLICY "Allow service_role all on event_runs" ON public.event_runs FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow read event_runs" ON public.event_runs;
CREATE POLICY "Allow read event_runs" ON public.event_runs FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "Allow service_role all on event_participants" ON public.event_participants;
CREATE POLICY "Allow service_role all on event_participants" ON public.event_participants FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow read event_participants" ON public.event_participants;
CREATE POLICY "Allow read event_participants" ON public.event_participants FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "Allow service_role all on event_progress" ON public.event_progress;
CREATE POLICY "Allow service_role all on event_progress" ON public.event_progress FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow read event_progress" ON public.event_progress;
CREATE POLICY "Allow read event_progress" ON public.event_progress FOR SELECT TO authenticated, anon USING (true);

GRANT ALL ON public.event_runs TO anon, authenticated, service_role;
GRANT ALL ON public.event_participants TO anon, authenticated, service_role;
GRANT ALL ON public.event_progress TO anon, authenticated, service_role;
