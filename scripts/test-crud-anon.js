import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ztjuhekmqnonpfnfbmho.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0anVoZWttcW5vbnBmbmZibWhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczNDM5OTYsImV4cCI6MjEwMjkxOTk5Nn0.n4Co-UgvJh9YI8gGX7AUZFfkk59vv5opDeft3jNiH9M";

const client = createClient(supabaseUrl, supabaseAnonKey);

async function testCrud() {
  console.log("Testing CREATE on public.events...");
  const testId = `test-evt-${Date.now()}`;
  const { data: created, error: createErr } = await client
    .from("events")
    .insert({
      id: testId,
      code: "INT-EVT-TEST-99",
      title: "Test Security Summit 2026",
      category: "Summit",
      date: "2026-11-20",
      date_label: "20 November 2026",
      start_time: "09:00 AM",
      end_time: "05:00 PM",
      city: "Cairo, Egypt",
      venue: "INT Headquarters",
      capacity: 300,
      registered_count: 0,
      checked_in_count: 0,
      status: "open",
      summary: "Test summit description",
      partners: ["Genetec", "Axis"],
    })
    .select()
    .single();

  if (createErr) {
    console.error("Create Error:", createErr);
    return;
  }
  console.log("SUCCESS: Created row in database:", created.id);

  console.log("Testing UPDATE on public.events...");
  const { error: updateErr } = await client
    .from("events")
    .update({ title: "Updated Test Security Summit 2026", capacity: 450 })
    .eq("id", testId);

  if (updateErr) {
    console.error("Update Error:", updateErr);
    return;
  }
  console.log("SUCCESS: Updated row in database");

  console.log("Testing READ on public.events...");
  const { data: fetched, error: fetchErr } = await client
    .from("events")
    .select("*")
    .eq("id", testId)
    .single();

  if (fetchErr) {
    console.error("Fetch Error:", fetchErr);
    return;
  }
  console.log("SUCCESS: Fetched updated row from database:", fetched.title, "Capacity:", fetched.capacity);

  console.log("Testing DELETE on public.events...");
  const { error: deleteErr } = await client
    .from("events")
    .delete()
    .eq("id", testId);

  if (deleteErr) {
    console.error("Delete Error:", deleteErr);
    return;
  }
  console.log("SUCCESS: Deleted test row from database");
}

testCrud().catch(console.error);
