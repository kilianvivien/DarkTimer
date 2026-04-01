import { getGeminiDevTimes } from './gemini';
import { getMistralDevTimes } from './mistral';
import { AIRecipeError } from './aiErrors';
import type { ProcessMode } from './recipe';
import type { AIProvider } from './settings';
import type { DevResponse } from './aiShared';

export type { DevResponse } from './aiShared';
export { AIRecipeError } from './aiErrors';

export async function getDevTimes(
  provider: AIProvider,
  apiKey: string,
  film: string,
  developer: string,
  iso: string,
  tempC: number,
  dilution: string,
  processMode: ProcessMode,
): Promise<DevResponse> {
  const response =
    provider === 'mistral'
      ? await getMistralDevTimes(apiKey, film, developer, iso, tempC, dilution, processMode)
      : await getGeminiDevTimes(apiKey, film, developer, iso, tempC, dilution, processMode);

  if (response.options.length === 0) {
    throw new AIRecipeError('no_results', provider);
  }

  return response;
}
