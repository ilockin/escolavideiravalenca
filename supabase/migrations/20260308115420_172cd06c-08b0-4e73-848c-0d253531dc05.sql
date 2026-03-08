
ALTER TABLE public.turmas ADD COLUMN invite_code text UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex');

-- Update existing rows that have null invite_code
UPDATE public.turmas SET invite_code = encode(gen_random_bytes(6), 'hex') WHERE invite_code IS NULL;

ALTER TABLE public.turmas ALTER COLUMN invite_code SET NOT NULL;

-- Allow public read of turmas by invite_code (for registration page)
CREATE POLICY "Anyone can read turma by invite_code"
ON public.turmas
FOR SELECT
TO anon, authenticated
USING (true);
