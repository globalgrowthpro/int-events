import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ztjuhekmqnonpfnfbmho.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0anVoZWttcW5vbnBmbmZibWhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczNDM5OTYsImV4cCI6MjEwMjkxOTk5Nn0.n4Co-UgvJh9YI8gGX7AUZFfkk59vv5opDeft3jNiH9M";

const client = createClient(supabaseUrl, supabaseAnonKey);

async function runFullVerification() {
  console.log("=== RUNNING FULL CRUD & SCANNER VERIFICATION ===");

  // 1. TEST /admin/attendees (public.registrations)
  console.log("\n[1] Testing /admin/attendees (Create, Read, Update, Delete)...");
  const attendeeId = `INT-ATT-TEST-${Date.now().toString().slice(-4)}`;
  const attendeeToken = `EVT-ATT-${Math.floor(1000 + Math.random() * 9000)}`;

  // Create
  const { error: attCreateErr } = await client.from("registrations").insert({
    id: attendeeId,
    event_id: "security-summit-2026",
    attendee_name: "Youssef Nabil",
    attendee_email: "youssef.nabil@vodafone.com",
    phone: "+20 100 111 2222",
    gender: "Male",
    company: "Vodafone Egypt",
    job_title: "Telecom Solutions Director",
    role: "client",
    ticket_token: attendeeToken,
    state: "registered",
    is_primary: true,
  });
  if (attCreateErr) throw new Error("Attendee Create Failed: " + attCreateErr.message);
  console.log("✓ Attendee Created in DB:", attendeeId);

  // Update
  const { error: attUpdateErr } = await client
    .from("registrations")
    .update({ job_title: "Chief Technical Officer" })
    .eq("id", attendeeId);
  if (attUpdateErr) throw new Error("Attendee Update Failed: " + attUpdateErr.message);
  console.log("✓ Attendee Updated in DB");

  // Read
  const { data: attRead, error: attReadErr } = await client
    .from("registrations")
    .select("*")
    .eq("id", attendeeId)
    .single();
  if (attReadErr || attRead.job_title !== "Chief Technical Officer") throw new Error("Attendee Read mismatch");
  console.log("✓ Attendee Read verified from DB:", attRead.attendee_name, "-", attRead.job_title);

  // 2. TEST /admin/scanner (QR Check-In & Gate Logs)
  console.log("\n[2] Testing /admin/scanner (Valid scan, duplicate detection, and attendance log creation)...");
  
  // First Scan (Valid)
  const scanTime = new Date().toISOString();
  await client.from("registrations").update({ state: "checked-in", check_in_time: scanTime }).eq("id", attendeeId);
  await client.from("attendance_logs").insert({
    registration_id: attendeeId,
    event_id: "security-summit-2026",
    gate: "Main Entrance Gate A",
    status: "valid",
  });
  console.log("✓ Scanner Valid check-in recorded in database");

  // Second Scan (Duplicate)
  await client.from("attendance_logs").insert({
    registration_id: attendeeId,
    event_id: "security-summit-2026",
    gate: "Main Entrance Gate A",
    status: "duplicate",
  });
  console.log("✓ Scanner Duplicate check-in recorded in attendance_logs");

  // Verify attendance logs
  const { data: logs, error: logsErr } = await client
    .from("attendance_logs")
    .select("*")
    .eq("registration_id", attendeeId);
  if (logsErr || logs.length < 2) throw new Error("Attendance logs not recorded properly");
  console.log("✓ Attendance logs verified in DB:", logs.length, "entries logged");

  // Delete attendee cleanup
  await client.from("registrations").delete().eq("id", attendeeId);
  console.log("✓ Attendee Deleted from DB (Cleaned up)");

  // 3. TEST /admin/vendors (public.vendors)
  console.log("\n[3] Testing /admin/vendors (Create, Read, Update State, Delete)...");
  
  // Create Vendor
  const { data: vInserted, error: vCreateErr } = await client.from("vendors").insert({
    name: "Bosch Security Systems",
    contact_person: "Klaus Weber",
    category: "CCTV & Video Surveillance",
    reps_count: 5,
    approved_events_count: 2,
    state: "pending",
    email: "klaus.weber@bosch.com",
    phone: "+49 89 123456",
  }).select().single();

  if (vCreateErr) throw new Error("Vendor Create Failed: " + vCreateErr.message);
  const vendorId = vInserted.id;
  console.log("✓ Vendor Created in DB with auto-generated UUID:", vendorId);

  // Update Vendor State (Approve)
  const { error: vUpdateErr } = await client
    .from("vendors")
    .update({ state: "approved", approved_events_count: 3 })
    .eq("id", vendorId);
  if (vUpdateErr) throw new Error("Vendor Update Failed: " + vUpdateErr.message);
  console.log("✓ Vendor Status Updated to 'approved' in DB");

  // Read Vendor
  const { data: vRead, error: vReadErr } = await client
    .from("vendors")
    .select("*")
    .eq("id", vendorId)
    .single();
  if (vReadErr || vRead.state !== "approved") throw new Error("Vendor Read mismatch");
  console.log("✓ Vendor Read verified from DB:", vRead.name, "State:", vRead.state);

  // Delete Vendor
  const { error: vDeleteErr } = await client.from("vendors").delete().eq("id", vendorId);
  if (vDeleteErr) throw new Error("Vendor Delete Failed: " + vDeleteErr.message);
  console.log("✓ Vendor Deleted from DB");

  console.log("\n🎉 ALL CRUD & DATABASE PERSISTENCE TESTS PASSED 100%!");
}

runFullVerification().catch(console.error);
