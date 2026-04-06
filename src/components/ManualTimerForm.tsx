import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Play } from 'lucide-react';
import {
  AgitationMode,
  DevPhase,
  DevRecipe,
  ProcessMode,
  getAgitationDescription,
  getAgitationLabel,
} from '../services/recipe';
import type { UserSettings } from '../services/userSettings';
import { getDefaultTemperatureForMode } from '../services/settings';
import {
  DEVELOPER_OPTIONS,
  DILUTION_OPTIONS,
  FILM_STOCK_OPTIONS,
  ISO_OPTIONS,
  filterCatalogByProcessMode,
} from '../services/searchCatalog';
import type { Preset } from '../services/presetTypes';
import { ProcessModeSwitch } from './ProcessModeSwitch';
import { SearchableField } from './SearchableField';
import { TemperatureInput } from './TemperatureInput';

interface ManualTimerFormProps {
  editingPreset?: Preset | null;
  onCancelEdit?: () => void;
  onStart: (recipe: DevRecipe) => void;
  onSavePreset: (recipe: DevRecipe) => Promise<void>;
  onUpdatePreset?: (id: string, recipe: DevRecipe) => Promise<void>;
  settings: UserSettings;
}

const AGITATION_OPTIONS: AgitationMode[] = ['every-60s', 'every-30s', 'stand'];

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

interface ManualFormState {
  film: string;
  developer: string;
  dilution: string;
  iso: number;
  processMode: ProcessMode;
  tempC: number;
  phases: DevPhase[];
}

function clonePhases(phases: DevPhase[]): DevPhase[] {
  return phases.map((phase) => ({ ...phase }));
}

function buildInitialFormState(settings: UserSettings, preset?: Preset | null): ManualFormState {
  if (!preset) {
    return {
      film: '',
      developer: '',
      dilution: '',
      iso: 400,
      processMode: 'bw',
      tempC: getDefaultTemperatureForMode('bw', settings),
      phases: createBwPhases(settings),
    };
  }

  return {
    film: preset.film,
    developer: preset.developer,
    dilution: preset.dilution === 'N/A' ? '' : preset.dilution,
    iso: preset.iso,
    processMode: preset.processMode,
    tempC: preset.tempC,
    phases: clonePhases(preset.phases),
  };
}

export const ManualTimerForm: React.FC<ManualTimerFormProps> = ({
  editingPreset = null,
  onCancelEdit,
  onStart,
  onSavePreset,
  onUpdatePreset,
  settings,
}) => {
  const [film, setFilm] = useState(() => buildInitialFormState(settings, editingPreset).film);
  const [developer, setDeveloper] = useState(() => buildInitialFormState(settings, editingPreset).developer);
  const [dilution, setDilution] = useState(() => buildInitialFormState(settings, editingPreset).dilution);
  const [iso, setIso] = useState(() => buildInitialFormState(settings, editingPreset).iso);
  const [processMode, setProcessMode] = useState<ProcessMode>(() => buildInitialFormState(settings, editingPreset).processMode);
  const [tempC, setTempC] = useState(() => buildInitialFormState(settings, editingPreset).tempC);
  const [phases, setPhases] = useState<DevPhase[]>(() => buildInitialFormState(settings, editingPreset).phases);
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const filmOptions = useMemo(
    () => filterCatalogByProcessMode(FILM_STOCK_OPTIONS, processMode),
    [processMode],
  );
  const developerOptions = useMemo(
    () => filterCatalogByProcessMode(DEVELOPER_OPTIONS, processMode),
    [processMode],
  );
  const isEditing = Boolean(editingPreset);

  useEffect(() => {
    const nextState = buildInitialFormState(settings, editingPreset);
    setFilm(nextState.film);
    setDeveloper(nextState.developer);
    setDilution(nextState.dilution);
    setIso(nextState.iso);
    setProcessMode(nextState.processMode);
    setTempC(nextState.tempC);
    setPhases(nextState.phases);
  }, [editingPreset, settings]);

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
    film: film.trim() || 'Custom Film',
    developer: developer.trim() || 'Custom Dev',
    dilution: dilution.trim() || 'N/A',
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
        {isEditing ? (
          <div className="flex flex-col gap-3 border-b border-dark-border pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-1">
              <p className="mono-label text-accent-red">Editing preset</p>
              <p className="text-sm text-ui-gray">Update the saved recipe, then overwrite it in your library.</p>
            </div>
            {onCancelEdit ? (
              <button
                type="button"
                onClick={onCancelEdit}
                className="utilitarian-button w-full shrink-0 whitespace-nowrap px-3 py-2 sm:w-auto sm:min-w-[6.5rem]"
              >
                Cancel
              </button>
            ) : null}
          </div>
        ) : null}
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
            placeholder={processMode === 'bw' ? 'e.g. HP5 Plus' : 'e.g. Portra 400'}
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
            placeholder={processMode === 'bw' ? 'e.g. ID-11' : 'e.g. C-41'}
            value={developer}
            onChange={setDeveloper}
          />
        </div>
        <div className="min-w-0">
          <SearchableField
            label="Dilution"
            options={DILUTION_OPTIONS}
            placeholder="e.g. 1+1"
            value={dilution}
            onChange={setDilution}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="manual-iso" className="mono-label">ISO</label>
          <select
            id="manual-iso"
            value={iso}
            onChange={(e) => setIso(parseInt(e.target.value, 10))}
            className="utilitarian-input mobile-form-control-compact w-full bg-dark-panel px-3 py-2"
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
                      className="mobile-form-control-inline bg-transparent border-b border-dark-border focus:border-white outline-none px-1 w-full font-mono"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removePhase(i)}
                    className="press-feedback text-ui-gray hover:text-accent-red p-1 md:order-last"
                    aria-label={`Remove ${phase.name || 'phase'}`}
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
                        className="mobile-form-control-inline bg-transparent border-b border-dark-border focus:border-white outline-none px-1 w-12 text-center font-mono"
                        min="0"
                      />
                      <span className="text-[10px] font-mono text-ui-gray uppercase">m</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <input
                        type="number"
                        value={secs}
                        onChange={(e) => updatePhaseTime(i, 'sec', parseInt(e.target.value) || 0)}
                        className="mobile-form-control-inline bg-transparent border-b border-dark-border focus:border-white outline-none px-1 w-12 text-center font-mono"
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
                      className="utilitarian-input mobile-form-control-compact w-full bg-dark-panel px-3 py-2"
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
          disabled={isSavingPreset}
          onClick={async () => {
            setIsSavingPreset(true);
            try {
              if (isEditing && editingPreset && onUpdatePreset) {
                await onUpdatePreset(editingPreset.id, buildRecipe());
              } else {
                await onSavePreset(buildRecipe());
              }
            } finally {
              setIsSavingPreset(false);
            }
          }}
          className="flex-1 utilitarian-button py-4 hover:bg-white hover:text-black disabled:opacity-60"
        >
          {isSavingPreset ? 'Saving…' : isEditing ? 'Update Preset' : 'Save to Library'}
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
