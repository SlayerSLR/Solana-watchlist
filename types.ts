
export interface TokenData {
  address: string;
  pairAddress: string;
  symbol: string;
  name: string;
  initialMcap: number;
  maxMcap: number;
  currentMcap: number;
  maxDrawdown: number; // Largest % drop from peak since scan
  volume24h: number;
  volume1h: number;
  priceNative: string;
  priceUsd: string;
  fdv: number;
  lastUpdated: number;
  addedAt: number;
  imageUrl?: string;
  dexUrl: string;
}

export interface WatchlistToken extends TokenData {
  id: string;
}

export interface WatchlistGroup {
  id: string;
  name: string;
  tokens: WatchlistToken[];
}

export type LayoutMode = 'grid' | 'list';

export type SortField = 'currentMcap' | 'volume24h' | 'maxMcap' | 'athROI' | 'addedAt';
export type SortDirection = 'asc' | 'desc';

export interface VolumeLeader {
  address: string;
  symbol: string;
  volume: number;
  mcap: number;
  change: number;
}
