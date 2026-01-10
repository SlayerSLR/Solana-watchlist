
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
      console.error('Missing Supabase configuration');
      return jsonResponse({ error: 'Supabase environment variables not configured in Vercel' }, 500);
    }

    // GET: Fetch watchlist data
    if (request.method === 'GET') {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/watchlists?id=eq.${id}&select=data`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
      });
      
      if (!response.ok) {
        const errText = await response.text();
        let errJson;
        try { errJson = JSON.parse(errText); } catch (e) { errJson = { message: errText }; }
        console.error('Supabase GET error:', errJson);
        return jsonResponse({ error: `Database error: ${errJson.message || 'Failed to fetch'}` }, response.status);
      }

      const data = await response.json();
      const result = Array.isArray(data) && data.length > 0 ? data[0].data : null;
      
      return jsonResponse(result);
    }

    // POST: Upsert watchlist data
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

      if (!response.ok) {
        const errText = await response.text();
        let errJson;
        try { errJson = JSON.parse(errText); } catch (e) { errJson = { message: errText }; }
        console.error('Supabase POST error:', errJson);
        return jsonResponse({ error: `Database save error: ${errJson.message || 'Upsert failed'}` }, response.status);
      }

      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: 'Method not allowed' }, 405);
  } catch (error: any) {
    console.error('API Handler Error:', error);
    return jsonResponse({ error: error.message || 'Internal server error' }, 500);
  }
}
