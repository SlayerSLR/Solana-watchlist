
import { TokenData } from '../types';

const API_BASE = 'https://api.dexscreener.com/latest/dex/tokens';

export const fetchTokenData = async (address: string): Promise<Partial<TokenData> | null> => {
  try {
    const response = await fetch(`${API_BASE}/${address}`);
    if (!response.ok) throw new Error('Failed to fetch from Dexscreener');
    
    const data = await response.json();
    if (!data.pairs || data.pairs.length === 0) return null;

    // We take the pair with the highest liquidity on Solana
    const solanaPairs = data.pairs.filter((p: any) => p.chainId === 'solana');
    const bestPair = solanaPairs.sort((a: any, b: any) => b.liquidity?.usd - a.liquidity?.usd)[0] || data.pairs[0];

    return {
      address: bestPair.baseToken.address,
      pairAddress: bestPair.pairAddress,
      symbol: bestPair.baseToken.symbol,
      name: bestPair.baseToken.name,
      currentMcap: bestPair.fdv || bestPair.marketCap || 0,
      volume24h: bestPair.volume?.h24 || 0,
      volume1h: bestPair.volume?.h1 || 0,
      priceNative: bestPair.priceNative,
      priceUsd: bestPair.priceUsd,
      fdv: bestPair.fdv || 0,
      imageUrl: bestPair.info?.imageUrl,
      dexUrl: bestPair.url
    };
  } catch (error) {
    console.error('Error fetching token data:', error);
    return null;
  }
};

export const fetchMultipleTokens = async (addresses: string[]): Promise<Map<string, Partial<TokenData>>> => {
  const results = new Map<string, Partial<TokenData>>();
  
  // Dexscreener API supports up to 30 addresses at once via comma separation
  const chunks = [];
  for (let i = 0; i < addresses.length; i += 30) {
    chunks.push(addresses.slice(i, i + 30));
  }

  for (const chunk of chunks) {
    try {
      const response = await fetch(`${API_BASE}/${chunk.join(',')}`);
      const data = await response.json();
      
      if (data.pairs) {
        data.pairs.forEach((pair: any) => {
          if (pair.chainId === 'solana') {
            const address = pair.baseToken.address;
            // Merge or update only if it's the primary pair
            if (!results.has(address) || (results.get(address)?.fdv || 0) < (pair.fdv || 0)) {
               results.set(address, {
                address: pair.baseToken.address,
                pairAddress: pair.pairAddress,
                symbol: pair.baseToken.symbol,
                name: pair.baseToken.name,
                currentMcap: pair.fdv || pair.marketCap || 0,
                volume24h: pair.volume?.h24 || 0,
                volume1h: pair.volume?.h1 || 0,
                priceNative: pair.priceNative,
                priceUsd: pair.priceUsd,
                fdv: pair.fdv || 0,
                imageUrl: pair.info?.imageUrl,
                dexUrl: pair.url
              });
            }
          }
        });
      }
    } catch (error) {
      console.error('Error fetching bulk tokens:', error);
    }
  }

  return results;
};
