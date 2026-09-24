-- ==============================================================================
-- Table: ACCOMMODATION_EMAILS (Tracks single & bulk accommodation emails)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.accommodation_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  building_name TEXT,
  room_type TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sending', 'sent', 'failed')),
  error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast lookup indexes for search, status filtering, and chronological sorting
CREATE INDEX IF NOT EXISTS idx_accommodation_emails_created_at 
  ON public.accommodation_emails (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_accommodation_emails_email 
  ON public.accommodation_emails (recipient_email);

CREATE INDEX IF NOT EXISTS idx_accommodation_emails_status 
  ON public.accommodation_emails (status);

-- Enable Row Level Security (RLS)
ALTER TABLE public.accommodation_emails ENABLE ROW LEVEL SECURITY;

-- Allow access policy (matching the INT Events schema pattern)
DROP POLICY IF EXISTS "accommodation_emails_all" ON public.accommodation_emails;
CREATE POLICY "accommodation_emails_all" 
  ON public.accommodation_emails 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);
