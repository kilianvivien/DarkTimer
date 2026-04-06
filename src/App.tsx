import React, { Suspense, lazy, startTransition, useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { ManualTimerForm } from './components/ManualTimerForm';
import { DevRecipe, type Session } from './services/recipe';
import { deletePreset, savePreset, updatePreset } from './services/presets';
import type { Preset } from './services/presets';
import { Camera, Sparkles, Info, Library, Settings, Sliders, Github, FlaskConical } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { cn } from './lib/utils';
import { DEFAULT_SETTINGS, saveAiProvider, saveSettings } from './services/settings';
import { useStorageReady, useStoredPresets, useStoredSessions, useStoredSettings, useStoredChems } from './hooks/useStoredData';
import { useApiKeySession } from './hooks/useApiKeySession';
import { clearStoredSessions, saveStoredSession, saveStoredChem, updateStoredChem, deleteStoredChem, incrementChemRollCount, clearAllData } from './services/storage';
import type { AIProvider, UserSettings } from './services/userSettings';
import {
  clearEncryptedApiKeys,
  dismissApiKeyMigrationNotice,
  saveEncryptedApiKeys,
  setSessionApiKeys,
  unlockEncryptedApiKeys,
} from './services/secretStorage';
import type { SettingsSaveRequest } from './components/SettingsMenu';
import type { StoredChem } from './services/chemTypes';
import {
  applyPwaUpdate,
  dismissPwaUpdatePrompt,
  getPwaUpdateSnapshot,
  subscribeToPwaUpdates,
} from './services/pwa';

type View = 'manual' | 'ai' | 'library' | 'chems' | 'settings' | 'timer';
type ToastTone = 'success' | 'error';

interface ToastState {
  id: number;
  message: string;
  tone: ToastTone;
}

const FilmSearch = lazy(() =>
  import('./components/FilmSearch').then((module) => ({ default: module.FilmSearch })),
);
const LibraryView = lazy(() =>
  import('./components/LibraryView').then((module) => ({ default: module.LibraryView })),
);
const ChemsView = lazy(() =>
  import('./components/ChemsView').then((module) => ({ default: module.ChemsView })),
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
  { view: 'chems',    label: 'Chems',    Icon: FlaskConical },
  { view: 'settings', label: 'Settings', Icon: Settings },
];
const SWIPEABLE_VIEWS: View[] = ['manual', 'ai', 'library', 'chems', 'settings'];

function getViewIndex(view: View): number {
  return SWIPEABLE_VIEWS.indexOf(view);
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(target.closest('button, a, input, select, textarea, label, [role="button"]'));
}

export default function App() {
  const [recipe, setRecipe] = useState<DevRecipe | null>(null);
  const [editingPreset, setEditingPreset] = useState<Preset | null>(null);
  const [view, setView] = useState<View>('manual');
  const [showHelp, setShowHelp] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [navDirection, setNavDirection] = useState(0);
  const reduceMotion = useReducedMotion();
  const storageReady = useStorageReady();
  const { data: settings, isLoading: settingsLoading } = useStoredSettings(DEFAULT_SETTINGS);
  const { data: presets, isLoading: presetsLoading } = useStoredPresets();
  const { data: sessions, isLoading: sessionsLoading } = useStoredSessions();
  const { data: chems } = useStoredChems();
  const {
    apiKeys,
    hasEncryptedApiKeys,
    isLocked: isApiKeyVaultLocked,
    isReady: apiKeysReady,
    migrationNotice,
  } = useApiKeySession();
  const pwaUpdate = useSyncExternalStore(
    subscribeToPwaUpdates,
    getPwaUpdateSnapshot,
    getPwaUpdateSnapshot,
  );
  const appReady = storageReady && !settingsLoading && !presetsLoading && !sessionsLoading && apiKeysReady;

  const notify = useCallback((message: string, tone: ToastTone = 'success') => {
    setToast({
      id: Date.now(),
      message,
      tone,
    });
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setToast((current) => (current?.id === toast.id ? null : current));
    }, 2600);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [toast]);

  useEffect(() => {
    if (!migrationNotice) {
      return;
    }

    notify(migrationNotice);
    dismissApiKeyMigrationNotice();
  }, [migrationNotice, notify]);

  const handleStartTimer = (newRecipe: DevRecipe) => {
    setEditingPreset(null);
    setRecipe(newRecipe);
    setNavDirection(1);
    startTransition(() => setView('timer'));
  };

  const reset = () => {
    setEditingPreset(null);
    setRecipe(null);
    setNavDirection(-1);
    startTransition(() => setView('manual'));
  };

  const changeView = (nextView: View) => {
    if (view === 'timer' || view === nextView) {
      return;
    }

    const currentIndex = getViewIndex(view);
    const nextIndex = getViewIndex(nextView);
    setNavDirection(nextIndex > currentIndex ? 1 : -1);
    startTransition(() => setView(nextView));
  };

  const handlePanEnd = (_event: PointerEvent, info: { offset: { x: number }; velocity: { x: number } }) => {
    if (view === 'timer' || window.innerWidth >= 768) {
      return;
    }

    if (Math.abs(info.offset.x) < 60 && Math.abs(info.velocity.x) < 500) {
      return;
    }

    const direction = info.offset.x < 0 ? 1 : -1;
    const currentIndex = getViewIndex(view);
    const nextIndex = currentIndex + direction;
    const nextView = SWIPEABLE_VIEWS[nextIndex];

    if (!nextView) {
      return;
    }

    changeView(nextView);
  };

  const handleSavePreset = async (nextRecipe: DevRecipe) => {
    await savePreset(nextRecipe);
    setEditingPreset(null);
    notify('Recipe saved to library.');
  };

  const handleUpdatePreset = async (id: string, nextRecipe: DevRecipe) => {
    await updatePreset(id, nextRecipe);
    setEditingPreset(null);
    notify('Preset updated.');
    if (view !== 'manual') {
      setNavDirection(-1);
      startTransition(() => setView('manual'));
    }
  };

  const handleDeletePreset = async (id: string) => {
    await deletePreset(id);
    if (editingPreset?.id === id) {
      setEditingPreset(null);
    }
    notify('Preset removed from library.');
  };

  const handleEditPreset = (preset: Preset) => {
    setEditingPreset(preset);
    const currentIndex = getViewIndex(view === 'timer' ? 'library' : view);
    const nextIndex = getViewIndex('manual');
    setNavDirection(nextIndex > currentIndex ? 1 : -1);
    startTransition(() => setView('manual'));
  };

  const handleSaveSettings = async ({
    settings: nextSettings,
    apiKeys: nextApiKeys,
    apiKeysChanged,
    passphrase,
  }: SettingsSaveRequest) => {
    const normalizedApiKeys = {
      gemini: nextApiKeys.gemini.trim(),
      mistral: nextApiKeys.mistral.trim(),
    };

    await saveSettings(nextSettings);

    if (nextSettings.apiKeyPersistenceMode === 'session') {
      await clearEncryptedApiKeys();
      await setSessionApiKeys(normalizedApiKeys);
    } else if (apiKeysChanged || !hasEncryptedApiKeys) {
      if (!passphrase && (normalizedApiKeys.gemini || normalizedApiKeys.mistral)) {
        throw new Error('Enter your passphrase to securely remember updated API keys.');
      }

      await saveEncryptedApiKeys(passphrase, normalizedApiKeys);
    }

    notify('API key settings saved.');
  };

  const handleUpdateSettings = async (nextSettings: UserSettings) => {
    await saveSettings(nextSettings);
  };

  const handleUnlockSavedKeys = async (passphrase: string) => {
    await unlockEncryptedApiKeys(passphrase);
    notify('Saved API keys unlocked for this session.');
  };

  const handleForgetSavedKeys = async (nextSettings: UserSettings) => {
    await Promise.all([
      saveSettings(nextSettings),
      clearEncryptedApiKeys(),
    ]);
    notify('Saved API keys were removed from this device.');
  };

  const handleProviderChange = async (provider: AIProvider) => {
    await saveAiProvider(provider);
  };

  const handleSaveSession = async (session: Session) => {
    try {
      await saveStoredSession(session);

      if (settings.autoTrackChemRolls && session.status === 'completed') {
        const devName = session.recipe.developer.toLowerCase().trim();
        const match = chems.find(
          (c) => c.type === 'developer' && c.name.toLowerCase().trim() === devName,
        );
        if (match) {
          await incrementChemRollCount(match.id);
        }
      }
    } catch (error) {
      console.error('Failed to save session history entry:', error);
      notify('Session history could not be saved.', 'error');
    }
  };

  const handleClearHistory = async () => {
    try {
      await clearStoredSessions();
      notify('Session history cleared.');
    } catch (error) {
      console.error('Failed to clear session history:', error);
      throw error;
    }
  };

  const handleClearAllData = async () => {
    await clearAllData();
  };

  const handleAddChem = async (data: Omit<StoredChem, 'id' | 'createdAt'>) => {
    await saveStoredChem(data);
    notify('Chemistry added.');
  };

  const handleUpdateChem = async (id: string, patch: Partial<Omit<StoredChem, 'id' | 'createdAt'>>) => {
    await updateStoredChem(id, patch);
  };

  const handleDeleteChem = async (id: string) => {
    await deleteStoredChem(id);
    notify('Chemistry removed.');
  };

  const handleIncrementChem = async (id: string) => {
    await incrementChemRollCount(id);
  };

  const handleApplyUpdate = async () => {
    try {
      await applyPwaUpdate();
    } catch (error) {
      console.error('Failed to apply DarkTimer update:', error);
      notify('Update could not be applied. Close and reopen DarkTimer to try again.', 'error');
    }
  };

  const activeView = view === 'timer' ? 'manual' : view;
  const viewMotion = reduceMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : {
        initial: { opacity: 0, x: navDirection * 20 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: navDirection * -20 },
      };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-dark-bg text-white flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-dark-border bg-dark-bg sticky top-0 z-50 pt-[env(safe-area-inset-top)]">
        <div className="max-w-5xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          <button
            type="button"
            className="press-feedback flex items-center space-x-2 cursor-pointer text-left"
            onClick={reset}
            aria-label="Return to manual timer"
          >
            <Camera size={16} className="text-accent-red" />
            <span className="font-mono font-bold tracking-tighter text-sm uppercase">DARK<span className="text-accent-red">TIMER</span></span>
          </button>

          <div className="flex items-center">
            {/* Desktop nav — hidden on mobile */}
            <div className="hidden md:flex items-center space-x-1">
              {NAV_ITEMS.map(({ view: v, label }) => (
                <button
                  key={v}
                  onClick={() => changeView(v)}
                  disabled={view === 'timer'}
                  className={cn(
                    "press-feedback px-4 h-14 font-mono text-xs uppercase tracking-widest transition-all border-b-2",
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
              className="press-feedback p-2 text-ui-gray hover:text-white transition-colors"
              aria-label="How to use"
            >
              <Info size={16} />
            </button>
          </div>
        </div>
      </header>

      <motion.main
        className="flex-1 flex flex-col items-center px-4 md:px-6 pt-8 md:pt-12 pb-40 md:pb-8 max-w-5xl mx-auto w-full"
        onPanEnd={(event, info) => {
          if (isInteractiveTarget(event.target)) {
            return;
          }

          handlePanEnd(event as PointerEvent, info);
        }}
      >
        {!appReady ? (
          <ViewLoader label="Loading DarkTimer" detail="Preparing your presets, settings, and secure local storage." />
        ) : (
          <AnimatePresence mode="wait">
          {view === 'manual' && (
            <motion.div
              key="manual"
              {...viewMotion}
              className="w-full flex flex-col items-center space-y-6 md:space-y-8"
            >
              <div className="text-center space-y-2">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight uppercase">Manual Timer</h1>
                <p className="mono-label">Input your own development parameters</p>
              </div>
              <ManualTimerForm
                editingPreset={editingPreset}
                onCancelEdit={() => setEditingPreset(null)}
                onStart={handleStartTimer}
                onSavePreset={handleSavePreset}
                onUpdatePreset={handleUpdatePreset}
                settings={settings}
              />
            </motion.div>
          )}

          {view === 'ai' && (
            <Suspense fallback={<ViewLoader label="Loading AI assistant" />}>
              <motion.div
                key="ai"
                {...viewMotion}
                className="w-full flex flex-col items-center space-y-6 md:space-y-8"
              >
                <div className="text-center space-y-2">
                  <h1 className="text-xl md:text-2xl font-bold tracking-tight uppercase">AI Assistant</h1>
                  <p className="mono-label">Search for recipes using Gemini or Mistral</p>
                </div>
                <FilmSearch
                  apiKeys={apiKeys}
                  hasEncryptedApiKeys={hasEncryptedApiKeys}
                  isVaultLocked={isApiKeyVaultLocked}
                  onOpenSettings={() => changeView('settings')}
                  onProviderChange={handleProviderChange}
                  onRecipeFound={handleStartTimer}
                  onSavePreset={handleSavePreset}
                  settings={settings}
                />
              </motion.div>
            </Suspense>
          )}

          {view === 'library' && (
            <Suspense fallback={<ViewLoader label="Loading library" />}>
              <motion.div
                key="library"
                {...viewMotion}
                className="w-full flex flex-col items-center space-y-6 md:space-y-8"
              >
                <div className="text-center space-y-2">
                  <h1 className="text-xl md:text-2xl font-bold tracking-tight uppercase">Library</h1>
                  <p className="mono-label">Your saved presets and session history</p>
                </div>
                <LibraryView
                  presets={presets}
                  sessions={sessions}
                  onSelect={handleStartTimer}
                  onDelete={handleDeletePreset}
                  onEdit={handleEditPreset}
                />
              </motion.div>
            </Suspense>
          )}

          {view === 'chems' && (
            <Suspense fallback={<ViewLoader label="Loading chemistry" />}>
              <motion.div
                key="chems"
                {...viewMotion}
                className="w-full flex flex-col items-center space-y-6 md:space-y-8"
              >
                <div className="text-center space-y-2">
                  <h1 className="text-xl md:text-2xl font-bold tracking-tight uppercase">Chemistry</h1>
                  <p className="mono-label">Track your developers and fixers</p>
                </div>
                <ChemsView
                  chems={chems}
                  onAdd={handleAddChem}
                  onUpdate={handleUpdateChem}
                  onDelete={handleDeleteChem}
                  onIncrement={handleIncrementChem}
                />
              </motion.div>
            </Suspense>
          )}

          {view === 'settings' && (
            <Suspense fallback={<ViewLoader label="Loading settings" />}>
              <motion.div
                key="settings"
                {...viewMotion}
                className="w-full flex flex-col items-center space-y-6 md:space-y-8"
              >
                <div className="text-center space-y-2">
                  <h1 className="text-xl md:text-2xl font-bold tracking-tight uppercase">Settings</h1>
                  <p className="mono-label">Development, AI, and notification preferences</p>
                </div>
                <SettingsMenu
                  apiKeys={apiKeys}
                  hasEncryptedApiKeys={hasEncryptedApiKeys}
                  isVaultLocked={isApiKeyVaultLocked}
                  onClearHistory={handleClearHistory}
                  onClearAllData={handleClearAllData}
                  onForgetSavedKeys={handleForgetSavedKeys}
                  onSettingsChange={handleUpdateSettings}
                  onSave={handleSaveSettings}
                  onUnlockSavedKeys={handleUnlockSavedKeys}
                  sessionCount={sessions.length}
                  settings={settings}
                />
              </motion.div>
            </Suspense>
          )}

          {view === 'timer' && (
            <Suspense fallback={<ViewLoader label="Preparing session" />}>
              <motion.div
                key="timer"
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
                animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="w-full"
              >
                <SessionView
                  recipe={recipe}
                  onExit={reset}
                  onSaveSession={handleSaveSession}
                  settings={settings}
                />
              </motion.div>
            </Suspense>
          )}
          </AnimatePresence>
        )}
      </motion.main>

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
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pointer-events-none">
        <div className="pointer-events-auto mx-auto max-w-md rounded-[1.6rem] border border-white/[0.07] bg-black/60 shadow-[0_-28px_64px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-2xl">
          <div className="flex p-1 gap-0.5">
            {NAV_ITEMS.map(({ view: v, label, Icon }) => (
              <button
                key={v}
                onClick={() => changeView(v)}
                disabled={view === 'timer'}
                className={cn(
                  "press-feedback flex flex-col items-center justify-center gap-1.5 flex-1 px-2 py-2.5 rounded-[1.2rem] transition-all duration-200",
                  activeView === v
                    ? "bg-white text-black shadow-[0_2px_12px_rgba(0,0,0,0.3)]"
                    : "text-white/35 hover:text-white/60",
                  view === 'timer' && "opacity-30 cursor-not-allowed"
                )}
                aria-current={activeView === v ? 'page' : undefined}
              >
                <Icon size={19} />
                <span className="text-[9px] font-mono uppercase tracking-widest leading-none">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Help modal */}
      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 md:p-6"
            onClick={() => setShowHelp(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="bg-black/70 backdrop-blur-2xl border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_32px_64px_rgba(0,0,0,0.7)] max-w-md w-full p-6 md:p-8 space-y-6 rounded-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-start">
                <h2 className="font-mono text-sm uppercase tracking-widest text-white">How to use DarkTimer</h2>
                <button
                  type="button"
                  onClick={() => setShowHelp(false)}
                  className="press-feedback text-ui-gray hover:text-white transition-colors font-mono text-sm leading-none"
                  aria-label="Close help"
                >
                  ✕
                </button>
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
                  <p>Save recipes from Manual or AI mode to keep them here. Switch to the History tab to review completed and interrupted sessions on-device.</p>
                </div>
                <div className="space-y-1">
                  <p className="text-white uppercase tracking-widest text-xs">Chems</p>
                  <p>Track your chemistry batches — add developers and fixers, record their mix date, expiration, and roll count. Warnings appear when a batch is aging or nearing capacity.</p>
                </div>
                <div className="space-y-1">
                  <p className="text-white uppercase tracking-widest text-xs">Settings</p>
                  <p>Set your development defaults, choose your AI provider, add your API keys, manage notifications, configure chemistry roll-count warnings, and clear session history.</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pwaUpdate.needRefresh && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+6rem)] z-[60] md:inset-x-auto md:right-6 md:bottom-6 md:w-[26rem]"
            aria-live="polite"
          >
            <div className="rounded-[1.75rem] border border-white/[0.08] bg-black/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_24px_64px_rgba(0,0,0,0.7)] backdrop-blur-2xl">
              <div className="space-y-2">
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-accent-red">Update Ready</p>
                <h2 className="text-base font-semibold tracking-tight text-white">A new DarkTimer version is available.</h2>
                <p className="text-sm leading-relaxed text-white/72">
                  Reload to install the latest features. Your recipes, history, chemistry, and settings stay on this device.
                </p>
              </div>
              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={dismissPwaUpdatePrompt}
                  className="press-feedback rounded-full border border-white/[0.08] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-white/72 hover:text-white"
                >
                  Later
                </button>
                <button
                  type="button"
                  onClick={() => void handleApplyUpdate()}
                  disabled={pwaUpdate.isUpdating}
                  className="press-feedback rounded-full bg-white px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-black disabled:cursor-progress disabled:opacity-70"
                >
                  {pwaUpdate.isUpdating ? 'Updating...' : 'Update App'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed left-4 right-4 top-18 z-[60] md:left-auto md:right-6 md:top-6 md:w-[24rem]"
          >
            <div
              className={cn(
                'rounded-2xl border px-4 py-3 font-mono text-xs uppercase tracking-[0.18em] shadow-lg',
                toast.tone === 'error'
                  ? 'border-accent-red/50 bg-black/75 backdrop-blur-2xl text-white shadow-[inset_0_1px_0_rgba(255,0,0,0.08)]'
                  : 'border-white/[0.08] bg-black/70 backdrop-blur-2xl text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]',
              )}
            >
              {toast.message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ViewLoader({ label, detail }: { label: string; detail?: string }) {
  return (
    <div className="w-full max-w-2xl utilitarian-border bg-dark-panel p-8 text-center space-y-3">
      <p className="mono-label text-white">{label}</p>
      {detail ? <p className="text-sm text-ui-gray">{detail}</p> : null}
    </div>
  );
}
