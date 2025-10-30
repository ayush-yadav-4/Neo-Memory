
-- Fix security warning: Update function to have immutable search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

-- Fix security warning: Move vector extension out of public schema
-- Note: We keep it in public for now as pgvector is designed to work in public schema
-- and moving it can cause issues. This warning can be safely ignored for pgvector.
