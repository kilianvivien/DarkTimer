import React, { useState } from 'react';
import { Trash2, Play, Clock, Beaker } from 'lucide-react';
import type { Preset } from '../services/presets';
import { motion, AnimatePresence } from 'motion/react';
import { formatTemperature, getProcessLabel } from '../services/recipe';
import { EmptyState } from './EmptyState';

interface PresetLibraryProps {
  presets: Preset[];
  onSelect: (preset: Preset) => void;
  onDelete: (id: string) => Promise<void>;
}

export const PresetLibrary: React.FC<PresetLibraryProps> = ({ presets, onSelect, onDelete }) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeletingId(id);

    try {
      await onDelete(id);
    } finally {
      setDeletingId((current) => (current === id ? null : current));
    }
  };

  if (presets.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title="Your library is empty"
        subtitle="Save recipes from Manual or AI mode to keep quick-start presets here."
        className="max-w-2xl"
      />
    );
  }

  return (
    <div className="w-full max-w-2xl grid grid-cols-1 gap-4">
      <AnimatePresence>
        {presets.map((preset) => (
          <motion.div
            key={preset.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            onClick={() => onSelect(preset)}
            className="group relative p-4 md:p-6 utilitarian-border bg-dark-panel hover:border-white transition-all cursor-pointer flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="space-y-2 min-w-0">
              <div className="flex items-center gap-3 min-w-0">
                <h3 className="text-lg font-bold text-white uppercase tracking-tight group-hover:text-accent-red transition-colors truncate">
                  {preset.film}
                </h3>
                <span className="px-2 py-0.5 border border-dark-border text-[10px] font-mono text-ui-gray uppercase">
                  ISO {preset.iso}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-mono text-ui-gray uppercase tracking-widest min-w-0">
                <div className="flex items-center space-x-1 min-w-0">
                  <Beaker size={10} />
                  <span className="truncate">{preset.developer} ({preset.dilution})</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock size={10} />
                  <span>{formatTemperature(preset.tempC)}</span>
                </div>
                <span>{getProcessLabel(preset.processMode)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end space-x-4 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => void handleDelete(e, preset.id)}
                disabled={deletingId === preset.id}
                className="p-2 text-ui-gray hover:text-accent-red transition-colors"
                title="Delete Preset"
              >
                <Trash2 size={16} />
              </button>
              <div className="p-2 text-accent-red">
                <Play size={20} fill="currentColor" />
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
