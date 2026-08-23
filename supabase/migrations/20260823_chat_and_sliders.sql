-- ==============================================================================
-- MIGRATION: Chat Messages & Promotional Hero Sliders
-- Created: 2026-08-23
-- ==============================================================================

-- 1. Table: MESSAGES (Chat System)
-- Supports account-to-account communication between Clients, Vendors, and Admins.
CREATE TABLE IF NOT EXISTS public.messages (
  id TEXT PRIMARY KEY DEFAULT ('msg-' || substr(md5(random()::text || clock_timestamp()::text), 1, 12)),
  sender_id TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  sender_company TEXT,
  sender_role TEXT DEFAULT 'client' CHECK (sender_role IN ('admin', 'client', 'vendor', 'employee')),
  content TEXT NOT NULL,
  attachment_url TEXT,
  attachment_name TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast thread lookups between two users
CREATE INDEX IF NOT EXISTS idx_messages_participants ON public.messages (sender_id, recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON public.messages (recipient_id, is_read);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages (created_at DESC);

-- Trigger to update updated_at on update
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_messages_updated_at ON public.messages;
CREATE TRIGGER set_messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 2. Table: SLIDERS (Hero / Promotional Banner Carousel)
CREATE TABLE IF NOT EXISTS public.sliders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  event_link TEXT, -- Optional link to event details or registration
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sliders_order ON public.sliders (order_index ASC, created_at DESC);

DROP TRIGGER IF EXISTS set_sliders_updated_at ON public.sliders;
CREATE TRIGGER set_sliders_updated_at
  BEFORE UPDATE ON public.sliders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sliders ENABLE ROW LEVEL SECURITY;

-- Helper function to check admin role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- MESSAGES POLICIES
-- Allows client, vendor, and admin users to send and receive chat messages.
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view their own chat messages or admin views all" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages as themselves or admin sends as anyone" ON public.messages;
DROP POLICY IF EXISTS "Recipients can mark messages read or admin updates" ON public.messages;
DROP POLICY IF EXISTS "Senders or admins can delete messages" ON public.messages;
DROP POLICY IF EXISTS "Messages full access" ON public.messages;

CREATE POLICY "Messages full access"
  ON public.messages FOR ALL
  USING (true)
  WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- SLIDERS POLICIES
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS "Anyone can view active sliders" ON public.sliders;
DROP POLICY IF EXISTS "Admins have full access to sliders" ON public.sliders;
DROP POLICY IF EXISTS "Sliders full access" ON public.sliders;

CREATE POLICY "Sliders full access"
  ON public.sliders FOR ALL
  USING (true)
  WITH CHECK (true);

-- ==============================================================================
-- REALTIME PUBLICATION
-- Enable realtime broadcasting for messages so live chat updates instantly
-- ==============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ==============================================================================
-- SEED INITIAL SLIDERS DATA
-- ==============================================================================
INSERT INTO public.sliders (image_url, title, subtitle, description, event_link, order_index, is_active)
VALUES
  (
    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1600&auto=format&fit=crop&q=80',
    'INT Security Technology Summit 2026',
    'Cairo, Egypt · September 15, 2026',
    'Join industry leaders, enterprise CTOs, and global tech partners at Egypt''s flagship summit on unified surveillance and smart security infrastructure.',
    '/events/security-summit-2026',
    1,
    TRUE
  ),
  (
    'https://images.unsplash.com/photo-1511578314322-379afb476865?w=1600&auto=format&fit=crop&q=80',
    'INT Technology & ICT Forum',
    'Cairo, Egypt · October 20, 2026',
    'Interactive keynote panels, data center modernisation workshops, and live demonstrations of enterprise infrastructure.',
    '/events/technology-forum-2026',
    2,
    TRUE
  ),
  (
    'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=1600&auto=format&fit=crop&q=80',
    'INT Partner & Sponsor Day',
    'Alexandria, Egypt · November 10, 2026',
    'Exclusive gathering exploring go-to-market strategies, technological roadmaps, and high-level enterprise networking.',
    '/events/partner-day-2026',
    3,
    TRUE
  )
ON CONFLICT DO NOTHING;
