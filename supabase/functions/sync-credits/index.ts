import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Credit allocations per tier
const TIER_CREDITS = {
  free: 200, // daily
  lite: 15000, // monthly
  pro: 50000, // monthly
  max: 500000, // monthly
};

// Map Stripe product IDs to tiers
const PRODUCT_TO_TIER: Record<string, string> = {
  'prod_Tjlv1XcekXiyA3': 'lite',
  'prod_TjlwMaE39JrWPc': 'pro',
  'prod_TjlwSBviPz1or8': 'max',
};

const logStep = (step: string, details?: any) => {
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
    let hasActiveSubscription = false;

    if (customers.data.length > 0) {
      const customerId = customers.data[0].id;
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        hasActiveSubscription = true;
        const subscription = subscriptions.data[0];
        const productId = subscription.items.data[0].price.product as string;
        tier = PRODUCT_TO_TIER[productId] || 'free';
        logStep("Active subscription found", { tier, productId });
      }
    }

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
      // Create new credits record
      const initialCredits = tier === 'free' ? TIER_CREDITS.free : TIER_CREDITS[tier as keyof typeof TIER_CREDITS];
      
      const { error: insertError } = await supabaseClient
        .from('user_credits')
        .insert({
          user_id: user.id,
          balance: initialCredits,
          subscription_tier: tier,
          monthly_allocation: tier !== 'free' ? initialCredits : 0,
          last_daily_reset: now.toISOString(),
          last_monthly_reset: tier !== 'free' ? now.toISOString() : null,
        });

      if (insertError) throw insertError;
      logStep("Created new credits record", { tier, credits: initialCredits });

      return new Response(JSON.stringify({
        success: true,
        tier,
        balance: initialCredits,
        message: "Credits initialized"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check if tier changed
    const currentTier = existingCredits.subscription_tier;
    
    if (currentTier !== tier) {
      // Tier changed - update credits
      const newCredits = tier === 'free' ? TIER_CREDITS.free : TIER_CREDITS[tier as keyof typeof TIER_CREDITS];
      
      const { error: updateError } = await supabaseClient
        .from('user_credits')
        .update({
          subscription_tier: tier,
          balance: existingCredits.balance + (tier !== 'free' ? newCredits : 0),
          monthly_allocation: tier !== 'free' ? newCredits : 0,
          last_monthly_reset: tier !== 'free' ? now.toISOString() : null,
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Log the tier change
      await supabaseClient
        .from('credit_transactions')
        .insert({
          user_id: user.id,
          operation: 'tier_change',
          amount: tier !== 'free' ? newCredits : 0,
          transaction_type: 'credit',
          balance_after: existingCredits.balance + (tier !== 'free' ? newCredits : 0),
          description: `Tier changed from ${currentTier} to ${tier}`,
        });

      logStep("Tier updated", { from: currentTier, to: tier });

      return new Response(JSON.stringify({
        success: true,
        tier,
        balance: existingCredits.balance + (tier !== 'free' ? newCredits : 0),
        message: "Tier updated"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check for daily reset (free tier only)
    if (tier === 'free') {
      const lastReset = new Date(existingCredits.last_daily_reset);
      if (lastReset < todayMidnight) {
        const { error: resetError } = await supabaseClient
          .from('user_credits')
          .update({
            balance: TIER_CREDITS.free,
            last_daily_reset: now.toISOString(),
          })
          .eq('user_id', user.id);

        if (resetError) throw resetError;

        await supabaseClient
          .from('credit_transactions')
          .insert({
            user_id: user.id,
            operation: 'daily_reset',
            amount: TIER_CREDITS.free,
            transaction_type: 'credit',
            balance_after: TIER_CREDITS.free,
            description: 'Daily credit reset for free tier',
          });

        logStep("Daily credits reset");

        return new Response(JSON.stringify({
          success: true,
          tier,
          balance: TIER_CREDITS.free,
          message: "Daily credits reset"
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    logStep("No updates needed", { tier, balance: existingCredits.balance });

    return new Response(JSON.stringify({
      success: true,
      tier,
      balance: existingCredits.balance,
      message: "Credits up to date"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
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
