
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { LayoutGrid, List, Plus, RefreshCw, Zap, TrendingUp, BarChart, AlertCircle, Edit2, Check, X, Trash2 } from 'lucide-react';
import { WatchlistToken, LayoutMode, SortField, SortDirection, WatchlistGroup } from './types';
import { fetchTokenData, fetchMultipleTokens } from './services/dexscreener';
import TokenCard from './components/TokenCard';
import TokenRow from './components/TokenRow';

const App: React.FC = () => {
  const [groups, setGroups] = useState<WatchlistGroup[]>(() => {
    const saved = localStorage.getItem('solana-watcher-groups');
    if (saved) return JSON.parse(saved);
    return [{ id: 'default', name: 'Main Watchlist', tokens: [] }];
  });
  
  const [activeGroupId, setActiveGroupId] = useState<string>(groups[0].id);
  const [layout, setLayout] = useState<LayoutMode>('grid');
  const [newAddress, setNewAddress] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Renaming state
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');

  // Sorting state
  const [sortBy, setSortBy] = useState<SortField>('addedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Ref to prevent overlapping refresh requests
  const isRefreshingRef = useRef(false);

  const activeGroup = useMemo(() => 
    groups.find(g => g.id === activeGroupId) || groups[0], 
  [groups, activeGroupId]);

  const totalTokens = useMemo(() => 
    groups.reduce((acc, g) => acc + g.tokens.length, 0), 
  [groups]);

  // Persistence
  useEffect(() => {
    localStorage.setItem('solana-watcher-groups', JSON.stringify(groups));
  }, [groups]);

  const refreshAllTokens = useCallback(async (isManual = false) => {
    if (totalTokens === 0 || isRefreshingRef.current) return;
    
    if (isManual) setIsRefreshing(true);
    isRefreshingRef.current = true;
    
    try {
      // Fix: Explicitly typed allAddresses as string[] to resolve TS error
      const allAddresses: string[] = Array.from(new Set(groups.flatMap(g => g.tokens.map(t => t.address))));
      const updatedDataMap = await fetchMultipleTokens(allAddresses);
      
      setGroups(prevGroups => prevGroups.map(group => ({
        ...group,
        tokens: group.tokens.map(token => {
          const newData = updatedDataMap.get(token.address);
          if (newData) {
            const currentMcap = newData.currentMcap || token.currentMcap;
            return {
              ...token,
              ...newData,
              maxMcap: Math.max(token.maxMcap, currentMcap),
              lastUpdated: Date.now()
            };
          }
          return token;
        })
      })));
    } catch (err) {
      if (isManual) setError("Failed to refresh market data.");
    } finally {
      if (isManual) setIsRefreshing(false);
      isRefreshingRef.current = false;
    }
  }, [groups, totalTokens]);

  useEffect(() => {
    const interval = setInterval(() => refreshAllTokens(false), 1000);
    return () => clearInterval(interval);
  }, [refreshAllTokens]);

  const createGroup = () => {
    const newGroup: WatchlistGroup = {
      id: crypto.randomUUID(),
      name: `Group ${groups.length + 1}`,
      tokens: []
    };
    setGroups(prev => [...prev, newGroup]);
    setActiveGroupId(newGroup.id);
  };

  const deleteGroup = (id: string) => {
    if (groups.length <= 1) return;
    const group = groups.find(g => g.id === id);
    if (group && group.tokens.length > 0) {
      if (!confirm(`Delete group "${group.name}" and all its tokens?`)) return;
    }
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
    if (!newAddress.trim()) return;
    if (totalTokens >= 200) {
      setError("Total watchlist limit of 200 tokens reached.");
      return;
    }
    const cleanAddress = newAddress.trim();
    if (activeGroup.tokens.some(t => t.address === cleanAddress)) {
      setError("Token already in this group.");
      return;
    }

    setIsAdding(true);
    setError(null);
    try {
      const data = await fetchTokenData(cleanAddress);
      if (data) {
        const newToken: WatchlistToken = {
          id: crypto.randomUUID(),
          address: data.address!,
          symbol: data.symbol || '?',
          name: data.name || 'Unknown',
          initialMcap: data.currentMcap || 0,
          maxMcap: data.currentMcap || 0,
          currentMcap: data.currentMcap || 0,
          volume24h: data.volume24h || 0,
          volume1h: data.volume1h || 0,
          priceNative: data.priceNative || '0',
          priceUsd: data.priceUsd || '0',
          fdv: data.fdv || 0,
          imageUrl: data.imageUrl,
          dexUrl: data.dexUrl!,
          addedAt: Date.now(),
          lastUpdated: Date.now()
        };
        setGroups(prev => prev.map(g => g.id === activeGroupId ? { ...g, tokens: [newToken, ...g.tokens] } : g));
        setNewAddress('');
      } else {
        setError("Token not found on Solana.");
      }
    } catch (err) {
      setError("Error adding token.");
    } finally {
      setIsAdding(false);
    }
  };

  const removeToken = (tokenId: string) => {
    setGroups(prev => prev.map(g => g.id === activeGroupId ? { ...g, tokens: g.tokens.filter(t => t.id !== tokenId) } : g));
  };

  const sortedTokens = useMemo(() => {
    return [...activeGroup.tokens].sort((a, b) => {
      const valA = a[sortBy] ?? 0;
      const valB = b[sortBy] ?? 0;
      return sortDirection === 'desc' ? (valB as number) - (valA as number) : (valA as number) - (valB as number);
    });
  }, [activeGroup.tokens, sortBy, sortDirection]);

  const volumeLeaders1h = useMemo(() => {
    const all = groups.flatMap(g => g.tokens);
    // Fix: Explicitly typing Map and using Array.from to resolve "unknown" property access errors
    const uniqueMap = new Map<string, WatchlistToken>(all.map(item => [item.address, item]));
    return Array.from(uniqueMap.values())
      .sort((a, b) => b.volume1h - a.volume1h).slice(0, 6);
  }, [groups]);

  const volumeLeaders24h = useMemo(() => {
    const all = groups.flatMap(g => g.tokens);
    // Fix: Explicitly typing Map and using Array.from to resolve "unknown" property access errors
    const uniqueMap = new Map<string, WatchlistToken>(all.map(item => [item.address, item]));
    return Array.from(uniqueMap.values())
      .sort((a, b) => b.volume24h - a.volume24h).slice(0, 6);
  }, [groups]);

  const toggleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('desc');
    }
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-zinc-800 px-4 py-4 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600 rounded-lg shadow-[0_0_15px_-3px_rgba(16,185,129,0.4)]">
              <Zap className="text-white fill-current" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">Solana <span className="text-emerald-400">Watchlist</span></h1>
              <p className="text-xs text-zinc-500 mono">{totalTokens}/200 Total Tracked</p>
            </div>
          </div>

          <div className="flex flex-1 max-w-xl">
            <form onSubmit={addToken} className="relative w-full">
              <input
                type="text"
                placeholder={`Add token to ${activeGroup.name}...`}
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:border-emerald-500 transition-colors text-white placeholder-zinc-600"
              />
              <button 
                type="submit" 
                disabled={isAdding}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg transition-all"
              >
                {isAdding ? <RefreshCw className="animate-spin" size={18} /> : <Plus size={18} />}
              </button>
            </form>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800">
              <button 
                onClick={() => setLayout('grid')}
                className={`p-2 rounded-md transition-all ${layout === 'grid' ? 'bg-zinc-800 text-emerald-400 shadow-inner' : 'text-zinc-500 hover:text-zinc-300'}`}
                title="Grid Layout"
              >
                <LayoutGrid size={18} />
              </button>
              <button 
                onClick={() => setLayout('list')}
                className={`p-2 rounded-md transition-all ${layout === 'list' ? 'bg-zinc-800 text-emerald-400 shadow-inner' : 'text-zinc-500 hover:text-zinc-300'}`}
                title="List Layout"
              >
                <List size={18} />
              </button>
            </div>
            <button 
              onClick={() => refreshAllTokens(true)}
              disabled={isRefreshing}
              className="p-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded-xl transition-all border border-zinc-800 disabled:opacity-50"
              title="Refresh All"
            >
              <RefreshCw className={isRefreshing ? 'animate-spin' : ''} size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 md:px-8">
        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-center gap-3 text-red-400">
            <AlertCircle size={20} />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Dashboard Stats */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2 text-zinc-100">
              <BarChart className="text-emerald-500" size={20} />
              Global Volume Leaders
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="glass rounded-xl p-5 border-l-4 border-l-emerald-500">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center justify-between">
                Highest Volume (1H)
                <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-mono">LIVE</span>
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {volumeLeaders1h.length > 0 ? volumeLeaders1h.map((token, idx) => (
                  <div key={token.address} className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-800/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-zinc-600 font-mono text-xs w-4">{idx + 1}.</span>
                      <div className="w-6 h-6 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0 border border-zinc-700">
                        {token.imageUrl ? <img src={token.imageUrl} className="w-full h-full object-cover" /> : null}
                      </div>
                      <span className="font-bold text-zinc-100">{token.symbol}</span>
                    </div>
                    <span className="text-emerald-400 font-mono text-sm">${token.volume1h.toLocaleString()}</span>
                  </div>
                )) : <p className="text-xs text-zinc-600 italic py-4 text-center">No volume data yet.</p>}
              </div>
            </div>
            <div className="glass rounded-xl p-5 border-l-4 border-l-emerald-600">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center justify-between">
                Highest Volume (24H)
                <span className="bg-emerald-900/20 text-emerald-500 px-2 py-0.5 rounded text-[10px] font-mono">DAILY</span>
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {volumeLeaders24h.length > 0 ? volumeLeaders24h.map((token, idx) => (
                  <div key={token.address} className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-800/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-zinc-600 font-mono text-xs w-4">{idx + 1}.</span>
                      <div className="w-6 h-6 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0 border border-zinc-700">
                        {token.imageUrl ? <img src={token.imageUrl} className="w-full h-full object-cover" /> : null}
                      </div>
                      <span className="font-bold text-zinc-100">{token.symbol}</span>
                    </div>
                    <span className="text-emerald-500 font-mono text-sm">${token.volume24h.toLocaleString()}</span>
                  </div>
                )) : <p className="text-xs text-zinc-600 italic py-4 text-center">No volume data yet.</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Groups Navigation */}
        <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-zinc-800 pb-2 overflow-x-auto no-scrollbar">
          {groups.map(group => (
            <div key={group.id} className="relative group/tab">
              <button
                onClick={() => setActiveGroupId(group.id)}
                className={`px-4 py-3 text-sm font-bold rounded-t-lg transition-all whitespace-nowrap flex items-center gap-2 border-b-2 ${activeGroupId === group.id ? 'bg-emerald-600/5 border-emerald-500 text-emerald-400' : 'bg-transparent border-transparent text-zinc-500 hover:text-zinc-300'}`}
              >
                {editingGroupId === group.id ? (
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <input
                      autoFocus
                      type="text"
                      value={editNameValue}
                      onChange={e => setEditNameValue(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveRename()}
                      className="bg-zinc-900 border border-zinc-700 rounded px-1 py-0.5 text-xs text-white outline-none focus:border-emerald-500"
                    />
                    <Check size={14} className="text-emerald-500 cursor-pointer" onClick={saveRename} />
                    <X size={14} className="text-zinc-500 cursor-pointer" onClick={() => setEditingGroupId(null)} />
                  </div>
                ) : (
                  <>
                    {group.name}
                    <span className="text-[10px] opacity-60">({group.tokens.length})</span>
                    <div className="flex gap-1 opacity-0 group-hover/tab:opacity-100 transition-opacity ml-2">
                      <Edit2 size={12} className="hover:text-white" onClick={(e) => { e.stopPropagation(); startRenaming(group); }} />
                      {groups.length > 1 && <Trash2 size={12} className="hover:text-rose-500" onClick={(e) => { e.stopPropagation(); deleteGroup(group.id); }} />}
                    </div>
                  </>
                )}
              </button>
            </div>
          ))}
          <button 
            onClick={createGroup}
            className="p-3 text-zinc-500 hover:text-emerald-400 transition-colors flex items-center gap-1 text-sm font-bold"
          >
            <Plus size={16} /> New List
          </button>
        </div>

        {/* Watchlist Section Header with Sorting */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-3">
              {activeGroup.name}
            </h2>
            
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mr-2">Sort by:</span>
              {(['currentMcap', 'volume24h', 'maxMcap', 'addedAt'] as SortField[]).map(field => (
                <button 
                  key={field}
                  onClick={() => toggleSort(field)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${sortBy === field ? 'bg-emerald-600/10 border-emerald-500/50 text-emerald-400' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'}`}
                >
                  {field === 'currentMcap' ? 'Market Cap' : field === 'volume24h' ? '24h Vol' : field === 'maxMcap' ? 'Max Cap' : 'Date Added'}
                  {sortBy === field && (sortDirection === 'desc' ? ' ↓' : ' ↑')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {activeGroup.tokens.length === 0 ? (
          <div className="glass rounded-2xl p-20 flex flex-col items-center justify-center text-center border-dashed border-2 border-zinc-800">
            <div className="p-6 bg-zinc-900 rounded-full mb-6 border border-zinc-800">
              <TrendingUp size={48} className="text-zinc-700" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-zinc-300">Group is Empty</h3>
            <p className="text-zinc-500 max-w-sm text-sm">Add contract addresses to the <b>{activeGroup.name}</b> group to start tracking performance.</p>
          </div>
        ) : (
          <div className={layout === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' : 'space-y-4'}>
            {sortedTokens.map((token) => (
              layout === 'grid' ? (
                <TokenCard key={token.id} token={token} onRemove={removeToken} />
              ) : (
                <TokenRow key={token.id} token={token} onRemove={removeToken} />
              )
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 glass border-t border-zinc-800 p-3 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center text-[10px] text-zinc-500 uppercase tracking-widest px-4 font-medium">
          <div className="flex gap-6">
            <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div> Solana Mainnet</span>
            <span className="opacity-60">Status: Operational</span>
          </div>
          <p className="hidden md:block">Solana Watchlist Suite v1.5</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
