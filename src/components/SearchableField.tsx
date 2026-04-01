import React, { useDeferredValue, useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';
import type { SearchableOption } from '../services/searchCatalog';

interface SearchableFieldProps {
  emptyLabel?: string;
  label: string;
  onChange: (value: string) => void;
  options: SearchableOption[];
  placeholder: string;
  value: string;
}

function matchesOption(option: SearchableOption, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return [option.label, option.value, ...(option.keywords ?? [])].some((value) =>
    value.toLowerCase().includes(normalized),
  );
}

export const SearchableField: React.FC<SearchableFieldProps> = ({
  emptyLabel = 'No matches. Keep typing to use a custom value.',
  label,
  onChange,
  options,
  placeholder,
  value,
}) => {
  const fieldId = useId();
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const deferredValue = useDeferredValue(value);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const filteredOptions = useMemo(() => {
    const next = options.filter((option) => matchesOption(option, deferredValue));
    return deferredValue.trim() ? next.slice(0, 12) : next.slice(0, 8);
  }, [deferredValue, options]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [deferredValue]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [isOpen]);

  const selectOption = (option: SearchableOption) => {
    onChange(option.value);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="space-y-1 min-w-0">
      <label htmlFor={fieldId} className="mono-label">
        {label}
      </label>
      <div className="relative">
        <input
          id={fieldId}
          type="text"
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(event) => {
            if (!filteredOptions.length) {
              if (event.key === 'Escape') {
                setIsOpen(false);
              }
              return;
            }

            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setIsOpen(true);
              setHighlightedIndex((current) => (current + 1) % filteredOptions.length);
            }

            if (event.key === 'ArrowUp') {
              event.preventDefault();
              setIsOpen(true);
              setHighlightedIndex((current) =>
                current === 0 ? filteredOptions.length - 1 : current - 1,
              );
            }

            if (event.key === 'Enter' && isOpen && filteredOptions[highlightedIndex]) {
              event.preventDefault();
              selectOption(filteredOptions[highlightedIndex]);
            }

            if (event.key === 'Escape') {
              setIsOpen(false);
            }
          }}
          placeholder={placeholder}
          className="utilitarian-input mobile-form-control-inline w-full pr-10"
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={isOpen}
          aria-label={label}
        />
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-ui-gray">
          <ChevronDown size={16} />
        </div>

        {isOpen ? (
          <div
            id={listboxId}
            role="listbox"
            aria-label={`${label} suggestions`}
            className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto border border-dark-border bg-dark-panel shadow-[0_12px_24px_rgba(0,0,0,0.35)]"
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={index === highlightedIndex}
                  className={cn(
                    'flex w-full items-center justify-between px-4 py-3 text-left font-mono text-xs uppercase tracking-[0.14em] transition-colors',
                    index === highlightedIndex
                      ? 'bg-white text-black'
                      : 'text-white hover:bg-[#111111]',
                  )}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => selectOption(option)}
                >
                  <span className="truncate">{option.label}</span>
                </button>
              ))
            ) : (
              <div className="px-4 py-3 text-xs text-ui-gray">{emptyLabel}</div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};
