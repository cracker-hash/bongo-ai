import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UsageAlertRequest {
  email: string;
  type: "usage_warning" | "usage_critical" | "payment_failed";
  message?: string;
  currentUsage?: number;
  limit?: number;
  resourceType?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, type, message, currentUsage, limit, resourceType }: UsageAlertRequest = await req.json();

    let subject = "";
    let htmlContent = "";

    switch (type) {
      case "usage_warning":
        subject = `⚠️ WISER AI: You've reached 80% of your ${resourceType} limit`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #1a1a2e; color: #ffffff;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #00bfff; margin: 0;">WISER AI</h1>
              <p style="color: #888;">Your Education & Automation Assistant</p>
            </div>
            
            <div style="background: #16213e; border-radius: 10px; padding: 25px; margin-bottom: 20px;">
              <h2 style="color: #ffd700; margin-top: 0;">⚠️ Usage Alert</h2>
              <p>You've used <strong style="color: #00bfff;">${currentUsage?.toLocaleString()}</strong> of your <strong>${limit?.toLocaleString()}</strong> ${resourceType} this month.</p>
              <p>That's <strong style="color: #ff6b6b;">80%</strong> of your monthly limit!</p>
              
              <div style="background: #0f0f23; border-radius: 8px; padding: 15px; margin: 20px 0;">
                <div style="background: #333; border-radius: 5px; height: 20px; overflow: hidden;">
                  <div style="background: linear-gradient(90deg, #00bfff, #ff6b6b); height: 100%; width: 80%;"></div>
                </div>
                <p style="text-align: center; margin: 10px 0 0; font-size: 14px; color: #888;">80% used</p>
              </div>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://wiser-ai.lovable.app/pricing" style="background: linear-gradient(135deg, #00bfff, #0099cc); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Upgrade Your Plan</a>
            </div>
            
            <p style="color: #888; font-size: 12px; text-align: center;">
              Need help? Contact support@wiser-ai.com
            </p>
          </div>
        `;
        break;

      case "usage_critical":
        subject = `🚨 WISER AI: You've reached your ${resourceType} limit`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #1a1a2e; color: #ffffff;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #00bfff; margin: 0;">WISER AI</h1>
              <p style="color: #888;">Your Education & Automation Assistant</p>
            </div>
            
            <div style="background: #16213e; border-radius: 10px; padding: 25px; margin-bottom: 20px; border: 2px solid #ff6b6b;">
              <h2 style="color: #ff6b6b; margin-top: 0;">🚨 Limit Reached</h2>
              <p>You've used all <strong style="color: #ff6b6b;">${limit?.toLocaleString()}</strong> ${resourceType} for this month.</p>
              <p>Upgrade now to continue using WISER AI without interruption.</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://wiser-ai.lovable.app/pricing" style="background: linear-gradient(135deg, #ff6b6b, #ff4757); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Upgrade Now</a>
            </div>
          </div>
        `;
        break;

      case "payment_failed":
        subject = "❌ WISER AI: Payment Failed";
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #1a1a2e; color: #ffffff;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #00bfff; margin: 0;">WISER AI</h1>
            </div>
            
            <div style="background: #16213e; border-radius: 10px; padding: 25px; border: 2px solid #ff6b6b;">
              <h2 style="color: #ff6b6b; margin-top: 0;">❌ Payment Failed</h2>
              <p>${message || "Your payment could not be processed. Please update your payment method."}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://wiser-ai.lovable.app/dashboard" style="background: #00bfff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Update Payment Method</a>
            </div>
          </div>
        `;
        break;
    }

    const emailResponse = await resend.emails.send({
      from: "WISER AI <notifications@resend.dev>",
      to: [email],
      subject,
      html: htmlContent,
    });

    console.log("Usage alert email sent:", emailResponse);

    return new Response(JSON.stringify({ success: true, id: emailResponse.id }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending usage alert:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
