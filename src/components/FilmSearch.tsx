import React, { useMemo, useRef, useEffect, useState } from 'react';
import { ArrowRightLeft, CircleAlert, Loader2, RotateCcw, Search, Settings, Sparkles } from 'lucide-react';
import { getDevTimes, type DevResponse } from '../services/ai';
import { AIRecipeError, type AIErrorCode } from '../services/aiErrors';
import { motion, AnimatePresence } from 'motion/react';
import { DevRecipe, ProcessMode, formatTemperature, getProcessLabel } from '../services/recipe';
import { getDefaultTemperatureForMode } from '../services/settings';
import { ProcessModeSwitch } from './ProcessModeSwitch';
import { TemperatureInput } from './TemperatureInput';
import { EmptyState } from './EmptyState';
import type { AIProvider, UserSettings } from '../services/userSettings';
import {
  DEVELOPER_OPTIONS,
  DILUTION_OPTIONS,
  FILM_STOCK_OPTIONS,
  ISO_OPTIONS,
  filterCatalogByProcessMode,
} from '../services/searchCatalog';
import { SearchableField } from './SearchableField';

interface FilmSearchProps {
  apiKeys: Record<AIProvider, string>;
  hasEncryptedApiKeys: boolean;
  isVaultLocked: boolean;
  onRecipeFound: (recipe: DevRecipe) => void;
  onOpenSettings: () => void;
  onProviderChange: (provider: AIProvider) => Promise<void>;
  onSavePreset: (recipe: DevRecipe) => Promise<void>;
  settings: UserSettings;
}

interface SearchQuery {
  film: string;
  developer: string;
  dilution: string;
  iso: number;
  tempC: number;
  processMode: ProcessMode;
}

interface SearchErrorState {
  code: AIErrorCode | 'validation';
  provider: AIProvider;
  retryable: boolean;
  title: string;
  message: string;
}

const MOBILE_BREAKPOINT = 768;
const REFRESH_THRESHOLD_PX = 72;
const MAX_PULL_DISTANCE_PX = 108;

const PROVIDER_LABELS: Record<AIProvider, string> = {
  gemini: 'Gemini',
  mistral: 'Mistral',
};

function getTotalRecipeDuration(recipe: DevRecipe): number {
  return recipe.phases.reduce((total, phase) => total + phase.duration, 0);
}

function normalizeQuery(query: SearchQuery): SearchQuery {
  return {
    ...query,
    film: query.film.trim(),
    developer: query.developer.trim(),
    dilution: query.dilution.trim(),
  };
}

function buildSearchError(provider: AIProvider, error: unknown): SearchErrorState {
  const normalized = error instanceof AIRecipeError ? error : new AIRecipeError('unknown', provider);

  switch (normalized.code) {
    case 'auth':
      return {
        code: normalized.code,
        provider,
        retryable: false,
        title: `${PROVIDER_LABELS[provider]} needs a valid API key`,
        message: 'Open Settings to update or unlock the saved key for this provider.',
      };
    case 'bad_request':
      return {
        code: normalized.code,
        provider,
        retryable: false,
        title: `${PROVIDER_LABELS[provider]} rejected this request`,
        message: normalized.message,
      };
    case 'rate_limit':
      return {
        code: normalized.code,
        provider,
        retryable: true,
        title: `${PROVIDER_LABELS[provider]} is rate limiting requests`,
        message: 'Wait a moment and retry, or switch providers if you have another key available.',
      };
    case 'unavailable':
      return {
        code: normalized.code,
        provider,
        retryable: true,
        title: `${PROVIDER_LABELS[provider]} is temporarily unavailable`,
        message: normalized.message,
      };
    case 'network':
      return {
        code: normalized.code,
        provider,
        retryable: true,
        title: `${PROVIDER_LABELS[provider]} could not be reached`,
        message: 'Check your connection and retry. Manual recipes and saved presets still work offline.',
      };
    case 'offline':
      return {
        code: normalized.code,
        provider,
        retryable: false,
        title: 'AI lookup is offline',
        message: 'Reconnect to the internet to fetch development recipes.',
      };
    case 'invalid_response':
      return {
        code: normalized.code,
        provider,
        retryable: true,
        title: `${PROVIDER_LABELS[provider]} returned unusable recipe data`,
        message: 'Retry the lookup or try the other provider for a cleaner result.',
      };
    case 'no_results':
      return {
        code: normalized.code,
        provider,
        retryable: true,
        title: 'No recipe candidates found',
        message: 'Try a different dilution, ISO, or provider to widen the search.',
      };
    default:
      return {
        code: normalized.code,
        provider,
        retryable: true,
        title: `${PROVIDER_LABELS[provider]} lookup failed`,
        message: normalized.message || 'Please retry, or switch providers if the problem persists.',
      };
  }
}

export const FilmSearch: React.FC<FilmSearchProps> = ({
  apiKeys,
  hasEncryptedApiKeys,
  isVaultLocked,
  onOpenSettings,
  onProviderChange,
  onRecipeFound,
  onSavePreset,
  settings,
}) => {
  const [film, setFilm] = useState('');
  const [developer, setDeveloper] = useState('');
  const [dilution, setDilution] = useState('');
  const [iso, setIso] = useState(400);
  const [processMode, setProcessMode] = useState<ProcessMode>('bw');
  const [tempC, setTempC] = useState(() => getDefaultTemperatureForMode('bw', settings));
  const [provider, setProvider] = useState<AIProvider>(settings.aiProvider);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DevResponse | null>(null);
  const [resultProvider, setResultProvider] = useState<AIProvider | null>(null);
  const [searchError, setSearchError] = useState<SearchErrorState | null>(null);
  const [showMissingKeyWarning, setShowMissingKeyWarning] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [savingRecipeIndex, setSavingRecipeIndex] = useState<number | null>(null);
  const [lastSubmittedQuery, setLastSubmittedQuery] = useState<SearchQuery | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(() =>
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  );
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const pullActiveRef = useRef(false);
  const pullDistanceRef = useRef(0);
  const latestRequestIdRef = useRef(0);

  useEffect(() => {
    setProvider(settings.aiProvider);
  }, [settings.aiProvider]);

  useEffect(() => {
    setProvider(settings.aiProvider);
  }, [settings.aiProvider]);

  useEffect(() => {
    const syncConnectivity = () => {
      setIsOffline(!navigator.onLine);
    };

    window.addEventListener('online', syncConnectivity);
    window.addEventListener('offline', syncConnectivity);

    return () => {
      window.removeEventListener('online', syncConnectivity);
      window.removeEventListener('offline', syncConnectivity);
    };
  }, []);

  const filmOptions = useMemo(
    () => filterCatalogByProcessMode(FILM_STOCK_OPTIONS, processMode),
    [processMode],
  );
  const developerOptions = useMemo(
    () => filterCatalogByProcessMode(DEVELOPER_OPTIONS, processMode),
    [processMode],
  );

  const alternateProvider: AIProvider = provider === 'gemini' ? 'mistral' : 'gemini';
  const alternateProviderHasKey = Boolean(apiKeys[alternateProvider]?.trim());

  const handleProcessModeChange = (nextMode: ProcessMode) => {
    setProcessMode(nextMode);
    setTempC(getDefaultTemperatureForMode(nextMode, settings));
  };

  const handleProviderChange = (nextProvider: AIProvider) => {
    setProvider(nextProvider);
    void onProviderChange(nextProvider);
  };

  const resetSearchUi = (preserveSearchedState = true) => {
    setSearchError(null);
    setResults(null);
    setResultProvider(null);
    setShowMissingKeyWarning(false);

    if (!preserveSearchedState) {
      setHasSearched(false);
    }
  };

  const executeSearch = async (
    query: SearchQuery,
    nextProvider: AIProvider,
    options: {
      showKeyWarning?: boolean;
      persistQuery?: boolean;
      preserveSearchedState?: boolean;
    } = {},
  ) => {
    const {
      showKeyWarning = false,
      persistQuery = true,
      preserveSearchedState = true,
    } = options;
    const normalizedQuery = normalizeQuery(query);
    const apiKey = apiKeys[nextProvider]?.trim() ?? '';

    resetSearchUi(preserveSearchedState);

    if (!apiKey) {
      if (showKeyWarning) {
        setShowMissingKeyWarning(true);
        setSearchError({
          code: 'validation',
          provider: nextProvider,
          retryable: false,
          title: hasEncryptedApiKeys && isVaultLocked
            ? 'Unlock saved API keys'
            : `${PROVIDER_LABELS[nextProvider]} API key required`,
          message: hasEncryptedApiKeys && isVaultLocked
            ? 'DarkTimer found saved keys, but they are still locked for this session.'
            : `Add a ${PROVIDER_LABELS[nextProvider]} API key in Settings before using AI search.`,
        });
      }
      return;
    }

    if (!normalizedQuery.film || !normalizedQuery.developer) {
      setSearchError({
        code: 'validation',
        provider: nextProvider,
        retryable: false,
        title: 'Add a film and developer',
        message: 'Enter at least a film stock and developer before asking AI.',
      });
      return;
    }

    if (isOffline) {
      setSearchError(buildSearchError(nextProvider, new AIRecipeError('offline', nextProvider)));
      return;
    }

    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;
    setLoading(true);
    setHasSearched(true);

    if (persistQuery) {
      setLastSubmittedQuery(normalizedQuery);
    }

    try {
      const response = await getDevTimes(
        nextProvider,
        apiKey,
        normalizedQuery.film,
        normalizedQuery.developer,
        String(normalizedQuery.iso),
        normalizedQuery.tempC,
        normalizedQuery.dilution,
        normalizedQuery.processMode,
      );

      if (requestId !== latestRequestIdRef.current) {
        return;
      }

      setResults(response);
      setResultProvider(nextProvider);
    } catch (error) {
      if (requestId !== latestRequestIdRef.current) {
        return;
      }

      setSearchError(buildSearchError(nextProvider, error));
    } finally {
      if (requestId === latestRequestIdRef.current) {
        setLoading(false);
      }
    }
  };

  const resetPullState = () => {
    touchStartRef.current = null;
    pullActiveRef.current = false;
    pullDistanceRef.current = 0;
    setPullDistance(0);
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLElement>) => {
    if (
      loading ||
      isRefreshing ||
      event.touches.length !== 1 ||
      window.innerWidth >= MOBILE_BREAKPOINT ||
      window.scrollY !== 0
    ) {
      resetPullState();
      return;
    }

    const touch = event.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    pullActiveRef.current = false;
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLElement>) => {
    if (!touchStartRef.current || loading || isRefreshing || window.innerWidth >= MOBILE_BREAKPOINT) {
      return;
    }

    const touch = event.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;

    if (deltaY <= 0 || window.scrollY !== 0) {
      resetPullState();
      return;
    }

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      resetPullState();
      return;
    }

    pullActiveRef.current = true;
    const nextDistance = Math.min(MAX_PULL_DISTANCE_PX, deltaY * 0.5);
    pullDistanceRef.current = nextDistance;
    setPullDistance(nextDistance);
    event.preventDefault();
  };

  const handleTouchEnd = async () => {
    if (!pullActiveRef.current) {
      resetPullState();
      return;
    }

    const shouldRefresh = pullDistanceRef.current >= REFRESH_THRESHOLD_PX;
    resetPullState();

    if (!shouldRefresh || loading || isRefreshing) {
      return;
    }

    resetSearchUi(false);

    if (!lastSubmittedQuery || isOffline) {
      return;
    }

    setIsRefreshing(true);

    try {
      await executeSearch(lastSubmittedQuery, provider, {
        showKeyWarning: false,
        persistQuery: false,
        preserveSearchedState: false,
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const pullRefreshLabel = useMemo(() => {
    if (isRefreshing) {
      return `Retrying with ${PROVIDER_LABELS[provider]}`;
    }

    if (pullDistance >= REFRESH_THRESHOLD_PX) {
      return lastSubmittedQuery && !isOffline ? `Release to retry with ${PROVIDER_LABELS[provider]}` : 'Release to clear';
    }

    return lastSubmittedQuery && !isOffline ? `Pull to retry with ${PROVIDER_LABELS[provider]}` : 'Pull to clear';
  }, [isRefreshing, isOffline, lastSubmittedQuery, provider, pullDistance]);

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault();

    await executeSearch(
      {
        film,
        developer,
        dilution,
        iso,
        tempC,
        processMode,
      },
      provider,
      { showKeyWarning: true, persistQuery: true },
    );
  };

  const handleRetry = () => {
    if (!lastSubmittedQuery || loading) {
      return;
    }

    void executeSearch(lastSubmittedQuery, provider, {
      showKeyWarning: true,
      persistQuery: false,
      preserveSearchedState: true,
    });
  };

  const handleAlternateProvider = () => {
    if (!lastSubmittedQuery || loading) {
      return;
    }

    handleProviderChange(alternateProvider);

    if (!alternateProviderHasKey) {
      onOpenSettings();
      return;
    }

    void executeSearch(lastSubmittedQuery, alternateProvider, {
      showKeyWarning: false,
      persistQuery: false,
      preserveSearchedState: true,
    });
  };

  return (
    <div
      className="w-full max-w-2xl space-y-8"
      aria-label="AI search"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={() => {
        void handleTouchEnd();
      }}
      onTouchCancel={resetPullState}
    >
      <div
        className={`overflow-hidden transition-[height,opacity] duration-200 ${
          pullDistance > 0 || isRefreshing ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ height: pullDistance > 0 || isRefreshing ? Math.max(40, pullDistance) : 0 }}
        aria-live="polite"
      >
        <div
          className={`flex h-full items-end justify-center pb-2 text-[10px] font-mono uppercase tracking-[0.18em] ${
            pullDistance >= REFRESH_THRESHOLD_PX && !isRefreshing ? 'text-white' : 'text-ui-gray'
          }`}
        >
          {pullRefreshLabel}
        </div>
      </div>

      <form onSubmit={handleSearch} className="space-y-8">
        <div className="utilitarian-border bg-dark-panel p-5 md:p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-[1.7fr_0.8fr] gap-4 items-end">
            <ProcessModeSwitch value={processMode} onChange={handleProcessModeChange} />
            <div className="space-y-1">
              <label className="mono-label">Temperature (°C)</label>
              <TemperatureInput value={tempC} onChange={setTempC} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="col-span-2 md:col-span-1 min-w-0">
            <SearchableField
              label="Film Stock"
              options={filmOptions}
              placeholder={processMode === 'bw' ? 'e.g. Tri-X 400' : 'e.g. Portra 400'}
              value={film}
              onChange={(value) => {
                setFilm(value);
                const match = FILM_STOCK_OPTIONS.find((o) => o.value === value);
                if (match?.iso != null && ISO_OPTIONS.includes(match.iso)) {
                  setIso(match.iso);
                }
              }}
            />
          </div>
          <div className="col-span-2 md:col-span-1 min-w-0">
            <SearchableField
              label="Developer"
              options={developerOptions}
              placeholder={processMode === 'bw' ? 'e.g. Rodinal' : 'e.g. C-41'}
              value={developer}
              onChange={setDeveloper}
            />
          </div>
          <div className="min-w-0">
            <SearchableField
              label="Dilution"
              options={DILUTION_OPTIONS}
              placeholder="e.g. 1+25"
              value={dilution}
              onChange={setDilution}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="ai-iso" className="mono-label">ISO</label>
            <select
              id="ai-iso"
              value={iso}
              onChange={(event) => setIso(parseInt(event.target.value, 10))}
              className="utilitarian-input mobile-form-control-compact w-full bg-dark-panel px-3 py-2"
            >
              {ISO_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="utilitarian-border bg-dark-panel p-5 md:p-6 space-y-5">
          <div className="space-y-2">
            <label className="mono-label">AI Provider</label>
            <div className="grid grid-cols-2 gap-2">
              {(['gemini', 'mistral'] as AIProvider[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleProviderChange(option)}
                  className={`utilitarian-button px-4 py-3 text-xs font-mono uppercase tracking-widest ${
                    provider === option ? 'bg-white text-black border-white' : ''
                  }`}
                  aria-pressed={provider === option}
                >
                  {PROVIDER_LABELS[option]}
                </button>
              ))}
            </div>
            <p className="text-xs text-ui-gray font-mono">
              The AI search form mirrors Manual mode on purpose, then adds provider-specific lookup on top.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="submit"
              disabled={loading || isOffline || !film.trim() || !developer.trim()}
              className="flex-1 utilitarian-button bg-white text-black font-bold py-4 hover:bg-accent-red hover:text-white hover:border-accent-red flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              <span>Ask AI</span>
            </button>
          </div>

          {isOffline ? (
            <p className="text-[10px] font-mono text-ui-gray text-center">
              You&apos;re offline. Manual mode, presets, and timers still work, but AI lookup is unavailable.
            </p>
          ) : null}
        </div>
      </form>

      {loading ? (
        <div className="space-y-4">
          <div className="utilitarian-border bg-dark-panel p-5 md:p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="mono-label text-accent-red">AI lookup in progress</p>
                <h3 className="text-xl font-bold uppercase tracking-tight text-white">
                  {film.trim() || 'Film'} + {developer.trim() || 'Developer'}
                </h3>
                <p className="text-sm leading-relaxed text-ui-gray">
                  {PROVIDER_LABELS[provider]} is building structured recipe candidates for {getProcessLabel(processMode)} processing.
                </p>
              </div>
              <motion.div
                aria-hidden="true"
                className="h-3 w-3 rounded-full bg-accent-red shadow-[0_0_18px_rgba(255,0,0,0.75)]"
                animate={{ opacity: [0.35, 1, 0.35], scale: [0.9, 1.08, 0.9] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>

            <div className="grid grid-cols-1 gap-3">
              {[0, 1].map((card) => (
                <div key={card} className="utilitarian-border bg-black/20 p-4 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="h-4 w-36 animate-pulse bg-dark-border" />
                      <div className="h-3 w-28 animate-pulse bg-dark-border" />
                    </div>
                    <div className="h-6 w-16 animate-pulse bg-dark-border" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="h-8 animate-pulse bg-dark-border" />
                    <div className="h-8 animate-pulse bg-dark-border" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {!loading && !results && !searchError && !hasSearched ? (
        <EmptyState
          icon={Search}
          title="Ask AI for a darkroom starting point"
          subtitle="Use the same process, temperature, and chemistry rhythm as Manual mode, then let AI return recipe candidates you can run or save."
          className="max-w-2xl"
        />
      ) : null}

      {!loading && !results && searchError ? (
        <div className="utilitarian-border bg-dark-panel p-5 md:p-6 space-y-5">
          <div className="flex items-start gap-3">
            <CircleAlert size={18} className="mt-0.5 shrink-0 text-accent-red" />
            <div className="space-y-2">
              <p className="mono-label text-accent-red">Search unavailable</p>
              <h3 className="text-lg font-bold uppercase tracking-tight text-white">{searchError.title}</h3>
              <p className="text-sm leading-relaxed text-ui-gray">{searchError.message}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleRetry}
              disabled={!lastSubmittedQuery || loading || isOffline}
              className="utilitarian-button bg-white text-black px-4 py-3 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <RotateCcw size={14} />
              <span>Retry</span>
            </button>
            <button
              type="button"
              onClick={handleAlternateProvider}
              disabled={!lastSubmittedQuery || loading}
              className="utilitarian-button px-4 py-3 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {alternateProviderHasKey ? <ArrowRightLeft size={14} /> : <Settings size={14} />}
              <span>{alternateProviderHasKey ? `Try ${PROVIDER_LABELS[alternateProvider]} Instead` : 'Open Settings'}</span>
            </button>
          </div>
        </div>
      ) : null}

      {results ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="mono-label text-accent-red">Recipe candidates</p>
              <p className="text-sm text-ui-gray">
                {(resultProvider ? PROVIDER_LABELS[resultProvider] : PROVIDER_LABELS[provider])} found {results.options.length} option{results.options.length === 1 ? '' : 's'}.
              </p>
            </div>
            {results.confidence ? (
              <span className="border border-dark-border px-3 py-2 text-[10px] font-mono uppercase tracking-[0.18em] text-ui-gray">
                Confidence {results.confidence}
              </span>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-3">
            {results.options.map((option, index) => {
              const totalDuration = getTotalRecipeDuration(option);
              const phasePreview = option.phases.slice(0, 3);

              return (
                <article
                  key={`${option.film}-${option.developer}-${index}`}
                  className="utilitarian-border bg-dark-panel p-5 md:p-6 space-y-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-xl font-bold uppercase tracking-tight text-white">
                          {option.film}
                        </h3>
                        <span className="border border-dark-border px-2 py-1 text-[10px] font-mono uppercase tracking-[0.18em] text-ui-gray">
                          ISO {option.iso}
                        </span>
                      </div>
                      <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-accent-red">
                        {option.developer} • {option.dilution} • {formatTemperature(option.tempC)}
                      </p>
                    </div>
                    <span className="shrink-0 border border-dark-border px-3 py-2 text-[10px] font-mono uppercase tracking-[0.18em] text-ui-gray">
                      {getProcessLabel(option.processMode)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono uppercase tracking-widest text-ui-gray md:grid-cols-4">
                    <div className="border border-dark-border bg-black/20 px-3 py-2">
                      <p className="mono-label">Total Time</p>
                      <p className="mt-1 text-white">{Math.floor(totalDuration / 60)}m {totalDuration % 60}s</p>
                    </div>
                    <div className="border border-dark-border bg-black/20 px-3 py-2">
                      <p className="mono-label">Phases</p>
                      <p className="mt-1 text-white">{option.phases.length}</p>
                    </div>
                    <div className="border border-dark-border bg-black/20 px-3 py-2">
                      <p className="mono-label">Source</p>
                      <p className="mt-1 truncate text-white">{option.source || 'Unknown'}</p>
                    </div>
                    <div className="border border-dark-border bg-black/20 px-3 py-2">
                      <p className="mono-label">Mode</p>
                      <p className="mt-1 text-white">{option.processMode === 'bw' ? 'B&W' : 'Color'}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {phasePreview.map((phase) => (
                      <span
                        key={`${option.film}-${phase.name}`}
                        className="border border-dark-border px-3 py-2 text-[10px] font-mono uppercase tracking-[0.18em] text-ui-gray"
                      >
                        {phase.name}: {Math.floor(phase.duration / 60)}m {phase.duration % 60}s
                      </span>
                    ))}
                  </div>

                  {option.notes ? (
                    <p className="text-sm leading-relaxed text-ui-gray">{option.notes}</p>
                  ) : null}

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={() => onRecipeFound(option)}
                      className="flex-1 utilitarian-button bg-white text-black font-bold py-4 hover:bg-accent-red hover:text-white hover:border-accent-red"
                    >
                      Start Timer
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        setSavingRecipeIndex(index);
                        try {
                          await onSavePreset(option);
                        } finally {
                          setSavingRecipeIndex((current) => (current === index ? null : current));
                        }
                      }}
                      disabled={savingRecipeIndex === index}
                      className="flex-1 utilitarian-button py-4 disabled:opacity-60"
                    >
                      {savingRecipeIndex === index ? 'Saving…' : 'Save to Library'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </motion.div>
      ) : null}

      <AnimatePresence>
        {showMissingKeyWarning ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 md:p-6"
            onClick={() => setShowMissingKeyWarning(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="bg-black/70 backdrop-blur-2xl border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_32px_64px_rgba(0,0,0,0.7)] rounded-2xl max-w-md w-full p-6 md:p-8 space-y-5"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="space-y-2">
                <p className="text-white font-mono text-sm uppercase tracking-widest">
                  {hasEncryptedApiKeys && isVaultLocked
                    ? 'Unlock saved API keys'
                    : 'Gemini or Mistral API key required'}
                </p>
                <p className="text-sm text-ui-gray leading-relaxed">
                  {hasEncryptedApiKeys && isVaultLocked
                    ? 'DarkTimer found securely remembered API keys, but they are still locked for this session. Open Settings to unlock them with your passphrase.'
                    : 'The AI Assistant needs a Gemini or Mistral API key before it can look up development times. Add one in AI Settings and come straight back here.'}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowMissingKeyWarning(false);
                    onOpenSettings();
                  }}
                  className="flex-1 utilitarian-button bg-white text-black hover:bg-accent-red hover:text-white hover:border-accent-red flex items-center justify-center space-x-2"
                >
                  <Settings size={16} />
                  <span>{hasEncryptedApiKeys && isVaultLocked ? 'Unlock in Settings' : 'Open Settings'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowMissingKeyWarning(false)}
                  className="flex-1 utilitarian-button"
                >
                  Not now
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};
