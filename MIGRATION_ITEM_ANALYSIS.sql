-- Create item_analysis table
CREATE TABLE IF NOT EXISTS public.item_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    word_id UUID REFERENCES public.vocabulary(id) ON DELETE CASCADE,
    p_value NUMERIC(3, 2) DEFAULT 0.00,
    d_value NUMERIC(3, 2) DEFAULT 0.00,
    success_rate NUMERIC(5, 2) DEFAULT 0.00,
    attempt_count INTEGER DEFAULT 0,
    avg_time_ms INTEGER DEFAULT 0,
    choices_selected_counts JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(word_id)
);

-- Enable RLS
ALTER TABLE public.item_analysis ENABLE ROW LEVEL SECURITY;

-- Allow public access for now since game clients write to it
DROP POLICY IF EXISTS "Allow public read/write to item_analysis" ON public.item_analysis;
CREATE POLICY "Allow public read/write to item_analysis" 
    ON public.item_analysis 
    FOR ALL 
    USING (true) WITH CHECK (true);
