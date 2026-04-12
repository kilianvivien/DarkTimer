import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { formatTime } from '../lib/utils';
import type { StoredChem } from '../services/chemTypes';

export type CompensationMode = 'off' | 'custom' | 'chems';

interface DeveloperCompensationInputProps {
  developerName: string;
  mode: CompensationMode;
  customPercent: number;
  perRollPercent: number;
  matchedChem: StoredChem | null;
  totalPercent: number;
  addedSeconds: number;
  onModeChange: (mode: CompensationMode) => void;
  onCustomPercentChange: (value: number) => void;
  onPerRollPercentChange: (value: number) => void;
}

const QUICK_PERCENTS = [2, 5, 10, 15];

export const DeveloperCompensationInput: React.FC<DeveloperCompensationInputProps> = ({
  developerName,
  mode,
  customPercent,
  perRollPercent,
  matchedChem,
  totalPercent,
  addedSeconds,
  onModeChange,
  onCustomPercentChange,
  onPerRollPercentChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const isActive = mode !== 'off' && addedSeconds > 0;

  const summary = isActive
    ? `+${formatTime(addedSeconds)}`
    : mode === 'chems' && !matchedChem
      ? 'No match'
      : mode === 'off'
        ? 'Off'
        : `${totalPercent}%`;

  // Whether the current custom % is a quick-pick value
  const isQuickPick = QUICK_PERCENTS.includes(customPercent);

  return (
    <div>
      {/* Header row — always visible, tappable to expand/collapse */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center justify-between py-0.5 group"
      >
        <span className="mono-label group-hover:text-white transition-colors">Reuse Compensation</span>
        <div className="flex items-center gap-2">
          <span className={`font-mono text-[10px] uppercase tracking-widest ${isActive ? 'text-accent-red' : 'text-ui-gray'}`}>
            {summary}
          </span>
          {isOpen
            ? <ChevronUp size={11} className="text-ui-gray" />
            : <ChevronDown size={11} className="text-ui-gray" />
          }
        </div>
      </button>

      {/* Expanded controls */}
      {isOpen && (
        <div className="mt-2 space-y-2">
          {/* Mode toggle */}
          <div className="flex gap-1">
            {(['off', 'custom', 'chems'] as CompensationMode[]).map((value) => {
              const label = value === 'off' ? 'Off' : value === 'custom' ? 'Custom' : 'Auto';
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => onModeChange(value)}
                  className={
                    mode === value
                      ? 'flex-1 border border-white bg-white text-black font-mono text-[10px] uppercase tracking-widest py-1.5 px-1 transition-colors'
                      : 'flex-1 utilitarian-button font-mono text-[10px] uppercase tracking-widest py-1.5 px-1'
                  }
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Custom mode — quick-picks + inline editable input in one row */}
          {mode === 'custom' && (
            <div className="flex gap-1 items-stretch">
              {QUICK_PERCENTS.map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => onCustomPercentChange(pct)}
                  className={
                    customPercent === pct
                      ? 'flex-1 border border-white bg-white text-black font-mono text-[10px] uppercase tracking-widest py-1.5 transition-colors'
                      : 'flex-1 utilitarian-button font-mono text-[10px] uppercase tracking-widest py-1.5'
                  }
                >
                  {pct}%
                </button>
              ))}
              {/* Inline custom input — acts as a 5th chip */}
              <div className={`flex items-center border ${!isQuickPick && customPercent > 0 ? 'border-white bg-white' : 'border-dark-border'} px-2`}>
                <input
                  type="number"
                  value={customPercent === 0 || isQuickPick ? '' : customPercent}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    onCustomPercentChange(Number.isFinite(v) && v >= 0 ? v : 0);
                  }}
                  onFocus={(e) => e.target.select()}
                  placeholder="…"
                  min={0}
                  max={100}
                  className={`bg-transparent outline-none font-mono text-[10px] w-7 text-center ${!isQuickPick && customPercent > 0 ? 'text-black' : 'text-ui-gray'}`}
                />
                <span className={`font-mono text-[10px] ${!isQuickPick && customPercent > 0 ? 'text-black' : 'text-ui-gray'}`}>%</span>
              </div>
            </div>
          )}

          {/* Chems mode */}
          {mode === 'chems' && (
            matchedChem ? (
              <div className="space-y-2">
                {/* Chem info row */}
                <div className="border border-dark-border bg-dark-bg px-4 py-3 flex items-center justify-between">
                  <span className="font-mono text-sm text-white">{matchedChem.name}</span>
                  <span className="font-mono text-sm text-ui-gray">{matchedChem.rollCount} rolls</span>
                </div>
                {/* Per-roll input row */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 flex items-center border border-dark-border bg-dark-bg px-4 py-3">
                    <input
                      type="number"
                      value={perRollPercent}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        onPerRollPercentChange(Number.isFinite(v) && v >= 0 ? v : 0);
                      }}
                      onFocus={(e) => e.target.select()}
                      min={0}
                      max={100}
                      step={0.5}
                      className="bg-transparent outline-none font-mono text-sm text-white w-12 text-center"
                    />
                    <span className="font-mono text-sm text-ui-gray ml-1">% per roll</span>
                  </div>
                  <div className="border border-dark-border bg-dark-bg px-4 py-3 shrink-0">
                    <span className="font-mono text-sm text-white">= {totalPercent.toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="font-mono text-[10px] uppercase tracking-widest text-ui-gray">
                No chem found for &ldquo;{developerName}&rdquo; — add one in Chems or use Custom.
              </p>
            )
          )}
        </div>
      )}
    </div>
  );
};
