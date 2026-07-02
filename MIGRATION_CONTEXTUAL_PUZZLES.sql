-- MIGRATION: Contextual Puzzles
-- Adds example_sentence and example_translation to vocabulary table

ALTER TABLE public.vocabulary
ADD COLUMN IF NOT EXISTS example_sentence TEXT,
ADD COLUMN IF NOT EXISTS example_translation TEXT;

-- Update some mock vocabulary data to have example sentences for testing
UPDATE public.vocabulary
SET example_sentence = 'The stray dog was ________ by its previous owner.',
    example_translation = 'สุนัขจรจัดตัวนั้นถูกละทิ้งโดยเจ้าของคนเก่า'
WHERE word = 'abandon';

UPDATE public.vocabulary
SET example_sentence = 'She has a ________ smile that makes everyone feel welcome.',
    example_translation = 'เธอมีรอยยิ้มที่เมตตาซึ่งทำให้ทุกคนรู้สึกยินดีต้อนรับ'
WHERE word = 'benevolent';

UPDATE public.vocabulary
SET example_sentence = 'Water is ________ for the survival of all living things.',
    example_translation = 'น้ำมีความสำคัญมากต่อการอยู่รอดของสิ่งมีชีวิตทั้งหมด'
WHERE word = 'crucial';

UPDATE public.vocabulary
SET example_sentence = 'He faced a difficult ________ when choosing between two great jobs.',
    example_translation = 'เขาเผชิญกับภาวะกลืนไม่เข้าคายไม่ออกเมื่อต้องเลือกระหว่างงานที่ดีสองงาน'
WHERE word = 'dilemma';
