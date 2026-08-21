import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ztjuhekmqnonpfnfbmho.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0anVoZWttcW5vbnBmbmZibWhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczNDM5OTYsImV4cCI6MjEwMjkxOTk5Nn0.n4Co-UgvJh9YI8gGX7AUZFfkk59vv5opDeft3jNiH9M";

const client = createClient(supabaseUrl, supabaseAnonKey);

async function testRegistrationsCrud() {
  console.log("1. Testing CREATE on public.registrations...");
  const testId = `INT-EVT-TEST-${Date.now().toString().slice(-4)}`;
  const testToken = `EVT-2026-TEST-${Math.floor(1000 + Math.random() * 9000)}`;

  const { data: created, error: createErr } = await client
    .from("registrations")
    .insert({
      id: testId,
      event_id: "security-summit-2026",
      attendee_name: "Test Attendee Validation",
      attendee_email: "test.attendee@integratedtechnics.com",
      gender: "Male",
      phone: "+20 100 999 8888",
      company: "Test Client Org",
      job_title: "Security Architect",
      role: "client",
      ticket_token: testToken,
      state: "registered",
      is_primary: true,
    })
    .select()
    .single();

  if (createErr) {
    console.error("Create Registration Error:", createErr);
    return;
  }
  console.log("SUCCESS: Created registration row in database with ID:", created.id);

  console.log("2. Testing UPDATE (check-in toggle) on public.registrations...");
  const { error: updateErr } = await client
    .from("registrations")
    .update({
      state: "checked-in",
      check_in_time: new Date().toISOString(),
    })
    .eq("id", testId);

  if (updateErr) {
    console.error("Update Registration Error:", updateErr);
    return;
  }
  console.log("SUCCESS: Updated registration to checked-in in database");

  console.log("3. Testing READ on public.registrations...");
  const { data: fetched, error: fetchErr } = await client
    .from("registrations")
    .select("*")
    .eq("id", testId)
    .single();

  if (fetchErr) {
    console.error("Fetch Registration Error:", fetchErr);
    return;
  }
  console.log("SUCCESS: Fetched registration:", fetched.attendee_name, "State:", fetched.state, "Token:", fetched.ticket_token);

  console.log("4. Testing DELETE on public.registrations...");
  const { error: deleteErr } = await client
    .from("registrations")
    .delete()
    .eq("id", testId);

  if (deleteErr) {
    console.error("Delete Registration Error:", deleteErr);
    return;
  }
  console.log("SUCCESS: Deleted test registration from database");
}

testRegistrationsCrud().catch(console.error);
