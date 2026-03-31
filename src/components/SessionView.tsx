import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { DevRecipe, formatTemperature, getProcessLabel } from '../services/recipe';
import { Timer } from './Timer';
import type { UserSettings } from '../services/userSettings';

interface SessionViewProps {
  recipe: DevRecipe | null;
  onExit: () => void;
  settings: UserSettings;
}

export const SessionView: React.FC<SessionViewProps> = ({ recipe, onExit, settings }) => {
  const [sessionKey, setSessionKey] = React.useState(0);
  const [isComplete, setIsComplete] = React.useState(false);

  React.useEffect(() => {
    setSessionKey(0);
    setIsComplete(false);
  }, [recipe]);

  if (!recipe) {
    return null;
  }

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

        <div className="bg-dark-panel p-4 utilitarian-border">
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
            <div className="pt-3 mt-3 border-t border-dark-border landscape:hidden">
              <p className="mono-label mb-1">Source</p>
              <p className="text-xs text-ui-gray font-mono">{recipe.source}</p>
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
            phases={recipe.phases}
            onComplete={() => setIsComplete(true)}
            onExitSession={onExit}
            settings={settings}
          />
        </div>
      )}
    </div>
  );
};
