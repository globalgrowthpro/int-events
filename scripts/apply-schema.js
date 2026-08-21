import fs from "fs";

async function run() {
  const sql = fs.readFileSync("supabase/schema.sql", "utf-8");
  const token = process.env.SUPABASE_ACCESS_TOKEN || "";
  const projectRef = "ztjuhekmqnonpfnfbmho";

  console.log("Applying schema to Supabase project:", projectRef);
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
