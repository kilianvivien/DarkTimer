import React from 'react';
import { cn } from '../lib/utils';
import { ProcessMode, getProcessLabel } from '../services/recipe';

interface ProcessModeSwitchProps {
  value: ProcessMode;
  onChange: (mode: ProcessMode) => void;
}

const OPTIONS: ProcessMode[] = ['bw', 'color'];

export const ProcessModeSwitch: React.FC<ProcessModeSwitchProps> = ({ value, onChange }) => {
  return (
    <div className="space-y-2">
      <label className="mono-label">Process</label>
      <div className="grid grid-cols-2 border border-dark-border">
        {OPTIONS.map((option, i) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={cn(
              'px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.2em] transition-colors',
              i === 0 && 'border-r border-dark-border',
              value === option ? 'bg-white text-black' : 'text-ui-gray hover:text-white hover:bg-[#0f0f0f]',
            )}
            aria-pressed={value === option}
          >
            {getProcessLabel(option)}
          </button>
        ))}
      </div>
    </div>
  );
};
