ALTER TABLE public.api_keys 
  ADD COLUMN IF NOT EXISTS rate_limit integer DEFAULT 100,
  ADD COLUMN IF NOT EXISTS permissions text[] DEFAULT ARRAY['chat']::text[];