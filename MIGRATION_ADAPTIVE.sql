-- MIGRATION: ADAPTIVE DIFFICULTY 100 STAGES STORY MODE
-- Run these queries in the Supabase SQL Editor to update your database schema.

-- 1. Update learning_paths table with new columns
ALTER TABLE learning_paths 
ADD COLUMN IF NOT EXISTS initial_rank INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS total_exp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT 'default_avatar.png',
ADD COLUMN IF NOT EXISTS total_stages INTEGER DEFAULT 100;

-- 2. Alter stages table to add missing columns if it already exists
ALTER TABLE stages ADD COLUMN IF NOT EXISTS title VARCHAR(255) DEFAULT 'ด่านผจญภัย';
ALTER TABLE stages ADD COLUMN IF NOT EXISTS theme VARCHAR(100) DEFAULT 'General';
ALTER TABLE stages ADD COLUMN IF NOT EXISTS word_pool_id VARCHAR(100) NULL;
ALTER TABLE stages ADD COLUMN IF NOT EXISTS is_boss_stage BOOLEAN DEFAULT FALSE;
ALTER TABLE stages ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW());

-- Ensure stage_number is unique to allow ON CONFLICT query to work
ALTER TABLE stages DROP CONSTRAINT IF EXISTS stages_category_id_stage_number_key;
ALTER TABLE stages ADD CONSTRAINT stages_stage_number_key UNIQUE (stage_number);

-- 3. Update vocabulary table with difficulty levels
ALTER TABLE vocabulary 
ADD COLUMN IF NOT EXISTS difficulty_level VARCHAR(50) DEFAULT 'normal', -- 'easy', 'normal', 'hard', 'expert'
ADD COLUMN IF NOT EXISTS stage_number INTEGER DEFAULT 1;

-- 4. Create stage_results table to track historical attempts
CREATE TABLE IF NOT EXISTS stage_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES students(id) ON DELETE CASCADE,
    stage_number INTEGER NOT NULL,
    rank_at_play INTEGER NOT NULL,
    score INTEGER NOT NULL,
    accuracy DOUBLE PRECISION NOT NULL,
    response_time_avg DOUBLE PRECISION NOT NULL,
    passed BOOLEAN NOT NULL,
    used_hints INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. Create rank_history table to audit Skill Profile changes
CREATE TABLE IF NOT EXISTS rank_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES students(id) ON DELETE CASCADE,
    old_rank INTEGER NOT NULL,
    new_rank INTEGER NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. Create user_review_words table for Mastery & Spaced Repetition
CREATE TABLE IF NOT EXISTS user_review_words (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES students(id) ON DELETE CASCADE,
    word_id UUID REFERENCES vocabulary(id) ON DELETE CASCADE,
    wrong_count INTEGER DEFAULT 0,
    mastery_level INTEGER DEFAULT 0, -- 0 to 4 (4 = Mastered)
    last_wrong_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    next_review_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(user_id, word_id)
);

-- 7. Insert default stages data (100 stages across 10 worlds)
-- This query populates the stages metadata
INSERT INTO stages (stage_number, title, theme, is_boss_stage)
VALUES 
(1, 'Animal Kingdom Intro', 'Animals', false),
(2, 'Pets & Companions', 'Animals', false),
(3, 'Safari Expedition', 'Animals', false),
(4, 'Deep Sea Creatures', 'Animals', false),
(5, 'Birds & Sky', 'Animals', false),
(6, 'Insects & Mini-Beasts', 'Animals', false),
(7, 'Farming Life', 'Animals', false),
(8, 'Prehistoric Dinosaurs', 'Animals', false),
(9, 'Endangered Wildlife', 'Animals', false),
(10, 'Guardian of the Forest (Boss)', 'Animals', true),
(11, 'Classroom Basics', 'School', false),
(12, 'School Subjects', 'School', false),
(13, 'Library & Books', 'School', false),
(14, 'Playground Activities', 'School', false),
(15, 'Science Lab', 'School', false),
(16, 'Math & Numbers', 'School', false),
(17, 'Art & Creativity', 'School', false),
(18, 'Music & Rhythm', 'School', false),
(19, 'Exams & Homework', 'School', false),
(20, 'The Headmaster Challenge (Boss)', 'School', true),
(21, 'Airport Boarding', 'Travel', false),
(22, 'Hotel Check-in', 'Travel', false),
(23, 'Packing Essentials', 'Travel', false),
(24, 'Public Transport', 'Travel', false),
(25, 'Sightseeing Landmarks', 'Travel', false),
(26, 'Road Trip Adventure', 'Travel', false),
(27, 'Lost in Translation', 'Travel', false),
(28, 'Souvenirs & Shops', 'Travel', false),
(29, 'Tickets & Bookings', 'Travel', false),
(30, 'The Ultimate Navigator (Boss)', 'Travel', true),
(31, 'Breakfast Table', 'Food', false),
(32, 'Fruits & Berries', 'Food', false),
(33, 'Vegetable Garden', 'Food', false),
(34, 'Fast Food & Snacks', 'Food', false),
(35, 'Baking & Desserts', 'Food', false),
(36, 'Kitchen Utensils', 'Food', false),
(37, 'Beverage Station', 'Food', false),
(38, 'Dining Etiquette', 'Food', false),
(39, 'Spices & Flavors', 'Food', false),
(40, 'The Michelin Feast (Boss)', 'Food', true),
(41, 'Football Match', 'Sports', false),
(42, 'Athletics & Track', 'Sports', false),
(43, 'Water Sports', 'Sports', false),
(44, 'Indoor Games', 'Sports', false),
(45, 'Exercise & Fitness', 'Sports', false),
(46, 'Healthy Eating', 'Sports', false),
(47, 'Minor Injuries', 'Sports', false),
(48, 'Body Anatomy', 'Sports', false),
(49, 'Hospitals & Doctors', 'Sports', false),
(50, 'The Olympic Arena (Boss)', 'Sports', true),
(51, 'Weather Elements', 'Nature', false),
(52, 'Forest & Trees', 'Nature', false),
(53, 'Mountain High', 'Nature', false),
(54, 'Rivers & Lakes', 'Nature', false),
(55, 'Natural Disasters', 'Nature', false),
(56, 'Environmental Care', 'Nature', false),
(57, 'Gardening Flowers', 'Nature', false),
(58, 'Camping Wilderness', 'Nature', false),
(59, 'Renewable Energy', 'Nature', false),
(60, 'Mother Nature Duel (Boss)', 'Nature', true),
(61, 'City Traffic', 'Transport', false),
(62, 'Train Journey', 'Transport', false),
(63, 'Cargo Ships', 'Transport', false),
(64, 'Bicycle Tracks', 'Transport', false),
(65, 'Road Signs', 'Transport', false),
(66, 'Highway Cruise', 'Transport', false),
(67, 'Traffic Control', 'Transport', false),
(68, 'Subway Stations', 'Transport', false),
(69, 'Vehicle Parts', 'Transport', false),
(70, 'The Grand Conductor (Boss)', 'Transport', true),
(71, 'Computer Screen', 'Tech', false),
(72, 'Internet & Web', 'Tech', false),
(73, 'Smart Devices', 'Tech', false),
(74, 'Robotic Hand', 'Tech', false),
(75, 'Coding Basics', 'Tech', false),
(76, 'AI & Algorithms', 'Tech', false),
(77, 'Electronic Circuits', 'Tech', false),
(78, 'Modern Inventions', 'Tech', false),
(79, 'Online Security', 'Tech', false),
(80, 'The Cyber Overlord (Boss)', 'Tech', true),
(81, 'Rocket Launch', 'Cosmos', false),
(82, 'The Solar System', 'Cosmos', false),
(83, 'Star Constellations', 'Cosmos', false),
(84, 'Astronaut Suite', 'Cosmos', false),
(85, 'Alien Galaxy', 'Cosmos', false),
(86, 'Space Stations', 'Cosmos', false),
(87, 'Moon Walk', 'Cosmos', false),
(88, 'Black Holes', 'Cosmos', false),
(89, 'Asteroids & Meteors', 'Cosmos', false),
(90, 'The Cosmic Singularity (Boss)', 'Cosmos', true),
(91, 'Medical Careers', 'Careers', false),
(92, 'Engineering & Build', 'Careers', false),
(93, 'Creative Industries', 'Careers', false),
(94, 'Office Business', 'Careers', false),
(95, 'Scientific Researchers', 'Careers', false),
(96, 'Public Services', 'Careers', false),
(97, 'Teaching & Mentors', 'Careers', false),
(98, 'Entrepreneurs', 'Careers', false),
(99, 'Future Job Markets', 'Careers', false),
(100, 'The Executive Boardroom (Boss)', 'Careers', true)
ON CONFLICT (stage_number) DO UPDATE SET 
title = EXCLUDED.title, 
theme = EXCLUDED.theme, 
is_boss_stage = EXCLUDED.is_boss_stage;

-- 8. Update existing vocabulary to assign stage numbers and difficulty levels
-- (For demonstration, we update first 100 words in DB to spread across stages 1-100)
DO $$
DECLARE
    vocab_rec RECORD;
    cnt INTEGER := 1;
    diffs TEXT[] := ARRAY['easy', 'normal', 'hard', 'expert'];
    diff_val TEXT;
BEGIN
    FOR vocab_rec IN SELECT id FROM vocabulary ORDER BY word LOOP
        diff_val := diffs[1 + (cnt % 4)];
        UPDATE vocabulary 
        SET stage_number = ((cnt - 1) % 100) + 1,
            difficulty_level = diff_val
        WHERE id = vocab_rec.id;
        cnt := cnt + 1;
    END LOOP;
END $$;
