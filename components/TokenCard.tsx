
import React from 'react';
import { WatchlistToken } from '../types';
import { ExternalLink, BarChart3, Trash2, TrendingUp, TrendingDown } from 'lucide-react';

interface Props {
  token: WatchlistToken;
  onRemove: (id: string) => void;
}

const TokenCard: React.FC<Props> = ({ token, onRemove }) => {
  const formatCurrency = (val: number) => {
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
    if (val >= 1_000) return `$${(val / 1_000).toFixed(1)}K`;
    return `$${val.toFixed(2)}`;
  };

  const gain = ((token.currentMcap - token.initialMcap) / token.initialMcap) * 100;
  const isPositive = gain >= 0;

  return (
    <div className="glass rounded-xl p-5 hover:border-emerald-500/30 transition-all duration-300 group border border-zinc-800 accent-glow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden border border-zinc-700 shadow-inner">
            {token.imageUrl ? (
              <img src={token.imageUrl} alt={token.symbol} className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-bold text-zinc-500">{token.symbol[0]}</span>
            )}
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-zinc-100 group-hover:text-emerald-400 transition-colors truncate">{token.symbol}</h3>
            <p className="text-[10px] text-zinc-500 truncate mono uppercase">{token.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`text-[11px] font-bold font-mono px-2 py-0.5 rounded flex items-center gap-1 ${isPositive ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'}`}>
            {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {isPositive ? '+' : ''}{gain.toFixed(1)}%
          </div>
          <button 
            onClick={() => onRemove(token.id)}
            className="text-zinc-600 hover:text-rose-400 transition-colors p-1"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-[9px] uppercase tracking-wider text-zinc-500 mb-1 font-bold">Current MC</p>
          <p className="text-sm font-semibold text-zinc-100 font-mono">{formatCurrency(token.currentMcap)}</p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-wider text-zinc-500 mb-1 font-bold">24h Vol</p>
          <p className="text-sm font-semibold text-zinc-100 font-mono">{formatCurrency(token.volume24h)}</p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-wider text-zinc-500 mb-1 font-bold">Entry MC</p>
          <p className="text-sm font-semibold text-zinc-400 font-mono">{formatCurrency(token.initialMcap)}</p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-wider text-zinc-500 mb-1 font-bold">Max MC</p>
          <p className="text-sm font-semibold text-emerald-500 font-mono">{formatCurrency(token.maxMcap)}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <a 
          href={token.dexUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-bold uppercase bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors border border-zinc-700"
        >
          <ExternalLink size={12} /> DexS
        </a>
        <a 
          href={`https://axiom.trade/token/${token.address}`} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-bold uppercase bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 rounded-lg transition-colors border border-emerald-500/30"
        >
          <BarChart3 size={12} /> Axiom
        </a>
      </div>
    </div>
  );
};

export default TokenCard;
