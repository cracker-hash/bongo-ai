import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLAN_LIMITS = {
  free: { requests: 100, tokens: 50000, podcasts: 0 },
  lite: { requests: 5000, tokens: 500000, podcasts: 5 },
  pro: { requests: 25000, tokens: 2500000, podcasts: 25 },
  max: { requests: -1, tokens: -1, podcasts: -1 }, // Unlimited
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get all users with their subscriptions
    const { data: subscriptions } = await supabaseAdmin
      .from("subscriptions")
      .select("user_id, plan");

    if (!subscriptions) {
      return new Response(JSON.stringify({ checked: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    let alertsSent = 0;

    for (const sub of subscriptions) {
      const limits = PLAN_LIMITS[sub.plan as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.free;
      
      // Skip unlimited plans
      if (limits.requests === -1) continue;

      // Get usage for this month
      const { data: usageLogs } = await supabaseAdmin
        .from("usage_logs")
        .select("action_type, tokens_used")
        .eq("user_id", sub.user_id)
        .gte("created_at", startOfMonth.toISOString());

      if (!usageLogs) continue;

      // Calculate totals
      const requestCount = usageLogs.filter(l => l.action_type === "chat" || l.action_type === "api_request").length;
      const tokenCount = usageLogs.reduce((sum, l) => sum + (l.tokens_used || 0), 0);
      const podcastCount = usageLogs.filter(l => l.action_type === "podcast").length;

      // Get user email
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(sub.user_id);
      const email = userData?.user?.email;

      if (!email) continue;

      // Check each limit at 80%
      const checks = [
        { current: requestCount, limit: limits.requests, type: "API requests" },
        { current: tokenCount, limit: limits.tokens, type: "tokens" },
        { current: podcastCount, limit: limits.podcasts, type: "podcasts" },
      ];

      for (const check of checks) {
        if (check.limit <= 0) continue;
        
        const percentage = (check.current / check.limit) * 100;
        
        if (percentage >= 80 && percentage < 100) {
          // Send 80% warning
          await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-usage-alert`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({
              email,
              type: "usage_warning",
              currentUsage: check.current,
              limit: check.limit,
              resourceType: check.type,
            }),
          });
          alertsSent++;
        } else if (percentage >= 100) {
          // Send limit reached alert
          await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-usage-alert`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({
              email,
              type: "usage_critical",
              currentUsage: check.current,
              limit: check.limit,
              resourceType: check.type,
            }),
          });
          alertsSent++;
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, checked: subscriptions.length, alertsSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error checking usage limits:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
