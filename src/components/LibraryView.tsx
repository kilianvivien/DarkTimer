import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PresetLibrary } from './PresetLibrary';
import { HistoryView } from './HistoryView';
import type { Preset } from '../services/presets';
import type { Session } from '../services/recipe';

type LibraryTab = 'recipes' | 'history';

const TABS: { id: LibraryTab; label: string }[] = [
  { id: 'recipes', label: 'Recipes' },
  { id: 'history', label: 'History' },
];

interface LibraryViewProps {
  presets: Preset[];
  sessions: Session[];
  onSelect: (preset: Preset) => void;
  onDelete: (id: string) => Promise<void>;
  onEdit: (preset: Preset) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  presets,
  sessions,
  onSelect,
  onDelete,
  onEdit,
}) => {
  const [activeTab, setActiveTab] = useState<LibraryTab>('recipes');
  const [tabDirection, setTabDirection] = useState(0);

  const switchTab = (tab: LibraryTab) => {
    if (tab === activeTab) return;
    const currentIndex = TABS.findIndex((t) => t.id === activeTab);
    const nextIndex = TABS.findIndex((t) => t.id === tab);
    setTabDirection(nextIndex > currentIndex ? 1 : -1);
    setActiveTab(tab);
  };

  return (
    <div className="w-full flex flex-col items-center space-y-6 md:space-y-8">
      {/* Tab switcher */}
      <div className="flex gap-0 border border-dark-border w-full max-w-2xl">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => switchTab(id)}
            className={`press-feedback flex-1 px-4 py-3 font-mono text-xs uppercase tracking-widest transition-colors ${
              activeTab === id
                ? 'bg-white text-black'
                : 'text-ui-gray hover:text-white hover:bg-[#0f0f0f]'
            }`}
            aria-pressed={activeTab === id}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="w-full flex flex-col items-center overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          {activeTab === 'recipes' ? (
            <motion.div
              key="recipes"
              initial={{ opacity: 0, x: tabDirection * 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: tabDirection * -16 }}
              transition={{ duration: 0.18, ease: 'easeInOut' }}
              className="w-full flex flex-col items-center"
            >
              <PresetLibrary
                presets={presets}
                onSelect={onSelect}
                onDelete={onDelete}
                onEdit={onEdit}
              />
            </motion.div>
          ) : (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: tabDirection * 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: tabDirection * -16 }}
              transition={{ duration: 0.18, ease: 'easeInOut' }}
              className="w-full flex flex-col items-center"
            >
              <HistoryView sessions={sessions} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
