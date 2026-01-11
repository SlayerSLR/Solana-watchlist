import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { LayoutGrid, List, Plus, RefreshCw, Zap, TrendingUp, BarChart, AlertCircle, Edit2, Check, X, Trash2, Share2, Database, ShieldAlert, Layers, Search, CloudOff, Globe, Cloud, Filter } from 'lucide-react';
import { WatchlistToken, LayoutMode, SortField, SortDirection, WatchlistGroup } from './types';
import { fetchTokenData, fetchMultipleTokens } from './services/dexscreener';
import TokenCard from './components/TokenCard';
import TokenRow from './components/TokenRow';

const App: React.FC = () => {
  const [watchlistId, setWatchlistId] = useState<string>(() => {
    const hashId = window.location.hash.replace('#', '');
    if (hashId) return hashId;
    const saved = localStorage.getItem('solana-watchlist-id');
    if (saved) return saved;
    const newId = crypto.randomUUID().slice(0, 8);
    return newId;
  });

  const [groups, setGroups] = useState<WatchlistGroup[]>(() => {
    const saved = localStorage.getItem(`local-watchlist-data-${watchlistId}`);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return [{ id: 'default', name: 'Main Watchlist', tokens: [] }]; }
    }
    return [{ id: 'default', name: 'Main Watchlist', tokens: [] }];
  });

  const [activeGroupId, setActiveGroupId] = useState<string>('default');
  const [layout, setLayout] = useState<LayoutMode>('grid');
  const [newAddress, setNewAddress] = useState('');
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCloudEnabled, setIsCloudEnabled] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<number>(Date.now());
  
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('addedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const isRefreshingRef = useRef(false);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  useEffect(() => {
    window.location.hash = watchlistId;
    localStorage.setItem('solana-watchlist-id', watchlistId);
  }, [watchlistId]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/watchlist?id=${watchlistId}`);
        const contentType = res.headers.get("content-type");
        
        if (res.ok && contentType && contentType.includes("application/json")) {
          const result = await res.json();
          if (result && !result.error) {
            setIsCloudEnabled(true);
            const watchlistData = result.data;
            if (watchlistData && Array.isArray(watchlistData)) {
              setGroups(watchlistData);
              if (watchlistData[0]) setActiveGroupId(watchlistData[0].id);
            }
          } else if (result?.error?.includes('keys missing')) {
            setIsCloudEnabled(false);
          } else {
            setDbError(result?.error || "Sync Error");
          }
        } else {
          setIsCloudEnabled(false);
        }
      } catch (e: any) {
        console.error("Cloud Connection Failed:", e.message);
        setIsCloudEnabled(false);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [watchlistId]);

  useEffect(() => {
    if (isLoading) return;
    
    localStorage.setItem(`local-watchlist-data-${watchlistId}`, JSON.stringify(groups));
    setLastSaved(Date.now());

    if (!isCloudEnabled) return;

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/watchlist?id=${watchlistId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(groups)
        });
        
        const contentType = res.headers.get("content-type");
        if (res.ok && contentType && contentType.includes("application/json")) {
          const result = await res.json();
          if (result && result.error) throw new Error(result.error);
          setDbError(null);
        }
      } catch (e) {
        setDbError("Sync paused");
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [groups, watchlistId, isLoading, isCloudEnabled]);

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
    } catch (err) { /* silent */ } finally {
      if (isManual) setIsRefreshing(false);
      isRefreshingRef.current = false;
    }
  }, [groups, totalTokens]);

  useEffect(() => {
    const interval = setInterval(() => refreshAllTokens(false), 20000);
    return () => clearInterval(interval);
  }, [refreshAllTokens]);

  const handleSortEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    if (dragItem.current === dragOverItem.current) return;
    
    const copyListItems = [...activeGroup.tokens];
    const dragItemContent = copyListItems[dragItem.current];
    copyListItems.splice(dragItem.current, 1);
    copyListItems.splice(dragOverItem.current, 0, dragItemContent);
    
    dragItem.current = null;
    dragOverItem.current = null;
    
    setGroups(prev => prev.map(g => g.id === activeGroupId ? { ...g, tokens: copyListItems } : g));
  };

  const createGroup = () => {
    const newGroup: WatchlistGroup = { id: crypto.randomUUID(), name: `List ${groups.length + 1}`, tokens: [] };
    setGroups(prev => [...prev, newGroup]);
    setActiveGroupId(newGroup.id);
  };

  const deleteGroup = (id: string) => {
    if (groups.length <= 1) return;
    const remaining = groups.filter(g => g.id !== id);
    setGroups(remaining);
    if (activeGroupId === id) setActiveGroupId(remaining[0].id);
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
    const filtered = (activeGroup.tokens || []).filter(t => {
      if (!localSearchTerm) return true;
      const term = localSearchTerm.toLowerCase();
      return (
        t.name.toLowerCase().includes(term) ||
        t.symbol.toLowerCase().includes(term) ||
        t.address.toLowerCase().includes(term)
      );
    });

    if (localSearchTerm || sortBy !== 'addedAt' || sortDirection !== 'desc') {
        return [...filtered].sort((a, b) => {
          let valA: number, valB: number;
          if (sortBy === 'athROI') {
            valA = ((a.maxMcap - a.initialMcap) / (a.initialMcap || 1)) * 100;
            valB = ((b.maxMcap - b.initialMcap) / (b.initialMcap || 1)) * 100;
          } else {
            valA = (a[sortBy] as number) || 0;
            valB = (b[sortBy] as number) || 0;
          }
          return sortDirection === 'desc' ? valB - valA : valA - valB;
        });
    }
    return filtered;
  }, [activeGroup.tokens, sortBy, sortDirection, localSearchTerm]);

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-500 font-mono text-sm">
      <div className="flex flex-col items-center gap-4">
        <Database className="animate-pulse text-emerald-500" size={32} />
        <p className="tracking-widest uppercase text-[10px]">Accessing Vault...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-20">
      {/* Reverted Header to taller spacious design with glass look - Increased max-width */}
      <header className="sticky top-0 z-50 glass px-4 h-20 md:px-8 shadow-2xl flex items-center">
        <div className="max-w-[1800px] mx-auto w-full flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-emerald-600 rounded-xl shadow-[0_0_20px_-5px_rgba(16,185,129,0.5)] active:scale-95 transition-transform cursor-pointer flex-shrink-0">
              <Zap className="text-white fill-current" size={20} />
            </div>
            <div className="hidden sm:block min-w-0">
              <h1 className="text-base font-black tracking-tight text-white flex items-center gap-2 whitespace-nowrap">
                SOLANA <span className="text-emerald-400">WATCHLIST</span>
              </h1>
              <div className="flex items-center gap-2">
                 <div className="flex items-center gap-1.5 bg-zinc-900/80 px-1.5 py-0.5 rounded border border-zinc-800">
                    <span className="text-[8px] text-zinc-500 uppercase tracking-tighter font-bold">Vault</span> 
                    <span className="text-[8px] text-zinc-300 font-mono">{watchlistId}</span>
                 </div>
                 <button onClick={() => {navigator.clipboard.writeText(window.location.href); alert('Link copied!')}} className="text-zinc-500 hover:text-emerald-400 p-0.5 transition-colors" title="Share Watchlist"><Share2 size={12} /></button>
              </div>
            </div>
          </div>

          <div className="flex-1 max-w-xl mx-auto flex items-center">
            <form onSubmit={addToken} className="relative w-full group">
              <input
                type="text"
                placeholder={`Paste CA to monitor in main watchlist...`}
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-xl py-2.5 pl-5 pr-12 text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 text-white placeholder-zinc-500 transition-all font-medium"
              />
              <button type="submit" disabled={isAdding} className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-50 transition-all active:scale-90 flex items-center justify-center shadow-lg shadow-emerald-600/20">
                {isAdding ? <RefreshCw className="animate-spin" size={16} /> : <Plus size={20} />}
              </button>
            </form>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-zinc-900/60 rounded-xl p-1 border border-white/5 flex-shrink-0">
              <button onClick={() => setLayout('grid')} className={`p-1.5 rounded-lg transition-all ${layout === 'grid' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-500 hover:text-zinc-400'}`}><LayoutGrid size={18} /></button>
              <button onClick={() => setLayout('list')} className={`p-1.5 rounded-lg transition-all ${layout === 'list' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-500 hover:text-zinc-400'}`}><List size={18} /></button>
            </div>
            <button onClick={() => refreshAllTokens(true)} disabled={isRefreshing} className="p-2 bg-zinc-900/60 text-zinc-400 rounded-xl border border-white/5 hover:text-emerald-400 transition-all active:scale-90 flex-shrink-0">
              <RefreshCw className={isRefreshing ? 'animate-spin' : ''} size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content - Increased max-width */}
      <main className="max-w-[1800px] mx-auto px-4 py-8 md:px-8">
        <div className="mb-6 flex flex-wrap items-center gap-3 border-b border-zinc-800/50 pb-1 overflow-x-auto no-scrollbar">
          {groups.map(group => (
            <div key={group.id} className="relative group/tab">
              <button onClick={() => setActiveGroupId(group.id)} className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-t-xl transition-all whitespace-nowrap flex items-center gap-3 border-b-2 ${activeGroupId === group.id ? 'bg-emerald-600/5 border-emerald-500 text-emerald-400' : 'bg-transparent border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/30'}`}>
                {editingGroupId === group.id ? (
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <input autoFocus type="text" value={editNameValue} onChange={e => setEditNameValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveRename()} className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-[10px] text-white outline-none focus:border-emerald-500 w-28" />
                    <Check size={12} className="text-emerald-500 cursor-pointer" onClick={saveRename} />
                  </div>
                ) : (
                  <>
                    {group.name} 
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${activeGroupId === group.id ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-zinc-900 text-zinc-600 border-zinc-800'}`}>
                      {group.tokens?.length || 0}
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover/tab:opacity-100 transition-opacity">
                      <Edit2 size={12} className="cursor-pointer hover:text-emerald-400" onClick={(e) => { e.stopPropagation(); startRenaming(group); }} />
                      {groups.length > 1 && <Trash2 size={12} className="text-rose-600 cursor-pointer hover:text-rose-400" onClick={(e) => { e.stopPropagation(); deleteGroup(group.id); }} />}
                    </div>
                  </>
                )}
              </button>
            </div>
          ))}
          <button onClick={createGroup} className="px-3 py-2 text-zinc-600 hover:text-emerald-400 transition-all flex items-center gap-2 text-xs font-black uppercase tracking-widest"><Plus size={16} /> NEW LIST</button>
        </div>

        <div className="mb-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex flex-col md:flex-row md:items-center gap-6 flex-1">
            <h2 className="text-2xl font-black text-white tracking-tight shrink-0">{activeGroup.name}</h2>
            <div className="relative w-full max-w-sm group">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-emerald-500 transition-colors">
                <Filter size={14} />
              </div>
              <input
                type="text"
                placeholder="Filter by name or CA..."
                value={localSearchTerm}
                onChange={(e) => setLocalSearchTerm(e.target.value)}
                className="w-full bg-zinc-900/40 border border-zinc-800/80 rounded-xl py-2 pl-10 pr-4 text-xs focus:outline-none focus:border-emerald-500/30 text-zinc-300 placeholder-zinc-700 transition-all font-medium"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 bg-zinc-900/50 p-1 rounded-xl border border-zinc-800/80">
            <span className="text-[9px] text-zinc-600 font-black uppercase tracking-[0.2em] px-3">Sort By</span>
            {(['currentMcap', 'volume24h', 'maxMcap', 'athROI', 'addedAt'] as SortField[]).map(field => (
              <button key={field} onClick={() => { if (sortBy === field) setSortDirection(d => d === 'asc' ? 'desc' : 'asc'); else { setSortBy(field); setSortDirection('desc'); } }} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all ${sortBy === field ? 'bg-zinc-800 text-emerald-400 shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}>
                {field === 'currentMcap' ? 'MC' : field === 'volume24h' ? 'Vol' : field === 'maxMcap' ? 'ATH' : field === 'athROI' ? 'ROI' : 'Date'}
                {sortBy === field && (sortDirection === 'desc' ? ' ↓' : ' ↑')}
              </button>
            ))}
          </div>
        </div>

        {activeGroup.tokens?.length === 0 ? (
          <div className="glass rounded-[2rem] p-24 text-center border-dashed border-2 border-zinc-800/30 bg-zinc-900/10 relative overflow-hidden">
             <div className="relative z-10">
                <div className="w-20 h-20 bg-zinc-950/80 rounded-2xl flex items-center justify-center mx-auto mb-8 border border-zinc-800 shadow-2xl">
                    <TrendingUp size={36} className="text-zinc-700 animate-pulse" />
                </div>
                <h3 className="text-lg font-black text-zinc-400 uppercase tracking-[0.2em] mb-3">Your list is empty</h3>
                <p className="text-sm text-zinc-600 font-medium max-w-sm mx-auto leading-relaxed">Paste a contract address in the header to start professional monitoring.</p>
             </div>
          </div>
        ) : (
          <div className={layout === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-8' : 'space-y-4'}>
            {sortedTokens.map((token, index) => (
              <div 
                key={token.id}
                draggable={sortBy === 'addedAt' && !localSearchTerm}
                onDragStart={() => (dragItem.current = index)}
                onDragEnter={() => (dragOverItem.current = index)}
                onDragEnd={handleSortEnd}
                onDragOver={(e) => e.preventDefault()}
                className="transition-all duration-300"
              >
                {layout === 'grid' ? (
                  <TokenCard 
                    token={token} 
                    onRemove={(tid) => setGroups(prev => prev.map(g => g.id === activeGroupId ? { ...g, tokens: (g.tokens || []).filter(t => t.id !== tid) } : g))} 
                  />
                ) : (
                  <TokenRow 
                    token={token} 
                    onRemove={(tid) => setGroups(prev => prev.map(g => g.id === activeGroupId ? { ...g, tokens: (g.tokens || []).filter(t => t.id !== tid) } : g))} 
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Reverted Footer to taller spacious design with glass look - Increased max-width */}
      <footer className="fixed bottom-0 left-0 right-0 glass py-2 px-4 z-50 shadow-2xl border-t border-white/5">
        <div className="max-w-[1800px] mx-auto flex flex-col sm:flex-row justify-between items-center text-[9px] text-zinc-500 uppercase tracking-[0.2em] px-4 font-black gap-2">
          <div className="flex flex-wrap gap-6 items-center justify-center">
            <span className="flex items-center gap-2.5 bg-black/20 px-3 py-1 rounded-full border border-white/5"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> Solana Mainnet</span>
            <span className="flex items-center gap-2 px-3 py-1 rounded-full border border-white/5 bg-black/20">
              <Layers size={14} className="text-zinc-600" /> TRACKED: {totalTokens}
            </span>
            <span className={`flex items-center gap-2 px-3 py-1 rounded-full border bg-black/20 border-white/5 ${!isCloudEnabled ? 'text-zinc-500' : dbError ? 'text-rose-500' : 'text-emerald-500/80'}`}>
              {!isCloudEnabled ? <CloudOff size={14} /> : <Cloud size={14} className="text-emerald-500" />} 
              {!isCloudEnabled ? 'LOCAL MODE' : dbError ? `SYNC LOST` : `CLOUD SYNCED`}
            </span>
          </div>
          <p className="opacity-30 font-mono tracking-tighter">SW-PRO v3.3.2 • SOLANA ON-CHAIN ANALYTICS</p>
        </div>
      </footer>
    </div>
  );
};

export default App;