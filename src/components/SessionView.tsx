import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { DevRecipe, formatTemperature, getProcessLabel } from '../services/recipe';
import { Timer } from './Timer';

interface SessionViewProps {
  recipe: DevRecipe | null;
  onExit: () => void;
}

export const SessionView: React.FC<SessionViewProps> = ({ recipe, onExit }) => {
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
                {recipe?.film}
              </h2>
              <p className="text-accent-red font-mono uppercase tracking-widest text-[10px]">
                {recipe?.developer} • {recipe?.dilution} • ISO {recipe?.iso}
                {recipe && <span className="text-ui-gray"> • {getProcessLabel(recipe.processMode)}</span>}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="mono-label">Temp</p>
              <p className="text-lg text-white font-bold font-mono">
                {recipe ? formatTemperature(recipe.tempC) : ''}
              </p>
            </div>
          </div>

          {/* Source + notes hidden in landscape to save vertical space */}
          {recipe?.source && (
            <div className="pt-3 mt-3 border-t border-dark-border landscape:hidden">
              <p className="mono-label mb-1">Source</p>
              <p className="text-xs text-ui-gray font-mono">{recipe.source}</p>
            </div>
          )}

        </div>
      </div>

      {/* Timer — full width */}
      <div className="w-full">
        <Timer phases={recipe?.phases || []} onComplete={() => {}} />
      </div>
    </div>
  );
};
