
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
    <div className="glass rounded-xl p-5 hover:border-emerald-500/30 transition-all duration-300 group border border-zinc-800 accent-glow relative">
      {/* Header */}
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
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-zinc-100 group-hover:text-emerald-400 transition-colors truncate">{token.symbol}</h3>
              <button 
                onClick={handleCopy}
                className={`transition-colors p-1 rounded hover:bg-zinc-800 ${copied ? 'text-emerald-400' : 'text-zinc-600 hover:text-zinc-400'}`}
                title="Copy Contract Address"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </div>
            <p className="text-[10px] text-zinc-500 truncate mono uppercase">{token.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`text-[11px] font-bold font-mono px-2 py-0.5 rounded flex items-center gap-1 ${isPositive ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'}`}>
            {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {isPositive ? '+' : ''}{currentGain.toFixed(1)}%
          </div>
          <button 
            onClick={() => onRemove(token.id)}
            className="text-zinc-700 hover:text-rose-400 transition-colors p-1"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-[9px] uppercase tracking-wider text-zinc-500 mb-1 font-bold">Current Mcap</p>
          <p className="text-sm font-semibold text-zinc-100 font-mono">{formatCurrency(token.currentMcap)}</p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-wider text-zinc-500 mb-1 font-bold">ATH</p>
          <p className="text-sm font-semibold text-emerald-500 font-mono">{formatCurrency(token.maxMcap)}</p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-wider text-zinc-500 mb-1 font-bold">Initial Scan</p>
          <p className="text-sm font-semibold text-zinc-400 font-mono">{formatCurrency(token.initialMcap)}</p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-wider text-zinc-500 mb-1 font-bold">24h Vol</p>
          <p className="text-sm font-semibold text-zinc-100 font-mono">{formatCurrency(token.volume24h)}</p>
        </div>
      </div>

      {/* Performance Summary Row */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 flex items-center justify-between p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
          <Target size={12} className="text-emerald-500/60" />
          <span className="text-[11px] font-mono font-bold text-emerald-400">+{athGain.toFixed(1)}%</span>
        </div>
        <div className="flex-1 flex items-center justify-between p-2 rounded-lg bg-rose-500/5 border border-rose-500/10">
          <ArrowDownCircle size={12} className="text-rose-500/60" />
          <span className="text-[11px] font-mono font-bold text-rose-400">{token.maxDrawdown ? token.maxDrawdown.toFixed(1) : '0.0'}%</span>
        </div>
      </div>

      {/* Action Buttons */}
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
          href={`https://axiom.trade/meme/${token.pairAddress}?chain=sol`} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-bold uppercase bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors border border-zinc-700"
        >
          <BarChart3 size={12} /> Axiom
        </a>
      </div>
    </div>
  );
};

export default TokenCard;
