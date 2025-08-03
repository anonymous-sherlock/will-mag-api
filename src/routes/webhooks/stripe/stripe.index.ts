import { Hono } from 'hono';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

const stripeWebhookRouter = new Hono();

stripeWebhookRouter.post('/api/v1/webhooks/stripe', async c => {
  const signature = c.req.header('stripe-signature');
  if (!signature) return c.text('Missing Stripe signature', 400);

  const rawBody = await c.req.text();

  try {
    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

    switch (event.type) {
      case 'checkout.session.completed':
        console.log('✅ Checkout session completed:', event.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return c.text('Success', 200);
  } catch (err) {
    console.error('❌ Stripe signature verification failed:', err);
    return c.text('Webhook Error: Invalid signature', 400);
  }
});

export default stripeWebhookRouter;
