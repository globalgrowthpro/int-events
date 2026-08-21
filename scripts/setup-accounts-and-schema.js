import fs from "fs";

async function run() {
  const token = process.env.SUPABASE_ACCESS_TOKEN || "";
  const projectRef = "ztjuhekmqnonpfnfbmho";

  const sql = `
  -- 1. Create Permissions Table
  CREATE TABLE IF NOT EXISTS public.permissions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- 2. Create Role Permissions Table
  CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role TEXT NOT NULL CHECK (role IN ('admin', 'client', 'vendor', 'employee')),
    permission_id TEXT NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    UNIQUE(role, permission_id)
  );

  -- 3. Create SMTP Configuration Table
  CREATE TABLE IF NOT EXISTS public.smtp_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host TEXT NOT NULL DEFAULT 'smtp.office365.com',
    port INTEGER NOT NULL DEFAULT 587,
    encryption TEXT NOT NULL DEFAULT 'tls' CHECK (encryption IN ('tls', 'ssl', 'none')),
    username TEXT NOT NULL DEFAULT 'events@integratedtechnics.com',
    password_encrypted TEXT NOT NULL DEFAULT 'enc_smtp_token_placeholder',
    from_email TEXT NOT NULL DEFAULT 'events@integratedtechnics.com',
    from_name TEXT NOT NULL DEFAULT 'Integrated Technics Events',
    reply_to TEXT DEFAULT 'support@integratedtechnics.com',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_verified BOOLEAN NOT NULL DEFAULT TRUE,
    last_tested_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- 4. Create Email Logs Table
  CREATE TABLE IF NOT EXISTS public.email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_email TEXT NOT NULL,
    template_name TEXT NOT NULL,
    subject TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('queued', 'sent', 'failed')),
    error_message TEXT,
    sent_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Enable RLS
  ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.smtp_settings ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "Permissions viewable by all authenticated users"
    ON public.permissions FOR SELECT USING (true);

  CREATE POLICY "Role permissions viewable by all authenticated users"
    ON public.role_permissions FOR SELECT USING (true);

  CREATE POLICY "SMTP settings managed by admins"
    ON public.smtp_settings FOR ALL USING (public.is_admin());

  CREATE POLICY "Email logs viewable by admins"
    ON public.email_logs FOR ALL USING (public.is_admin());

  -- Seed Default Permissions
  INSERT INTO public.permissions (id, name, category, description) VALUES
    ('events:create', 'Create Events', 'Events', 'Ability to create new INT summits and forums'),
    ('events:edit', 'Edit Events', 'Events', 'Ability to edit event schedule, capacity, and details'),
    ('events:delete', 'Delete Events', 'Events', 'Ability to remove events from platform'),
    ('attendees:manage', 'Manage Attendees', 'Attendees', 'View, edit, and export attendee registrations'),
    ('vendors:approve', 'Approve Vendors', 'Vendors', 'Review and approve/reject partner exhibitor applications'),
    ('attendance:scan', 'Scan Badges', 'Attendance', 'Use QR scanner to check in attendees at gates'),
    ('reports:export', 'Export Reports', 'Analytics', 'Download CSV reports and view analytics diagrams'),
    ('settings:manage', 'Manage Settings', 'System', 'Configure system parameters and SMTP'),
    ('certificates:issue', 'Issue Certificates', 'Certificates', 'Generate and verify completion certificates')
  ON CONFLICT (id) DO NOTHING;

  -- Seed Role Permissions
  INSERT INTO public.role_permissions (role, permission_id) VALUES
    ('admin', 'events:create'),
    ('admin', 'events:edit'),
    ('admin', 'events:delete'),
    ('admin', 'attendees:manage'),
    ('admin', 'vendors:approve'),
    ('admin', 'attendance:scan'),
    ('admin', 'reports:export'),
    ('admin', 'settings:manage'),
    ('admin', 'certificates:issue'),
    ('employee', 'attendance:scan'),
    ('employee', 'attendees:manage'),
    ('vendor', 'reports:export')
  ON CONFLICT DO NOTHING;

  -- Seed Default SMTP Setting
  INSERT INTO public.smtp_settings (host, port, encryption, username, from_email, from_name)
  VALUES ('smtp.sendgrid.net', 587, 'tls', 'apikey', 'events@integratedtechnics.com', 'Integrated Technics Events')
  ON CONFLICT DO NOTHING;

  -- 5. Create 4 Distinct System Accounts in auth.users and public.profiles

  -- Account 1: Super Admin
  DO $$
  DECLARE
    v_admin_id UUID := 'a0000000-0000-0000-0000-000000000001';
  BEGIN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_admin_id,
      'authenticated',
      'authenticated',
      'admin@integratedtechnics.com',
      crypt('Admin@INT2026!', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Hafez Rahim","role":"admin","company":"Integrated Technics","gender":"Male"}',
      NOW(),
      NOW()
    ) ON CONFLICT (id) DO UPDATE SET
      encrypted_password = crypt('Admin@INT2026!', gen_salt('bf'));

    INSERT INTO public.profiles (id, email, full_name, gender, company, job_title, role, status)
    VALUES (v_admin_id, 'admin@integratedtechnics.com', 'Hafez Rahim', 'Male', 'Integrated Technics', 'Super Administrator', 'admin', 'active')
    ON CONFLICT (id) DO UPDATE SET
      role = 'admin', full_name = 'Hafez Rahim';
  END $$;

  -- Account 2: Client / Attendee
  DO $$
  DECLARE
    v_client_id UUID := 'b0000000-0000-0000-0000-000000000002';
  BEGIN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_client_id,
      'authenticated',
      'authenticated',
      'client@intevents.com',
      crypt('Client@INT2026!', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Ahmed Mohamed","role":"client","company":"ABC Corporation","gender":"Male"}',
      NOW(),
      NOW()
    ) ON CONFLICT (id) DO UPDATE SET
      encrypted_password = crypt('Client@INT2026!', gen_salt('bf'));

    INSERT INTO public.profiles (id, email, full_name, gender, company, job_title, role, status)
    VALUES (v_client_id, 'client@intevents.com', 'Ahmed Mohamed', 'Male', 'ABC Corporation', 'IT Director', 'client', 'active')
    ON CONFLICT (id) DO UPDATE SET
      role = 'client', full_name = 'Ahmed Mohamed';
  END $$;

  -- Account 3: Vendor / Partner
  DO $$
  DECLARE
    v_vendor_id UUID := 'c0000000-0000-0000-0000-000000000003';
  BEGIN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_vendor_id,
      'authenticated',
      'authenticated',
      'vendor@genetec.com',
      crypt('Vendor@INT2026!', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Sarah Klein","role":"vendor","company":"Genetec","gender":"Female"}',
      NOW(),
      NOW()
    ) ON CONFLICT (id) DO UPDATE SET
      encrypted_password = crypt('Vendor@INT2026!', gen_salt('bf'));

    INSERT INTO public.profiles (id, email, full_name, gender, company, job_title, role, status)
    VALUES (v_vendor_id, 'vendor@genetec.com', 'Sarah Klein', 'Female', 'Genetec', 'Solutions Director', 'vendor', 'active')
    ON CONFLICT (id) DO UPDATE SET
      role = 'vendor', full_name = 'Sarah Klein';
  END $$;

  -- Account 4: INT Employee / Staff
  DO $$
  DECLARE
    v_employee_id UUID := 'd0000000-0000-0000-0000-000000000004';
  BEGIN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_employee_id,
      'authenticated',
      'authenticated',
      'employee@integratedtechnics.com',
      crypt('Employee@INT2026!', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Omar Ali","role":"employee","company":"Integrated Technics","gender":"Male"}',
      NOW(),
      NOW()
    ) ON CONFLICT (id) DO UPDATE SET
      encrypted_password = crypt('Employee@INT2026!', gen_salt('bf'));

    INSERT INTO public.profiles (id, email, full_name, gender, company, job_title, role, status)
    VALUES (v_employee_id, 'employee@integratedtechnics.com', 'Omar Ali', 'Male', 'Integrated Technics', 'Field Operations Lead', 'employee', 'active')
    ON CONFLICT (id) DO UPDATE SET
      role = 'employee', full_name = 'Omar Ali';
  END $$;
  `;

  console.log("Executing SQL migration for permissions, SMTP, and 4 accounts...");
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query: sql })
  });

  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Response:", text);
}

run().catch(console.error);
