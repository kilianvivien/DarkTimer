import React from 'react';
import ReactMarkdown from 'react-markdown';
import { ChevronLeft } from 'lucide-react';
import { DevRecipe, formatTemperature, getProcessLabel } from '../services/recipe';
import { Timer } from './Timer';

interface SessionViewProps {
  recipe: DevRecipe | null;
  onExit: () => void;
}

export const SessionView: React.FC<SessionViewProps> = ({ recipe, onExit }) => {
  return (
    <div className="w-full flex flex-col-reverse md:flex-row gap-6 md:gap-12 items-start justify-center">
      <div className="flex-1 space-y-4 md:space-y-6 w-full">
        <button
          onClick={onExit}
          className="flex items-center space-x-2 mono-label hover:text-white transition-colors"
        >
          <ChevronLeft size={12} />
          <span>Exit Session</span>
        </button>

        <div className="bg-dark-panel p-4 md:p-6 utilitarian-border space-y-4 md:space-y-6">
          <div className="flex justify-between items-start gap-4">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-white uppercase tracking-tight">
                {recipe?.film}
              </h2>
              <p className="text-accent-red font-mono uppercase tracking-widest text-[10px]">
                {recipe?.developer} • {recipe?.dilution} • ISO {recipe?.iso}
              </p>
              {recipe && (
                <p className="mono-label mt-2">{getProcessLabel(recipe.processMode)}</p>
              )}
            </div>
            <div className="text-right">
              <p className="mono-label">Temp</p>
              <p className="text-lg text-white font-bold font-mono">
                {recipe ? formatTemperature(recipe.tempC) : ''}
              </p>
            </div>
          </div>

          {recipe?.source && (
            <div className="pt-4 border-t border-dark-border">
              <p className="mono-label mb-1">Source</p>
              <p className="text-xs text-ui-gray font-mono">{recipe.source}</p>
            </div>
          )}

          {recipe?.notes && (
            <div className="pt-4 border-t border-dark-border">
              <p className="mono-label mb-2">Notes</p>
              <div className="text-xs text-ui-gray leading-relaxed prose prose-invert prose-sm max-w-none">
                <ReactMarkdown>{recipe.notes}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 w-full md:w-auto">
        <Timer phases={recipe?.phases || []} onComplete={() => {}} />
      </div>
    </div>
  );
};
