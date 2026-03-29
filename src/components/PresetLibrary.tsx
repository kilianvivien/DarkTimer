import React from 'react';
import { Trash2, Play, Clock, Beaker } from 'lucide-react';
import { Preset, deletePreset } from '../services/presets';
import { motion, AnimatePresence } from 'motion/react';

interface PresetLibraryProps {
  presets: Preset[];
  onSelect: (preset: Preset) => void;
  onDelete: () => void;
}

export const PresetLibrary: React.FC<PresetLibraryProps> = ({ presets, onSelect, onDelete }) => {
  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deletePreset(id);
    onDelete();
  };

  if (presets.length === 0) {
    return (
      <div className="w-full max-w-2xl p-12 utilitarian-border bg-dark-panel text-center space-y-4">
        <Clock size={32} className="mx-auto text-dark-border" />
        <p className="mono-label">Your library is empty</p>
        <p className="text-xs text-ui-gray">Save recipes from Manual or AI modes to see them here.</p>
      </div>
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
            className="group relative p-6 utilitarian-border bg-dark-panel hover:border-white transition-all cursor-pointer flex justify-between items-center"
          >
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <h3 className="text-lg font-bold text-white uppercase tracking-tight group-hover:text-accent-red transition-colors">
                  {preset.film}
                </h3>
                <span className="px-2 py-0.5 border border-dark-border text-[10px] font-mono text-ui-gray uppercase">
                  ISO {preset.iso}
                </span>
              </div>
              <div className="flex items-center space-x-4 text-xs font-mono text-ui-gray uppercase tracking-widest">
                <div className="flex items-center space-x-1">
                  <Beaker size={10} />
                  <span>{preset.developer} ({preset.dilution})</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock size={10} />
                  <span>{preset.temp}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => handleDelete(e, preset.id)}
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
