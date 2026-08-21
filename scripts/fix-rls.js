async function fixRLS() {
  const token = process.env.SUPABASE_ACCESS_TOKEN || "";
  const projectRef = "ztjuhekmqnonpfnfbmho";

  const sql = `
  -- Allow public / anon read & write for Events, Registrations, Vendors, Logs, and Settings
  DROP POLICY IF EXISTS "Admins can insert, update, delete events" ON public.events;
  DROP POLICY IF EXISTS "Events are viewable by everyone" ON public.events;
  DROP POLICY IF EXISTS "Events full public access" ON public.events;
  CREATE POLICY "Events full access" ON public.events FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Admins have full access to registrations" ON public.registrations;
  DROP POLICY IF EXISTS "Users can create registrations" ON public.registrations;
  DROP POLICY IF EXISTS "Users can update their own registrations" ON public.registrations;
  DROP POLICY IF EXISTS "Users can view their own registrations" ON public.registrations;
  DROP POLICY IF EXISTS "Registrations full access" ON public.registrations;
  CREATE POLICY "Registrations full access" ON public.registrations FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Admins have full access to vendors" ON public.vendors;
  DROP POLICY IF EXISTS "Vendors can register and edit own company" ON public.vendors;
  DROP POLICY IF EXISTS "Vendors can update own company" ON public.vendors;
  DROP POLICY IF EXISTS "Vendors viewable by authenticated users" ON public.vendors;
  DROP POLICY IF EXISTS "Vendors full access" ON public.vendors;
  CREATE POLICY "Vendors full access" ON public.vendors FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Attendance logs insertable by authorized scanners" ON public.attendance_logs;
  DROP POLICY IF EXISTS "Attendance logs readable by admins" ON public.attendance_logs;
  DROP POLICY IF EXISTS "Attendance logs full access" ON public.attendance_logs;
  CREATE POLICY "Attendance logs full access" ON public.attendance_logs FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "SMTP settings managed by admins" ON public.smtp_settings;
  DROP POLICY IF EXISTS "SMTP settings full access" ON public.smtp_settings;
  CREATE POLICY "SMTP settings full access" ON public.smtp_settings FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Email logs viewable by admins" ON public.email_logs;
  DROP POLICY IF EXISTS "Email logs full access" ON public.email_logs;
  CREATE POLICY "Email logs full access" ON public.email_logs FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public profiles are readable by authenticated users" ON public.profiles;
  DROP POLICY IF EXISTS "Admins have full access to profiles" ON public.profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Profiles full access" ON public.profiles;
  CREATE POLICY "Profiles full access" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
  `;

  console.log("Applying open RLS policies...");
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql })
  });
  console.log("Result:", res.status, await res.text());
}

fixRLS().catch(console.error);
