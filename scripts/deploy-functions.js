async function deployFunctions() {
  const token = process.env.SUPABASE_ACCESS_TOKEN || "";
  const projectRef = "ztjuhekmqnonpfnfbmho";

  // 1. verify-pass Edge Function Code (Deno / TypeScript)
  const verifyPassCode = `import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { token, gate, scanned_by } = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing ticket token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call stored procedure verify_and_checkin_ticket
    const { data, error } = await supabaseClient.rpc("verify_and_checkin_ticket", {
      p_ticket_token: token,
      p_scanned_by: scanned_by || null,
      p_gate: gate || "Main Entrance Gate",
    });

    if (error) {
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify(data),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
`;

  // 2. event-stats Edge Function Code
  const eventStatsCode = `import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const { data: events, error } = await supabaseClient
      .from("events")
      .select("id, code, title, capacity, registered_count, checked_in_count, status");

    if (error) throw error;

    const totalCapacity = events.reduce((s, e) => s + e.capacity, 0);
    const totalRegistered = events.reduce((s, e) => s + e.registered_count, 0);
    const totalCheckedIn = events.reduce((s, e) => s + e.checked_in_count, 0);

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          totalEvents: events.length,
          totalCapacity,
          totalRegistered,
          totalCheckedIn,
          attendanceRate: totalRegistered > 0 ? Math.round((totalCheckedIn / totalRegistered) * 100) : 0,
        },
        events,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
`;

  console.log("Deploying Edge Functions...");

  // Deploy verify-pass
  const res1 = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/functions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      slug: "verify-pass",
      name: "verify-pass",
      body: verifyPassCode,
      verify_jwt: false,
    }),
  });
  console.log("verify-pass deploy status:", res1.status, await res1.text());

  // Deploy event-stats
  const res2 = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/functions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      slug: "event-stats",
      name: "event-stats",
      body: eventStatsCode,
      verify_jwt: false,
    }),
  });
  console.log("event-stats deploy status:", res2.status, await res2.text());
}

deployFunctions().catch(console.error);
