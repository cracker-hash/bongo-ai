import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Wiser AI API configuration
const WISER_API_KEY = Deno.env.get("MANUS_API_KEY"); // Using existing secret
const WISER_API_URL = "https://api.manus.ai/v1"; // Backend endpoint unchanged

interface ManusTask {
  id: string;
  type: string;
  action: string;
  params: Record<string, any>;
  status: string;
  result?: any;
  error?: string;
}

interface AgentState {
  phase: "analyze" | "think" | "select" | "execute" | "observe" | "complete";
  goal: string;
  context: Record<string, any>;
  tasks: ManusTask[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, input, agentId } = await req.json();

    switch (action) {
      case "analyze": {
        // Analyze the input and break down into subtasks
        const analysis = await analyzeInput(input);
        return new Response(JSON.stringify(analysis), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "execute": {
        // Execute a specific task
        const result = await executeTask(input);
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "run": {
        // Run full agent loop
        const result = await runAgentLoop(input);
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error("Wiser automation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function analyzeInput(input: string): Promise<{
  goal: string;
  subTasks: string[];
  selectedTools: string[];
}> {
  // Use AI to analyze the input and determine tasks
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
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
          content: `You are a task analyzer. Given a user request, break it down into:
1. A clear goal statement
2. A list of subtasks needed to accomplish the goal
3. Tools needed (from: web_search, browse_url, generate_code, create_file, execute_command, send_email, social_post)

Respond in JSON format:
{
  "goal": "string",
  "subTasks": ["task1", "task2"],
  "selectedTools": ["tool1", "tool2"]
}`
        },
        { role: "user", content: input }
      ],
      max_tokens: 1000
    }),
  });

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";
  
  try {
    // Extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error("Failed to parse analysis:", e);
  }

  // Fallback response
  return {
    goal: input,
    subTasks: ["Analyze request", "Execute task", "Verify results"],
    selectedTools: ["web_search", "generate_code"]
  };
}

async function executeTask(task: ManusTask): Promise<ManusTask> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  task.status = "running";

  try {
    switch (task.action) {
      case "web_search": {
        // Simulate web search
        task.result = { 
          results: [`Search results for: ${task.params.query}`],
          sources: ["source1.com", "source2.com"]
        };
        break;
      }

      case "generate_code": {
        // Use AI to generate code
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
                content: `You are a code generator. Generate ${task.params.language || "TypeScript"} code for the following request. Return only the code.`
              },
              { role: "user", content: task.params.description }
            ],
            max_tokens: 2000
          }),
        });

        const data = await response.json();
        task.result = { 
          code: data.choices?.[0]?.message?.content || "",
          language: task.params.language || "typescript"
        };
        break;
      }

      case "create_file": {
        // Simulate file creation
        task.result = {
          success: true,
          path: task.params.path,
          size: task.params.content?.length || 0
        };
        break;
      }

      case "browse_url": {
        // Simulate browsing
        task.result = {
          url: task.params.url,
          content: `Content extracted from ${task.params.url}`,
          title: "Page Title"
        };
        break;
      }

      default:
        task.result = { message: `Executed: ${task.action}` };
    }

    task.status = "completed";
  } catch (error) {
    task.status = "failed";
    task.error = error instanceof Error ? error.message : "Unknown error";
  }

  return task;
}

async function runAgentLoop(input: string): Promise<{
  success: boolean;
  summary: string;
  tasks: ManusTask[];
  phases: string[];
}> {
  const phases: string[] = [];
  
  // Phase 1: Analyze
  phases.push("analyze");
  const analysis = await analyzeInput(input);

  // Phase 2: Think - Create task plan
  phases.push("think");
  const tasks: ManusTask[] = analysis.selectedTools.map((tool, i) => ({
    id: crypto.randomUUID(),
    type: "automation",
    action: tool,
    params: { 
      query: analysis.subTasks[i] || input,
      description: analysis.subTasks[i] || input
    },
    status: "pending"
  }));

  // Phase 3: Select - Prioritize tasks
  phases.push("select");

  // Phase 4: Execute - Run each task
  phases.push("execute");
  for (let i = 0; i < tasks.length; i++) {
    tasks[i] = await executeTask(tasks[i]);
  }

  // Phase 5: Observe - Check results
  phases.push("observe");
  const completedTasks = tasks.filter(t => t.status === "completed");
  const failedTasks = tasks.filter(t => t.status === "failed");

  const success = failedTasks.length === 0;
  const summary = success
    ? `Successfully completed all ${completedTasks.length} tasks for: ${analysis.goal}`
    : `Completed ${completedTasks.length}/${tasks.length} tasks. ${failedTasks.length} failed.`;

  phases.push("complete");

  return { success, summary, tasks, phases };
}
