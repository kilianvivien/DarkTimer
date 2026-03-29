import React, { useState, useEffect } from 'react';
import { Timer } from './components/Timer';
import { FilmSearch } from './components/FilmSearch';
import { ManualTimerForm } from './components/ManualTimerForm';
import { PresetLibrary } from './components/PresetLibrary';
import { SettingsMenu } from './components/SettingsMenu';
import { DevRecipe } from './services/gemini';
import { Preset, getPresets } from './services/presets';
import { Camera, Sparkles, ChevronLeft, Info, Library, Settings, Sliders, Github } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { cn } from './lib/utils';

type View = 'manual' | 'ai' | 'library' | 'settings' | 'timer';

const NAV_ITEMS: { view: View; label: string; Icon: React.FC<{ size?: number; className?: string }> }[] = [
  { view: 'manual',   label: 'Manual',   Icon: Sliders },
  { view: 'ai',       label: 'AI',       Icon: Sparkles },
  { view: 'library',  label: 'Library',  Icon: Library },
  { view: 'settings', label: 'Settings', Icon: Settings },
];

export default function App() {
  const [recipe, setRecipe] = useState<DevRecipe | null>(null);
  const [view, setView] = useState<View>('manual');
  const [presets, setPresets] = useState<Preset[]>([]);
  const [showHelp, setShowHelp] = useState(false);

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

  const activeView = view === 'timer' ? 'manual' : view;

  return (
    <div className="min-h-screen bg-dark-bg text-white flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-dark-border bg-dark-bg sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={reset}>
            <Camera size={16} className="text-accent-red" />
            <span className="font-mono font-bold tracking-tighter text-sm uppercase">DARK<span className="text-accent-red">TIMER</span></span>
          </div>

          <div className="flex items-center">
            {/* Desktop nav — hidden on mobile */}
            <div className="hidden md:flex items-center space-x-1">
              {NAV_ITEMS.map(({ view: v, label }) => (
                <button
                  key={v}
                  onClick={() => view !== 'timer' && setView(v)}
                  disabled={view === 'timer'}
                  className={cn(
                    "px-4 h-14 font-mono text-xs uppercase tracking-widest transition-all border-b-2",
                    activeView === v ? "border-accent-red text-white" : "border-transparent text-ui-gray hover:text-white",
                    view === 'timer' && "opacity-30 cursor-not-allowed"
                  )}
                >
                  {label === 'Settings' ? <Settings size={14} /> : label}
                </button>
              ))}
            </div>
            {/* GitHub link — always visible */}
            <a
              href="https://github.com/kilianvivien/DarkTimer"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 p-2 text-ui-gray hover:text-white transition-colors"
              aria-label="GitHub repository"
            >
              <Github size={16} />
            </a>
            {/* Info button — always visible */}
            <button
              onClick={() => setShowHelp(true)}
              className="p-2 text-ui-gray hover:text-white transition-colors"
              aria-label="How to use"
            >
              <Info size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center px-4 md:px-6 pt-8 md:pt-12 pb-28 md:pb-8 max-w-5xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {view === 'manual' && (
            <motion.div
              key="manual"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full flex flex-col items-center space-y-6 md:space-y-8"
            >
              <div className="text-center space-y-2">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight uppercase">Manual Timer</h1>
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
              className="w-full flex flex-col items-center space-y-6 md:space-y-8"
            >
              <div className="text-center space-y-2">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight uppercase">AI Assistant</h1>
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
              className="w-full flex flex-col items-center space-y-6 md:space-y-8"
            >
              <div className="text-center space-y-2">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight uppercase">Library</h1>
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
              className="w-full flex flex-col items-center space-y-6 md:space-y-8"
            >
              <div className="text-center space-y-2">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight uppercase">Settings</h1>
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
              className="w-full flex flex-col-reverse md:flex-row gap-6 md:gap-12 items-start justify-center"
            >
              <div className="flex-1 space-y-4 md:space-y-6 w-full">
                <button
                  onClick={reset}
                  className="flex items-center space-x-2 mono-label hover:text-white transition-colors"
                >
                  <ChevronLeft size={12} />
                  <span>Exit Session</span>
                </button>

                <div className="bg-dark-panel p-4 md:p-6 utilitarian-border space-y-4 md:space-y-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl md:text-2xl font-bold text-white uppercase tracking-tight">{recipe?.film}</h2>
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

      {/* Desktop footer — hidden on mobile */}
      <footer className="hidden md:block p-6 border-t border-dark-border">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <a
            href="https://github.com/kilianvivien/DarkTimer"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[9px] font-mono uppercase tracking-[0.4em] text-ui-gray hover:text-white transition-colors"
          >
            DarkTimer — MIT Licence
          </a>
        </div>
      </footer>

      {/* Mobile bottom nav bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-dark-bg border-t border-dark-border pb-[env(safe-area-inset-bottom)]">
        <div className="flex">
          {NAV_ITEMS.map(({ view: v, label, Icon }) => (
            <button
              key={v}
              onClick={() => view !== 'timer' && setView(v)}
              disabled={view === 'timer'}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 py-3 transition-colors",
                activeView === v ? "text-white" : "text-ui-gray",
                view === 'timer' && "opacity-30 cursor-not-allowed"
              )}
            >
              <Icon size={20} />
              <span className="text-[10px] font-mono uppercase tracking-widest">{label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Help modal */}
      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 md:p-6"
            onClick={() => setShowHelp(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="bg-dark-panel border border-dark-border max-w-md w-full p-6 md:p-8 space-y-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-start">
                <h2 className="font-mono text-sm uppercase tracking-widest text-white">How to use DarkTimer</h2>
                <button onClick={() => setShowHelp(false)} className="text-ui-gray hover:text-white transition-colors font-mono text-sm leading-none">✕</button>
              </div>

              <div className="space-y-5 text-sm font-mono text-ui-gray leading-relaxed">
                <div className="space-y-1">
                  <p className="text-white uppercase tracking-widest text-xs">Manual</p>
                  <p>Enter your film, developer, dilution, ISO and temperature. DarkTimer will walk you through each phase (developer → stop → fixer → wash) with a countdown and agitation alerts.</p>
                </div>
                <div className="space-y-1">
                  <p className="text-white uppercase tracking-widest text-xs">AI Assistant</p>
                  <p>Let Gemini suggest development times based on your film and chemistry. Add your Gemini API key in Settings first. The AI looks up published data from sources like the Massive Dev Chart.</p>
                </div>
                <div className="space-y-1">
                  <p className="text-white uppercase tracking-widest text-xs">Library</p>
                  <p>Recipes you start from the AI Assistant are automatically saved here. Tap any preset to jump straight into a timer session.</p>
                </div>
                <div className="space-y-1">
                  <p className="text-white uppercase tracking-widest text-xs">Settings</p>
                  <p>Set your default stop bath, fixer and wash durations, and configure agitation interval and duration. Paste your Gemini API key to enable the AI Assistant.</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
