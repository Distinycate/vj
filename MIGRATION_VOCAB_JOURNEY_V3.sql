-- ==============================================================================
-- Vocab Journey - V3 Migration
-- Features: Registration Settings, Name Splitting, Grade Level Organization
-- ==============================================================================

-- 1. School Settings
ALTER TABLE public.schools
ADD COLUMN IF NOT EXISTS is_registration_open boolean DEFAULT true;

-- 2. Classrooms schema update
ALTER TABLE public.classrooms
ADD COLUMN IF NOT EXISTS grade_level text,
ADD COLUMN IF NOT EXISTS room_number text;

-- 3. Students schema update
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text,
ADD COLUMN IF NOT EXISTS grade_level text,
ADD COLUMN IF NOT EXISTS room_number text;

-- 4. Data Migration for existing records
-- Try to split student_name into first_name and last_name if there is a space
UPDATE public.students
SET 
  first_name = split_part(student_name, ' ', 1),
  last_name = CASE 
                WHEN strpos(student_name, ' ') > 0 THEN substr(student_name, strpos(student_name, ' ') + 1)
                ELSE ''
              END
WHERE first_name IS NULL;
