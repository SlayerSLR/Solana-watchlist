
import React from 'react';
import { WatchlistToken } from '../types';
import { ExternalLink, Trash2, BarChart3, TrendingUp, TrendingDown } from 'lucide-react';

interface Props {
  token: WatchlistToken;
  onRemove: (id: string) => void;
}

const TokenRow: React.FC<Props> = ({ token, onRemove }) => {
  const formatCurrency = (val: number) => {
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
    if (val >= 1_000) return `$${(val / 1_000).toFixed(1)}K`;
    return `$${val.toFixed(2)}`;
  };

  const currentGain = ((token.currentMcap - token.initialMcap) / (token.initialMcap || 1)) * 100;
  const athROI = ((token.maxMcap - token.initialMcap) / (token.initialMcap || 1)) * 100;
  const isPositive = currentGain >= 0;

  return (
    <div className="glass flex flex-wrap items-center gap-4 p-3 hover:border-emerald-500/30 transition-all duration-300 group border border-zinc-800">
      <div className="flex items-center gap-3 w-48">
        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden flex-shrink-0 border border-zinc-700">
          {token.imageUrl ? (
            <img src={token.imageUrl} alt={token.symbol} className="w-full h-full object-cover" />
          ) : (
            <span className="text-[10px] font-bold text-zinc-600">{token.symbol[0]}</span>
          )}
        </div>
        <div className="min-w-0">
          <h3 className="font-bold text-zinc-100 group-hover:text-emerald-400 transition-colors truncate text-sm">{token.symbol}</h3>
          <p className="text-[10px] text-zinc-600 mono truncate">{token.address.slice(0, 4)}...{token.address.slice(-4)}</p>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-2 md:grid-cols-7 gap-4">
        <div>
          <p className="text-[9px] uppercase text-zinc-600 font-bold tracking-tight">Current MC</p>
          <p className="text-xs font-semibold text-zinc-200 font-mono">{formatCurrency(token.currentMcap)}</p>
        </div>
        <div>
          <p className="text-[9px] uppercase text-zinc-600 font-bold tracking-tight">ATH</p>
          <p className="text-xs font-semibold text-emerald-500 font-mono">{formatCurrency(token.maxMcap)}</p>
        </div>
        <div>
          <p className="text-[9px] uppercase text-zinc-600 font-bold tracking-tight">ROI</p>
          <p className="text-xs font-semibold text-emerald-400 font-mono">+{athROI.toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-[9px] uppercase text-zinc-600 font-bold tracking-tight">Drawdown</p>
          <p className="text-xs font-semibold text-rose-500 font-mono">
            {token.maxDrawdown ? token.maxDrawdown.toFixed(1) : '0.0'}%
          </p>
        </div>
        <div>
          <p className="text-[9px] uppercase text-zinc-600 font-bold tracking-tight">24h Vol</p>
          <p className="text-xs font-semibold text-zinc-200 font-mono">{formatCurrency(token.volume24h)}</p>
        </div>
        <div>
          <p className="text-[9px] uppercase text-zinc-600 font-bold tracking-tight">Entry MC</p>
          <p className="text-xs font-semibold text-zinc-400 font-mono">{formatCurrency(token.initialMcap)}</p>
        </div>
        <div className="flex flex-col justify-center">
          <div className={`text-[11px] font-bold font-mono flex items-center gap-1 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {isPositive ? '+' : ''}{currentGain.toFixed(1)}%
          </div>
        </div>
      </div>

      <div className="flex gap-2 ml-auto">
        <a 
          href={token.dexUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg transition-colors border border-zinc-700"
          title="DexScreener"
        >
          <ExternalLink size={14} />
        </a>
        <a 
          href={`https://axiom.trade/meme/${token.pairAddress}?chain=sol`} 
          target="_blank" 
          rel="noopener noreferrer"
          className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg transition-colors border border-zinc-700"
          title="Axiom Trade"
        >
          <BarChart3 size={14} />
        </a>
        <button 
          onClick={() => onRemove(token.id)}
          className="p-2 text-zinc-700 hover:text-rose-400 transition-colors"
          title="Remove"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

export default TokenRow;
