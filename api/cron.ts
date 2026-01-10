
import { fetchMultipleTokens } from '../services/dexscreener';

export const config = {
  runtime: 'edge',
};

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return new Response('Supabase environment variables not configured', { status: 500 });
  }

  try {
    // 1. Fetch all watchlists from Supabase
    const response = await fetch(`${SUPABASE_URL}/rest/v1/watchlists?select=*`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
    });
    
    if (!response.ok) {
      const err = await response.text();
      return new Response(`Supabase fetch failed: ${err}`, { status: 500 });
    }

    const watchlists = await response.json();
    if (!watchlists || watchlists.length === 0) return new Response('No watchlists to process');

    for (const item of watchlists) {
      const { id, data: groups } = item;
      if (!groups || !Array.isArray(groups)) continue;

      const allAddresses = Array.from(new Set(groups.flatMap((g: any) => g.tokens?.map((t: any) => t.address) || [])));
      if (allAddresses.length === 0) continue;

      // 2. Refresh market data
      const updatedDataMap = await fetchMultipleTokens(allAddresses as string[]);
      
      let modified = false;
      const updatedGroups = groups.map((group: any) => ({
        ...group,
        tokens: group.tokens?.map((token: any) => {
          const newData = updatedDataMap.get(token.address);
          if (newData) {
            modified = true;
            const currentMcap = newData.currentMcap || token.currentMcap;
            const newMaxMcap = Math.max(token.maxMcap, currentMcap);
            const currentDrawdown = newMaxMcap > 0 ? ((currentMcap - newMaxMcap) / newMaxMcap) * 100 : 0;
            const newMaxDrawdown = Math.min(token.maxDrawdown || 0, currentDrawdown);

            return {
              ...token,
              ...newData,
              maxMcap: newMaxMcap,
              maxDrawdown: newMaxDrawdown,
              lastUpdated: Date.now()
            };
          }
          return token;
        })
      }));

      // 3. Save updates back to Supabase
      if (modified) {
        await fetch(`${SUPABASE_URL}/rest/v1/watchlists?id=eq.${id}`, {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data: updatedGroups,
            updated_at: new Date().toISOString()
          }),
        });
      }
    }

    return new Response(JSON.stringify({ success: true, count: watchlists.length }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Cron error:', error);
    return new Response(`Cron Error: ${error.message}`, { status: 500 });
  }
}
