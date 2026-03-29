import React, { useState } from 'react';
import { Plus, Trash2, Play } from 'lucide-react';
import {
  AgitationMode,
  DevPhase,
  DevRecipe,
  ProcessMode,
  getAgitationDescription,
  getAgitationLabel,
} from '../services/recipe';
import { savePreset } from '../services/presets';
import { UserSettings, getDefaultTemperatureForMode, getSettings } from '../services/settings';
import { ProcessModeSwitch } from './ProcessModeSwitch';
import { TemperatureInput } from './TemperatureInput';

interface ManualTimerFormProps {
  onStart: (recipe: DevRecipe) => void;
}

const AGITATION_OPTIONS: AgitationMode[] = ['every-60s', 'every-30s', 'stand'];
const ISO_OPTIONS = [1, 2, 3, 6, 12, 25, 50, 64, 100, 200, 250, 320, 400, 800, 1600, 3200];

const createBwPhases = (s: UserSettings): DevPhase[] => [
  { name: 'Developer', duration: s.defaultBwDeveloper, agitationMode: 'every-60s' },
  { name: 'Stop Bath', duration: s.defaultStopBath, agitationMode: 'stand' },
  { name: 'Fixer', duration: s.defaultFixer, agitationMode: 'every-60s' },
  { name: 'Wash', duration: s.defaultWash, agitationMode: 'stand' },
];

const createColorPhases = (s: UserSettings): DevPhase[] => [
  { name: 'Developer', duration: s.defaultColorDeveloper, agitationMode: 'every-60s' },
  { name: 'Blix', duration: s.defaultColorBlix, agitationMode: 'every-60s' },
  { name: 'Wash', duration: s.defaultColorWash, agitationMode: 'stand' },
];

export const ManualTimerForm: React.FC<ManualTimerFormProps> = ({ onStart }) => {
  const settings = getSettings();
  const [film, setFilm] = useState('');
  const [developer, setDeveloper] = useState('');
  const [dilution, setDilution] = useState('');
  const [iso, setIso] = useState(400);
  const [processMode, setProcessMode] = useState<ProcessMode>('bw');
  const [tempC, setTempC] = useState(() => getDefaultTemperatureForMode('bw', settings));
  const [phases, setPhases] = useState<DevPhase[]>(() => createBwPhases(settings));

  const handleProcessModeChange = (nextMode: ProcessMode) => {
    setProcessMode(nextMode);
    setTempC(getDefaultTemperatureForMode(nextMode, settings));
    setPhases(nextMode === 'color' ? createColorPhases(settings) : createBwPhases(settings));
  };

  const addPhase = () => {
    setPhases([...phases, { name: 'New Phase', duration: 60, agitationMode: 'stand' }]);
  };

  const removePhase = (index: number) => {
    setPhases(phases.filter((_, i) => i !== index));
  };

  const updatePhase = (
    index: number,
    field: keyof DevPhase,
    value: string | number | AgitationMode | null,
  ) => {
    const newPhases = [...phases];
    newPhases[index] = { ...newPhases[index], [field]: value };

    if (field === 'agitationMode') {
      const currentPhaseName = newPhases[index].name.trim().toLowerCase();
      const developerIndex = newPhases.findIndex((phase) => phase.name.trim().toLowerCase() === 'developer');

      if (currentPhaseName === 'developer') {
        newPhases.forEach((phase, phaseIndex) => {
          if (phaseIndex !== index && phase.name.trim().toLowerCase() === 'fixer') {
            newPhases[phaseIndex] = { ...phase, agitationMode: value as AgitationMode | null };
          }
        });
      } else if (currentPhaseName === 'fixer' && developerIndex >= 0) {
        newPhases[index] = {
          ...newPhases[index],
          agitationMode: newPhases[developerIndex].agitationMode ?? 'stand',
        };
      }
    }

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

  const buildRecipe = (): DevRecipe => ({
    film: film || 'Custom Film',
    developer: developer || 'Custom Dev',
    dilution: dilution || 'N/A',
    iso,
    tempC,
    processMode,
    phases: phases.map((phase) => {
      const agitationMode = phase.agitationMode ?? 'stand';

      return {
        ...phase,
        agitationMode,
        agitation: getAgitationDescription(agitationMode),
      };
    }),
    notes: 'Manual entry',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStart(buildRecipe());
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl space-y-8">
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
        <div className="space-y-1 col-span-2 md:col-span-1">
          <label className="mono-label">Film Stock</label>
          <input
            type="text"
            value={film}
            onChange={(e) => setFilm(e.target.value)}
            placeholder="e.g. HP5 Plus"
            className="utilitarian-input w-full"
          />
        </div>
        <div className="space-y-1 col-span-2 md:col-span-1">
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
              <div key={i} className="p-4 utilitarian-border bg-dark-panel space-y-3 md:space-y-0 md:flex md:flex-nowrap md:items-center md:gap-4">
                {/* Top row: name + delete */}
                <div className="flex items-center gap-2 md:contents">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={phase.name}
                      onChange={(e) => updatePhase(i, 'name', e.target.value)}
                      className="bg-transparent border-b border-dark-border focus:border-white outline-none px-1 w-full font-mono text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removePhase(i)}
                    className="text-ui-gray hover:text-accent-red p-1 md:order-last"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Bottom row on mobile: time + agitation */}
                <div className="flex items-center gap-4 md:contents">
                  <div className="flex items-center space-x-4">
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
                  <div className="flex-1">
                    <label className="mono-label mb-1 block">Agitation</label>
                    <select
                      value={phase.agitationMode ?? 'stand'}
                      onChange={(e) => updatePhase(i, 'agitationMode', e.target.value as AgitationMode)}
                      className="utilitarian-input w-full bg-dark-panel px-3 py-2 text-xs"
                    >
                      {AGITATION_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {getAgitationLabel(option)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={() => {
            savePreset(buildRecipe());
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
