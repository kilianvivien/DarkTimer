import React, { Suspense, lazy, startTransition, useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { ManualTimerForm } from './components/ManualTimerForm';
import { DevRecipe, type Session } from './services/recipe';
import { deletePreset, savePreset, updatePreset } from './services/presets';
import type { Preset } from './services/presets';
import {
  Sparkles,
  Info,
  Library,
  Settings,
  Sliders,
  Github,
  FlaskConical,
  Ellipsis,
  Share,
  Plus,
  ToggleRight,
  House,
  Menu,
  Download,
  Lamp,
  X,
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { cn } from './lib/utils';
import { DEFAULT_SETTINGS, saveAiProvider, saveSettings } from './services/settings';
import {
  useStorageReady,
  useStoredActiveTimerSession,
  useStoredPresets,
  useStoredSessions,
  useStoredSettings,
  useStoredChems,
} from './hooks/useStoredData';
import { useApiKeySession } from './hooks/useApiKeySession';
import {
  clearStoredActiveTimerSession,
  clearStoredSessions,
  saveStoredSession,
  saveStoredChem,
  updateStoredChem,
  deleteStoredChem,
  incrementChemRollCount,
  clearAllData,
} from './services/storage';
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
  dismissPwaOfflineReady,
  dismissPwaUpdatePrompt,
  getPwaUpdateSnapshot,
  dismissPwaInstallPrompt,
  getInstallInstructions,
  requestPwaInstall,
  subscribeToPwaUpdates,
} from './services/pwa';
import type { ActiveTimerSession } from './services/recipe';

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

function getInitialView(): View {
  if (typeof window === 'undefined') {
    return 'manual';
  }

  // App-shortcut launches (manifest `shortcuts`) land on /?view=<view>.
  const param = new URLSearchParams(window.location.search).get('view');
  return param && (SWIPEABLE_VIEWS as string[]).includes(param) ? (param as View) : 'manual';
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(target.closest('button, a, input, select, textarea, label, [role="button"]'));
}

function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }

  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

const INSTALL_STEP_ICONS = {
  ellipsis: Ellipsis,
  share: Share,
  plus: Plus,
  toggle: ToggleRight,
  home: House,
  menu: Menu,
  download: Download,
} as const;

export default function App() {
  const [recipe, setRecipe] = useState<DevRecipe | null>(null);
  const [editingPreset, setEditingPreset] = useState<Preset | null>(null);
  const [view, setView] = useState<View>(getInitialView);
  const [showHelp, setShowHelp] = useState(false);
  const [showIosSafelightAdvice, setShowIosSafelightAdvice] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [navDirection, setNavDirection] = useState(0);
  const reduceMotion = useReducedMotion();
  const storageReady = useStorageReady();
  const { data: settings, isLoading: settingsLoading } = useStoredSettings(DEFAULT_SETTINGS);
  const { data: presets, isLoading: presetsLoading } = useStoredPresets();
  const { data: sessions, isLoading: sessionsLoading } = useStoredSessions();
  const { data: chems } = useStoredChems();
  const { data: activeTimerSession, isLoading: activeTimerLoading } = useStoredActiveTimerSession();
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
  const appReady =
    storageReady &&
    !settingsLoading &&
    !presetsLoading &&
    !sessionsLoading &&
    !activeTimerLoading &&
    apiKeysReady;
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [resumeSession, setResumeSession] = useState<ActiveTimerSession | null>(null);

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

  useEffect(() => {
    if (!pwaUpdate.offlineReady) {
      return;
    }

    notify('DarkTimer is ready to work offline.');
    dismissPwaOfflineReady();
  }, [pwaUpdate.offlineReady, notify]);

  useEffect(() => {
    const root = document.documentElement;

    if (settings.theme === 'safelight') {
      root.dataset.theme = 'safelight';
    } else {
      delete root.dataset.theme;
    }
  }, [settings.theme]);

  useEffect(() => {
    if (!activeTimerSession || view === 'timer' || recipe) {
      return;
    }

    setResumeSession(activeTimerSession);
  }, [activeTimerSession, recipe, view]);

  const handleStartTimer = (newRecipe: DevRecipe) => {
    setResumeSession(null);
    setEditingPreset(null);
    setRecipe(newRecipe);
    setNavDirection(1);
    startTransition(() => setView('timer'));
  };

  const reset = () => {
    setResumeSession(null);
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

  const handleToggleSafelight = () => {
    const enablingSafelight = settings.theme !== 'safelight';
    const isPortrait = typeof window !== 'undefined'
      && window.matchMedia('(orientation: portrait)').matches;

    if (enablingSafelight && isIOSDevice() && isPortrait) {
      setShowIosSafelightAdvice(true);
    } else if (!enablingSafelight) {
      setShowIosSafelightAdvice(false);
    }

    void saveSettings({
      ...settings,
      theme: enablingSafelight ? 'safelight' : 'dark',
    });
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

  const handleResumeStoredSession = () => {
    if (!resumeSession) {
      return;
    }

    setRecipe(resumeSession.recipe);
    setNavDirection(1);
    startTransition(() => setView('timer'));
  };

  const handleDiscardStoredSession = async () => {
    try {
      await clearStoredActiveTimerSession();
      setResumeSession(null);
      notify('Discarded the interrupted timer session.');
    } catch (error) {
      console.error('Failed to discard the interrupted timer session:', error);
      notify('Could not discard the interrupted timer session.', 'error');
    }
  };

  const handleInstallAction = async () => {
    const outcome = await requestPwaInstall();
    if (outcome === 'accepted') {
      notify('DarkTimer is being installed.');
      return;
    }

    if (outcome === 'dismissed') {
      return;
    }

    setShowInstallHelp(true);
  };

  const installInstructions = getInstallInstructions(pwaUpdate.installPlatform);
  // Prompt after the app has proven useful, not on arrival: at least one finished
  // session in history or a small preset library.
  const hasProvenValue = sessions.length >= 1 || presets.length >= 2;
  const showInstallBanner =
    !pwaUpdate.isStandalone &&
    !pwaUpdate.isInstallDismissed &&
    !pwaUpdate.needRefresh &&
    hasProvenValue &&
    view !== 'timer' &&
    (pwaUpdate.isInstallPromptAvailable || installInstructions);
  // Never interrupt a running development session with an update prompt —
  // reloading mid-development would ruin the film even with session resumption.
  const showUpdateBanner = pwaUpdate.needRefresh && view !== 'timer';

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
    <div className="app-shell min-h-screen min-h-[100dvh] bg-dark-bg text-white flex flex-col font-sans md:pl-24">
      {/* Header */}
      <header className="tablet-landscape-hide border-b border-dark-border bg-dark-bg sticky top-0 z-50 pt-[env(safe-area-inset-top)]">
        <div className="max-w-5xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          <button
            type="button"
            className="press-feedback flex items-center cursor-pointer text-left"
            onClick={reset}
            aria-label="Return to manual timer"
          >
            <span className="font-mono font-bold tracking-tighter text-sm uppercase">DARK<span className="text-accent-red">TIMER</span></span>
          </button>

          <div className="flex items-center">
            {/* Safelight quick toggle — always visible */}
            <button
              onClick={handleToggleSafelight}
              className={cn(
                'press-feedback p-2 transition-colors',
                settings.theme === 'safelight'
                  ? 'text-accent-red'
                  : 'text-ui-gray hover:text-white',
              )}
              aria-label={settings.theme === 'safelight' ? 'Switch to standard theme' : 'Switch to safelight theme'}
              aria-pressed={settings.theme === 'safelight'}
            >
              <Lamp size={16} />
            </button>
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

      {/* Tablet/desktop navigation rail — phones keep the bottom pill */}
      <nav
        aria-label="Primary"
        className="tablet-landscape-nav hidden md:flex fixed left-[calc(env(safe-area-inset-left)+0.75rem)] top-1/2 z-40 w-[4.75rem] -translate-y-1/2 flex-col items-center gap-0.5 rounded-[1.75rem] border border-white/[0.07] bg-black/55 p-1.5 shadow-[0_18px_55px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
      >
        <div className="tablet-landscape-rail-brand hidden w-full flex-col items-center rounded-[1.5rem] bg-black/55 p-1.5 shadow-[0_14px_40px_rgba(0,0,0,0.48)] backdrop-blur-2xl">
          <button
            type="button"
            className="press-feedback flex min-h-16 w-full flex-col items-center justify-center rounded-[1.15rem] py-2 font-mono text-[13px] font-bold uppercase leading-none tracking-tighter"
            onClick={reset}
            aria-label="Return to manual timer"
          >
            <span>DARK</span>
            <span className="text-accent-red">TIMER</span>
          </button>
        </div>

        <div className="tablet-landscape-main-rail contents">
          {NAV_ITEMS.map(({ view: v, label, Icon }) => (
            <button
              key={v}
              onClick={() => changeView(v)}
              disabled={view === 'timer'}
              className={cn(
                'press-feedback flex w-full flex-col items-center gap-1.5 rounded-[1.2rem] px-2 py-3 transition-colors',
                activeView === v
                  ? 'bg-white text-black shadow-[0_8px_24px_rgba(255,255,255,0.12)]'
                  : 'text-ui-gray hover:bg-white/[0.05] hover:text-white',
                view === 'timer' && 'opacity-30 cursor-not-allowed',
              )}
              aria-current={activeView === v ? 'page' : undefined}
            >
              <Icon size={18} />
              <span className="text-[9px] font-mono uppercase tracking-widest leading-none">{label}</span>
            </button>
          ))}
        </div>

        <div className="tablet-landscape-rail-actions hidden w-full flex-col items-center gap-0.5 rounded-[1.5rem] border border-white/[0.07] bg-black/55 p-1.5 shadow-[0_14px_40px_rgba(0,0,0,0.48)] backdrop-blur-2xl">
          <button
            onClick={handleToggleSafelight}
            className={cn(
              'press-feedback flex w-full items-center justify-center rounded-[1.2rem] transition-colors',
              settings.theme === 'safelight'
                ? 'text-accent-red'
                : 'text-ui-gray hover:bg-white/[0.05] hover:text-white',
            )}
            aria-label={settings.theme === 'safelight' ? 'Switch to standard theme' : 'Switch to safelight theme'}
            aria-pressed={settings.theme === 'safelight'}
          >
            <Lamp size={17} />
          </button>
          <a
            href="https://github.com/kilianvivien/DarkTimer"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-11 w-full items-center justify-center rounded-[1.2rem] text-ui-gray transition-colors hover:bg-white/[0.05] hover:text-white"
            aria-label="GitHub repository"
          >
            <Github size={17} />
          </a>
          <button
            onClick={() => setShowHelp(true)}
            className="press-feedback flex w-full items-center justify-center rounded-[1.2rem] text-ui-gray transition-colors hover:bg-white/[0.05] hover:text-white"
            aria-label="How to use"
          >
            <Info size={17} />
          </button>
        </div>
      </nav>

      <motion.main
        className="flex-1 flex flex-col items-center px-4 md:px-6 pt-8 md:pt-10 xl:pt-12 pb-40 md:pb-8 max-w-5xl xl:max-w-6xl mx-auto w-full"
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
                className="w-full max-w-2xl md:max-w-5xl xl:max-w-6xl mx-auto"
              >
                <SessionView
                  recipe={recipe}
                  initialSession={resumeSession}
                  onExit={reset}
                  onSaveSession={handleSaveSession}
                  onToggleTheme={handleToggleSafelight}
                  settings={settings}
                />
              </motion.div>
            </Suspense>
          )}
          </AnimatePresence>
        )}
      </motion.main>

      {/* Mobile bottom nav bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] pointer-events-none">
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
            className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur-sm sm:items-center md:p-6"
            onClick={() => setShowHelp(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="help-modal-panel bg-black/70 backdrop-blur-2xl border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_32px_64px_rgba(0,0,0,0.7)] max-w-md w-full p-6 md:p-8 space-y-6 rounded-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="sticky top-0 z-10 -mx-1 flex items-start justify-between bg-black/90 px-1 py-1 backdrop-blur-xl">
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

              <p className="text-sm leading-relaxed text-white/65">
                Choose a workflow, prepare the recipe, then review every phase before starting. Recipes, chemistry, and session history stay on this device.
              </p>

              <div className="help-modal-grid grid grid-cols-1 gap-4 text-ui-gray">
                <div className="space-y-2 rounded-xl border border-white/[0.06] bg-white/[0.025] p-3 sm:p-4">
                  <p className="font-mono text-xs uppercase tracking-widest text-white">Manual</p>
                  <p className="text-sm leading-relaxed">Build a recipe from scratch: choose the process, film, developer, dilution, ISO, and temperature. Set the duration and agitation for each bath, then save it or start immediately.</p>
                </div>
                <div className="space-y-2 rounded-xl border border-white/[0.06] bg-white/[0.025] p-3 sm:p-4">
                  <p className="font-mono text-xs uppercase tracking-widest text-white">AI Assistant</p>
                  <p className="text-sm leading-relaxed">Enter your film and developer to look for a starting point. DarkTimer checks its offline chart and cache first, then uses Gemini or Mistral when a local API key and connection are available.</p>
                </div>
                <div className="space-y-2 rounded-xl border border-white/[0.06] bg-white/[0.025] p-3 sm:p-4">
                  <p className="font-mono text-xs uppercase tracking-widest text-white">Run the Timer</p>
                  <p className="text-sm leading-relaxed">Review the recipe and developer compensation before starting. The timer advances through each bath, signals agitation and phase changes, and can resume an interrupted active session.</p>
                </div>
                <div className="space-y-2 rounded-xl border border-white/[0.06] bg-white/[0.025] p-3 sm:p-4">
                  <p className="font-mono text-xs uppercase tracking-widest text-white">Library</p>
                  <p className="text-sm leading-relaxed">Recipes holds reusable presets saved from Manual or AI. History records completed and interrupted sessions so you can inspect what was run and quickly reuse a proven setup.</p>
                </div>
                <div className="space-y-2 rounded-xl border border-white/[0.06] bg-white/[0.025] p-3 sm:p-4">
                  <p className="font-mono text-xs uppercase tracking-widest text-white">Chemistry</p>
                  <p className="text-sm leading-relaxed">Track developer and fixer batches by mix date, expiry, and roll count. Capacity and age warnings help you decide when chemistry should be checked or replaced.</p>
                </div>
                <div className="space-y-2 rounded-xl border border-white/[0.06] bg-white/[0.025] p-3 sm:p-4">
                  <p className="font-mono text-xs uppercase tracking-widest text-white">Settings</p>
                  <p className="text-sm leading-relaxed">Set development defaults and display mode, manage local API keys, choose alerts and cues, configure chemistry tracking, and control saved history and app data.</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showIosSafelightAdvice && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="fixed inset-x-4 top-[calc(env(safe-area-inset-top)+4.5rem)] z-[65] landscape:hidden"
            role="status"
          >
            <div className="mx-auto max-w-md rounded-2xl border border-accent-red/35 bg-black/90 p-4 shadow-[0_18px_48px_rgba(0,0,0,0.75)] backdrop-blur-2xl">
              <div className="flex items-start gap-3">
                <Lamp size={18} className="mt-0.5 shrink-0 text-accent-red" />
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent-red">iPhone safelight tip</p>
                  <p className="text-sm leading-relaxed text-white/72">
                    Rotate to landscape so iOS hides its bright status bar. For the safest setup, also enable iOS Color Tint and lower display brightness.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIosSafelightAdvice(false)}
                  className="press-feedback -mr-1 -mt-1 flex h-11 w-11 items-center justify-center rounded-full text-ui-gray hover:text-white"
                  aria-label="Dismiss iPhone safelight tip"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!pwaUpdate.isOnline && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="fixed inset-x-4 top-[calc(env(safe-area-inset-top)+4.5rem)] z-[60] md:inset-x-auto md:right-6 md:w-[24rem]"
            aria-live="polite"
          >
            <div className="rounded-2xl border border-accent-red/35 bg-black/80 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,0,0,0.08),0_18px_48px_rgba(0,0,0,0.7)] backdrop-blur-2xl">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent-red">Offline</p>
              <p className="mt-1 text-sm leading-relaxed text-white/75">
                Manual recipes, your saved presets, chemistry, and timers still work. AI lookups use cached results when available.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showInstallBanner && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+11rem)] z-[60] md:inset-x-auto md:right-6 md:bottom-36 md:w-[26rem]"
            aria-live="polite"
          >
            <div className="rounded-[1.75rem] border border-accent-red/25 bg-black/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_24px_64px_rgba(0,0,0,0.7)] backdrop-blur-2xl">
              <div className="space-y-2">
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-accent-red">Install DarkTimer</p>
                <h2 className="text-base font-semibold tracking-tight text-white">Keep DarkTimer one tap away.</h2>
                <p className="text-sm leading-relaxed text-white/72">
                  Install the app for a more native timer experience, easier relaunching, and cleaner fullscreen behavior.
                </p>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => void dismissPwaInstallPrompt()}
                  className="press-feedback rounded-full border border-white/[0.08] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-white/72 hover:text-white"
                >
                  Dismiss
                </button>
                <button
                  type="button"
                  onClick={() => void handleInstallAction()}
                  className="press-feedback rounded-full bg-white px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-black"
                >
                  {pwaUpdate.isInstallPromptAvailable ? 'Install App' : 'Install Steps'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showUpdateBanner && (
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
                {pwaUpdate.installPlatform === 'ios-safari' && pwaUpdate.isStandalone ? (
                  <p className="text-xs leading-relaxed text-white/50">
                    On iOS, fully close and relaunch DarkTimer afterwards to finish the update.
                  </p>
                ) : null}
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
        {resumeSession && view !== 'timer' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[65] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-6"
          >
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="w-full max-w-md rounded-[1.75rem] border border-white/[0.08] bg-black/80 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_24px_64px_rgba(0,0,0,0.7)] backdrop-blur-2xl"
            >
              <div className="space-y-2">
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-accent-red">Resume Session</p>
                <h2 className="text-xl font-semibold tracking-tight text-white">
                  Continue {resumeSession.recipe.film}
                </h2>
                <p className="text-sm leading-relaxed text-white/72">
                  DarkTimer found an interrupted timer session. Resume where you left off or discard it and start fresh.
                </p>
              </div>
              <div className="mt-5 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleResumeStoredSession}
                  className="press-feedback flex-1 rounded-full bg-white px-4 py-3 font-mono text-[11px] uppercase tracking-[0.2em] text-black"
                >
                  Resume Timer
                </button>
                <button
                  type="button"
                  onClick={() => void handleDiscardStoredSession()}
                  className="press-feedback flex-1 rounded-full border border-white/[0.08] px-4 py-3 font-mono text-[11px] uppercase tracking-[0.2em] text-white/72 hover:text-white"
                >
                  Discard
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showInstallHelp && installInstructions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[65] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] md:p-6"
            onClick={() => setShowInstallHelp(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="flex max-h-[min(78vh,42rem)] w-full max-w-md flex-col overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-black/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_24px_64px_rgba(0,0,0,0.7)] backdrop-blur-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="space-y-2 overflow-y-auto px-6 pt-6 pb-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-accent-red">Install Guide</p>
                <h2 className="text-xl font-semibold tracking-tight text-white">{installInstructions.title}</h2>
                {installInstructions.steps ? (
                  <div className="space-y-3 pt-1">
                    {installInstructions.steps.map((step, index) => {
                      const Icon = INSTALL_STEP_ICONS[step.icon];
                      return (
                        <div
                          key={`${step.cue}-${index}`}
                          className="flex items-start gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3 py-3"
                        >
                          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-accent-red/30 bg-accent-red/10 text-accent-red">
                            <Icon size={16} />
                          </div>
                          <div className="space-y-1">
                            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white">
                              {index + 1}. {step.cue}
                            </p>
                            <p className="text-sm leading-relaxed text-white/72">{step.detail}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : installInstructions.body ? (
                  <p className="whitespace-pre-line text-sm leading-relaxed text-white/72">{installInstructions.body}</p>
                ) : null}
              </div>
              <div className="flex justify-end border-t border-white/[0.06] px-6 pt-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
                <button
                  type="button"
                  onClick={() => setShowInstallHelp(false)}
                  className="press-feedback rounded-full bg-white px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-black"
                >
                  Close
                </button>
              </div>
            </motion.div>
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
