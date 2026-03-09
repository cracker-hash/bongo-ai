import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

interface AgentPhase {
  index: number;
  name: string;
  capability: string;
  description: string;
  tools: string[];
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  result?: any;
  error?: string;
}

// ─── Real Tool Implementations ───

async function toolWebSearch(query: string): Promise<{ results: { title: string; url: string; snippet: string }[] }> {
  // Use AI to synthesize search results since we don't have a direct search API
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: "You are a web research assistant. Given a search query, provide factual, up-to-date information with real sources. Return a JSON object: { \"results\": [{ \"title\": \"...\", \"url\": \"...\", \"snippet\": \"...\" }], \"summary\": \"...\" }. Include 3-5 results." },
        { role: "user", content: `Search for: ${query}` }
      ],
      tools: [{
        type: "function",
        function: {
          name: "return_search_results",
          description: "Return search results",
          parameters: {
            type: "object",
            properties: {
              results: { type: "array", items: { type: "object", properties: { title: { type: "string" }, url: { type: "string" }, snippet: { type: "string" } }, required: ["title", "url", "snippet"] } },
              summary: { type: "string" }
            },
            required: ["results", "summary"]
          }
        }
      }],
      tool_choice: { type: "function", function: { name: "return_search_results" } }
    }),
  });
  if (!response.ok) throw new Error(`Search failed: ${response.status}`);
  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) return JSON.parse(toolCall.function.arguments);
  return { results: [] };
}

async function toolHttpRequest(url: string, method = "GET"): Promise<{ status: number; body: string; extracted_text?: string }> {
  try {
    const resp = await fetch(url, { method, headers: { "User-Agent": "WiserAI-Agent/1.0" } });
    const body = await resp.text();
    // Strip HTML tags to extract readable text
    const extractedText = body.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 8000);
    return { status: resp.status, body: body.slice(0, 3000), extracted_text: extractedText };
  } catch (e) {
    return { status: 0, body: e instanceof Error ? e.message : "Request failed" };
  }
}

async function toolScrapeAndSummarize(url: string): Promise<{ url: string; summary: string; keyPoints: string[] }> {
  const pageData = await toolHttpRequest(url);
  if (!pageData.extracted_text || pageData.status === 0) {
    return { url, summary: "Failed to fetch page content", keyPoints: [] };
  }
  const summaryResult = await toolSummarize(pageData.extracted_text);
  return { url, summary: summaryResult.summary, keyPoints: summaryResult.keyPoints };
}

async function toolGenerateCode(prompt: string, language: string): Promise<{ code: string; explanation: string }> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: `You are an expert ${language} developer. Generate production-ready code. Return via the tool call.` },
        { role: "user", content: prompt }
      ],
      tools: [{
        type: "function",
        function: {
          name: "return_code",
          description: "Return generated code",
          parameters: {
            type: "object",
            properties: {
              code: { type: "string", description: "The generated code" },
              explanation: { type: "string", description: "Brief explanation of the code" },
              language: { type: "string" }
            },
            required: ["code", "explanation"]
          }
        }
      }],
      tool_choice: { type: "function", function: { name: "return_code" } }
    }),
  });
  if (!response.ok) throw new Error(`Code generation failed: ${response.status}`);
  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) return JSON.parse(toolCall.function.arguments);
  return { code: "", explanation: "Generation failed" };
}

async function toolTextGeneration(prompt: string, context: string): Promise<{ text: string }> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: "You are a helpful AI assistant. Provide thorough, well-structured responses." },
        { role: "user", content: `Context: ${context}\n\nTask: ${prompt}` }
      ],
      max_tokens: 3000
    }),
  });
  if (!response.ok) throw new Error(`Text generation failed: ${response.status}`);
  const data = await response.json();
  return { text: data.choices?.[0]?.message?.content || "" };
}

async function toolSummarize(text: string): Promise<{ summary: string; keyPoints: string[] }> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-lite",
      messages: [
        { role: "system", content: "Summarize the given text. Return via tool call." },
        { role: "user", content: text }
      ],
      tools: [{
        type: "function",
        function: {
          name: "return_summary",
          description: "Return summary",
          parameters: {
            type: "object",
            properties: {
              summary: { type: "string" },
              keyPoints: { type: "array", items: { type: "string" } }
            },
            required: ["summary", "keyPoints"]
          }
        }
      }],
      tool_choice: { type: "function", function: { name: "return_summary" } }
    }),
  });
  if (!response.ok) throw new Error(`Summarization failed: ${response.status}`);
  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) return JSON.parse(toolCall.function.arguments);
  return { summary: "", keyPoints: [] };
}

async function toolDataAnalysis(data: string, question: string): Promise<{ analysis: string; insights: string[] }> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: "You are a data analyst. Analyze the provided data and answer the question. Return via tool call." },
        { role: "user", content: `Data: ${data}\n\nQuestion: ${question}` }
      ],
      tools: [{
        type: "function",
        function: {
          name: "return_analysis",
          description: "Return analysis",
          parameters: {
            type: "object",
            properties: {
              analysis: { type: "string" },
              insights: { type: "array", items: { type: "string" } }
            },
            required: ["analysis", "insights"]
          }
        }
      }],
      tool_choice: { type: "function", function: { name: "return_analysis" } }
    }),
  });
  if (!response.ok) throw new Error(`Analysis failed: ${response.status}`);
  const d = await response.json();
  const toolCall = d.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) return JSON.parse(toolCall.function.arguments);
  return { analysis: "", insights: [] };
}

// ─── Tool Router ───

async function executeTool(toolName: string, phase: AgentPhase, context: any, previousResults: any[]): Promise<any> {
  const prevSummary = previousResults.map(r => r.phase + ": " + JSON.stringify(r.result).slice(0, 500)).join("\n");

  switch (toolName) {
    case "web_search":
      return await toolWebSearch(phase.description + " " + context.original_input);
    case "browse_url":
    case "http_request": {
      const urlMatch = phase.description.match(/https?:\/\/[^\s]+/);
      const url = urlMatch ? urlMatch[0] : `https://www.google.com/search?q=${encodeURIComponent(context.original_input)}`;
      return await toolHttpRequest(url);
    }
    case "generate_code":
    case "create_file":
      return await toolGenerateCode(phase.description + "\nContext: " + context.original_input + "\nPrevious: " + prevSummary, "typescript");
    case "data_analysis":
      return await toolDataAnalysis(prevSummary, phase.description);
    case "summarize":
      return await toolSummarize(prevSummary || context.original_input);
    case "text_generation":
    case "translate":
    default:
      return await toolTextGeneration(phase.description, context.original_input + "\nPrevious: " + prevSummary);
  }
}

// ─── Main Handler ───

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Service role client for DB operations
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    
    // Use anon-key client with getClaims for proper signing-keys JWT validation
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    if (userError || !userData?.user) throw new Error("Authentication failed");
    const userId = userData.user.id;

    const { action, taskId, input, capability } = await req.json();

    switch (action) {
      case "create_task": return await handleCreateTask(supabase, userId, input, capability);
      case "run_task": return await handleRunTask(supabase, userId, taskId);
      case "pause_task": return await handlePauseTask(supabase, userId, taskId);
      case "resume_task": return await handleRunTask(supabase, userId, taskId);
      case "cancel_task": return await handleCancelTask(supabase, userId, taskId);
      case "get_tasks": return await handleGetTasks(supabase, userId);
      case "get_task_detail": return await handleGetTaskDetail(supabase, userId, taskId);
      default: throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error("Agent orchestrator error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ─── Agent Memory ───

async function loadAgentMemory(supabase: any, userId: string): Promise<Record<string, any>> {
  const { data } = await supabase.from("agent_memory").select("key, value, category").eq("user_id", userId).order("updated_at", { ascending: false }).limit(20);
  const memory: Record<string, any> = {};
  (data || []).forEach((m: any) => { memory[m.key] = m.value; });
  return memory;
}

async function saveAgentMemory(supabase: any, userId: string, key: string, value: any, category = "general") {
  const { data: existing } = await supabase.from("agent_memory").select("id").eq("user_id", userId).eq("key", key).single();
  if (existing) {
    await supabase.from("agent_memory").update({ value, category, updated_at: new Date().toISOString() }).eq("id", existing.id);
  } else {
    await supabase.from("agent_memory").insert({ user_id: userId, key, value, category });
  }
}

// ─── Task Handlers ───

async function handleCreateTask(supabase: any, userId: string, input: string, capability?: string) {
  const memory = await loadAgentMemory(supabase, userId);
  const analysis = await analyzeAndPlan(input);

  const { data: task, error: taskError } = await supabase
    .from("agent_tasks")
    .insert({ user_id: userId, title: analysis.title, description: input, capability: capability || analysis.capability, context: { original_input: input, analysis, memory }, status: "pending" })
    .select().single();
  if (taskError) throw new Error(`Failed to create task: ${taskError.message}`);

  const phases: AgentPhase[] = analysis.phases.map((p: any, i: number) => ({
    index: i, name: p.name, capability: p.capability, description: p.description, tools: p.tools, status: "pending",
  }));

  const { data: plan, error: planError } = await supabase
    .from("agent_plans")
    .insert({ task_id: task.id, user_id: userId, phases, total_phases: phases.length, status: "draft" })
    .select().single();
  if (planError) throw new Error(`Failed to create plan: ${planError.message}`);

  await logExecution(supabase, task.id, plan.id, userId, 0, "task_created", "system", { input }, { task_id: task.id }, "success");

  return new Response(JSON.stringify({ task, plan }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function handleRunTask(supabase: any, userId: string, taskId: string) {
  const { data: task } = await supabase.from("agent_tasks").select("*").eq("id", taskId).eq("user_id", userId).single();
  if (!task) throw new Error("Task not found");

  const { data: plan } = await supabase.from("agent_plans").select("*").eq("task_id", taskId).eq("user_id", userId).single();
  if (!plan) throw new Error("Plan not found");

  await supabase.from("agent_tasks").update({ status: "executing", started_at: task.started_at || new Date().toISOString() }).eq("id", taskId);
  await supabase.from("agent_plans").update({ status: "active" }).eq("id", plan.id);

  const phases: AgentPhase[] = plan.phases;
  let currentPhase = plan.current_phase;
  const results: any[] = [];

  for (let i = currentPhase; i < phases.length; i++) {
    const phase = phases[i];

    const { data: freshTask } = await supabase.from("agent_tasks").select("status").eq("id", taskId).single();
    if (freshTask?.status === "paused" || freshTask?.status === "cancelled") break;

    phases[i].status = "running";
    await supabase.from("agent_plans").update({ phases, current_phase: i }).eq("id", plan.id);

    const startTime = Date.now();

    try {
      // Execute real tools for the phase
      let phaseResult: any;
      if (phase.tools.length > 0) {
        const toolResults: Record<string, any> = {};
        for (const tool of phase.tools) {
          toolResults[tool] = await executeTool(tool, phase, task.context, results);
        }
        phaseResult = { toolResults, tools_used: phase.tools };
      } else {
        phaseResult = await toolTextGeneration(phase.description, task.context.original_input);
      }

      phases[i].status = "completed";
      phases[i].result = phaseResult;
      results.push({ phase: phase.name, result: phaseResult });

      await logExecution(supabase, taskId, plan.id, userId, i, "phase_execution", phase.tools[0] || "ai", { phase_name: phase.name }, phaseResult, "success", Date.now() - startTime);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "Unknown error";
      phases[i].status = "failed";
      phases[i].error = errMsg;

      await logExecution(supabase, taskId, plan.id, userId, i, "phase_execution", phase.tools[0] || "ai", { phase_name: phase.name }, null, "error", Date.now() - startTime, errMsg);

      if (task.retry_count < task.max_retries) {
        await supabase.from("agent_tasks").update({ retry_count: task.retry_count + 1 }).eq("id", taskId);
        const revisedPhases = await revisePlan(phases, i, errMsg, task.context);
        if (revisedPhases) {
          phases.splice(i, phases.length - i, ...revisedPhases);
          await supabase.from("agent_plans").update({ phases, total_phases: phases.length, revision_count: plan.revision_count + 1, status: "revising" }).eq("id", plan.id);
          i--;
          continue;
        }
      }

      await supabase.from("agent_tasks").update({ status: "failed", error_message: errMsg }).eq("id", taskId);
      await supabase.from("agent_plans").update({ phases, status: "failed" }).eq("id", plan.id);

      return new Response(JSON.stringify({ success: false, error: errMsg, phases, results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  }

  // Save key insights to agent memory
  const lastResult = results[results.length - 1];
  if (lastResult) {
    const memoryKey = `task_${taskId}_result`;
    await saveAgentMemory(supabase, userId, memoryKey, { summary: JSON.stringify(lastResult.result).slice(0, 1000), task_title: task.title }, "task_results");
  }

  await supabase.from("agent_tasks").update({ status: "completed", completed_at: new Date().toISOString(), result: { phases: results } }).eq("id", taskId);
  await supabase.from("agent_plans").update({ phases, current_phase: phases.length, status: "completed" }).eq("id", plan.id);

  return new Response(JSON.stringify({ success: true, phases, results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function handlePauseTask(supabase: any, userId: string, taskId: string) {
  await supabase.from("agent_tasks").update({ status: "paused" }).eq("id", taskId).eq("user_id", userId);
  return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function handleCancelTask(supabase: any, userId: string, taskId: string) {
  await supabase.from("agent_tasks").update({ status: "cancelled" }).eq("id", taskId).eq("user_id", userId);
  return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function handleGetTasks(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("agent_tasks")
    .select(`*, agent_plans(id, phases, current_phase, total_phases, status, revision_count)`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return new Response(JSON.stringify({ tasks: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function handleGetTaskDetail(supabase: any, userId: string, taskId: string) {
  const { data: task } = await supabase
    .from("agent_tasks")
    .select(`*, agent_plans(*), agent_execution_logs(*)`)
    .eq("id", taskId)
    .eq("user_id", userId)
    .single();
  if (!task) throw new Error("Task not found");
  return new Response(JSON.stringify({ task }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

// ─── AI Planning ───

async function analyzeAndPlan(input: string) {
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content: `You are a task planning AI. Given a user request, create a structured execution plan.
Available tools: web_search, generate_code, create_file, browse_url, http_request, data_analysis, text_generation, summarize, translate.
Create 2-8 phases. Be specific and actionable. Each phase should use 1-2 tools max.`
        },
        { role: "user", content: input }
      ],
      tools: [{
        type: "function",
        function: {
          name: "create_plan",
          description: "Create a structured task plan",
          parameters: {
            type: "object",
            properties: {
              title: { type: "string" },
              capability: { type: "string", enum: ["general", "data_analysis", "web_development", "tutoring", "accessibility", "automation", "presentation", "integration", "research", "coding"] },
              phases: { type: "array", items: { type: "object", properties: { name: { type: "string" }, capability: { type: "string" }, description: { type: "string" }, tools: { type: "array", items: { type: "string" } } }, required: ["name", "capability", "description", "tools"] } }
            },
            required: ["title", "capability", "phases"]
          }
        }
      }],
      tool_choice: { type: "function", function: { name: "create_plan" } }
    }),
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error("Rate limited. Please try again later.");
    if (response.status === 402) throw new Error("AI credits exhausted. Please add funds.");
    throw new Error("AI planning failed");
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) return JSON.parse(toolCall.function.arguments);

  return {
    title: input.slice(0, 60),
    capability: "general",
    phases: [
      { name: "Research", capability: "general", description: "Research the topic", tools: ["web_search"] },
      { name: "Analyze", capability: "general", description: "Analyze findings", tools: ["text_generation"] },
      { name: "Summarize", capability: "general", description: "Create final summary", tools: ["summarize"] }
    ]
  };
}

async function revisePlan(phases: AgentPhase[], failedIndex: number, error: string, context: any): Promise<AgentPhase[] | null> {
  if (!LOVABLE_API_KEY) return null;
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: `A task phase failed. Revise the remaining plan.\nFailed phase: ${phases[failedIndex].name}\nError: ${error}\nGoal: ${context.original_input}\n\nReturn a JSON array of revised phases.` },
          { role: "user", content: "Revise the plan" }
        ],
        max_tokens: 1000
      }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    const match = content.match(/\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]);
  } catch { /* ignore */ }
  return null;
}

// ─── Logging ───

async function logExecution(supabase: any, taskId: string, planId: string | null, userId: string, phaseIndex: number, actionType: string, toolName: string, inputData: any, outputData: any, status: string, durationMs?: number, errorMessage?: string) {
  await supabase.from("agent_execution_logs").insert({
    task_id: taskId, plan_id: planId, user_id: userId, phase_index: phaseIndex, action_type: actionType, tool_name: toolName, input_data: inputData, output_data: outputData, status, duration_ms: durationMs, error_message: errorMessage,
  });
}
