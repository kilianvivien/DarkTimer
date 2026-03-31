import React, { useEffect, useState } from 'react';
import { Sparkles, Loader2, Info, Plus, Settings, Search, CircleAlert } from 'lucide-react';
import { getDevTimes, DevResponse } from '../services/ai';
import { AnimatePresence, motion } from 'motion/react';
import { DevRecipe, ProcessMode, formatTemperature } from '../services/recipe';
import {
  getDefaultTemperatureForMode,
} from '../services/settings';
import { ProcessModeSwitch } from './ProcessModeSwitch';
import { TemperatureInput } from './TemperatureInput';
import { EmptyState } from './EmptyState';
import type { AIProvider, UserSettings } from '../services/userSettings';

interface FilmSearchProps {
  apiKeys: Record<AIProvider, string>;
  onRecipeFound: (recipe: DevRecipe) => void;
  onOpenSettings: () => void;
  onProviderChange: (provider: AIProvider) => Promise<void>;
  onSavePreset: (recipe: DevRecipe) => Promise<void>;
  settings: UserSettings;
}

const ISO_OPTIONS = [1, 2, 3, 6, 12, 25, 50, 64, 100, 200, 250, 320, 400, 800, 1600, 3200];

const PROVIDER_LABELS: Record<AIProvider, string> = {
  gemini: 'Gemini',
  mistral: 'Mistral',
};

export const FilmSearch: React.FC<FilmSearchProps> = ({
  apiKeys,
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
  const [error, setError] = useState('');
  const [showMissingKeyWarning, setShowMissingKeyWarning] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [savingRecipeIndex, setSavingRecipeIndex] = useState<number | null>(null);
  const [isOffline, setIsOffline] = useState(() =>
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  );

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

  const handleProcessModeChange = (nextMode: ProcessMode) => {
    setProcessMode(nextMode);
    setTempC(getDefaultTemperatureForMode(nextMode, settings));
  };

  const handleProviderChange = (nextProvider: AIProvider) => {
    setProvider(nextProvider);
    void onProviderChange(nextProvider);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const apiKey = apiKeys[provider]?.trim() ?? '';

    if (!apiKey) {
      setShowMissingKeyWarning(true);
      setError('');
      return;
    }
    if (!film || !developer) {
      setError('Enter at least a film and developer before asking AI.');
      return;
    }
    if (isOffline) {
      setError('AI lookup requires an internet connection.');
      return;
    }

    setLoading(true);
    setError('');
    setResults(null);
    setResultProvider(null);
    setHasSearched(true);
    
    const response = await getDevTimes(
      provider,
      apiKey,
      film,
      developer,
      String(iso),
      tempC,
      dilution,
      processMode,
    );
    
    if (response && response.options.length > 0) {
      setResults(response);
      setResultProvider(provider);
    } else {
      setError('No recipes found. Try adjusting parameters.');
    }
    setLoading(false);
  };

  return (
    <div className="w-full max-w-2xl space-y-8">
      <form onSubmit={handleSearch} className="space-y-6 utilitarian-border p-6 bg-dark-panel">
        <div className="grid grid-cols-1 md:grid-cols-[1.7fr_0.8fr] gap-4 items-end">
          <ProcessModeSwitch value={processMode} onChange={handleProcessModeChange} />
          <div className="space-y-1">
            <label className="mono-label">Temperature (°C)</label>
            <TemperatureInput value={tempC} onChange={setTempC} />
          </div>
        </div>

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
              >
                {PROVIDER_LABELS[option]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1 col-span-2 md:col-span-1">
            <label className="mono-label">Film</label>
            <input
              type="text"
              placeholder="e.g. Tri-X"
              value={film}
              onChange={(e) => setFilm(e.target.value)}
              className="utilitarian-input w-full"
            />
          </div>
          <div className="space-y-1 col-span-2 md:col-span-1">
            <label className="mono-label">Developer</label>
            <input
              type="text"
              placeholder="e.g. Rodinal"
              value={developer}
              onChange={(e) => setDeveloper(e.target.value)}
              className="utilitarian-input w-full"
            />
          </div>
          <div className="space-y-1">
            <label className="mono-label">Dilution</label>
            <input
              type="text"
              placeholder="e.g. 1+25"
              value={dilution}
              onChange={(e) => setDilution(e.target.value)}
              className="utilitarian-input w-full"
            />
          </div>
          <div className="space-y-1">
            <label className="mono-label">ISO</label>
            <select
              value={iso}
              onChange={(e) => setIso(parseInt(e.target.value))}
              className="utilitarian-input w-full bg-dark-panel px-3 py-2 text-xs"
            >
              {ISO_OPTIONS.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={loading || isOffline}
            className="w-full sm:w-auto utilitarian-button bg-white text-black flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            <span>Ask AI</span>
          </button>
        </div>

        {isOffline && (
          <p className="text-[10px] font-mono text-ui-gray text-center">
            You&apos;re offline. Manual mode, presets, and timers still work, but AI lookup is unavailable.
          </p>
        )}
        {error && <p className="text-[10px] font-mono text-accent-red text-center">{error}</p>}
      </form>

      {loading && (
        <div className="grid grid-cols-1 gap-3">
          {[0, 1].map((card) => (
            <div key={card} className="utilitarian-border bg-dark-panel p-4 space-y-4 animate-pulse">
              <div className="flex justify-between gap-3">
                <div className="h-4 w-32 bg-dark-border" />
                <div className="h-4 w-14 bg-dark-border" />
              </div>
              <div className="space-y-2">
                <div className="h-3 w-2/3 bg-dark-border" />
                <div className="h-3 w-1/3 bg-dark-border" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !results && !error && !hasSearched && (
        <EmptyState
          icon={Search}
          title="Ask AI for a darkroom starting point"
          subtitle="Enter a film stock and developer to get structured timing suggestions you can run immediately or save to your library."
          className="max-w-2xl"
        />
      )}

      {!loading && !results && error && (
        <EmptyState
          icon={CircleAlert}
          title="Search unavailable"
          subtitle={error}
          className="max-w-2xl"
        />
      )}

      {results && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center space-x-2 text-ui-gray">
            <Info size={12} />
            <span className="mono-label">
              {(resultProvider ? PROVIDER_LABELS[resultProvider] : PROVIDER_LABELS[provider])} found {results.options.length} options
            </span>
          </div>
          
          <div className="grid grid-cols-1 gap-3">
            {results.options.map((option, i) => (
              <div key={i} className="flex gap-2 group">
                <button
                  onClick={() => onRecipeFound(option)}
                  className="flex-1 text-left p-4 utilitarian-border bg-dark-panel hover:border-accent-red transition-all"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-white">{option.film} @ {option.iso}</h4>
                    <span className="mono-label text-accent-red">{formatTemperature(option.tempC)}</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <div className="text-[10px] font-mono text-ui-gray">
                      <p>{option.developer} ({option.dilution})</p>
                      <p className="mt-1 italic">Source: {option.source || 'Unknown'}</p>
                    </div>
                    <div className="text-xs font-mono text-white">
                      {Math.floor(option.phases[0].duration / 60)}m {option.phases[0].duration % 60}s
                    </div>
                  </div>
                </button>
                <button
                  onClick={async () => {
                    setSavingRecipeIndex(i);
                    try {
                      await onSavePreset(option);
                    } finally {
                      setSavingRecipeIndex((current) => (current === i ? null : current));
                    }
                  }}
                  disabled={savingRecipeIndex === i}
                  className="utilitarian-button px-3 hover:bg-accent-red hover:text-white hover:border-accent-red disabled:opacity-60"
                  title="Save to Library"
                >
                  <Plus size={16} />
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {showMissingKeyWarning && (
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
                  Gemini or Mistral API key required
                </p>
                <p className="text-sm text-ui-gray leading-relaxed">
                  The AI Assistant needs a Gemini or Mistral API key before it can look up development times. Add one in AI Settings and come straight back here.
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
                  <span>Open Settings</span>
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
        )}
      </AnimatePresence>
    </div>
  );
};
