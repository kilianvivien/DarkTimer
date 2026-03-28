import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Play } from 'lucide-react';
import { DevPhase, DevRecipe } from '../services/gemini';
import { getSettings } from '../services/settings';

interface ManualTimerFormProps {
  onStart: (recipe: DevRecipe) => void;
}

export const ManualTimerForm: React.FC<ManualTimerFormProps> = ({ onStart }) => {
  const [film, setFilm] = useState('');
  const [developer, setDeveloper] = useState('');
  const [dilution, setDilution] = useState('');
  const [phases, setPhases] = useState<DevPhase[]>([]);

  useEffect(() => {
    const settings = getSettings();
    setPhases([
      { name: 'Developer', duration: 360, agitation: `Agitate ${settings.agitationDuration}s every ${settings.agitationInterval}s` },
      { name: 'Stop Bath', duration: settings.defaultStopBath },
      { name: 'Fixer', duration: settings.defaultFixer },
      { name: 'Wash', duration: settings.defaultWash },
    ]);
  }, []);

  const addPhase = () => {
    setPhases([...phases, { name: 'New Phase', duration: 60 }]);
  };

  const removePhase = (index: number) => {
    setPhases(phases.filter((_, i) => i !== index));
  };

  const updatePhase = (index: number, field: keyof DevPhase, value: string | number) => {
    const newPhases = [...phases];
    newPhases[index] = { ...newPhases[index], [field]: value };
    setPhases(newPhases);
  };

  const updatePhaseTime = (index: number, part: 'min' | 'sec', value: number) => {
    const newPhases = [...phases];
    const currentTotal = newPhases[index].duration;
    const currentMin = Math.floor(currentTotal / 60);
    const currentSec = currentTotal % 60;

    let newTotal = 0;
    if (part === 'min') {
      newTotal = value * 60 + currentSec;
    } else {
      newTotal = currentMin * 60 + value;
    }

    newPhases[index] = { ...newPhases[index], duration: newTotal };
    setPhases(newPhases);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStart({
      film: film || 'Custom Film',
      developer: developer || 'Custom Dev',
      dilution: dilution || 'N/A',
      iso: 400,
      temp: '20°C',
      phases,
      notes: 'Manual entry',
    });
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1">
          <label className="mono-label">Film Stock</label>
          <input
            type="text"
            value={film}
            onChange={(e) => setFilm(e.target.value)}
            placeholder="e.g. HP5 Plus"
            className="utilitarian-input w-full"
          />
        </div>
        <div className="space-y-1">
          <label className="mono-label">Developer</label>
          <input
            type="text"
            value={developer}
            onChange={(e) => setDeveloper(e.target.value)}
            placeholder="e.g. ID-11"
            className="utilitarian-input w-full"
          />
        </div>
        <div className="space-y-1">
          <label className="mono-label">Dilution</label>
          <input
            type="text"
            value={dilution}
            onChange={(e) => setDilution(e.target.value)}
            placeholder="e.g. 1+1"
            className="utilitarian-input w-full"
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <label className="mono-label">Phases</label>
          <button
            type="button"
            onClick={addPhase}
            className="text-[10px] font-mono uppercase tracking-widest text-accent-red hover:underline flex items-center space-x-1"
          >
            <Plus size={12} />
            <span>Add Phase</span>
          </button>
        </div>

        <div className="space-y-2">
          {phases.map((phase, i) => {
            const mins = Math.floor(phase.duration / 60);
            const secs = phase.duration % 60;

            return (
              <div key={i} className="flex flex-wrap md:flex-nowrap items-center gap-4 p-4 utilitarian-border bg-dark-panel">
                <div className="flex-1 min-w-[150px]">
                  <input
                    type="text"
                    value={phase.name}
                    onChange={(e) => updatePhase(i, 'name', e.target.value)}
                    className="bg-transparent border-b border-dark-border focus:border-white outline-none px-1 w-full font-mono text-sm"
                  />
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="flex flex-col items-center">
                    <div className="flex items-center space-x-1">
                      <input
                        type="number"
                        value={mins}
                        onChange={(e) => updatePhaseTime(i, 'min', parseInt(e.target.value) || 0)}
                        className="bg-transparent border-b border-dark-border focus:border-white outline-none px-1 w-12 text-center font-mono text-sm"
                        min="0"
                      />
                      <span className="text-[10px] font-mono text-ui-gray uppercase">m</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="flex items-center space-x-1">
                      <input
                        type="number"
                        value={secs}
                        onChange={(e) => updatePhaseTime(i, 'sec', parseInt(e.target.value) || 0)}
                        className="bg-transparent border-b border-dark-border focus:border-white outline-none px-1 w-12 text-center font-mono text-sm"
                        min="0"
                        max="59"
                      />
                      <span className="text-[10px] font-mono text-ui-gray uppercase">s</span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 min-w-[200px]">
                  <input
                    type="text"
                    value={phase.agitation || ''}
                    placeholder="Agitation notes..."
                    onChange={(e) => updatePhase(i, 'agitation', e.target.value)}
                    className="bg-transparent border-b border-dark-border focus:border-white outline-none px-1 w-full text-xs text-ui-gray italic"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => removePhase(i)}
                  className="text-ui-gray hover:text-accent-red p-1"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => {
            const recipe = {
              film: film || 'Custom Film',
              developer: developer || 'Custom Dev',
              dilution: dilution || 'N/A',
              iso: 400,
              temp: '20°C',
              phases,
              notes: 'Manual entry',
            };
            import('../services/presets').then(m => m.savePreset(recipe));
            alert('Recipe saved to library');
          }}
          className="flex-1 utilitarian-button py-4 hover:bg-white hover:text-black"
        >
          Save to Library
        </button>
        <button
          type="submit"
          className="flex-[2] utilitarian-button bg-white text-black font-bold py-4 hover:bg-accent-red hover:text-white hover:border-accent-red flex items-center justify-center space-x-2"
        >
          <Play size={18} fill="currentColor" />
          <span>Start Session</span>
        </button>
      </div>
    </form>
  );
};
