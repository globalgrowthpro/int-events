async function verify() {
  const token = process.env.SUPABASE_ACCESS_TOKEN || "";
  const projectRef = "ztjuhekmqnonpfnfbmho";

  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      query: `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name;
      `
    })
  });

  const data = await res.json();
  console.log("Public Tables:", data);

  const eventsRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      query: "SELECT id, title, capacity, registered_count, status FROM public.events;"
    })
  });
  console.log("Seeded Events:", await eventsRes.json());
}

verify().catch(console.error);
