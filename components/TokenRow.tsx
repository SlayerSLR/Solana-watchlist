import React, { useState } from 'react';
import { WatchlistToken } from '../types';
import { ExternalLink, Trash2, BarChart3, TrendingUp, TrendingDown, Copy, Check } from 'lucide-react';

interface Props {
  token: WatchlistToken;
  onRemove: (id: string) => void;
}

const TokenRow: React.FC<Props> = ({ token, onRemove }) => {
  const [copied, setCopied] = useState(false);

  const formatCurrency = (val: number) => {
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
    if (val >= 1_000) return `$${(val / 1_000).toFixed(1)}K`;
    return `$${val.toFixed(2)}`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(token.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentGain = ((token.currentMcap - token.initialMcap) / (token.initialMcap || 1)) * 100;
  const athROI = ((token.maxMcap - token.initialMcap) / (token.initialMcap || 1)) * 100;
  const isPositive = currentGain >= 0;

  return (
    <div className="glass flex flex-wrap items-center gap-4 p-2.5 hover:border-emerald-500/30 transition-all duration-300 group border border-zinc-800 cursor-grab active:cursor-grabbing">
      <div className="flex items-center gap-3 w-40 min-w-0 flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden flex-shrink-0 border border-zinc-700">
          {token.imageUrl ? (
            <img src={token.imageUrl} alt={token.symbol} className="w-full h-full object-cover" />
          ) : (
            <span className="text-[10px] font-bold text-zinc-600">{token.symbol[0]}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-zinc-100 group-hover:text-emerald-400 transition-colors truncate text-xs">{token.symbol}</h3>
          <div className="flex items-center gap-1">
            <p className="text-[9px] text-zinc-600 mono truncate">{token.address.slice(0, 4)}...{token.address.slice(-4)}</p>
            <button 
              onClick={(e) => { e.stopPropagation(); handleCopy(); }}
              className={`transition-colors p-0.5 rounded ${copied ? 'text-emerald-400' : 'text-zinc-700 hover:text-zinc-400'}`}
              title="Copy CA"
            >
              {copied ? <Check size={10} /> : <Copy size={10} />}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-2 md:grid-cols-6 gap-3 min-w-0">
        <div className="min-w-0">
          <p className="text-[8px] uppercase text-zinc-600 font-black tracking-tight">Current Mcap</p>
          <div className="flex items-center gap-1">
            <p className="text-[11px] font-bold text-zinc-200 font-mono truncate">{formatCurrency(token.currentMcap)}</p>
            <div className={`text-[10px] font-bold font-mono ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isPositive ? '+' : ''}{currentGain.toFixed(1)}%
            </div>
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-[8px] uppercase text-zinc-600 font-black tracking-tight">ATH</p>
          <p className="text-[11px] font-bold text-emerald-500 font-mono truncate">{formatCurrency(token.maxMcap)}</p>
        </div>
        <div className="min-w-0">
          <p className="text-[8px] uppercase text-zinc-600 font-black tracking-tight">ATH ROI</p>
          <p className="text-[11px] font-bold text-emerald-400 font-mono truncate">+{athROI.toFixed(1)}%</p>
        </div>
        <div className="min-w-0">
          <p className="text-[8px] uppercase text-zinc-600 font-black tracking-tight">DD</p>
          <p className="text-[11px] font-bold text-rose-500 font-mono truncate">
            {token.maxDrawdown ? token.maxDrawdown.toFixed(1) : '0.0'}%
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-[8px] uppercase text-zinc-600 font-black tracking-tight">24h Vol</p>
          <p className="text-[11px] font-bold text-zinc-200 font-mono truncate">{formatCurrency(token.volume24h)}</p>
        </div>
        <div className="min-w-0">
          <p className="text-[8px] uppercase text-zinc-600 font-black tracking-tight">Initial</p>
          <p className="text-[11px] font-bold text-zinc-400 font-mono truncate">{formatCurrency(token.initialMcap)}</p>
        </div>
      </div>

      <div className="flex gap-2 ml-auto flex-shrink-0">
        <a 
          href={token.dexUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded transition-colors border border-zinc-700"
          title="DexScreener"
        >
          <ExternalLink size={14} />
        </a>
        <a 
          href={`https://axiom.trade/meme/${token.pairAddress}?chain=sol`} 
          target="_blank" 
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded transition-colors border border-zinc-700"
          title="Axiom Trade"
        >
          <BarChart3 size={14} />
        </a>
        <button 
          onClick={(e) => { e.stopPropagation(); onRemove(token.id); }}
          className="p-1.5 text-zinc-700 hover:text-rose-400 transition-colors"
          title="Remove"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

export default TokenRow;