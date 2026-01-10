
export const config = {
  runtime: 'edge',
};

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, '');
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const jsonResponse = (data: any, status = 200) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
};

export default async function handler(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return jsonResponse({ error: 'ID required' }, 400);

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return jsonResponse({ error: 'Supabase keys missing in Vercel environment' }, 500);
    }

    if (request.method === 'GET') {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/watchlists?id=eq.${id}&select=data`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
      });
      
      if (!response.ok) return jsonResponse({ error: 'Database fetch failed' }, response.status);

      const data = await response.json();
      const result = Array.isArray(data) && data.length > 0 ? data[0].data : null;
      return jsonResponse(result);
    }

    if (request.method === 'POST') {
      const body = await request.json();
      const response = await fetch(`${SUPABASE_URL}/rest/v1/watchlists`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({
          id: id,
          data: body,
          updated_at: new Date().toISOString()
        }),
      });

      if (!response.ok) return jsonResponse({ error: 'Database save failed' }, response.status);
      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: 'Method not allowed' }, 405);
  } catch (error: any) {
    return jsonResponse({ error: error.message || 'Internal server error' }, 500);
  }
}
