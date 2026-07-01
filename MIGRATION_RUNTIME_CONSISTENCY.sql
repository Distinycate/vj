-- NON-DESTRUCTIVE RUNTIME CONSISTENCY MIGRATION
-- Run after SUPABASE_SCHEMA.sql and the existing adaptive/avatar migrations.
-- This migration does not change authentication or existing credentials.

ALTER TABLE public.vocabulary
  ADD COLUMN IF NOT EXISTS meaning_th text,
  ADD COLUMN IF NOT EXISTS example_sentence text,
  ADD COLUMN IF NOT EXISTS stage_number integer,
  ADD COLUMN IF NOT EXISTS difficulty_level varchar(50) DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS audio_url text,
  ADD COLUMN IF NOT EXISTS normalized_word text,
  ADD COLUMN IF NOT EXISTS normalized_meaning_th text,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

UPDATE public.vocabulary
SET
  meaning_th = COALESCE(NULLIF(meaning_th, ''), meaning),
  meaning = COALESCE(NULLIF(meaning, ''), meaning_th),
  example_sentence = COALESCE(NULLIF(example_sentence, ''), example),
  example = COALESCE(NULLIF(example, ''), example_sentence),
  stage_number = COALESCE(stage_number, stage, 1),
  stage = COALESCE(stage, stage_number, 1),
  normalized_word = lower(trim(regexp_replace(word, '\s+', ' ', 'g'))),
  normalized_meaning_th = trim(regexp_replace(
    COALESCE(NULLIF(meaning_th, ''), meaning),
    '\s+',
    ' ',
    'g'
  )),
  is_active = COALESCE(is_active, true);

ALTER TABLE public.learning_paths
  ADD COLUMN IF NOT EXISTS initial_rank integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS total_exp integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avatar_seed varchar(255),
  ADD COLUMN IF NOT EXISTS avatar_style varchar(50) DEFAULT 'adventurer',
  ADD COLUMN IF NOT EXISTS total_stages integer DEFAULT 100;

UPDATE public.learning_paths
SET
  avatar_seed = COALESCE(avatar_seed, student_id::text),
  total_exp = COALESCE(total_exp, exp, 0);

CREATE TABLE IF NOT EXISTS public.stage_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.students(id) ON DELETE CASCADE,
  stage_number integer NOT NULL,
  rank_at_play integer NOT NULL,
  score integer NOT NULL,
  accuracy double precision NOT NULL,
  response_time_avg double precision NOT NULL,
  passed boolean NOT NULL,
  used_hints integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.rank_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.students(id) ON DELETE CASCADE,
  old_rank integer NOT NULL,
  new_rank integer NOT NULL,
  reason text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_review_words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.students(id) ON DELETE CASCADE,
  word_id uuid REFERENCES public.vocabulary(id) ON DELETE CASCADE,
  wrong_count integer DEFAULT 0,
  mastery_level integer DEFAULT 0,
  last_wrong_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  next_review_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_id, word_id)
);

CREATE TABLE IF NOT EXISTS public.question_validation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id varchar(255) NOT NULL,
  word_id uuid,
  question_type varchar(50) NOT NULL,
  error_type varchar(100) NOT NULL,
  error_message text NOT NULL,
  raw_question_json jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.question_validation_logs
  ALTER COLUMN word_id DROP NOT NULL;

INSERT INTO public.analytics_summary (student_id)
SELECT id
FROM public.students
ON CONFLICT (student_id) DO NOTHING;

-- Keep one active record for an English word in each stage. Historical duplicate
-- rows remain available for old attempts, but the question engine ignores them.
WITH ranked_words AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY stage_number, normalized_word
      ORDER BY created_at, id
    ) AS duplicate_rank
  FROM public.vocabulary
  WHERE is_active = true
    AND normalized_word IS NOT NULL
    AND normalized_word <> ''
)
UPDATE public.vocabulary AS vocabulary
SET is_active = false
FROM ranked_words
WHERE vocabulary.id = ranked_words.id
  AND ranked_words.duplicate_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS unique_active_word_per_stage
ON public.vocabulary(stage_number, normalized_word)
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS stage_results_user_created_idx
ON public.stage_results(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS review_words_due_idx
ON public.user_review_words(user_id, next_review_at);

CREATE INDEX IF NOT EXISTS vocabulary_active_stage_idx
ON public.vocabulary(stage_number, is_active);
