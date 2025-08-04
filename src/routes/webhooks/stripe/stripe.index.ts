import type z from "zod";

import { Hono } from "hono";
import Stripe from "stripe";

import type { PaymentMetadataSchema } from "@/db/schema/payments.schema";

import { db } from "@/db";
import env from "@/env";
import { stripe } from "@/lib/stripe";
import { getActiveVoteMultiplier } from "@/lib/vote-multiplier";

const webhookSecret = env.STRIPE_WEBHOOK_SECRET!;

const stripeWebhookRouter = new Hono();

stripeWebhookRouter.post("/api/v1/webhooks/stripe", async (c) => {
  const signature = c.req.header("stripe-signature");

  if (!signature) {
    console.error("❌ Missing Stripe signature header");
    return c.text("Missing Stripe signature", 400);
  }

  let rawBody: string;
  try {
    rawBody = await c.req.text();
  }
  catch (error) {
    console.error("❌ Failed to read request body:", error);
    return c.text("Failed to read request body", 400);
  }

  try {
    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

    switch (event.type) {
      case "checkout.session.completed":
        sessionCompleted(event);
        break;
      case "payment_intent.succeeded":
        console.log("✅ Payment intent succeeded:", event.data.object);
        // Handle successful payment logic here
        break;
      case "payment_intent.payment_failed":
        console.log("❌ Payment intent failed:", event.data.object);
        // Handle failed payment logic here
        break;
      case "customer.subscription.created":
        console.log("✅ Subscription created:", event.data.object);
        // Handle subscription creation logic here
        break;
      case "customer.subscription.updated":
        console.log("✅ Subscription updated:", event.data.object);
        // Handle subscription update logic here
        break;
      case "customer.subscription.deleted":
        console.log("❌ Subscription deleted:", event.data.object);
        // Handle subscription deletion logic here
        break;
      default:
        console.log(`⚠️ Unhandled event type: ${event.type}`);
    }

    return c.text("Success", 200);
  }
  catch (err) {
    console.error("❌ Stripe signature verification failed:", err);

    if (err instanceof Stripe.errors.StripeSignatureVerificationError) {
      // console.error("🔍 Signature verification details:");
      // console.error("- Error message:", err.message);
      // console.error("- Received signature:", signature);
      // console.error("- Webhook secret used:", `${webhookSecret.substring(0, 10)}...`);
    }

    return c.text("Webhook Error: Invalid signature", 400);
  }
});

export default stripeWebhookRouter;

async function sessionCompleted(event: Stripe.Event) {
  const eventObject = event.data.object as Stripe.Checkout.Session;
  const metadata = eventObject.metadata as z.infer<typeof PaymentMetadataSchema>;

  await db.$transaction(async (tx) => {
    // Get the active vote multiplier
    const multiplier = await getActiveVoteMultiplier();

    // Calculate the total number of votes to create (original votes * multiplier)
    const originalVoteCount = Number.parseInt(metadata.voteCount);
    const totalVoteCount = originalVoteCount * multiplier;

    console.log(`🎯 Vote multiplier applied: ${originalVoteCount} votes × ${multiplier} = ${totalVoteCount} total votes`);

    await tx.vote.createMany({
      data: Array.from({ length: totalVoteCount }).map(() => ({
        voteeId: metadata.voteeId,
        voterId: metadata.voterId,
        contestId: metadata.contestId,
        type: "PAID",
        paymentId: metadata.paymentId,
        createdAt: new Date(),
      })),
    });

    await tx.payment.update({
      where: { id: metadata.paymentId },
      data: {
        status: "COMPLETED",
        stripeSessionId: eventObject.id,
      },
    });
  });
}
