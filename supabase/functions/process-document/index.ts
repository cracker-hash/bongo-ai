// Secured Document Processing Edge Function with auth, validation, and restricted CORS
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://wiser-ai.lovable.app',
  'https://gbbqdmgrjtdliiddikwq.lovableproject.com',
  'http://localhost:5173',
  'http://localhost:3000',
];

function getCorsHeaders(origin: string | null) {
  const allowedOrigin = origin && ALLOWED_ORIGINS.some(o => origin.startsWith(o.replace(/:\d+$/, ''))) 
    ? origin 
    : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true',
  };
}

// Input validation schemas
const DocumentRequestSchema = z.object({
  content: z.string().max(500000).optional(),
  filename: z.string().max(255).optional(),
  mode: z.enum(['study', 'quiz', 'validate-answer', 'summary']).optional(),
  question: z.string().max(2000).optional(),
  userAnswer: z.string().max(5000).optional(),
  documentContext: z.string().max(50000).optional(),
  isPdf: z.boolean().optional(),
  fileBase64: z.string().optional(),
  fileName: z.string().max(255).optional(),
  fileType: z.string().max(50).optional(),
});

// Extract text from PDF using PDF.co API
async function extractPdfText(pdfContent: string, filename: string): Promise<string> {
  const PDFCO_API_KEY = Deno.env.get("PDFCO_API_KEY");
  
  if (!PDFCO_API_KEY) {
    console.log("PDF.co not configured, using raw content");
    return pdfContent;
  }

  try {
    const uploadResponse = await fetch("https://api.pdf.co/v1/file/upload/base64", {
      method: "POST",
      headers: {
        "x-api-key": PDFCO_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: filename,
        file: pdfContent.replace(/^data:application\/pdf;base64,/, ""),
      }),
    });

    if (!uploadResponse.ok) {
      console.error("PDF upload failed:", uploadResponse.status);
      return pdfContent;
    }

    const uploadData = await uploadResponse.json();
    const fileUrl = uploadData.url;

    const extractResponse = await fetch("https://api.pdf.co/v1/pdf/convert/to/text", {
      method: "POST",
      headers: {
        "x-api-key": PDFCO_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: fileUrl,
        inline: true,
        async: false,
      }),
    });

    if (!extractResponse.ok) {
      console.error("PDF extraction failed:", extractResponse.status);
      return pdfContent;
    }

    const extractData = await extractResponse.json();
    
    if (extractData.body) {
      console.log("PDF text extracted successfully");
      return extractData.body;
    }

    return pdfContent;
  } catch (error) {
    console.error("PDF extraction error:", error);
    return pdfContent;
  }
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
    
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parse and validate input
    const rawBody = await req.json();
    const validationResult = DocumentRequestSchema.safeParse(rawBody);
    
    if (!validationResult.success) {
      console.error('Validation error:', validationResult.error.errors);
      return new Response(JSON.stringify({ error: 'Invalid request format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { content, filename, mode, question, userAnswer, documentContext, isPdf, fileBase64, fileName, fileType } = validationResult.data;
    
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    
    if (!OPENROUTER_API_KEY && !OPENAI_API_KEY) {
      console.error("No AI API key configured");
      return new Response(JSON.stringify({ error: 'Service temporarily unavailable' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const useOpenRouter = !!OPENROUTER_API_KEY;
    const apiUrl = useOpenRouter 
      ? "https://openrouter.ai/api/v1/chat/completions" 
      : "https://api.openai.com/v1/chat/completions";
    const apiKey = useOpenRouter ? OPENROUTER_API_KEY : OPENAI_API_KEY;
    const model = useOpenRouter ? 'openai/gpt-4o-mini' : 'gpt-4o-mini';
    
    console.log(`Document processing: user=${claimsData.user.id.slice(0, 8)}, mode=${mode}`);

    // Handle simple text extraction for podcast generator
    if (fileBase64 && fileType === 'pdf') {
      const extractedText = await extractPdfText(fileBase64, fileName || 'document.pdf');
      return new Response(JSON.stringify({ 
        success: true,
        text: extractedText,
        filename: fileName
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle answer validation mode
    if (mode === "validate-answer") {
      if (!question || !userAnswer) {
        return new Response(JSON.stringify({ error: 'Question and answer are required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const validationPrompt = `You are WISER AI, an expert educational mentor. Evaluate the student's answer.

Context from the document:
${documentContext ? documentContext.substring(0, 3000) : "No document context provided"}

Question: ${question}

Student's Answer: ${userAnswer}

Evaluate based on correctness and understanding. Be encouraging but accurate.

Respond with valid JSON only (no markdown):
{
  "isCorrect": true or false,
  "explanation": "Detailed explanation",
  "additionalInfo": "Related insight if correct"
}`;

      const validationResponse = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          ...(useOpenRouter && { "HTTP-Referer": "https://wiser-ai.lovable.app" }),
          ...(useOpenRouter && { "X-Title": "Wiser AI" }),
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: validationPrompt }],
          response_format: { type: "json_object" },
          max_tokens: 1500,
        }),
      });

      if (!validationResponse.ok) {
        console.error("Validation API error:", validationResponse.status);
        return new Response(JSON.stringify({ error: 'Unable to validate answer' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const validationData = await validationResponse.json();
      const validationContent = validationData.choices?.[0]?.message?.content || "";
      
      try {
        const result = JSON.parse(validationContent);
        return new Response(JSON.stringify({
          isCorrect: result.isCorrect === true,
          explanation: result.explanation || "Unable to provide explanation.",
          additionalInfo: result.additionalInfo || ""
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch {
        return new Response(JSON.stringify({
          isCorrect: false,
          explanation: validationContent,
          additionalInfo: ""
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Handle document processing modes
    if (!content) {
      return new Response(JSON.stringify({ error: 'No document content provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Extract text from PDF if needed
    let processedContent = content;
    if (isPdf && filename?.toLowerCase().endsWith('.pdf')) {
      processedContent = await extractPdfText(content, filename);
    }

    let userPrompt = "";

    if (mode === "study") {
      userPrompt = `Analyze this document and provide:
1. **Document Summary** (2-3 sentences)
2. **Key Topics** (main topics)
3. **Key Concepts** (important terms)
4. **Study Outline** (structured breakdown)
5. **Difficulty Level** (Beginner/Intermediate/Advanced)
6. **Recommended Study Approach**

Document content:
${processedContent}`;
    } else if (mode === "quiz") {
      userPrompt = `Analyze this document and generate exactly 5 quiz questions.

Respond with valid JSON only:
{
  "questions": [
    {
      "question": "Question text?",
      "correctAnswer": "Expected answer",
      "explanation": "Why this is correct",
      "hint": "A helpful hint"
    }
  ]
}

Requirements: 5 short-answer questions, mix of difficulty levels.

Document content:
${processedContent}`;
    } else {
      userPrompt = `Analyze this document and provide a comprehensive summary including main topics, key points, and important details.

Document content:
${processedContent}`;
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(useOpenRouter && { "HTTP-Referer": "https://wiser-ai.lovable.app" }),
        ...(useOpenRouter && { "X-Title": "Wiser AI" }),
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "You are WISER AI, an expert educational content analyzer." },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 2048,
        ...(mode === "quiz" ? { response_format: { type: "json_object" } } : {}),
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Service is busy. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Service credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("Document API error:", response.status);
      return new Response(JSON.stringify({ error: 'Unable to process document' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const data = await response.json();
    const analysisContent = data.choices?.[0]?.message?.content || "";

    console.log("Document processed successfully");

    if (mode === "quiz") {
      try {
        const quizData = JSON.parse(analysisContent);
        return new Response(JSON.stringify({ 
          success: true,
          questions: quizData.questions || [],
          filename,
          mode,
          documentContext: processedContent.substring(0, 5000),
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch {
        return new Response(JSON.stringify({ error: 'Failed to generate quiz questions' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      summary: analysisContent,
      analysis: analysisContent,
      filename,
      mode,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Document processing error:", error);
    return new Response(JSON.stringify({ error: 'Unable to process request' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});