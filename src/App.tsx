import React, { Suspense, lazy, startTransition, useEffect, useState } from 'react';
import { ManualTimerForm } from './components/ManualTimerForm';
import { DevRecipe } from './services/recipe';
import { Preset, getPresets } from './services/presets';
import { Camera, Sparkles, Info, Library, Settings, Sliders, Github } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

type View = 'manual' | 'ai' | 'library' | 'settings' | 'timer';

const FilmSearch = lazy(() =>
  import('./components/FilmSearch').then((module) => ({ default: module.FilmSearch })),
);
const PresetLibrary = lazy(() =>
  import('./components/PresetLibrary').then((module) => ({ default: module.PresetLibrary })),
);
const SettingsMenu = lazy(() =>
  import('./components/SettingsMenu').then((module) => ({ default: module.SettingsMenu })),
);
const SessionView = lazy(() =>
  import('./components/SessionView').then((module) => ({ default: module.SessionView })),
);

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
    if (view === 'library') {
      setPresets(getPresets());
    }
  }, [view]);

  const handleStartTimer = (newRecipe: DevRecipe) => {
    setRecipe(newRecipe);
    startTransition(() => setView('timer'));
  };

  const reset = () => {
    setRecipe(null);
    startTransition(() => setView('manual'));
  };

  const refreshPresets = () => {
    setPresets(getPresets());
  };

  const changeView = (nextView: View) => {
    if (view === 'timer') {
      return;
    }

    startTransition(() => setView(nextView));
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
                  onClick={() => changeView(v)}
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
            <Suspense fallback={<ViewLoader label="Loading AI assistant" />}>
              <motion.div
                key="ai"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full flex flex-col items-center space-y-6 md:space-y-8"
              >
                <div className="text-center space-y-2">
                  <h1 className="text-xl md:text-2xl font-bold tracking-tight uppercase">AI Assistant</h1>
                  <p className="mono-label">Search for recipes using Gemini or Mistral</p>
                </div>
                <FilmSearch onRecipeFound={handleStartTimer} onOpenSettings={() => changeView('settings')} />
              </motion.div>
            </Suspense>
          )}

          {view === 'library' && (
            <Suspense fallback={<ViewLoader label="Loading library" />}>
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
            </Suspense>
          )}

          {view === 'settings' && (
            <Suspense fallback={<ViewLoader label="Loading settings" />}>
              <motion.div
                key="settings"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full flex flex-col items-center space-y-6 md:space-y-8"
              >
                <div className="text-center space-y-2">
                  <h1 className="text-xl md:text-2xl font-bold tracking-tight uppercase">Settings</h1>
                  <p className="mono-label">Development, AI, and notification preferences</p>
                </div>
                <SettingsMenu onSave={() => changeView('manual')} />
              </motion.div>
            </Suspense>
          )}

          {view === 'timer' && (
            <Suspense fallback={<ViewLoader label="Preparing session" />}>
              <motion.div
                key="timer"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="w-full"
              >
                <SessionView recipe={recipe} onExit={reset} />
              </motion.div>
            </Suspense>
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
              onClick={() => changeView(v)}
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
                  <p>Choose your process mode, confirm the default temperature, and build a phase-by-phase manual recipe with explicit agitation choices.</p>
                </div>
                <div className="space-y-1">
                  <p className="text-white uppercase tracking-widest text-xs">AI Assistant</p>
                  <p>Let Gemini or Mistral suggest development times based on your film, chemistry, process mode, and temperature. Add your API keys in AI Settings first.</p>
                </div>
                <div className="space-y-1">
                  <p className="text-white uppercase tracking-widest text-xs">Library</p>
                  <p>Save recipes from Manual or AI mode to keep them here. Tap any preset to jump straight into a timer session.</p>
                </div>
                <div className="space-y-1">
                  <p className="text-white uppercase tracking-widest text-xs">Settings</p>
                  <p>Set your development defaults, choose your AI provider, add your API keys, and manage notifications.</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ViewLoader({ label }: { label: string }) {
  return (
    <div className="w-full max-w-2xl utilitarian-border bg-dark-panel p-8 text-center">
      <p className="mono-label">{label}</p>
    </div>
  );
}
