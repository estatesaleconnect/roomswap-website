const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function safeParseInterests(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function handleCheckoutCompleted(session) {
  const customer = await stripe.customers.retrieve(session.customer);
  const meta = customer.metadata || {};
  const shipping = customer.shipping || {};
  const address = shipping.address || {};

  const firstName = meta.first_name || (customer.name || '').split(' ')[0] || '';
  const lastName = meta.last_name || (customer.name || '').split(' ').slice(1).join(' ') || '';

  const record = {
    status: 'active',
    first_name: firstName,
    last_name: lastName,
    email: (customer.email || '').toLowerCase(),
    phone: customer.phone || '',
    address_line1: address.line1 || '',
    address_line2: address.line2 || null,
    city: address.city || '',
    state: address.state || '',
    zip: address.postal_code || '',
    birthday_month: parseInt(meta.birthday_month, 10) || null,
    birthday_day: parseInt(meta.birthday_day, 10) || null,
    interests: safeParseInterests(meta.interests),
    top_size: meta.top_size || null,
    bottom_size: meta.bottom_size || null,
    shoe_size: meta.shoe_size || null,
    style_notes: meta.style_notes || null,
    newsletter_optin: meta.newsletter_optin === 'true',
    stripe_customer_id: customer.id,
    stripe_subscription_id: session.subscription,
  };

  const { error } = await supabase
    .from('members')
    .upsert(record, { onConflict: 'stripe_customer_id' });

  if (error) {
    console.error('Supabase upsert failed:', error);
    throw error;
  }
}

async function handlePaymentFailed(invoice) {
  const { error } = await supabase
    .from('members')
    .update({ status: 'past_due' })
    .eq('stripe_customer_id', invoice.customer);
  if (error) console.error('Supabase past_due update failed:', error);
}

async function handleSubscriptionDeleted(subscription) {
  const { error } = await supabase
    .from('members')
    .update({ status: 'canceled' })
    .eq('stripe_subscription_id', subscription.id);
  if (error) console.error('Supabase canceled update failed:', error);
}

async function handlePaymentSucceeded(invoice) {
  const { error } = await supabase
    .from('members')
    .update({ status: 'active' })
    .eq('stripe_customer_id', invoice.customer)
    .eq('status', 'past_due');
  if (error) console.error('Supabase reactivate update failed:', error);
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const sig = event.headers['stripe-signature'] || event.headers['Stripe-Signature'];
  if (!sig) {
    return { statusCode: 400, body: 'Missing Stripe signature header' };
  }

  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf8')
    : event.body;

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  try {
    switch (stripeEvent.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(stripeEvent.data.object);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailed(stripeEvent.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(stripeEvent.data.object);
        break;
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(stripeEvent.data.object);
        break;
      default:
        // Ignore other event types
        break;
    }
    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  } catch (err) {
    console.error(`Webhook handler error for ${stripeEvent.type}:`, err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Webhook handler failed' }) };
  }
};
