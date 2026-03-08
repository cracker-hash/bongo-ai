import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Credit costs per endpoint
const ENDPOINT_CREDITS: Record<string, number> = {
  "chat/completions": 1,
  "images/generate": 50,
  "audio/tts": 5,
  "podcast/generate": 20,
  "documents/analyze": 10,
  "automation/execute": 10,
};

// In-memory rate limit tracking (per-instance, resets on cold start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(keyId: string, limit: number): boolean {
  const now = Date.now();
  const windowMs = 60_000; // 1 minute window
  const entry = rateLimitMap.get(keyId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(keyId, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count++;
  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonError(405, "Method not allowed");
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // 1. Extract API key
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonError(401, "Missing or invalid Authorization header. Use: Bearer wsr_your_key");
    }

    const apiKey = authHeader.replace("Bearer ", "").trim();
    if (!apiKey.startsWith("wsr_") && !apiKey.startsWith("wsk_")) {
      return jsonError(401, "Invalid API key format. Keys start with wsr_ or wsk_");
    }

    // 2. Validate API key against DB
    const { data: keyData, error: keyError } = await supabase
      .from("api_keys")
      .select("id, user_id, is_active, rate_limit, permissions, requests_count")
      .eq("api_key", apiKey)
      .single();

    if (keyError || !keyData) {
      return jsonError(401, "Invalid API key");
    }

    if (!keyData.is_active) {
      return jsonError(403, "API key is inactive");
    }

    // 3. Parse request body
    const body = await req.json();
    const endpoint = body.endpoint as string;

    if (!endpoint || !ENDPOINT_CREDITS[endpoint]) {
      return jsonError(400, `Invalid endpoint. Valid endpoints: ${Object.keys(ENDPOINT_CREDITS).join(", ")}`);
    }

    // 4. Check permissions
    const permissions = keyData.permissions || ["chat"];
    const endpointCategory = endpoint.split("/")[0]; // "chat", "images", "audio", etc.
    if (!permissions.includes(endpointCategory) && !permissions.includes("all")) {
      return jsonError(403, `API key does not have permission for '${endpointCategory}'. Allowed: ${permissions.join(", ")}`);
    }

    // 5. Rate limiting
    const rateLimit = keyData.rate_limit || 100;
    if (!checkRateLimit(keyData.id, rateLimit)) {
      return jsonError(429, `Rate limit exceeded. Limit: ${rateLimit} requests/minute`);
    }

    // 6. Check credits
    const creditCost = ENDPOINT_CREDITS[endpoint];
    const { data: credits, error: creditsError } = await supabase
      .from("user_credits")
      .select("balance")
      .eq("user_id", keyData.user_id)
      .single();

    if (creditsError || !credits) {
      return jsonError(403, "No credit balance found. Please set up your account.");
    }

    if (credits.balance < creditCost) {
      return jsonError(403, `Insufficient credits. Required: ${creditCost}, Available: ${credits.balance}`);
    }

    // 7. Deduct credits
    const newBalance = credits.balance - creditCost;
    await supabase
      .from("user_credits")
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq("user_id", keyData.user_id);

    // 8. Log usage
    await supabase.from("usage_logs").insert({
      user_id: keyData.user_id,
      api_key_id: keyData.id,
      action_type: endpoint,
      tokens_used: creditCost,
    });

    // 9. Update API key stats
    await supabase
      .from("api_keys")
      .update({
        last_used_at: new Date().toISOString(),
        requests_count: (keyData.requests_count || 0) + 1,
      })
      .eq("id", keyData.id);

    // 10. Log credit transaction
    await supabase.from("credit_transactions").insert({
      user_id: keyData.user_id,
      amount: -creditCost,
      balance_after: newBalance,
      transaction_type: "debit",
      operation: endpoint,
      description: `API call: ${endpoint}`,
    });

    // 11. Route to internal function
    const result = await routeToFunction(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, endpoint, body, keyData.user_id);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("API Gateway error:", error);
    return jsonError(500, error instanceof Error ? error.message : "Internal server error");
  }
});

async function routeToFunction(
  supabaseUrl: string,
  serviceKey: string,
  endpoint: string,
  body: Record<string, unknown>,
  userId: string
): Promise<Record<string, unknown>> {
  const functionsUrl = `${supabaseUrl}/functions/v1`;

  const routeMap: Record<string, { url: string; transformBody: (b: Record<string, unknown>) => Record<string, unknown> }> = {
    "chat/completions": {
      url: `${functionsUrl}/chat`,
      transformBody: (b) => ({
        messages: b.messages || [],
        model: b.model || "wiser-pro",
        temperature: b.temperature ?? 0.7,
        max_tokens: b.max_tokens ?? 2048,
        stream: b.stream ?? false,
      }),
    },
    "images/generate": {
      url: `${functionsUrl}/freepik-ai`,
      transformBody: (b) => ({
        action: "generate",
        prompt: b.prompt,
        size: b.size || "1024x1024",
        quality: b.quality || "hd",
      }),
    },
    "audio/tts": {
      url: `${functionsUrl}/elevenlabs-tts`,
      transformBody: (b) => ({
        text: b.text || b.input,
        voice: b.voice || "default",
      }),
    },
    "podcast/generate": {
      url: `${functionsUrl}/generate-podcast`,
      transformBody: (b) => ({
        topic: b.topic,
        style: b.style || "conversational",
        duration: b.duration || "short",
      }),
    },
    "documents/analyze": {
      url: `${functionsUrl}/process-document`,
      transformBody: (b) => ({
        url: b.url || b.document_url,
        action: b.action || "analyze",
      }),
    },
    "automation/execute": {
      url: `${functionsUrl}/manus-automation`,
      transformBody: (b) => ({
        action: "run",
        input: b.input || b.task,
      }),
    },
  };

  const route = routeMap[endpoint];
  if (!route) {
    throw new Error(`No route configured for endpoint: ${endpoint}`);
  }

  const response = await fetch(route.url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(route.transformBody(body)),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Upstream error (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  // Wrap chat responses in OpenAI-compatible format
  if (endpoint === "chat/completions" && !data.choices) {
    return {
      id: `chatcmpl-${crypto.randomUUID().slice(0, 12)}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: (body.model as string) || "wiser-pro",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: data.content || data.message || JSON.stringify(data),
          },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      },
    };
  }

  return data;
}

function jsonError(status: number, message: string) {
  return new Response(
    JSON.stringify({
      error: { message, type: "api_error", code: status },
    }),
    {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}
