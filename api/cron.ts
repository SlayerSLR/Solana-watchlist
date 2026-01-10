export const config = {
  runtime: 'edge',
};

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const API_BASE = 'https://api.dexscreener.com/latest/dex/tokens';

async function fetchMultipleTokens(addresses: string[]) {
  const results = new Map<string, any>();
  const chunks = [];
  for (let i = 0; i < addresses.length; i += 30) chunks.push(addresses.slice(i, i + 30));

  for (const chunk of chunks) {
    try {
      const response = await fetch(`${API_BASE}/${chunk.join(',')}`);
      const data = await response.json();
      if (data.pairs) {
        data.pairs.forEach((pair: any) => {
          if (pair.chainId === 'solana') {
            const address = pair.baseToken.address;
            const pairLiquidity = pair.liquidity?.usd || 0;
            const existing = results.get(address);
            
            // Prioritize higher liquidity to avoid inflated prices from low-liquidity "ghost" pools
            if (!existing || pairLiquidity > (existing.liquidityUsd || 0)) {
               results.set(address, {
                currentMcap: pair.marketCap || pair.fdv || 0,
                volume24h: pair.volume?.h24 || 0,
                volume1h: pair.volume?.h1 || 0,
                priceNative: pair.priceNative,
                priceUsd: pair.priceUsd,
                fdv: pair.fdv || 0,
                liquidityUsd: pairLiquidity
              });
            }
          }
        });
      }
    } catch (e) { console.error(e); }
  }
  return results;
}

export default async function handler(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return new Response('Supabase environment variables not configured', { status: 500 });
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/watchlists?select=*`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
    });
    
    if (!response.ok) return new Response('Supabase fetch failed', { status: 500 });

    const watchlists = await response.json();
    if (!watchlists || watchlists.length === 0) return new Response('No watchlists');

    for (const item of watchlists) {
      const { id, data: groups } = item;
      if (!groups || !Array.isArray(groups)) continue;

      const allAddresses = Array.from(new Set(groups.flatMap((g: any) => g.tokens?.map((t: any) => t.address) || [])));
      if (allAddresses.length === 0) continue;

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

            return { ...token, ...newData, maxMcap: newMaxMcap, maxDrawdown: newMaxDrawdown, lastUpdated: Date.now() };
          }
          return token;
        })
      }));

      if (modified) {
        await fetch(`${SUPABASE_URL}/rest/v1/watchlists?id=eq.${id}`, {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ data: updatedGroups, updated_at: new Date().toISOString() }),
        });
      }
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error: any) {
    return new Response(`Cron Error: ${error.message}`, { status: 500 });
  }
}