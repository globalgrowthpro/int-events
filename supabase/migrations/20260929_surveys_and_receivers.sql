-- ==============================================================================
-- Table: SURVEYS & SURVEY_RECEIVERS
-- Handles event surveys, receivers (Name, Email), and survey responses
-- ==============================================================================

-- 1. Table: surveys (Core survey definitions)
CREATE TABLE IF NOT EXISTS public.surveys (
  id TEXT PRIMARY KEY,
  event_id TEXT REFERENCES public.events(id) ON DELETE CASCADE,
  event_name TEXT,
  title TEXT NOT NULL,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  receivers JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'draft', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast lookup indexes
CREATE INDEX IF NOT EXISTS idx_surveys_event_id ON public.surveys(event_id);
CREATE INDEX IF NOT EXISTS idx_surveys_created_at ON public.surveys(created_at DESC);

-- Enable RLS & policies
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "surveys_all" ON public.surveys;
CREATE POLICY "surveys_all" ON public.surveys FOR ALL USING (true) WITH CHECK (true);

-- 2. Table: survey_receivers (Relational receivers table for Name & Email tracking)
CREATE TABLE IF NOT EXISTS public.survey_receivers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  survey_id TEXT NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'opened', 'submitted')),
  sent_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Receiver indexes
CREATE INDEX IF NOT EXISTS idx_survey_receivers_survey_id ON public.survey_receivers(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_receivers_email ON public.survey_receivers(email);
CREATE INDEX IF NOT EXISTS idx_survey_receivers_status ON public.survey_receivers(status);

-- Enable RLS & policies
ALTER TABLE public.survey_receivers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "survey_receivers_all" ON public.survey_receivers;
CREATE POLICY "survey_receivers_all" ON public.survey_receivers FOR ALL USING (true) WITH CHECK (true);

-- 3. Table: survey_responses (Attendee responses to survey questions)
CREATE TABLE IF NOT EXISTS public.survey_responses (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  survey_id TEXT NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  receiver_id TEXT REFERENCES public.survey_receivers(id) ON DELETE SET NULL,
  respondent_name TEXT,
  respondent_email TEXT,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Response indexes
CREATE INDEX IF NOT EXISTS idx_survey_responses_survey_id ON public.survey_responses(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_email ON public.survey_responses(respondent_email);

-- Enable RLS & policies
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "survey_responses_all" ON public.survey_responses;
CREATE POLICY "survey_responses_all" ON public.survey_responses FOR ALL USING (true) WITH CHECK (true);
