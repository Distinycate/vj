-- MIGRATION: DICEBEAR AVATAR & QUESTION VALIDATION SYSTEM

-- 1. Add Avatar Seed & Style to learning_paths
ALTER TABLE learning_paths
ADD COLUMN IF NOT EXISTS avatar_seed VARCHAR(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS avatar_style VARCHAR(50) DEFAULT 'adventurer';

-- Set a default unique seed for existing users based on their student_id
UPDATE learning_paths 
SET avatar_seed = student_id::text 
WHERE avatar_seed IS NULL;

-- 2. Create Question Validation Logs Table
CREATE TABLE IF NOT EXISTS question_validation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id VARCHAR(255) NOT NULL,
    word_id UUID,
    question_type VARCHAR(50) NOT NULL,
    error_type VARCHAR(100) NOT NULL,
    error_message TEXT NOT NULL,
    raw_question_json JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Note: We do not use Supabase Storage for avatars, so no buckets need to be created/modified.
-- Note: Avatar Shops, Items, Coins logic are fully bypassed in UI.
