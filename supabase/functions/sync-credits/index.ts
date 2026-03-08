import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Daily credit allocations per tier
const TIER_DAILY_CREDITS: Record<string, number> = {
  free: 200,
  lite: 500,
  pro: 1666,
  max: 16666,
};

// Map Stripe product IDs to tiers
const PRODUCT_TO_TIER: Record<string, string> = {
  'prod_Tjlv1XcekXiyA3': 'lite',
  'prod_TjlwMaE39JrWPc': 'pro',
  'prod_TjlwSBviPz1or8': 'max',
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SYNC-CREDITS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check for active subscription
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let tier = 'free';

    if (customers.data.length > 0) {
      const customerId = customers.data[0].id;
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        const subscription = subscriptions.data[0];
        const productId = subscription.items.data[0].price.product as string;
        tier = PRODUCT_TO_TIER[productId] || 'free';
        logStep("Active subscription found", { tier, productId });
      }
    }

    const dailyCredits = TIER_DAILY_CREDITS[tier] ?? TIER_DAILY_CREDITS.free;

    // Get or create user credits record
    const { data: existingCredits, error: fetchError } = await supabaseClient
      .from('user_credits')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (fetchError) throw fetchError;

    const now = new Date();
    const todayMidnight = new Date(now);
    todayMidnight.setUTCHours(0, 0, 0, 0);

    if (!existingCredits) {
      // Create new credits record with daily allocation
      const { error: insertError } = await supabaseClient
        .from('user_credits')
        .insert({
          user_id: user.id,
          balance: dailyCredits,
          subscription_tier: tier,
          monthly_allocation: dailyCredits,
          last_daily_reset: now.toISOString(),
        });

      if (insertError) throw insertError;
      logStep("Created new credits record", { tier, credits: dailyCredits });

      return new Response(JSON.stringify({
        success: true, tier, balance: dailyCredits, message: "Credits initialized"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if tier changed
    const currentTier = existingCredits.subscription_tier;
    
    if (currentTier !== tier) {
      const { error: updateError } = await supabaseClient
        .from('user_credits')
        .update({
          subscription_tier: tier,
          balance: dailyCredits,
          monthly_allocation: dailyCredits,
          last_daily_reset: now.toISOString(),
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      await supabaseClient
        .from('credit_transactions')
        .insert({
          user_id: user.id,
          operation: 'tier_change',
          amount: dailyCredits,
          transaction_type: 'credit',
          balance_after: dailyCredits,
          description: `Tier changed from ${currentTier} to ${tier} - ${dailyCredits} daily credits`,
        });

      logStep("Tier updated", { from: currentTier, to: tier });

      return new Response(JSON.stringify({
        success: true, tier, balance: dailyCredits, message: "Tier updated"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check for daily reset
    const lastReset = new Date(existingCredits.last_daily_reset);
    if (lastReset < todayMidnight) {
      const { error: resetError } = await supabaseClient
        .from('user_credits')
        .update({
          balance: dailyCredits,
          last_daily_reset: now.toISOString(),
        })
        .eq('user_id', user.id);

      if (resetError) throw resetError;

      await supabaseClient
        .from('credit_transactions')
        .insert({
          user_id: user.id,
          operation: 'daily_reset',
          amount: dailyCredits,
          transaction_type: 'credit',
          balance_after: dailyCredits,
          description: `Daily credit reset for ${tier} tier`,
        });

      logStep("Daily credits reset", { tier, credits: dailyCredits });

      return new Response(JSON.stringify({
        success: true, tier, balance: dailyCredits, message: "Daily credits reset"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("No updates needed", { tier, balance: existingCredits.balance });

    return new Response(JSON.stringify({
      success: true, tier, balance: existingCredits.balance, message: "Credits up to date"
    }), {
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
