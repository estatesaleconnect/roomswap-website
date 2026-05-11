const Stripe = require('stripe');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const REQUIRED_FIELDS = [
  'firstName', 'lastName', 'email', 'phone',
  'addressLine1', 'city', 'state', 'zip',
  'birthdayMonth', 'birthdayDay', 'consent',
];

const US_STATES = new Set([
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
]);

function daysInMonth(month) {
  return [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] || 0;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PRICE_ID) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Stripe is not configured on the server.' }),
    };
  }

  let data;
  try {
    data = JSON.parse(event.body || '{}');
  } catch (err) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  for (const field of REQUIRED_FIELDS) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      return { statusCode: 400, body: JSON.stringify({ error: `Missing field: ${field}` }) };
    }
  }

  if (!data.consent) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Subscription consent is required.' }) };
  }

  const email = String(data.email).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid email address.' }) };
  }

  const phoneDigits = String(data.phone).replace(/\D/g, '');
  if (phoneDigits.length < 10) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid phone number.' }) };
  }

  const state = String(data.state).trim().toUpperCase();
  if (!US_STATES.has(state)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid state.' }) };
  }

  const zip = String(data.zip).trim();
  if (!/^\d{5}(-?\d{4})?$/.test(zip)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid ZIP code.' }) };
  }

  const month = parseInt(data.birthdayMonth, 10);
  const day = parseInt(data.birthdayDay, 10);
  if (!month || month < 1 || month > 12 || !day || day < 1 || day > daysInMonth(month)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid birthday.' }) };
  }

  const interests = Array.isArray(data.interests) ? data.interests.slice(0, 20) : [];
  const styleNotes = String(data.styleNotes || '').slice(0, 500);

  try {
    const customer = await stripe.customers.create({
      email,
      name: `${data.firstName} ${data.lastName}`.trim(),
      phone: phoneDigits,
      shipping: {
        name: `${data.firstName} ${data.lastName}`.trim(),
        address: {
          line1: String(data.addressLine1).trim(),
          line2: String(data.addressLine2 || '').trim() || undefined,
          city: String(data.city).trim(),
          state,
          postal_code: zip,
          country: 'US',
        },
      },
      metadata: {
        first_name: String(data.firstName).trim(),
        last_name: String(data.lastName).trim(),
        birthday_month: String(month),
        birthday_day: String(day),
        interests: JSON.stringify(interests),
        top_size: String(data.topSize || '').slice(0, 50),
        bottom_size: String(data.bottomSize || '').slice(0, 50),
        shoe_size: String(data.shoeSize || '').slice(0, 50),
        style_notes: styleNotes,
        newsletter_optin: data.newsletterOptin ? 'true' : 'false',
        source: 'swap-squad-signup',
      },
    });

    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: 'subscription',
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      success_url: process.env.STRIPE_SUCCESS_URL,
      cancel_url: process.env.STRIPE_CANCEL_URL,
      allow_promotion_codes: true,
      subscription_data: {
        metadata: {
          source: 'swap-squad-signup',
        },
      },
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    console.error('swap-squad-signup error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Could not start checkout. Please try again or call 843-900-1412.' }),
    };
  }
};
