import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
});

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!signature || !webhookSecret) {
    console.error("Missing signature or webhook secret");
    return new Response("Missing signature", { status: 400 });
  }

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    console.log(`Processing Stripe event: ${event.type}`);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        // Get customer email
        const customer = await stripe.customers.retrieve(customerId);
        const email = (customer as Stripe.Customer).email;

        if (email) {
          // Get user by email
          const { data: userData } = await supabaseAdmin.auth.admin.listUsers();
          const user = userData.users.find(u => u.email === email);

          if (user) {
            // Get subscription details
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            const productId = subscription.items.data[0]?.price.product as string;

            // Determine plan based on product
            let plan = "free";
            const product = await stripe.products.retrieve(productId);
            if (product.name.toLowerCase().includes("lite")) plan = "lite";
            else if (product.name.toLowerCase().includes("pro")) plan = "pro";
            else if (product.name.toLowerCase().includes("max")) plan = "max";

            // Upsert subscription
            await supabaseAdmin.from("subscriptions").upsert({
              user_id: user.id,
              plan,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            }, { onConflict: "user_id" });

            console.log(`Subscription created for user ${user.id}: ${plan}`);
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Find user by stripe_customer_id
        const { data: subData } = await supabaseAdmin
          .from("subscriptions")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (subData) {
          const productId = subscription.items.data[0]?.price.product as string;
          const product = await stripe.products.retrieve(productId);
          
          let plan = "free";
          if (product.name.toLowerCase().includes("lite")) plan = "lite";
          else if (product.name.toLowerCase().includes("pro")) plan = "pro";
          else if (product.name.toLowerCase().includes("max")) plan = "max";

          await supabaseAdmin.from("subscriptions").update({
            plan,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          }).eq("user_id", subData.user_id);

          console.log(`Subscription updated for user ${subData.user_id}: ${plan}`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        await supabaseAdmin.from("subscriptions").update({
          plan: "free",
          stripe_subscription_id: null,
          current_period_end: null,
        }).eq("stripe_customer_id", customerId);

        console.log(`Subscription cancelled for customer ${customerId}`);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        // Get customer email for notification
        const customer = await stripe.customers.retrieve(customerId);
        const email = (customer as Stripe.Customer).email;

        if (email) {
          // Send payment failed notification
          await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-usage-alert`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({
              email,
              type: "payment_failed",
              message: "Your payment failed. Please update your payment method to continue using WISER AI.",
            }),
          });
        }
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("Webhook error:", errorMessage);
    return new Response(`Webhook Error: ${errorMessage}`, { status: 400 });
  }
});
