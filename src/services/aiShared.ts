import { DevRecipe, ProcessMode, formatTemperature, getProcessLabel, normalizeRecipe } from './recipe';

export interface DevResponse {
  options: DevRecipe[];
  confidence: string;
}

interface LookupContext {
  film: string;
  developer: string;
  iso: string;
  tempC: number;
  dilution: string;
  processMode: ProcessMode;
}

export function buildRecipeLookupPrompt({
  film,
  developer,
  iso,
  tempC,
  dilution,
  processMode,
}: LookupContext): string {
  return `Find the standard development times for ${film} at ISO ${iso} using ${developer} at ${formatTemperature(tempC)} for ${getProcessLabel(processMode)} processing${dilution ? ` with dilution ${dilution}` : ''}.
Return only a JSON object with an array property named "options".
If there are multiple common times (for example different dilutions, agitation methods, or sources), include up to 3 options.
For each option include:
- film: string
- developer: string
- dilution: string
- iso: number
- tempC: number
- processMode: "bw" | "color"
- phases: array of { name: string, duration: number (seconds), agitation: string }
- phases[].agitationMode: "every-60s" | "every-30s" | "stand" when the source is explicit enough
- notes: string (brief)
- source: string (e.g. "Massive Dev Chart", "Kodak Datasheet")

Include standard phases: Developer, Stop Bath (30s), Fixer (300s), Wash (600s).
Use real darkroom references found via web search when needed.
Return valid JSON only.`;
}

export function normalizeDevResponse(
  parsed: Partial<DevResponse>,
  fallback: Pick<LookupContext, 'processMode' | 'tempC'>,
): DevResponse {
  return {
    options: Array.isArray(parsed.options)
      ? parsed.options.map((option) =>
          normalizeRecipe(option, {
            processMode: fallback.processMode,
            tempC: fallback.tempC,
          }),
        )
      : [],
    confidence: typeof parsed.confidence === 'string' ? parsed.confidence : '',
  };
}

export function parseJsonResponse(
  text: string | null | undefined,
  fallback: Pick<LookupContext, 'processMode' | 'tempC'>,
): DevResponse | null {
  if (!text) {
    return null;
  }

  try {
    return normalizeDevResponse(JSON.parse(text) as Partial<DevResponse>, fallback);
  } catch (error) {
    console.error('Failed to parse AI recipe response:', error, text);
    return null;
  }
}
