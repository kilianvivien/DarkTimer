import React, { useEffect, useState } from 'react';
import { Sparkles, Loader2, Info, Plus, Settings } from 'lucide-react';
import { getDevTimes, DevResponse } from '../services/ai';
import { AnimatePresence, motion } from 'motion/react';
import { DevRecipe, ProcessMode, formatTemperature } from '../services/recipe';
import { savePreset } from '../services/presets';
import {
  AIProvider,
  getDefaultTemperatureForMode,
  getGeminiApiKey,
  getMistralApiKey,
  getSettings,
  saveAiProvider,
} from '../services/settings';
import { ProcessModeSwitch } from './ProcessModeSwitch';

interface FilmSearchProps {
  onRecipeFound: (recipe: DevRecipe) => void;
  onOpenSettings: () => void;
}

const PROVIDER_LABELS: Record<AIProvider, string> = {
  gemini: 'Gemini',
  mistral: 'Mistral',
};

function getApiKeyForProvider(provider: AIProvider): string {
  return provider === 'mistral' ? getMistralApiKey() : getGeminiApiKey();
}

export const FilmSearch: React.FC<FilmSearchProps> = ({ onRecipeFound, onOpenSettings }) => {
  const settings = getSettings();
  const [film, setFilm] = useState('');
  const [developer, setDeveloper] = useState('');
  const [dilution, setDilution] = useState('');
  const [iso, setIso] = useState('400');
  const [processMode, setProcessMode] = useState<ProcessMode>('bw');
  const [tempC, setTempC] = useState(() => getDefaultTemperatureForMode('bw', settings));
  const [provider, setProvider] = useState<AIProvider>(settings.aiProvider);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DevResponse | null>(null);
  const [resultProvider, setResultProvider] = useState<AIProvider | null>(null);
  const [error, setError] = useState('');
  const [showMissingKeyWarning, setShowMissingKeyWarning] = useState(false);
  const [isOffline, setIsOffline] = useState(() =>
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  );

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
    saveAiProvider(nextProvider);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!getApiKeyForProvider(provider).trim()) {
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
    
    const response = await getDevTimes(provider, film, developer, iso, tempC, dilution, processMode);
    
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
            <input
              type="number"
              value={tempC}
              onChange={(e) => setTempC(parseFloat(e.target.value) || 0)}
              className="utilitarian-input w-full"
              step="0.5"
            />
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
            <input
              type="text"
              placeholder="e.g. 400"
              value={iso}
              onChange={(e) => setIso(e.target.value)}
              className="utilitarian-input w-full"
            />
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
                  onClick={() => {
                    savePreset(option);
                    alert('Recipe saved to library');
                  }}
                  className="utilitarian-button px-3 hover:bg-accent-red hover:text-white hover:border-accent-red"
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 md:p-6"
            onClick={() => setShowMissingKeyWarning(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="bg-dark-panel border border-dark-border max-w-md w-full p-6 md:p-8 space-y-5"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="space-y-2">
                <p className="text-white font-mono text-sm uppercase tracking-widest">
                  {PROVIDER_LABELS[provider]} API key required
                </p>
                <p className="text-sm text-ui-gray leading-relaxed">
                  The AI Assistant needs a {PROVIDER_LABELS[provider]} API key before it can look up development times. You can add it in AI Settings and come straight back here.
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
