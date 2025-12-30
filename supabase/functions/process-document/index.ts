import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { document, filename, mode } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!document) {
      throw new Error("No document provided");
    }

    console.log(`Processing document: ${filename}, mode: ${mode}`);

    // Build prompt based on mode
    let systemPrompt = "";
    let userPrompt = "";

    if (mode === "study") {
      systemPrompt = `You are WISER AI, an expert educational content analyzer. Your task is to analyze uploaded documents and extract key learning content.`;
      userPrompt = `Analyze this document and provide:

1. **Document Summary** (2-3 sentences overview)
2. **Key Topics** (list main topics covered)
3. **Key Concepts** (important terms and definitions)
4. **Study Outline** (structured breakdown by sections/chapters)
5. **Difficulty Level** (Beginner/Intermediate/Advanced)
6. **Recommended Study Approach** (how to best study this material)

Be thorough but concise. Extract the most important information for learning.

Document content:
${document}`;
    } else if (mode === "quiz") {
      systemPrompt = `You are WISER AI, an expert quiz generator. Your task is to analyze documents and generate quiz questions.`;
      userPrompt = `Analyze this document and generate a quiz:

1. **Document Summary** (brief overview for context)
2. **Key Topics for Quiz** (main areas to test)
3. **Generate 5-10 Short-Answer Questions** based on the content:
   - Mix difficulty levels (easy to challenging)
   - Include recall, application, and analysis questions
   - Each question should test genuine understanding, not memorization
   - Format each question clearly

For each question, also prepare (but don't reveal):
- The correct answer
- A brief explanation referencing the document content
- Hints if the student struggles

Output the questions only (not the answers yet - those will be used for grading).

Document content:
${document}`;
    } else {
      systemPrompt = `You are WISER AI, an intelligent document analyzer.`;
      userPrompt = `Analyze this document and provide a comprehensive summary including:
- Main topics and themes
- Key points and takeaways
- Structure overview
- Important details

Document content:
${document}`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to process document");
    }

    const data = await response.json();
    const analysis = data.choices?.[0]?.message?.content || "Unable to analyze document";

    console.log("Document processed successfully");

    return new Response(JSON.stringify({ 
      success: true,
      analysis,
      filename,
      mode,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Document processing error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Failed to process document" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
