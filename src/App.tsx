import React, { useState, useEffect } from 'react';
import { Timer } from './components/Timer';
import { FilmSearch } from './components/FilmSearch';
import { ManualTimerForm } from './components/ManualTimerForm';
import { PresetLibrary } from './components/PresetLibrary';
import { SettingsMenu } from './components/SettingsMenu';
import { DevRecipe } from './services/gemini';
import { Preset, getPresets } from './services/presets';
import { Camera, Beaker, Sparkles, ChevronLeft, Info, Library, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { cn } from './lib/utils';

export default function App() {
  const [recipe, setRecipe] = useState<DevRecipe | null>(null);
  const [view, setView] = useState<'manual' | 'ai' | 'library' | 'settings' | 'timer'>('manual');
  const [presets, setPresets] = useState<Preset[]>([]);

  useEffect(() => {
    setPresets(getPresets());
  }, [view]);

  const handleStartTimer = (newRecipe: DevRecipe) => {
    setRecipe(newRecipe);
    setView('timer');
  };

  const reset = () => {
    setRecipe(null);
    setView('manual');
  };

  const refreshPresets = () => {
    setPresets(getPresets());
  };

  return (
    <div className="min-h-screen bg-dark-bg text-white flex flex-col font-sans">
      {/* Utility Header */}
      <header className="border-b border-dark-border bg-dark-bg sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={reset}>
            <Camera size={16} className="text-accent-red" />
            <span className="font-mono font-bold tracking-tighter text-sm uppercase">DARK<span className="text-accent-red">TIMER</span></span>
          </div>
          
          <div className="flex items-center space-x-1">
            <button 
              onClick={() => setView('manual')}
              className={cn(
                "px-4 h-14 font-mono text-[10px] uppercase tracking-widest transition-all border-b-2",
                view === 'manual' ? "border-accent-red text-white" : "border-transparent text-ui-gray hover:text-white"
              )}
            >
              Manual
            </button>
            <button 
              onClick={() => setView('ai')}
              className={cn(
                "px-4 h-14 font-mono text-[10px] uppercase tracking-widest transition-all border-b-2",
                view === 'ai' ? "border-accent-red text-white" : "border-transparent text-ui-gray hover:text-white"
              )}
            >
              AI Assistant
            </button>
            <button 
              onClick={() => setView('library')}
              className={cn(
                "px-4 h-14 font-mono text-[10px] uppercase tracking-widest transition-all border-b-2",
                view === 'library' ? "border-accent-red text-white" : "border-transparent text-ui-gray hover:text-white"
              )}
            >
              Library
            </button>
            <button 
              onClick={() => setView('settings')}
              className={cn(
                "px-4 h-14 font-mono text-[10px] uppercase tracking-widest transition-all border-b-2",
                view === 'settings' ? "border-accent-red text-white" : "border-transparent text-ui-gray hover:text-white"
              )}
            >
              <Settings size={14} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center p-6 max-w-5xl mx-auto w-full pt-12">
        <AnimatePresence mode="wait">
          {view === 'manual' && (
            <motion.div
              key="manual"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full flex flex-col items-center space-y-8"
            >
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold tracking-tight uppercase">Manual Timer</h1>
                <p className="mono-label">Input your own development parameters</p>
              </div>
              <ManualTimerForm onStart={handleStartTimer} />
            </motion.div>
          )}

          {view === 'ai' && (
            <motion.div
              key="ai"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full flex flex-col items-center space-y-8"
            >
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold tracking-tight uppercase">AI Assistant</h1>
                <p className="mono-label">Search for recipes using Gemini</p>
              </div>
              <FilmSearch onRecipeFound={handleStartTimer} />
            </motion.div>
          )}

          {view === 'library' && (
            <motion.div
              key="library"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full flex flex-col items-center space-y-8"
            >
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold tracking-tight uppercase">Library</h1>
                <p className="mono-label">Your saved presets</p>
              </div>
              <PresetLibrary 
                presets={presets} 
                onSelect={handleStartTimer} 
                onDelete={refreshPresets}
              />
            </motion.div>
          )}

          {view === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full flex flex-col items-center space-y-8"
            >
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold tracking-tight uppercase">Settings</h1>
                <p className="mono-label">Configure your darkroom defaults</p>
              </div>
              <SettingsMenu onSave={() => setView('manual')} />
            </motion.div>
          )}

          {view === 'timer' && (
            <motion.div
              key="timer"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="w-full flex flex-col md:flex-row gap-12 items-start justify-center"
            >
              <div className="flex-1 space-y-6 w-full">
                <button 
                  onClick={reset}
                  className="flex items-center space-x-2 mono-label hover:text-white transition-colors"
                >
                  <ChevronLeft size={12} />
                  <span>Exit Session</span>
                </button>

                <div className="bg-dark-panel p-6 utilitarian-border space-y-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-2xl font-bold text-white uppercase tracking-tight">{recipe?.film}</h2>
                      <p className="text-accent-red font-mono uppercase tracking-widest text-[10px]">
                        {recipe?.developer} • {recipe?.dilution} • ISO {recipe?.iso}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="mono-label">Temp</p>
                      <p className="text-lg text-white font-bold font-mono">{recipe?.temp}</p>
                    </div>
                  </div>

                  {recipe?.source && (
                    <div className="pt-4 border-t border-dark-border">
                      <p className="mono-label mb-1">Source</p>
                      <p className="text-xs text-ui-gray font-mono">{recipe.source}</p>
                    </div>
                  )}

                  {recipe?.notes && (
                    <div className="pt-4 border-t border-dark-border">
                      <p className="mono-label mb-2">Notes</p>
                      <div className="text-xs text-ui-gray leading-relaxed prose prose-invert prose-sm max-w-none">
                        <ReactMarkdown>{recipe.notes}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-shrink-0 w-full md:w-auto">
                <Timer 
                  phases={recipe?.phases || []} 
                  onComplete={() => {}} 
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="p-6 border-t border-dark-border">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <p className="text-[8px] font-mono uppercase tracking-[0.4em] text-ui-gray">
            DARKTIMER // UTILITARIAN DARKROOM TOOL
          </p>
          <div className="flex space-x-4">
            <Info size={12} className="text-ui-gray cursor-help" />
          </div>
        </div>
      </footer>
    </div>
  );
}
