-- 1. Add normalized columns for duplicate detection
ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS normalized_word text;
ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS normalized_meaning_th text;
ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- 2. Populate normalized data
UPDATE vocabulary
SET
  normalized_word = lower(trim(regexp_replace(word, '\s+', ' ', 'g'))),
  normalized_meaning_th = lower(trim(regexp_replace(meaning, '\s+', ' ', 'g')));

-- 3. Keep the first active word in each stage and retain duplicate rows for history.
WITH ranked_words AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY stage_number, normalized_word
      ORDER BY created_at, id
    ) AS duplicate_rank
  FROM vocabulary
  WHERE is_active = true
)
UPDATE vocabulary AS vocab
SET is_active = false
FROM ranked_words
WHERE vocab.id = ranked_words.id
  AND ranked_words.duplicate_rank > 1;

-- 4. Prevent new active duplicates in the same stage.
CREATE UNIQUE INDEX IF NOT EXISTS unique_word_per_stage
ON vocabulary(stage_number, normalized_word)
WHERE is_active = true;
