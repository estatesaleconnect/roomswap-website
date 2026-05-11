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
  const auth = requireStaff(context);
  if (!auth.ok) {
    return { statusCode: auth.status, body: JSON.stringify({ error: auth.error }) };
  }

  const phoneRaw = (event.queryStringParameters && event.queryStringParameters.phone) || '';
  const phone = phoneRaw.replace(/\D/g, '');
  if (phone.length < 4) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Enter at least 4 digits of the phone number.' }) };
  }

  const { data, error } = await supabase
    .from('members')
    .select('*')
    .ilike('phone', `%${phone}%`)
    .order('last_name', { ascending: true })
    .limit(10);

  if (error) {
    console.error('admin-members-lookup error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ members: data || [] }),
  };
};
