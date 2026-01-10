
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { LayoutGrid, List, Plus, RefreshCw, Zap, TrendingUp, BarChart, AlertCircle, Edit2, Check, X, Trash2, Cloud, CloudLightning, Share2, Database, ShieldAlert } from 'lucide-react';
import { WatchlistToken, LayoutMode, SortField, SortDirection, WatchlistGroup } from './types';
import { fetchTokenData, fetchMultipleTokens } from './services/dexscreener';
import TokenCard from './components/TokenCard';
import TokenRow from './components/TokenRow';

// Supabase Direct Config
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const App: React.FC = () => {
  const [watchlistId, setWatchlistId] = useState<string>(() => {
    const hashId = window.location.hash.replace('#', '');
    if (hashId) return hashId;
    const saved = localStorage.getItem('solana-watchlist-id');
    if (saved) return saved;
    const newId = crypto.randomUUID().slice(0, 8);
    return newId;
  });

  const [groups, setGroups] = useState<WatchlistGroup[]>([{ id: 'default', name: 'Main Watchlist', tokens: [] }]);
  const [activeGroupId, setActiveGroupId] = useState<string>('default');
  const [layout, setLayout] = useState<LayoutMode>('grid');
  const [newAddress, setNewAddress] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<number>(Date.now());
  
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('addedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const isRefreshingRef = useRef(false);

  useEffect(() => {
    window.location.hash = watchlistId;
    localStorage.setItem('solana-watchlist-id', watchlistId);
  }, [watchlistId]);

  // Direct Supabase GET
  useEffect(() => {
    const loadData = async () => {
      if (!SUPABASE_URL || !SUPABASE_KEY) {
        setDbError("Supabase Keys Missing");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setDbError(null);
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/watchlists?id=eq.${watchlistId}&select=data`, {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
          }
        });
        
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`DB Error: ${res.status}`);
        }
        
        const data = await res.json();
        const watchlistData = Array.isArray(data) && data.length > 0 ? data[0].data : null;
        
        if (watchlistData && Array.isArray(watchlistData)) {
          setGroups(watchlistData);
          if (watchlistData[0]) setActiveGroupId(watchlistData[0].id);
        }
      } catch (e: any) {
        console.error("Cloud Load Error:", e.message);
        setDbError(e.message);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [watchlistId]);

  // Direct Supabase POST (Upsert)
  useEffect(() => {
    if (isLoading || dbError === "Supabase Keys Missing") return;
    
    const timer = setTimeout(async () => {
      if (!SUPABASE_URL || !SUPABASE_KEY) return;

      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/watchlists`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify({
            id: watchlistId,
            data: groups,
            updated_at: new Date().toISOString()
          })
        });

        if (res.ok) {
          setLastSaved(Date.now());
          setDbError(null);
        } else {
          setDbError(`Save Failed (${res.status})`);
        }
      } catch (e) {
        setDbError("Connection Timeout");
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [groups, watchlistId, isLoading, dbError]);

  const activeGroup = useMemo(() => 
    groups.find(g => g.id === activeGroupId) || groups[0] || { id: 'default', name: 'Main', tokens: [] }, 
  [groups, activeGroupId]);

  const totalTokens = useMemo(() => 
    groups.reduce((acc, g) => acc + (g.tokens?.length || 0), 0), 
  [groups]);

  const refreshAllTokens = useCallback(async (isManual = false) => {
    if (totalTokens === 0 || isRefreshingRef.current) return;
    if (isManual) setIsRefreshing(true);
    isRefreshingRef.current = true;
    try {
      const allAddresses: string[] = Array.from(new Set(groups.flatMap(g => g.tokens?.map(t => t.address) || [])));
      const updatedDataMap = await fetchMultipleTokens(allAddresses);
      setGroups(prevGroups => prevGroups.map(group => ({
        ...group,
        tokens: (group.tokens || []).map(token => {
          const newData = updatedDataMap.get(token.address);
          if (newData) {
            const currentMcap = newData.currentMcap || token.currentMcap;
            const newMaxMcap = Math.max(token.maxMcap, currentMcap);
            const currentDrawdown = newMaxMcap > 0 ? ((currentMcap - newMaxMcap) / newMaxMcap) * 100 : 0;
            const newMaxDrawdown = Math.min(token.maxDrawdown || 0, currentDrawdown);
            return {
              ...token, ...newData,
              maxMcap: newMaxMcap,
              maxDrawdown: newMaxDrawdown,
              lastUpdated: Date.now()
            };
          }
          return token;
        })
      })));
    } catch (err) {
      // background refresh fail is silent
    } finally {
      if (isManual) setIsRefreshing(false);
      isRefreshingRef.current = false;
    }
  }, [groups, totalTokens]);

  useEffect(() => {
    const interval = setInterval(() => refreshAllTokens(false), 8000);
    return () => clearInterval(interval);
  }, [refreshAllTokens]);

  const createGroup = () => {
    const newGroup: WatchlistGroup = { id: crypto.randomUUID(), name: `Group ${groups.length + 1}`, tokens: [] };
    setGroups(prev => [...prev, newGroup]);
    setActiveGroupId(newGroup.id);
  };

  const deleteGroup = (id: string) => {
    if (groups.length <= 1) return;
    setGroups(prev => prev.filter(g => g.id !== id));
    if (activeGroupId === id) setActiveGroupId(groups[0].id);
  };

  const startRenaming = (group: WatchlistGroup) => {
    setEditingGroupId(group.id);
    setEditNameValue(group.name);
  };

  const saveRename = () => {
    if (!editingGroupId || !editNameValue.trim()) return;
    setGroups(prev => prev.map(g => g.id === editingGroupId ? { ...g, name: editNameValue.trim() } : g));
    setEditingGroupId(null);
  };

  const addToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddress.trim() || totalTokens >= 200) return;
    const cleanAddress = newAddress.trim();
    if (activeGroup.tokens?.some(t => t.address === cleanAddress)) return;

    setIsAdding(true);
    try {
      const data = await fetchTokenData(cleanAddress);
      if (data) {
        const initialMcap = data.currentMcap || 0;
        const newToken: WatchlistToken = {
          id: crypto.randomUUID(),
          address: data.address!,
          pairAddress: data.pairAddress!,
          symbol: data.symbol || '?',
          name: data.name || 'Unknown',
          initialMcap, maxMcap: initialMcap, currentMcap: initialMcap,
          maxDrawdown: 0, volume24h: data.volume24h || 0, volume1h: data.volume1h || 0,
          priceNative: data.priceNative || '0', priceUsd: data.priceUsd || '0',
          fdv: data.fdv || 0, imageUrl: data.imageUrl, dexUrl: data.dexUrl!,
          addedAt: Date.now(), lastUpdated: Date.now()
        };
        setGroups(prev => prev.map(g => g.id === activeGroupId ? { ...g, tokens: [newToken, ...(g.tokens || [])] } : g));
        setNewAddress('');
      }
    } catch (err) { /* silent */ } finally { setIsAdding(false); }
  };

  const sortedTokens = useMemo(() => {
    return [...(activeGroup.tokens || [])].sort((a, b) => {
      let valA: number, valB: number;
      if (sortBy === 'athROI') {
        valA = ((a.maxMcap - a.initialMcap) / (a.initialMcap || 1)) * 100;
        valB = ((b.maxMcap - b.initialMcap) / (b.initialMcap || 1)) * 100;
      } else {
        valA = (a[sortBy] as number) ?? 0;
        valB = (b[sortBy] as number) ?? 0;
      }
      return sortDirection === 'desc' ? valB - valA : valA - valB;
    });
  }, [activeGroup.tokens, sortBy, sortDirection]);

  const copyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("Shareable link copied!");
  };

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-500 font-mono text-sm">
      <div className="flex flex-col items-center gap-4">
        <Database className="animate-pulse text-emerald-500" size={32} />
        <p className="tracking-widest uppercase text-[10px]">Accessing Cloud Vault...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-50 glass border-b border-zinc-800 px-4 py-4 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600 rounded-lg shadow-[0_0_15px_-3px_rgba(16,185,129,0.4)]">
              <Zap className="text-white fill-current" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">Solana <span className="text-emerald-400">Watchlist</span></h1>
              <div className="flex items-center gap-2">
                 <p className="text-[10px] text-zinc-500 mono">Vault: {watchlistId}</p>
                 <button onClick={copyShareLink} className="text-zinc-600 hover:text-emerald-400"><Share2 size={10} /></button>
              </div>
            </div>
          </div>

          <div className="flex flex-1 max-w-xl">
            <form onSubmit={addToken} className="relative w-full">
              <input
                type="text"
                placeholder={`Add token to ${activeGroup.name}...`}
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:border-emerald-500 text-white placeholder-zinc-600"
              />
              <button type="submit" disabled={isAdding} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-emerald-600 text-white rounded-lg">
                {isAdding ? <RefreshCw className="animate-spin" size={18} /> : <Plus size={18} />}
              </button>
            </form>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800">
              <button onClick={() => setLayout('grid')} className={`p-2 rounded-md ${layout === 'grid' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-500'}`}><LayoutGrid size={18} /></button>
              <button onClick={() => setLayout('list')} className={`p-2 rounded-md ${layout === 'list' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-500'}`}><List size={18} /></button>
            </div>
            <button onClick={() => refreshAllTokens(true)} disabled={isRefreshing} className="p-3 bg-zinc-900 text-zinc-400 rounded-xl border border-zinc-800 hover:text-emerald-400 transition-colors">
              <RefreshCw className={isRefreshing ? 'animate-spin' : ''} size={18} />
            </button>
          </div>
        </div>
      </header>

      {dbError && (
        <div className="bg-rose-500/10 border-b border-rose-500/20 px-8 py-2 flex items-center justify-center gap-2 text-rose-400 text-[10px] font-bold uppercase tracking-widest">
           <ShieldAlert size={14} />
           DB Status: {dbError} • Using Local Cache
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-8 md:px-8">
        <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-zinc-800 pb-2 overflow-x-auto no-scrollbar">
          {groups.map(group => (
            <div key={group.id} className="relative group/tab">
              <button onClick={() => setActiveGroupId(group.id)} className={`px-4 py-3 text-sm font-bold rounded-t-lg transition-all whitespace-nowrap flex items-center gap-2 border-b-2 ${activeGroupId === group.id ? 'bg-emerald-600/5 border-emerald-500 text-emerald-400' : 'bg-transparent border-transparent text-zinc-500 hover:text-zinc-300'}`}>
                {editingGroupId === group.id ? (
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <input autoFocus type="text" value={editNameValue} onChange={e => setEditNameValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveRename()} className="bg-zinc-900 border border-zinc-700 rounded px-1 py-0.5 text-xs text-white" />
                    <Check size={14} className="text-emerald-500" onClick={saveRename} />
                  </div>
                ) : (
                  <>
                    {group.name} <span className="text-[10px] opacity-60">({group.tokens?.length || 0})</span>
                    <Edit2 size={12} className="opacity-0 group-hover/tab:opacity-100 transition-opacity ml-1" onClick={(e) => { e.stopPropagation(); startRenaming(group); }} />
                    {groups.length > 1 && <Trash2 size={12} className="opacity-0 group-hover/tab:opacity-100 text-rose-500" onClick={(e) => { e.stopPropagation(); deleteGroup(group.id); }} />}
                  </>
                )}
              </button>
            </div>
          ))}
          <button onClick={createGroup} className="p-3 text-zinc-500 hover:text-emerald-400 transition-colors flex items-center gap-1 text-sm font-bold"><Plus size={16} /> New List</button>
        </div>

        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-zinc-100">{activeGroup.name}</h2>
          <div className="flex flex-wrap items-center gap-2">
            {(['currentMcap', 'volume24h', 'maxMcap', 'athROI', 'addedAt'] as SortField[]).map(field => (
              <button key={field} onClick={() => { if (sortBy === field) setSortDirection(d => d === 'asc' ? 'desc' : 'asc'); else { setSortBy(field); setSortDirection('desc'); } }} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${sortBy === field ? 'bg-emerald-600/10 border-emerald-500/50 text-emerald-400 shadow-[0_0_10px_-2px_rgba(16,185,129,0.3)]' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'}`}>
                {field === 'currentMcap' ? 'MC' : field === 'volume24h' ? 'Vol' : field === 'maxMcap' ? 'ATH' : field === 'athROI' ? 'ROI' : 'Date'}
                {sortBy === field && (sortDirection === 'desc' ? ' ↓' : ' ↑')}
              </button>
            ))}
          </div>
        </div>

        {activeGroup.tokens?.length === 0 ? (
          <div className="glass rounded-2xl p-20 text-center border-dashed border-2 border-zinc-800 text-zinc-500">
             <TrendingUp size={48} className="mx-auto mb-4 opacity-10" />
             <p className="text-sm font-medium">No tokens tracked in this group.</p>
             <p className="text-xs opacity-50 mt-1">Paste a Solana contract address above to begin monitoring.</p>
          </div>
        ) : (
          <div className={layout === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' : 'space-y-4'}>
            {sortedTokens.map((token) => layout === 'grid' ? <TokenCard key={token.id} token={token} onRemove={(tid) => setGroups(prev => prev.map(g => g.id === activeGroupId ? { ...g, tokens: (g.tokens || []).filter(t => t.id !== tid) } : g))} /> : <TokenRow key={token.id} token={token} onRemove={(tid) => setGroups(prev => prev.map(g => g.id === activeGroupId ? { ...g, tokens: (g.tokens || []).filter(t => t.id !== tid) } : g))} />)}
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 glass border-t border-zinc-800 p-3 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center text-[10px] text-zinc-500 uppercase tracking-widest px-4 font-bold">
          <div className="flex gap-6 items-center">
            <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)]"></div> SOL Mainnet</span>
            <span className={`flex items-center gap-2 ${dbError ? 'text-rose-400' : 'text-emerald-400/80'}`}>
              <Database size={12} /> {dbError ? `Sync Issue: ${dbError}` : `Cloud Synced: ${new Date(lastSaved).toLocaleTimeString()}`}
            </span>
          </div>
          <p className="hidden md:block">Watchlist Suite • v2.8 Direct API</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
