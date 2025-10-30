-- Enhanced API Key Management Schema

-- Add new columns to api_keys table
ALTER TABLE public.api_keys 
ADD COLUMN IF NOT EXISTS name TEXT DEFAULT 'Default Key',
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rate_limit INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS scopes TEXT[] DEFAULT ARRAY['read', 'write'];

-- Create API key usage tracking table
CREATE TABLE IF NOT EXISTS public.api_key_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on usage table
ALTER TABLE public.api_key_usage ENABLE ROW LEVEL SECURITY;

-- RLS policy for usage tracking (allow all for now, as it's logged by edge functions)
CREATE POLICY "Allow all access to usage logs" 
ON public.api_key_usage 
FOR ALL 
USING (true);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_api_key_usage_key_timestamp 
ON public.api_key_usage(api_key_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_active 
ON public.api_keys(user_id, is_active);

-- Function to clean up old usage logs (optional, for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_usage_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM public.api_key_usage 
  WHERE timestamp < NOW() - INTERVAL '90 days';
END;
$$;