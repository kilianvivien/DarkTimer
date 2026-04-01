import React from 'react';

interface TemperatureInputProps {
  value: number;
  onChange: (value: number) => void;
  step?: number;
}

export const TemperatureInput: React.FC<TemperatureInputProps> = ({ value, onChange, step = 0.5 }) => {
  const decrement = () => onChange(Math.round((value - step) * 10) / 10);
  const increment = () => onChange(Math.round((value + step) * 10) / 10);

  return (
    <div className="flex border border-dark-border focus-within:border-accent-red transition-all">
      <button
        type="button"
        onClick={decrement}
        className="px-3 text-ui-gray hover:text-white hover:bg-[#111] transition-colors font-mono text-base border-r border-dark-border"
        aria-label="Decrease temperature"
      >
        −
      </button>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="mobile-form-control-inline bg-transparent px-3 py-2 focus:outline-none font-mono text-center flex-1 min-w-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        step={step}
      />
      <button
        type="button"
        onClick={increment}
        className="px-3 text-ui-gray hover:text-white hover:bg-[#111] transition-colors font-mono text-base border-l border-dark-border"
        aria-label="Increase temperature"
      >
        +
      </button>
    </div>
  );
};
