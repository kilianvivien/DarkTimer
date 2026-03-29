import { getGeminiDevTimes } from './gemini';
import { getMistralDevTimes } from './mistral';
import { ProcessMode } from './recipe';
import { AIProvider } from './settings';
import { DevResponse } from './aiShared';

export type { DevResponse } from './aiShared';

export async function getDevTimes(
  provider: AIProvider,
  film: string,
  developer: string,
  iso: string,
  tempC: number,
  dilution: string,
  processMode: ProcessMode,
): Promise<DevResponse | null> {
  if (provider === 'mistral') {
    return getMistralDevTimes(film, developer, iso, tempC, dilution, processMode);
  }

  return getGeminiDevTimes(film, developer, iso, tempC, dilution, processMode);
}
