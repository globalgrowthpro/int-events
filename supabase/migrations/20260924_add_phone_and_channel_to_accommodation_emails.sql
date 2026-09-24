-- Additive migration: Add phone and channel columns to accommodation_emails
ALTER TABLE public.accommodation_emails 
  ADD COLUMN IF NOT EXISTS recipient_phone TEXT,
  ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'email';

CREATE INDEX IF NOT EXISTS idx_accommodation_emails_phone 
  ON public.accommodation_emails (recipient_phone);

CREATE INDEX IF NOT EXISTS idx_accommodation_emails_channel 
  ON public.accommodation_emails (channel);
