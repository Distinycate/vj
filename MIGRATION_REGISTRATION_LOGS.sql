-- Create registration_logs table for debugging registration issues
CREATE TABLE IF NOT EXISTS public.registration_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id VARCHAR(50),
    username VARCHAR(100),
    email VARCHAR(255),
    error_code VARCHAR(50),
    error_message TEXT,
    device_info TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Allow inserting logs without authentication (since it happens during registration)
ALTER TABLE public.registration_logs ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist to avoid errors
DROP POLICY IF EXISTS "Allow public insert to registration_logs" ON public.registration_logs;
DROP POLICY IF EXISTS "Allow admins to read registration_logs" ON public.registration_logs;

CREATE POLICY "Allow public insert to registration_logs" 
    ON public.registration_logs 
    FOR INSERT 
    WITH CHECK (true);

-- Allow admins to read logs
CREATE POLICY "Allow admins to read registration_logs" 
    ON public.registration_logs 
    FOR SELECT 
    USING (
        auth.role() = 'authenticated'
    );
