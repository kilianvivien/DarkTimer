import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { DevRecipe, formatTemperature, getProcessLabel, type Session } from '../services/recipe';
import { Timer, type TimerSessionResult } from './Timer';
import type { UserSettings } from '../services/userSettings';
import { useStoredChems } from '../hooks/useStoredData';
import { applyDeveloperCompensation } from '../lib/utils';
import { DeveloperCompensationInput, type CompensationMode } from './DeveloperCompensationInput';

interface SessionViewProps {
  recipe: DevRecipe | null;
  onExit: () => void;
  onSaveSession: (session: Session) => Promise<void>;
  settings: UserSettings;
}

export const SessionView: React.FC<SessionViewProps> = ({
  recipe,
  onExit,
  onSaveSession,
  settings,
}) => {
  const [sessionKey, setSessionKey] = React.useState(0);
  const [isComplete, setIsComplete] = React.useState(false);

  const [compMode, setCompMode] = React.useState<CompensationMode>('off');
  const [customPercent, setCustomPercent] = React.useState(0);
  const [perRollPercent, setPerRollPercent] = React.useState(2);

  const { data: chems } = useStoredChems();

  React.useEffect(() => {
    setSessionKey(0);
    setIsComplete(false);
    setCompMode('off');
    setCustomPercent(0);
    setPerRollPercent(2);
  }, [recipe]);

  if (!recipe) {
    return null;
  }

  const matchedChem = chems.find(
    (c) => c.type === 'developer' && c.name.toLowerCase() === recipe.developer.toLowerCase(),
  ) ?? null;

  const totalPercent =
    compMode === 'custom'
      ? customPercent
      : compMode === 'chems'
        ? perRollPercent * (matchedChem?.rollCount ?? 0)
        : 0;

  const developerPhase = recipe.phases.find((p) => p.name.toLowerCase() === 'developer');
  const addedSeconds = developerPhase
    ? Math.round(developerPhase.duration * totalPercent / 100)
    : 0;

  const compensatedPhases = applyDeveloperCompensation(recipe.phases, totalPercent);

  const handleSessionEnd = async (result: TimerSessionResult) => {
    await onSaveSession({
      id: crypto.randomUUID(),
      recipe,
      startTime: result.startTime,
      endTime: result.endTime,
      status: result.status,
      phasesCompleted: result.phasesCompleted,
    });
  };

  return (
    <div className="w-full flex flex-col landscape:flex-col gap-4 md:gap-8">

      {/* Recipe info — compact strip in landscape, full card in portrait */}
      <div className="space-y-3 landscape:space-y-0">
        <button
          onClick={onExit}
          className="flex items-center space-x-2 mono-label hover:text-white transition-colors"
        >
          <ChevronLeft size={12} />
          <span>Exit Session</span>
        </button>

        <div className="bg-dark-panel p-4 utilitarian-border space-y-4">
          {/* Always-visible compact row */}
          <div className="flex justify-between items-center gap-4">
            <div className="min-w-0">
              <h2 className="text-base md:text-xl font-bold text-white uppercase tracking-tight truncate">
                {recipe.film}
              </h2>
              <p className="text-accent-red font-mono uppercase tracking-widest text-[10px]">
                {recipe.developer} • {recipe.dilution} • ISO {recipe.iso}
                <span className="text-ui-gray"> • {getProcessLabel(recipe.processMode)}</span>
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="mono-label">Temp</p>
              <p className="text-lg text-white font-bold font-mono">
                {formatTemperature(recipe.tempC)}
              </p>
            </div>
          </div>

          {/* Source + notes hidden in landscape to save vertical space */}
          {recipe.source && (
            <div className="pt-3 border-t border-dark-border landscape:hidden">
              <p className="mono-label mb-1">Source</p>
              <p className="text-xs text-ui-gray font-mono">{recipe.source}</p>
            </div>
          )}

          {/* Compensation panel — only show before session starts */}
          {!isComplete && developerPhase && (
            <div className="pt-3 border-t border-dark-border">
              <DeveloperCompensationInput
                developerName={recipe.developer}
                mode={compMode}
                customPercent={customPercent}
                perRollPercent={perRollPercent}
                matchedChem={matchedChem}
                totalPercent={totalPercent}
                addedSeconds={addedSeconds}
                onModeChange={setCompMode}
                onCustomPercentChange={setCustomPercent}
                onPerRollPercentChange={setPerRollPercent}
              />
            </div>
          )}
        </div>
      </div>

      {isComplete ? (
        <div className="w-full utilitarian-border bg-dark-panel p-6 md:p-8 space-y-5">
          <div className="space-y-2">
            <p className="mono-label text-accent-red">Session complete</p>
            <h3 className="text-2xl md:text-3xl font-bold uppercase tracking-tight text-white">
              {recipe.film} is done
            </h3>
            <p className="text-sm text-ui-gray leading-relaxed">
              Stay here to review the recipe, run the same session again, or exit back to the main timer views.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => {
                setSessionKey((current) => current + 1);
                setIsComplete(false);
              }}
              className="utilitarian-button bg-white text-black font-bold py-4 px-5 hover:bg-accent-red hover:text-white hover:border-accent-red"
            >
              Run Again
            </button>
            <button
              type="button"
              onClick={onExit}
              className="utilitarian-button py-4 px-5"
            >
              Exit Session
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full">
          <Timer
            key={sessionKey}
            phases={compensatedPhases}
            compensationAddedSeconds={addedSeconds}
            onComplete={() => setIsComplete(true)}
            onExitSession={onExit}
            onSessionEnd={handleSessionEnd}
            settings={settings}
          />
        </div>
      )}
    </div>
  );
};
