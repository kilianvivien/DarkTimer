import React, { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

interface ThemedSelectFieldProps {
  getOptionLabel?: (option: string) => string;
  label: string;
  onChange: (value: string) => void;
  options: readonly string[];
  value: string;
}

export const ThemedSelectField: React.FC<ThemedSelectFieldProps> = ({
  getOptionLabel = (option) => option,
  label,
  onChange,
  options,
  value,
}) => {
  const labelId = useId();
  const valueId = useId();
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [opensUp, setOpensUp] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const selectedIndex = Math.max(0, options.indexOf(value));

  const openMenu = (preferredIndex = selectedIndex) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpensUp(spaceBelow < 180 && rect.top > spaceBelow);
    }
    setActiveIndex(preferredIndex);
    setIsOpen(true);
  };

  const selectOption = (index: number) => {
    const option = options[index];
    if (option === undefined) {
      return;
    }
    onChange(option);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      optionRefs.current[activeIndex]?.focus();
    }
  }, [activeIndex, isOpen]);

  return (
    <div ref={containerRef} className="min-w-0 space-y-1">
      <span id={labelId} className="mono-label block">{label}</span>
      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => {
            if (isOpen) {
              setIsOpen(false);
            } else {
              openMenu();
            }
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setIsOpen(false);
            }
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              openMenu(selectedIndex);
            }
            if (event.key === 'ArrowUp') {
              event.preventDefault();
              openMenu(selectedIndex);
            }
          }}
          className="utilitarian-input mobile-form-control-compact flex w-full items-center justify-between gap-2 bg-dark-panel px-3 py-2 text-left"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={listboxId}
          aria-labelledby={`${labelId} ${valueId}`}
        >
          <span id={valueId}>{getOptionLabel(value)}</span>
          <ChevronDown
            size={16}
            className={cn('shrink-0 text-ui-gray transition-transform', isOpen && 'rotate-180')}
          />
        </button>

        {isOpen ? (
          <div
            id={listboxId}
            role="listbox"
            aria-labelledby={labelId}
            className={cn(
              'absolute right-0 z-30 max-h-64 min-w-full overflow-y-auto border border-dark-border bg-dark-panel shadow-[0_12px_24px_rgba(0,0,0,0.65)]',
              opensUp ? 'bottom-full mb-2' : 'top-full mt-2',
            )}
          >
            {options.map((option, index) => {
              const selected = option === value;
              return (
                <button
                  ref={(element) => {
                    optionRefs.current[index] = element;
                  }}
                  key={option}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => selectOption(index)}
                  onKeyDown={(event) => {
                    if (event.key === 'ArrowDown') {
                      event.preventDefault();
                      setActiveIndex((current) => (current + 1) % options.length);
                    } else if (event.key === 'ArrowUp') {
                      event.preventDefault();
                      setActiveIndex((current) => (current - 1 + options.length) % options.length);
                    } else if (event.key === 'Home') {
                      event.preventDefault();
                      setActiveIndex(0);
                    } else if (event.key === 'End') {
                      event.preventDefault();
                      setActiveIndex(options.length - 1);
                    } else if (event.key === 'Escape') {
                      event.preventDefault();
                      setIsOpen(false);
                      triggerRef.current?.focus();
                    } else if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      selectOption(index);
                    }
                  }}
                  className={cn(
                    'press-feedback flex w-full items-center justify-between gap-3 px-4 py-3 text-left font-mono text-sm transition-colors',
                    selected
                      ? 'bg-accent-red/10 text-white'
                      : 'text-ui-gray hover:bg-white/5 hover:text-white',
                  )}
                >
                  <span>{getOptionLabel(option)}</span>
                  {selected ? <Check size={14} className="text-accent-red" /> : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
};
