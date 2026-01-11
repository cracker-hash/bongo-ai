// Migrated from Lovable AI to OpenAI Direct + PDF.co Integration
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Extract text from PDF using PDF.co API
async function extractPdfText(pdfContent: string, filename: string): Promise<string> {
  const PDFCO_API_KEY = Deno.env.get("PDFCO_API_KEY");
  
  if (!PDFCO_API_KEY) {
    console.log("PDF.co API key not configured, using raw content");
    return pdfContent;
  }

  try {
    // Upload file to PDF.co
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
      console.error("PDF.co upload failed:", await uploadResponse.text());
      return pdfContent;
    }

    const uploadData = await uploadResponse.json();
    const fileUrl = uploadData.url;

    // Extract text from PDF
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
      console.error("PDF.co extraction failed:", await extractResponse.text());
      return pdfContent;
    }

    const extractData = await extractResponse.json();
    
    if (extractData.body) {
      console.log("PDF.co successfully extracted text");
      return extractData.body;
    }

    return pdfContent;
  } catch (error) {
    console.error("PDF.co error:", error);
    return pdfContent;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { content, filename, mode, question, userAnswer, documentContext, isPdf, fileBase64, fileName, fileType } = body;
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    
    if (!OPENROUTER_API_KEY && !OPENAI_API_KEY) {
      throw new Error("No API key configured (OPENROUTER_API_KEY or OPENAI_API_KEY)");
    }
    
    // Use OpenRouter if available, fallback to OpenAI
    const useOpenRouter = !!OPENROUTER_API_KEY;
    const apiUrl = useOpenRouter 
      ? "https://openrouter.ai/api/v1/chat/completions" 
      : "https://api.openai.com/v1/chat/completions";
    const apiKey = useOpenRouter ? OPENROUTER_API_KEY : OPENAI_API_KEY;
    const model = useOpenRouter ? 'openai/gpt-4o-mini' : 'gpt-4o-mini';
    
    console.log(`Processing request - mode: ${mode}, isPdf: ${isPdf}, fileType: ${fileType}, using: ${useOpenRouter ? 'OpenRouter' : 'OpenAI'}`);

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
        throw new Error("Question and user answer are required for validation");
      }

      console.log(`Validating answer for question: ${question.substring(0, 50)}...`);

      const validationPrompt = `You are WISER AI, an expert educational mentor. Evaluate the student's answer.

Context from the document:
${documentContext ? documentContext.substring(0, 3000) : "No document context provided"}

Question: ${question}

Student's Answer: ${userAnswer}

Evaluate based on:
1. Is the answer factually correct based on the document?
2. Does it demonstrate understanding?
3. Is it complete enough?

IMPORTANT: Be encouraging but accurate. Accept answers that demonstrate understanding.

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
          max_tokens: 2000,
        }),
      });

      if (!validationResponse.ok) {
        const errorText = await validationResponse.text();
        console.error("Validation error:", validationResponse.status, errorText);
        throw new Error("Failed to validate answer");
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
      } catch (parseError) {
        console.error("Failed to parse validation:", parseError);
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
      throw new Error("No document content provided");
    }

    // Extract text from PDF if needed
    let processedContent = content;
    if (isPdf && filename?.toLowerCase().endsWith('.pdf')) {
      processedContent = await extractPdfText(content, filename);
    }

    let userPrompt = "";

    if (mode === "study") {
      userPrompt = `Analyze this document and provide:

1. **Document Summary** (2-3 sentences overview)
2. **Key Topics** (list main topics covered)
3. **Key Concepts** (important terms and definitions)
4. **Study Outline** (structured breakdown by sections)
5. **Difficulty Level** (Beginner/Intermediate/Advanced)
6. **Recommended Study Approach** (how to best study this material)

Be thorough but concise.

Document content:
${processedContent}`;
    } else if (mode === "quiz") {
      userPrompt = `Analyze this document and generate exactly 5 quiz questions.

Respond with valid JSON only:
{
  "questions": [
    {
      "question": "Question text here?",
      "correctAnswer": "Expected correct answer",
      "explanation": "Why this is correct",
      "hint": "A helpful hint"
    }
  ]
}

Requirements:
- Create exactly 5 short-answer questions
- Mix difficulty: 2 easy, 2 medium, 1 challenging
- Questions should test understanding
- Each must be answerable from the document

Document content:
${processedContent}`;
    } else {
      userPrompt = `Analyze this document and provide a comprehensive summary including:
- Main topics and themes
- Key points and takeaways
- Structure overview
- Important details

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
        max_tokens: 4000,
        ...(mode === "quiz" ? { response_format: { type: "json_object" } } : {}),
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("OpenAI error:", response.status, errorText);
      throw new Error("Failed to process document");
    }

    const data = await response.json();
    const analysisContent = data.choices?.[0]?.message?.content || "";

    console.log("Document processed successfully, mode:", mode);

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
      } catch (parseError) {
        console.error("Failed to parse quiz questions:", parseError);
        return new Response(JSON.stringify({ 
          error: "Failed to generate quiz questions. Please try again."
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
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
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Failed to process document" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
