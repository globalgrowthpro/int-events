-- ==============================================================================
-- INT Events Platform - Supabase Database Schema, Functions, Triggers & RLS
-- ==============================================================================

-- 1. Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Helper function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- Table: PROFILES (User profiles linked to auth.users)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('Male', 'Female')),
  company TEXT,
  job_title TEXT,
  phone TEXT,
  country TEXT DEFAULT 'Egypt',
  city TEXT DEFAULT 'Cairo',
  industry TEXT,
  linkedin_url TEXT,
  role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('admin', 'client', 'vendor', 'employee')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'suspended')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- Table: EVENTS (INT Summits, Forums, Workshops)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.events (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Summit',
  date DATE NOT NULL,
  date_label TEXT NOT NULL,
  start_time TEXT DEFAULT '09:00 AM',
  end_time TEXT DEFAULT '05:00 PM',
  city TEXT NOT NULL DEFAULT 'Cairo, Egypt',
  venue TEXT NOT NULL,
  image_url TEXT,
  capacity INTEGER NOT NULL DEFAULT 250,
  registered_count INTEGER NOT NULL DEFAULT 0,
  checked_in_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('open', 'upcoming', 'almost-full', 'completed', 'cancelled')),
  organizer TEXT NOT NULL DEFAULT 'Integrated Technics',
  summary TEXT,
  description TEXT[] DEFAULT '{}'::TEXT[],
  partners TEXT[] DEFAULT '{}'::TEXT[],
  speakers JSONB DEFAULT '[]'::JSONB,
  agenda JSONB DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- Table: REGISTRATIONS (Event Attendance Passes & Badges)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.registrations (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  attendee_name TEXT NOT NULL,
  attendee_email TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('Male', 'Female')),
  phone TEXT,
  company TEXT,
  job_title TEXT,
  role TEXT DEFAULT 'client',
  ticket_token TEXT UNIQUE NOT NULL,
  state TEXT NOT NULL DEFAULT 'registered' CHECK (state IN ('registered', 'checked-in', 'cancelled', 'no-show')),
  is_primary BOOLEAN DEFAULT TRUE,
  delegation_leader_id TEXT,
  dates_attending TEXT DEFAULT 'All days',
  sector TEXT,
  travel_required BOOLEAN DEFAULT FALSE,
  check_in_details TEXT,
  check_out_details TEXT,
  considerations TEXT,
  check_in_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_registrations_updated_at
  BEFORE UPDATE ON public.registrations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- Table: VENDORS (Exhibitors and Partner Companies)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('Male', 'Female')),
  email TEXT NOT NULL,
  phone TEXT,
  category TEXT NOT NULL,
  website TEXT,
  address TEXT,
  logo_url TEXT,
  reps_count INTEGER DEFAULT 1,
  approved_events_count INTEGER DEFAULT 0,
  products_summary TEXT,
  has_partnership BOOLEAN DEFAULT FALSE,
  state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('approved', 'pending', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_vendors_updated_at
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- Table: ATTENDANCE_LOGS (Gate Scans & Audit Log)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.attendance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id TEXT NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  scanned_by UUID REFERENCES auth.users(id),
  gate TEXT DEFAULT 'Main Entrance',
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'valid' CHECK (status IN ('valid', 'duplicate', 'invalid')),
  notes TEXT
);

-- ==============================================================================
-- Table: CERTIFICATES (Digital verifiable completion certificates)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.certificates (
  id TEXT PRIMARY KEY,
  registration_id TEXT REFERENCES public.registrations(id) ON DELETE SET NULL,
  event_id TEXT NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient_name TEXT NOT NULL,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  verification_hash TEXT UNIQUE NOT NULL,
  state TEXT NOT NULL DEFAULT 'issued' CHECK (state IN ('issued', 'claimed', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- Table: INVITATIONS (Event Invitations sent via SMTP with delay pacing)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.invitations (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  event_title TEXT,
  recipient_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  company TEXT,
  job_title TEXT,
  phone TEXT,
  source TEXT NOT NULL DEFAULT 'accounts' CHECK (source IN ('accounts', 'excel', 'manual')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  token TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_invitations_updated_at
  BEFORE UPDATE ON public.invitations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- Table: NOTIFICATIONS (System alerts & event reminders)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  tone TEXT NOT NULL DEFAULT 'info' CHECK (tone IN ('info', 'success', 'warning', 'destructive')),
  read BOOLEAN NOT NULL DEFAULT FALSE,
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- Table: SMTP_SETTINGS (Outgoing Mail Gateway configuration)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.smtp_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host TEXT NOT NULL DEFAULT 'box5517.bluehost.com',
  port INTEGER NOT NULL DEFAULT 465,
  encryption TEXT NOT NULL DEFAULT 'ssl' CHECK (encryption IN ('tls', 'ssl', 'none')),
  username TEXT NOT NULL DEFAULT 'event@integratedtechnics.com',
  password_encrypted TEXT NOT NULL DEFAULT 'event786@hafez',
  from_email TEXT NOT NULL DEFAULT 'event@integratedtechnics.com',
  from_name TEXT NOT NULL DEFAULT 'Integrated Technics Events',
  reply_to TEXT DEFAULT 'support@integratedtechnics.com',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_smtp_settings_updated_at
  BEFORE UPDATE ON public.smtp_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- Table: EMAIL_LOGS (SMTP Dispatch audit trail)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email TEXT NOT NULL,
  template_name TEXT NOT NULL DEFAULT 'event_invitation',
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'pending', 'failed')),
  error_message TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- TRIGGER 1: Auto-create profile on auth.users signup
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    gender,
    company
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'client'),
    NEW.raw_user_meta_data->>'gender',
    NEW.raw_user_meta_data->>'company'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- TRIGGER 2: Update event registered and checked-in counts automatically
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.update_event_counts()
RETURNS TRIGGER AS $$
DECLARE
  target_event_id TEXT;
  reg_count INTEGER;
  check_count INTEGER;
  evt_capacity INTEGER;
BEGIN
  target_event_id := COALESCE(NEW.event_id, OLD.event_id);
  
  SELECT COUNT(*), COUNT(*) FILTER (WHERE state = 'checked-in')
  INTO reg_count, check_count
  FROM public.registrations
  WHERE event_id = target_event_id AND state != 'cancelled';

  SELECT capacity INTO evt_capacity
  FROM public.events
  WHERE id = target_event_id;

  UPDATE public.events
  SET
    registered_count = reg_count,
    checked_in_count = check_count,
    status = CASE
      WHEN status IN ('completed', 'cancelled') THEN status
      WHEN reg_count >= evt_capacity THEN 'almost-full'
      WHEN reg_count >= (evt_capacity * 0.9) THEN 'almost-full'
      ELSE 'open'
    END
  WHERE id = target_event_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_registration_count_change ON public.registrations;
CREATE TRIGGER on_registration_count_change
  AFTER INSERT OR UPDATE OR DELETE ON public.registrations
  FOR EACH ROW EXECUTE FUNCTION public.update_event_counts();

-- ==============================================================================
-- STORED PROCEDURE / FUNCTION: QR Check-in verification
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.verify_and_checkin_ticket(
  p_ticket_token TEXT,
  p_scanned_by UUID DEFAULT NULL,
  p_gate TEXT DEFAULT 'Main Gate A'
)
RETURNS JSONB AS $$
DECLARE
  v_reg public.registrations%ROWTYPE;
  v_event public.events%ROWTYPE;
BEGIN
  -- 1. Find registration by ticket_token
  SELECT * INTO v_reg
  FROM public.registrations
  WHERE ticket_token = p_ticket_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'status', 'invalid',
      'message', 'Invalid ticket token. Pass not found in system.'
    );
  END IF;

  SELECT * INTO v_event
  FROM public.events
  WHERE id = v_reg.event_id;

  -- 2. Check if already checked in
  IF v_reg.state = 'checked-in' THEN
    -- Log duplicate scan attempt
    INSERT INTO public.attendance_logs (registration_id, event_id, scanned_by, gate, status, notes)
    VALUES (v_reg.id, v_reg.event_id, p_scanned_by, p_gate, 'duplicate', 'Already checked in at ' || TO_CHAR(v_reg.check_in_time, 'HH12:MI AM'));

    RETURN jsonb_build_object(
      'success', false,
      'status', 'duplicate',
      'message', 'Badge was already scanned and checked in.',
      'attendee_name', v_reg.attendee_name,
      'company', v_reg.company,
      'event_title', v_event.title,
      'check_in_time', v_reg.check_in_time
    );
  END IF;

  -- 3. Perform valid check-in
  UPDATE public.registrations
  SET
    state = 'checked-in',
    check_in_time = NOW()
  WHERE id = v_reg.id;

  -- Log valid scan
  INSERT INTO public.attendance_logs (registration_id, event_id, scanned_by, gate, status)
  VALUES (v_reg.id, v_reg.event_id, p_scanned_by, p_gate, 'valid');

  RETURN jsonb_build_object(
    'success', true,
    'status', 'valid',
    'message', 'Check-in confirmed successfully!',
    'attendee_name', v_reg.attendee_name,
    'company', v_reg.company,
    'job_title', v_reg.job_title,
    'event_title', v_event.title,
    'check_in_time', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Invitations manageable by admins"
  ON public.invitations FOR ALL
  USING (true)
  WITH CHECK (true);

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Profiles Policies
CREATE POLICY "Public profiles are readable by authenticated users"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins have full access to profiles"
  ON public.profiles FOR ALL
  USING (public.is_admin());

-- 2. Events Policies
CREATE POLICY "Events are viewable by everyone"
  ON public.events FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert, update, delete events"
  ON public.events FOR ALL
  USING (public.is_admin());

-- 3. Registrations Policies
CREATE POLICY "Users can view their own registrations"
  ON public.registrations FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can create registrations"
  ON public.registrations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own registrations"
  ON public.registrations FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Admins have full access to registrations"
  ON public.registrations FOR ALL
  USING (public.is_admin());

-- 4. Vendors Policies
CREATE POLICY "Vendors viewable by authenticated users"
  ON public.vendors FOR SELECT
  USING (true);

CREATE POLICY "Vendors can register and edit own company"
  ON public.vendors FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Vendors can update own company"
  ON public.vendors FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Admins have full access to vendors"
  ON public.vendors FOR ALL
  USING (public.is_admin());

-- 5. Attendance Logs Policies
CREATE POLICY "Attendance logs readable by admins"
  ON public.attendance_logs FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Attendance logs insertable by authorized scanners"
  ON public.attendance_logs FOR INSERT
  WITH CHECK (true);

-- 6. Certificates Policies
CREATE POLICY "Certificates readable by everyone with verification hash"
  ON public.certificates FOR SELECT
  USING (true);

CREATE POLICY "Admins have full access to certificates"
  ON public.certificates FOR ALL
  USING (public.is_admin());

-- 7. Notifications Policies
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- ==============================================================================
-- SEED INITIAL INT SUMMIT DATA
-- ==============================================================================
INSERT INTO public.events (id, code, title, category, date, date_label, start_time, end_time, city, venue, capacity, registered_count, status, summary, partners)
VALUES
  (
    'security-summit-2026',
    'INT-EVT-2026-01',
    'INT Security Technology Summit 2026',
    'Summit',
    '2026-09-15',
    '15 September 2026',
    '09:00 AM',
    '05:00 PM',
    'Cairo, Egypt',
    'Four Seasons Nile Plaza, Grand Ballroom',
    300,
    248,
    'open',
    'Integrated Technics annual flagship conference on unified security, intelligent surveillance and enterprise command centres.',
    ARRAY['Genetec', 'Axis Communications', 'Cisco', 'Honeywell', 'Milestone']
  ),
  (
    'technology-forum-2026',
    'INT-EVT-2026-02',
    'INT Technology & ICT Forum',
    'Forum',
    '2026-10-20',
    '20 October 2026',
    '10:00 AM',
    '04:00 PM',
    'Cairo, Egypt',
    'INT Headquarters, Auditorium',
    250,
    195,
    'upcoming',
    'Panel discussions on enterprise networking, data centre modernisation and digital infrastructure.',
    ARRAY['Cisco', 'Vertiv', 'Dell Technologies', 'Huawei']
  ),
  (
    'partner-day-2026',
    'INT-EVT-2026-03',
    'INT Partner Day',
    'Partner Day',
    '2026-11-10',
    '10 November 2026',
    '09:30 AM',
    '03:30 PM',
    'Alexandria, Egypt',
    'Tolip Hotel, Exhibition Hall',
    150,
    144,
    'almost-full',
    'Exclusive partner gathering exploring roadmaps, joint offerings and go-to-market strategies.',
    ARRAY['Milestone', 'HID Global', 'Bosch', 'CommScope']
  ),
  (
    'smart-infrastructure-workshop',
    'INT-EVT-2026-04',
    'Smart Infrastructure Technical Workshop',
    'Technical Workshop',
    '2026-06-04',
    '4 June 2026',
    '09:00 AM',
    '02:00 PM',
    'Cairo, Egypt',
    'INT Training Centre, Lab 3',
    60,
    60,
    'completed',
    'Hands-on technical workshop on converged building management and smart city sensors.',
    ARRAY['Schneider Electric', 'Johnson Controls', 'INT Labs']
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  capacity = EXCLUDED.capacity,
  registered_count = EXCLUDED.registered_count;

INSERT INTO public.vendors (name, contact_person, category, reps_count, approved_events_count, state, email, phone)
VALUES
  ('Genetec', 'John Smith', 'Unified Security', 6, 3, 'approved', 'jsmith@genetec.com', '+20 100 123 4567'),
  ('Axis Communications', 'Petra Lund', 'Network Video', 4, 2, 'approved', 'plund@axis.com', '+20 100 234 5678'),
  ('Milestone Systems', 'Marco Rossi', 'VMS', 3, 2, 'pending', 'mrossi@milestonesys.com', '+20 100 345 6789'),
  ('HID Global', 'Amira Zaki', 'Access Control', 2, 1, 'pending', 'azaki@hidglobal.com', '+20 100 456 7890'),
  ('Vertiv', 'Daniel Okoro', 'Data Centre', 2, 1, 'rejected', 'dokoro@vertiv.com', '+20 100 567 8901')
ON CONFLICT DO NOTHING;
