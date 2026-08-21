async function check() {
  const token = process.env.SUPABASE_ACCESS_TOKEN || "";
  const projectRef = "ztjuhekmqnonpfnfbmho";

  const res1 = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: "SELECT id, email, full_name, role, status FROM public.profiles;" })
  });
  console.log("Profiles:", await res1.json());

  const res2 = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: "SELECT id, name, category FROM public.permissions LIMIT 5;" })
  });
  console.log("Sample Permissions:", await res2.json());

  const res3 = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: "SELECT host, port, encryption, from_email, is_active FROM public.smtp_settings;" })
  });
  console.log("SMTP Config:", await res3.json());
}

check().catch(console.error);
