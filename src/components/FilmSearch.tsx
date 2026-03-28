import React, { useState } from 'react';
import { Search, Sparkles, Loader2, Info, Plus } from 'lucide-react';
import { getDevTimes, DevRecipe, DevResponse } from '../services/gemini';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface FilmSearchProps {
  onRecipeFound: (recipe: DevRecipe) => void;
}

export const FilmSearch: React.FC<FilmSearchProps> = ({ onRecipeFound }) => {
  const [film, setFilm] = useState('');
  const [developer, setDeveloper] = useState('');
  const [dilution, setDilution] = useState('');
  const [iso, setIso] = useState('400');
  const [temp, setTemp] = useState('20°C');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DevResponse | null>(null);
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!film || !developer) return;

    setLoading(true);
    setError('');
    setResults(null);
    
    const response = await getDevTimes(film, developer, iso, temp, dilution);
    
    if (response && response.options.length > 0) {
      setResults(response);
    } else {
      setError('No recipes found. Try adjusting parameters.');
    }
    setLoading(false);
  };

  return (
    <div className="w-full max-w-2xl space-y-8">
      <form onSubmit={handleSearch} className="space-y-6 utilitarian-border p-6 bg-dark-panel">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="space-y-1">
            <label className="mono-label">Film</label>
            <input
              type="text"
              placeholder="e.g. Tri-X"
              value={film}
              onChange={(e) => setFilm(e.target.value)}
              className="utilitarian-input w-full"
            />
          </div>
          <div className="space-y-1">
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
          <div className="space-y-1">
            <label className="mono-label">Temp</label>
            <input
              type="text"
              value={temp}
              onChange={(e) => setTemp(e.target.value)}
              className="utilitarian-input w-full"
            />
          </div>
        </div>

        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={loading || !film || !developer}
            className="utilitarian-button bg-white text-black flex items-center space-x-2 disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            <span>Ask AI</span>
          </button>
        </div>

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
            <span className="mono-label">Gemini found {results.options.length} options</span>
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
                    <span className="mono-label text-accent-red">{option.temp}</span>
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
                    import('../services/presets').then(m => m.savePreset(option));
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
    </div>
  );
};

