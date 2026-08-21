async function seedMore() {
  const token = process.env.SUPABASE_ACCESS_TOKEN || "";
  const projectRef = "ztjuhekmqnonpfnfbmho";

  const sql = `
  -- Seed realistic registrations if empty
  INSERT INTO public.registrations (id, event_id, attendee_name, attendee_email, gender, phone, company, job_title, role, ticket_token, state, check_in_time)
  VALUES
    ('INT-EVT-000248', 'security-summit-2026', 'Ahmed Mohamed', 'ahmed.mohamed@abccorp.com', 'Male', '+20 100 123 4567', 'ABC Corporation', 'IT Director', 'client', 'EVT-2026-000248-X7K92', 'checked-in', NOW() - INTERVAL '45 minutes'),
    ('INT-EVT-000249', 'security-summit-2026', 'John Smith', 'jsmith@genetec.com', 'Male', '+20 100 234 5678', 'Genetec', 'Solutions Architect', 'vendor', 'EVT-2026-000249-G8K11', 'checked-in', NOW() - INTERVAL '38 minutes'),
    ('INT-EVT-000250', 'security-summit-2026', 'Omar Ali', 'omar.ali@integratedtechnics.com', 'Male', '+20 100 345 6789', 'Integrated Technics', 'Field Operations Lead', 'employee', 'EVT-2026-000250-T2P90', 'checked-in', NOW() - INTERVAL '32 minutes'),
    ('INT-EVT-000251', 'security-summit-2026', 'Nour Hassan', 'nour.hassan@egypttelecom.eg', 'Female', '+20 100 456 7890', 'Egypt Telecom', 'Infrastructure Manager', 'client', 'EVT-2026-000251-Q4W88', 'checked-in', NOW() - INTERVAL '21 minutes'),
    ('INT-EVT-000252', 'security-summit-2026', 'Sara Adel', 'sara.adel@deltabank.com.eg', 'Female', '+20 100 567 8901', 'Delta Bank', 'Chief Security Officer', 'client', 'EVT-2026-000252-Z9L33', 'registered', NULL),
    ('INT-EVT-000253', 'partner-day-2026', 'Marco Rossi', 'mrossi@milestonesys.com', 'Male', '+20 100 678 9012', 'Milestone', 'VP Sales EMEA', 'vendor', 'EVT-2026-000253-B5K44', 'registered', NULL),
    ('INT-EVT-000254', 'security-summit-2026', 'Yasmin Fouad', 'yasmin.fouad@integratedtechnics.com', 'Female', '+20 100 789 0123', 'Integrated Technics', 'Senior Security Engineer', 'employee', 'EVT-2026-000254-M7V12', 'checked-in', NOW() - INTERVAL '12 minutes'),
    ('INT-EVT-000255', 'technology-forum-2026', 'Khaled Samir', 'khaled.samir@greengas.eg', 'Male', '+20 100 890 1234', 'GreenGas Energy', 'Operations Director', 'client', 'EVT-2026-000255-P1K77', 'registered', NULL),
    ('INT-EVT-000256', 'security-summit-2026', 'Dina Farouk', 'dina.farouk@cisco.com', 'Female', '+20 100 901 2345', 'Cisco Systems', 'Enterprise Architect', 'vendor', 'EVT-2026-000256-C3N99', 'checked-in', NOW() - INTERVAL '5 minutes')
  ON CONFLICT (id) DO NOTHING;

  -- Seed attendance logs
  INSERT INTO public.attendance_logs (registration_id, event_id, gate, status, scanned_at)
  VALUES
    ('INT-EVT-000248', 'security-summit-2026', 'Main Entrance Gate A', 'valid', NOW() - INTERVAL '45 minutes'),
    ('INT-EVT-000249', 'security-summit-2026', 'Partner & Exhibitor Gate', 'valid', NOW() - INTERVAL '38 minutes'),
    ('INT-EVT-000250', 'security-summit-2026', 'Staff & Crew Gate', 'valid', NOW() - INTERVAL '32 minutes'),
    ('INT-EVT-000251', 'security-summit-2026', 'Main Entrance Gate A', 'valid', NOW() - INTERVAL '21 minutes'),
    ('INT-EVT-000254', 'security-summit-2026', 'Staff & Crew Gate', 'valid', NOW() - INTERVAL '12 minutes'),
    ('INT-EVT-000256', 'security-summit-2026', 'VIP & Speaker Entrance', 'valid', NOW() - INTERVAL '5 minutes')
  ON CONFLICT DO NOTHING;
  `;

  console.log("Seeding more live data...");
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql })
  });
  console.log("Status:", res.status, await res.text());
}

seedMore().catch(console.error);
