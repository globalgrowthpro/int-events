async function checkData() {
  const token = process.env.SUPABASE_ACCESS_TOKEN || "";
  const projectRef = "ztjuhekmqnonpfnfbmho";

  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `
        SELECT 
          (SELECT COUNT(*) FROM public.events) as total_events,
          (SELECT SUM(capacity) FROM public.events) as total_capacity,
          (SELECT SUM(registered_count) FROM public.events) as total_event_reg,
          (SELECT COUNT(*) FROM public.registrations) as total_registrations,
          (SELECT COUNT(*) FROM public.registrations WHERE state = 'checked-in') as total_checked_in,
          (SELECT COUNT(*) FROM public.vendors) as total_vendors,
          (SELECT COUNT(*) FROM public.vendors WHERE state = 'pending') as pending_vendors;
      `
    })
  });
  console.log("DB Stats:", await res.json());

  const regsRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `
        SELECT role, COUNT(*) as count 
        FROM public.registrations 
        GROUP BY role;
      `
    })
  });
  console.log("Registrations by Role:", await regsRes.json());
}

checkData().catch(console.error);
