import React, { useState } from 'react';
import { Trash2, Play, Clock, Beaker, Pencil, Check, X } from 'lucide-react';
import type { Preset } from '../services/presets';
import { motion, AnimatePresence } from 'motion/react';
import { formatTemperature, getProcessLabel } from '../services/recipe';
import { EmptyState } from './EmptyState';

interface PresetLibraryProps {
  presets: Preset[];
  onEdit: (preset: Preset) => void;
  onSelect: (preset: Preset) => void;
  onDelete: (id: string) => Promise<void>;
}

export const PresetLibrary: React.FC<PresetLibraryProps> = ({
  presets,
  onEdit,
  onSelect,
  onDelete,
}) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeletingId(id);

    try {
      await onDelete(id);
      setConfirmDeleteId((current) => (current === id ? null : current));
    } finally {
      setDeletingId((current) => (current === id ? null : current));
    }
  };

  return (
    <section aria-label="Preset library" className="w-full max-w-2xl space-y-4">
      {presets.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="Your library is empty"
          subtitle="Save recipes from Manual or AI mode to keep quick-start presets here."
          className="max-w-2xl"
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          <AnimatePresence>
            {presets.map((preset) => (
              <motion.article
                key={preset.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="group relative utilitarian-border bg-dark-panel transition-all hover:border-white flex flex-col gap-3 p-4 md:p-6 sm:flex-row sm:items-center sm:justify-between"
              >
                <button
                  type="button"
                  onClick={() => onSelect(preset)}
                  className="press-feedback flex-1 min-w-0 text-left"
                  aria-label={`Start preset ${preset.film}, ${preset.developer}, ISO ${preset.iso}`}
                >
                  <div className="space-y-2 min-w-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <h3 className="text-lg font-bold text-white uppercase tracking-tight group-hover:text-accent-red transition-colors truncate">
                        {preset.film}
                      </h3>
                      <span className="px-2 py-0.5 border border-dark-border text-[10px] font-mono text-ui-gray uppercase shrink-0">
                        ISO {preset.iso}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-mono text-ui-gray uppercase tracking-widest min-w-0">
                      <div className="flex items-center space-x-1 min-w-0">
                        <Beaker size={10} />
                        <span className="truncate">{preset.developer} ({preset.dilution})</span>
                      </div>
                      <div className="flex items-center space-x-1 shrink-0">
                        <Clock size={10} />
                        <span>{formatTemperature(preset.tempC)}</span>
                      </div>
                      <span>{getProcessLabel(preset.processMode)}</span>
                    </div>
                  </div>
                </button>

                <div className="flex shrink-0 items-center justify-between sm:justify-end space-x-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => onSelect(preset)}
                    className="press-feedback p-2 text-accent-red hover:text-white transition-colors"
                    aria-label={`Play preset ${preset.film}`}
                    title="Start Preset"
                  >
                    <Play size={20} fill="currentColor" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onEdit(preset)}
                    className="press-feedback p-2 text-ui-gray hover:text-white transition-colors"
                    aria-label={`Edit preset ${preset.film}`}
                    title="Edit Preset"
                  >
                    <Pencil size={16} />
                  </button>
                  {confirmDeleteId === preset.id ? (
                    <>
                      <button
                        type="button"
                        onClick={(e) => void handleDelete(e, preset.id)}
                        disabled={deletingId === preset.id}
                        className="press-feedback p-2 text-accent-red hover:text-white transition-colors disabled:opacity-60"
                        aria-label={`Confirm delete preset ${preset.film}`}
                        title="Confirm Delete"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="press-feedback p-2 text-ui-gray hover:text-white transition-colors"
                        aria-label={`Cancel delete preset ${preset.film}`}
                        title="Cancel Delete"
                      >
                        <X size={16} />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(preset.id)}
                      className="press-feedback p-2 text-ui-gray hover:text-accent-red transition-colors"
                      aria-label={`Delete preset ${preset.film}`}
                      title="Delete Preset"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
};
