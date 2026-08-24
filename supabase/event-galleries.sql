-- ==============================================================================
-- Event Galleries (post-event results & photo albums)
-- Run this in the Supabase SQL editor to enable database-backed galleries.
-- Until it is applied, the app stores galleries locally in the browser.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.event_galleries (
  id TEXT PRIMARY KEY DEFAULT ('gal-' || substr(md5(random()::text || clock_timestamp()::text), 1, 12)),
  event_id TEXT NOT NULL,
  title TEXT,
  results TEXT,
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_galleries_event ON public.event_galleries (event_id);

-- Data API grants (PostgREST has no default privileges on the public schema)
GRANT SELECT ON public.event_galleries TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_galleries TO authenticated;
GRANT ALL ON public.event_galleries TO service_role;

ALTER TABLE public.event_galleries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Galleries are publicly readable" ON public.event_galleries;
CREATE POLICY "Galleries are publicly readable"
  ON public.event_galleries FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Galleries are manageable" ON public.event_galleries;
CREATE POLICY "Galleries are manageable"
  ON public.event_galleries FOR ALL
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS set_event_galleries_updated_at ON public.event_galleries;
CREATE TRIGGER set_event_galleries_updated_at
  BEFORE UPDATE ON public.event_galleries
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
