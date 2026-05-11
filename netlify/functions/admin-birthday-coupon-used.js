const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function requireStaff(context) {
  const user = context.clientContext && context.clientContext.user;
  if (!user) return { ok: false, status: 401, error: 'Unauthorized' };
  const roles = (user.app_metadata && user.app_metadata.roles) || [];
  if (!roles.includes('staff') && !roles.includes('admin')) {
    return { ok: false, status: 403, error: 'Forbidden' };
  }
  return { ok: true };
}

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const auth = requireStaff(context);
  if (!auth.ok) {
    return { statusCode: auth.status, body: JSON.stringify({ error: auth.error }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const memberId = body.memberId;
  if (!memberId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing memberId' }) };
  }

  const now = new Date();
  const yyyy = String(now.getFullYear());

  const { error } = await supabase
    .from('members')
    .update({ birthday_coupon_used_year: yyyy })
    .eq('id', memberId);

  if (error) {
    console.error('admin-birthday-coupon-used error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ success: true, yyyy }),
  };
};
