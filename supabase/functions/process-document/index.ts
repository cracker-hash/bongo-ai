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
    const body = await req.json();
    const { content, filename, mode, question, userAnswer, documentContext } = body;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Processing request - mode: ${mode}`);

    // Handle answer validation mode
    if (mode === "validate-answer") {
      if (!question || !userAnswer) {
        throw new Error("Question and user answer are required for validation");
      }

      console.log(`Validating answer for question: ${question.substring(0, 50)}...`);

      const validationPrompt = `You are WISER AI, an expert educational mentor. Evaluate the student's answer to the quiz question.

Context from the document:
${documentContext ? documentContext.substring(0, 3000) : "No document context provided"}

Question: ${question}

Student's Answer: ${userAnswer}

Evaluate the answer based on these criteria:
1. Is the answer factually correct based on the document content?
2. Does it demonstrate understanding of the concept?
3. Is it complete enough to show comprehension?

IMPORTANT: Be encouraging but accurate. Accept answers that demonstrate understanding even if not word-perfect.

You MUST respond with a valid JSON object in this exact format (no markdown, no code blocks):
{
  "isCorrect": true or false,
  "explanation": "If incorrect: detailed explanation of the correct answer from the document. If correct: brief confirmation.",
  "additionalInfo": "If correct: interesting related fact or deeper insight from the document content."
}`;

      const validationResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "user", content: validationPrompt },
          ],
        }),
      });

      if (!validationResponse.ok) {
        const errorText = await validationResponse.text();
        console.error("AI validation error:", validationResponse.status, errorText);
        throw new Error("Failed to validate answer");
      }

      const validationData = await validationResponse.json();
      const validationContent = validationData.choices?.[0]?.message?.content || "";
      
      console.log("Validation response:", validationContent.substring(0, 200));

      // Parse the JSON response
      try {
        // Clean the response - remove any markdown code blocks
        let cleanedContent = validationContent
          .replace(/```json\s*/g, '')
          .replace(/```\s*/g, '')
          .trim();
        
        const result = JSON.parse(cleanedContent);
        
        return new Response(JSON.stringify({
          isCorrect: result.isCorrect === true,
          explanation: result.explanation || "Unable to provide explanation.",
          additionalInfo: result.additionalInfo || ""
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (parseError) {
        console.error("Failed to parse validation response:", parseError);
        // Fallback: try to determine correctness from the text
        const isCorrect = validationContent.toLowerCase().includes('"iscorrect": true') || 
                         validationContent.toLowerCase().includes('"iscorrect":true');
        return new Response(JSON.stringify({
          isCorrect,
          explanation: validationContent,
          additionalInfo: ""
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Handle document processing modes
    if (!content) {
      throw new Error("No document content provided");
    }

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
${content}`;
    } else if (mode === "quiz") {
      systemPrompt = `You are WISER AI, an expert quiz generator. Generate quiz questions from the document content.`;
      userPrompt = `Analyze this document and generate exactly 5 quiz questions.

CRITICAL: You MUST respond with a valid JSON object in this exact format (no markdown, no code blocks, no extra text):
{
  "questions": [
    {
      "question": "Your question text here?",
      "correctAnswer": "The expected correct answer",
      "explanation": "Explanation of why this is correct, referencing the document",
      "hint": "A helpful hint if the student is stuck"
    }
  ]
}

Requirements for questions:
- Create exactly 5 short-answer questions
- Mix difficulty: 2 easy, 2 medium, 1 challenging
- Questions should test understanding, not just memorization
- Each question should be answerable from the document content
- Include recall, application, and analysis questions

Document content:
${content}`;
    } else {
      systemPrompt = `You are WISER AI, an intelligent document analyzer.`;
      userPrompt = `Analyze this document and provide a comprehensive summary including:
- Main topics and themes
- Key points and takeaways
- Structure overview
- Important details

Document content:
${content}`;
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
    const analysisContent = data.choices?.[0]?.message?.content || "";

    console.log("Document processed successfully, mode:", mode);

    // For quiz mode, parse the JSON response
    if (mode === "quiz") {
      try {
        // Clean the response
        let cleanedContent = analysisContent
          .replace(/```json\s*/g, '')
          .replace(/```\s*/g, '')
          .trim();
        
        const quizData = JSON.parse(cleanedContent);
        
        return new Response(JSON.stringify({ 
          success: true,
          questions: quizData.questions || [],
          filename,
          mode,
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (parseError) {
        console.error("Failed to parse quiz questions:", parseError);
        console.log("Raw response:", analysisContent.substring(0, 500));
        
        // Return an error so we can try again
        return new Response(JSON.stringify({ 
          error: "Failed to generate quiz questions. Please try again.",
          rawResponse: analysisContent.substring(0, 200)
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // For other modes, return the analysis as text
    return new Response(JSON.stringify({ 
      success: true,
      analysis: analysisContent,
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
