import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TIER_DAILY_CREDITS: Record<string, number> = {
  free: 200,
  lite: 500,
  pro: 1666,
  max: 16666,
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[RESET-DAILY-CREDITS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Calculate today's midnight UTC
    const now = new Date();
    const todayMidnight = new Date(now);
    todayMidnight.setUTCHours(0, 0, 0, 0);

    // Fetch all users needing a reset
    const { data: usersToReset, error: fetchError } = await supabaseClient
      .from('user_credits')
      .select('id, user_id, subscription_tier, balance')
      .lt('last_daily_reset', todayMidnight.toISOString());

    if (fetchError) throw fetchError;

    if (!usersToReset || usersToReset.length === 0) {
      logStep("No users need reset");
      return new Response(JSON.stringify({ success: true, reset_count: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Users to reset", { count: usersToReset.length });

    let resetCount = 0;

    for (const userCredit of usersToReset) {
      const tier = userCredit.subscription_tier || 'free';
      const dailyAllocation = TIER_DAILY_CREDITS[tier] ?? TIER_DAILY_CREDITS.free;

      // Reset balance
      const { error: updateError } = await supabaseClient
        .from('user_credits')
        .update({
          balance: dailyAllocation,
          last_daily_reset: now.toISOString(),
        })
        .eq('id', userCredit.id);

      if (updateError) {
        logStep("Error resetting user", { userId: userCredit.user_id, error: updateError.message });
        continue;
      }

      // Log transaction
      await supabaseClient
        .from('credit_transactions')
        .insert({
          user_id: userCredit.user_id,
          operation: 'daily_reset',
          amount: dailyAllocation,
          transaction_type: 'credit',
          balance_after: dailyAllocation,
          description: `Daily credit reset for ${tier} tier`,
        });

      resetCount++;
    }

    logStep("Reset complete", { resetCount });

    return new Response(JSON.stringify({ success: true, reset_count: resetCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
