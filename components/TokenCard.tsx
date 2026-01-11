import React, { useState } from 'react';
import { WatchlistToken } from '../types';
import { ExternalLink, BarChart3, Trash2, TrendingUp, TrendingDown, ArrowDownCircle, Target, Copy, Check } from 'lucide-react';

interface Props {
  token: WatchlistToken;
  onRemove: (id: string) => void;
}

const TokenCard: React.FC<Props> = ({ token, onRemove }) => {
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
  const athGain = ((token.maxMcap - token.initialMcap) / (token.initialMcap || 1)) * 100;
  const isPositive = currentGain >= 0;

  return (
    <div className="glass rounded-2xl p-6 hover:border-emerald-500/30 transition-all duration-300 group border border-zinc-800 accent-glow relative cursor-grab active:cursor-grabbing h-full flex flex-col shadow-lg">
      {/* Header - Long Name Space Optimization */}
      <div className="flex justify-between items-start mb-5 gap-4">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center overflow-hidden border border-zinc-700 shadow-inner flex-shrink-0">
            {token.imageUrl ? (
              <img src={token.imageUrl} alt={token.symbol} className="w-full h-full object-cover" />
            ) : (
              <span className="text-lg font-bold text-zinc-500">{token.symbol[0]}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 w-full">
              <h3 className="font-bold text-zinc-100 group-hover:text-emerald-400 transition-colors truncate text-base leading-tight flex-1">{token.symbol}</h3>
              <button 
                onClick={(e) => { e.stopPropagation(); handleCopy(); }}
                className={`transition-colors p-1 rounded hover:bg-zinc-800 flex-shrink-0 ${copied ? 'text-emerald-400' : 'text-zinc-600 hover:text-zinc-400'}`}
                title="Copy Contract Address"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
            <p className="text-[11px] text-zinc-500 truncate mono uppercase font-medium mt-0.5">{token.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button 
            onClick={(e) => { e.stopPropagation(); onRemove(token.id); }}
            className="text-zinc-700 hover:text-rose-400 transition-colors p-1.5"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 gap-5 mb-5">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5 font-black">Current Mcap</p>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-base font-semibold text-zinc-100 font-mono">{formatCurrency(token.currentMcap)}</p>
            <div className={`text-[11px] font-bold font-mono px-1.5 py-0.5 rounded flex items-center gap-0.5 whitespace-nowrap ${isPositive ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'}`}>
              {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              {currentGain.toFixed(1)}%
            </div>
          </div>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5 font-black">ATH</p>
          <p className="text-base font-semibold text-emerald-500 font-mono">{formatCurrency(token.maxMcap)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5 font-black">Initial Scan</p>
          <p className="text-base font-semibold text-zinc-400 font-mono">{formatCurrency(token.initialMcap)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5 font-black">24h Vol</p>
          <p className="text-base font-semibold text-zinc-100 font-mono">{formatCurrency(token.volume24h)}</p>
        </div>
      </div>

      {/* Performance Summary Row - Labels Removed, Keep Only Icon and % with Borders */}
      <div className="flex gap-3 mb-6 mt-auto">
        <div className="flex-1 flex items-center justify-center gap-2 p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/30 shadow-sm">
          <Target size={16} className="text-emerald-500/60" />
          <span className="text-xs font-mono font-black text-emerald-400">+{athGain.toFixed(1)}%</span>
        </div>
        <div className="flex-1 flex items-center justify-center gap-2 p-2.5 rounded-xl bg-rose-500/5 border border-rose-500/30 shadow-sm">
          <ArrowDownCircle size={16} className="text-rose-500/60" />
          <span className="text-xs font-mono font-black text-rose-400">{token.maxDrawdown ? token.maxDrawdown.toFixed(1) : '0.0'}%</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <a 
          href={token.dexUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-black uppercase bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-colors border border-zinc-700 shadow-md"
        >
          <ExternalLink size={14} /> DexS
        </a>
        <a 
          href={`https://axiom.trade/meme/${token.pairAddress}?chain=sol`} 
          target="_blank" 
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-black uppercase bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-colors border border-zinc-700 shadow-md"
        >
          <BarChart3 size={14} /> Axiom
        </a>
      </div>
    </div>
  );
};

export default TokenCard;