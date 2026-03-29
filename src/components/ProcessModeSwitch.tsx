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
      <div className="grid grid-cols-2 rounded-none border border-dark-border bg-dark-panel p-1">
        {OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={cn(
              'px-3 py-3 text-left font-mono text-[10px] uppercase tracking-[0.2em] transition-colors',
              value === option ? 'bg-white text-black' : 'text-ui-gray hover:text-white',
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
