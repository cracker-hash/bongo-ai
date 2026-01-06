import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[GOOGLE-OAUTH] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabase = createClient(
      SUPABASE_URL ?? "",
      SUPABASE_SERVICE_ROLE_KEY ?? "",
      { auth: { persistSession: false } }
    );

    const { action, code, provider, redirect_uri } = await req.json();
    logStep("Request received", { action, provider });

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    if (action === "get_auth_url") {
      // Generate OAuth URL for Google
      const scopes = provider === "gmail" 
        ? ["https://www.googleapis.com/auth/gmail.readonly", "https://www.googleapis.com/auth/gmail.send"]
        : ["https://www.googleapis.com/auth/drive.readonly", "https://www.googleapis.com/auth/drive.file"];

      const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID ?? "");
      authUrl.searchParams.set("redirect_uri", redirect_uri);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", scopes.join(" "));
      authUrl.searchParams.set("access_type", "offline");
      authUrl.searchParams.set("prompt", "consent");
      authUrl.searchParams.set("state", JSON.stringify({ user_id: user.id, provider }));

      logStep("Generated auth URL", { provider });

      return new Response(JSON.stringify({ url: authUrl.toString() }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "exchange_token") {
      // Exchange authorization code for tokens
      if (!code) throw new Error("Authorization code required");

      logStep("Exchanging code for tokens");

      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID ?? "",
          client_secret: GOOGLE_CLIENT_SECRET ?? "",
          code,
          grant_type: "authorization_code",
          redirect_uri,
        }),
      });

      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        logStep("Token exchange error", { error: tokenData.error });
        throw new Error(tokenData.error_description || tokenData.error);
      }

      logStep("Tokens received", { hasAccessToken: !!tokenData.access_token, hasRefreshToken: !!tokenData.refresh_token });

      // Get user info from Google
      const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const userInfo = await userInfoResponse.json();

      logStep("User info received", { email: userInfo.email });

      // Calculate token expiry
      const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));

      // Store tokens in connected_accounts
      const { error: upsertError } = await supabase
        .from("connected_accounts")
        .upsert({
          user_id: user.id,
          provider: provider || "google_drive",
          provider_account_id: userInfo.id,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_at: expiresAt.toISOString(),
          account_email: userInfo.email,
          account_name: userInfo.name,
          scopes: tokenData.scope?.split(" ") || [],
          is_active: true,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "user_id,provider",
        });

      if (upsertError) {
        logStep("Database upsert error", { error: upsertError.message });
        throw new Error(upsertError.message);
      }

      logStep("Account connected successfully", { provider, email: userInfo.email });

      return new Response(JSON.stringify({ 
        success: true, 
        email: userInfo.email,
        name: userInfo.name,
        provider
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "refresh_token") {
      // Refresh access token
      const { data: account, error: fetchError } = await supabase
        .from("connected_accounts")
        .select("*")
        .eq("user_id", user.id)
        .eq("provider", provider)
        .single();

      if (fetchError || !account) {
        throw new Error("No connected account found");
      }

      if (!account.refresh_token) {
        throw new Error("No refresh token available");
      }

      logStep("Refreshing token", { provider });

      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID ?? "",
          client_secret: GOOGLE_CLIENT_SECRET ?? "",
          refresh_token: account.refresh_token,
          grant_type: "refresh_token",
        }),
      });

      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        throw new Error(tokenData.error_description || tokenData.error);
      }

      // Update access token
      const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));
      
      await supabase
        .from("connected_accounts")
        .update({
          access_token: tokenData.access_token,
          token_expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .eq("provider", provider);

      logStep("Token refreshed successfully");

      return new Response(JSON.stringify({ 
        success: true,
        access_token: tokenData.access_token,
        expires_at: expiresAt.toISOString()
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "disconnect") {
      // Disconnect account
      const { error: deleteError } = await supabase
        .from("connected_accounts")
        .delete()
        .eq("user_id", user.id)
        .eq("provider", provider);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      logStep("Account disconnected", { provider });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list") {
      // List connected accounts
      const { data: accounts, error: listError } = await supabase
        .from("connected_accounts")
        .select("provider, account_email, account_name, is_active, created_at, updated_at")
        .eq("user_id", user.id);

      if (listError) {
        throw new Error(listError.message);
      }

      logStep("Listed accounts", { count: accounts?.length || 0 });

      return new Response(JSON.stringify({ accounts: accounts || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid action");

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
