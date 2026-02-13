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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Authentication failed");
    const userId = userData.user.id;

    const { action, taskId, input, capability } = await req.json();

    switch (action) {
      case "create_task": {
        return await handleCreateTask(supabase, userId, input, capability);
      }
      case "run_task": {
        return await handleRunTask(supabase, userId, taskId);
      }
      case "pause_task": {
        return await handlePauseTask(supabase, userId, taskId);
      }
      case "resume_task": {
        return await handleRunTask(supabase, userId, taskId);
      }
      case "cancel_task": {
        return await handleCancelTask(supabase, userId, taskId);
      }
      case "get_tasks": {
        return await handleGetTasks(supabase, userId);
      }
      case "get_task_detail": {
        return await handleGetTaskDetail(supabase, userId, taskId);
      }
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error("Agent orchestrator error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function handleCreateTask(supabase: any, userId: string, input: string, capability?: string) {
  // Step 1: Use AI to analyze and create a plan
  const analysis = await analyzeAndPlan(input);

  // Step 2: Create the task
  const { data: task, error: taskError } = await supabase
    .from("agent_tasks")
    .insert({
      user_id: userId,
      title: analysis.title,
      description: input,
      capability: capability || analysis.capability,
      context: { original_input: input, analysis: analysis },
      status: "pending",
    })
    .select()
    .single();

  if (taskError) throw new Error(`Failed to create task: ${taskError.message}`);

  // Step 3: Create the plan
  const phases: AgentPhase[] = analysis.phases.map((p: any, i: number) => ({
    index: i,
    name: p.name,
    capability: p.capability,
    description: p.description,
    tools: p.tools,
    status: "pending",
  }));

  const { data: plan, error: planError } = await supabase
    .from("agent_plans")
    .insert({
      task_id: task.id,
      user_id: userId,
      phases: phases,
      total_phases: phases.length,
      status: "draft",
    })
    .select()
    .single();

  if (planError) throw new Error(`Failed to create plan: ${planError.message}`);

  // Log creation
  await logExecution(supabase, task.id, plan.id, userId, 0, "task_created", "system", { input }, { task_id: task.id, plan_id: plan.id }, "success");

  return new Response(
    JSON.stringify({ task, plan }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleRunTask(supabase: any, userId: string, taskId: string) {
  // Get task and plan
  const { data: task } = await supabase
    .from("agent_tasks")
    .select("*")
    .eq("id", taskId)
    .eq("user_id", userId)
    .single();

  if (!task) throw new Error("Task not found");

  const { data: plan } = await supabase
    .from("agent_plans")
    .select("*")
    .eq("task_id", taskId)
    .eq("user_id", userId)
    .single();

  if (!plan) throw new Error("Plan not found");

  // Update task status
  await supabase
    .from("agent_tasks")
    .update({ status: "executing", started_at: task.started_at || new Date().toISOString() })
    .eq("id", taskId);

  await supabase
    .from("agent_plans")
    .update({ status: "active" })
    .eq("id", plan.id);

  // Execute phases sequentially from current_phase
  const phases: AgentPhase[] = plan.phases;
  let currentPhase = plan.current_phase;
  const results: any[] = [];

  for (let i = currentPhase; i < phases.length; i++) {
    const phase = phases[i];
    
    // Check if task was paused/cancelled
    const { data: freshTask } = await supabase
      .from("agent_tasks")
      .select("status")
      .eq("id", taskId)
      .single();
    
    if (freshTask?.status === "paused" || freshTask?.status === "cancelled") {
      break;
    }

    // Update phase status
    phases[i].status = "running";
    await supabase
      .from("agent_plans")
      .update({ phases, current_phase: i })
      .eq("id", plan.id);

    const startTime = Date.now();
    
    try {
      // Execute the phase using AI
      const phaseResult = await executePhase(phase, task.context, results);
      
      phases[i].status = "completed";
      phases[i].result = phaseResult;
      results.push({ phase: phase.name, result: phaseResult });

      await logExecution(supabase, taskId, plan.id, userId, i, "phase_execution", phase.tools[0] || "ai", { phase_name: phase.name }, phaseResult, "success", Date.now() - startTime);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "Unknown error";
      phases[i].status = "failed";
      phases[i].error = errMsg;

      await logExecution(supabase, taskId, plan.id, userId, i, "phase_execution", phase.tools[0] || "ai", { phase_name: phase.name }, null, "error", Date.now() - startTime, errMsg);

      // Check if we should retry
      if (task.retry_count < task.max_retries) {
        await supabase
          .from("agent_tasks")
          .update({ retry_count: task.retry_count + 1 });
        
        // Try to revise the plan
        const revisedPhases = await revisePlan(phases, i, errMsg, task.context);
        if (revisedPhases) {
          phases.splice(i, phases.length - i, ...revisedPhases);
          await supabase
            .from("agent_plans")
            .update({ phases, total_phases: phases.length, revision_count: plan.revision_count + 1, status: "revising" })
            .eq("id", plan.id);
          i--; // Retry this phase
          continue;
        }
      }

      // Mark task as failed
      await supabase
        .from("agent_tasks")
        .update({ status: "failed", error_message: errMsg })
        .eq("id", taskId);

      await supabase
        .from("agent_plans")
        .update({ phases, status: "failed" })
        .eq("id", plan.id);

      return new Response(
        JSON.stringify({ success: false, error: errMsg, phases, results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  // Mark task as completed
  await supabase
    .from("agent_tasks")
    .update({ 
      status: "completed", 
      completed_at: new Date().toISOString(),
      result: { phases: results }
    })
    .eq("id", taskId);

  await supabase
    .from("agent_plans")
    .update({ phases, current_phase: phases.length, status: "completed" })
    .eq("id", plan.id);

  return new Response(
    JSON.stringify({ success: true, phases, results }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handlePauseTask(supabase: any, userId: string, taskId: string) {
  await supabase
    .from("agent_tasks")
    .update({ status: "paused" })
    .eq("id", taskId)
    .eq("user_id", userId);

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleCancelTask(supabase: any, userId: string, taskId: string) {
  await supabase
    .from("agent_tasks")
    .update({ status: "cancelled" })
    .eq("id", taskId)
    .eq("user_id", userId);

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleGetTasks(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("agent_tasks")
    .select(`
      *,
      agent_plans(id, phases, current_phase, total_phases, status, revision_count)
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;

  return new Response(
    JSON.stringify({ tasks: data }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleGetTaskDetail(supabase: any, userId: string, taskId: string) {
  const { data: task } = await supabase
    .from("agent_tasks")
    .select(`
      *,
      agent_plans(*),
      agent_execution_logs(*)
    `)
    .eq("id", taskId)
    .eq("user_id", userId)
    .single();

  if (!task) throw new Error("Task not found");

  return new Response(
    JSON.stringify({ task }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// AI-powered analysis and planning
async function analyzeAndPlan(input: string) {
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: `You are a task planning AI. Given a user request, create a structured execution plan.
Return a JSON object with:
{
  "title": "short task title",
  "capability": one of "general"|"data_analysis"|"web_development"|"tutoring"|"accessibility"|"automation"|"presentation"|"integration"|"research"|"coding",
  "phases": [
    {
      "name": "phase name",
      "capability": "category",
      "description": "what this phase does",
      "tools": ["tool names needed"]
    }
  ]
}
Available tools: web_search, generate_code, create_file, browse_url, http_request, data_analysis, text_generation, summarize, translate.
Create 2-8 phases. Be specific and actionable.`
        },
        { role: "user", content: input }
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "create_plan",
            description: "Create a structured task plan",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string" },
                capability: { type: "string", enum: ["general", "data_analysis", "web_development", "tutoring", "accessibility", "automation", "presentation", "integration", "research", "coding"] },
                phases: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      capability: { type: "string" },
                      description: { type: "string" },
                      tools: { type: "array", items: { type: "string" } }
                    },
                    required: ["name", "capability", "description", "tools"]
                  }
                }
              },
              required: ["title", "capability", "phases"]
            }
          }
        }
      ],
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
  
  if (toolCall?.function?.arguments) {
    return JSON.parse(toolCall.function.arguments);
  }

  // Fallback
  return {
    title: input.slice(0, 60),
    capability: "general",
    phases: [
      { name: "Analyze", capability: "general", description: "Analyze the request", tools: ["text_generation"] },
      { name: "Execute", capability: "general", description: "Execute the main task", tools: ["text_generation"] },
      { name: "Review", capability: "general", description: "Review and finalize", tools: ["summarize"] }
    ]
  };
}

// Execute a single phase using AI
async function executePhase(phase: AgentPhase, context: any, previousResults: any[]) {
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: `You are an autonomous AI agent executing a specific phase of a task plan.

Phase: ${phase.name}
Description: ${phase.description}
Tools available: ${phase.tools.join(", ")}

Original goal: ${context.original_input}
Previous results: ${JSON.stringify(previousResults.slice(-3))}

Execute this phase thoroughly. Return a detailed result of what was accomplished.
Be specific and actionable. Include any outputs, findings, or artifacts.`
        },
        { role: "user", content: `Execute phase: ${phase.name} - ${phase.description}` }
      ],
      max_tokens: 2000
    }),
  });

  if (!response.ok) throw new Error(`Phase execution failed: ${response.status}`);

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";
  
  return { output: content, tools_used: phase.tools };
}

// Revise plan when a phase fails
async function revisePlan(phases: AgentPhase[], failedIndex: number, error: string, context: any): Promise<AgentPhase[] | null> {
  if (!LOVABLE_API_KEY) return null;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `A task phase failed. Revise the remaining plan to work around the error.
Failed phase: ${phases[failedIndex].name}
Error: ${error}
Original goal: ${context.original_input}

Return a JSON array of revised phases to replace the failed and remaining phases.
Each phase: { "name": "...", "capability": "...", "description": "...", "tools": [...], "status": "pending" }`
          },
          { role: "user", content: "Revise the plan" }
        ],
        max_tokens: 1000
      }),
    });

    if (!response.ok) return null;
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    const match = content.match(/\[[\s\S]*\]/);
    if (match) {
      return JSON.parse(match[0]);
    }
  } catch {
    // Revision failed, continue with original plan
  }
  return null;
}

// Log execution to database
async function logExecution(
  supabase: any,
  taskId: string,
  planId: string | null,
  userId: string,
  phaseIndex: number,
  actionType: string,
  toolName: string,
  inputData: any,
  outputData: any,
  status: string,
  durationMs?: number,
  errorMessage?: string
) {
  await supabase.from("agent_execution_logs").insert({
    task_id: taskId,
    plan_id: planId,
    user_id: userId,
    phase_index: phaseIndex,
    action_type: actionType,
    tool_name: toolName,
    input_data: inputData,
    output_data: outputData,
    status,
    duration_ms: durationMs,
    error_message: errorMessage,
  });
}
