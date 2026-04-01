import { DevRecipe, ProcessMode, formatTemperature, getProcessLabel, normalizeRecipe } from './recipe';

export interface DevResponse {
  options: DevRecipe[];
  confidence: string;
}

export interface LookupContext {
  film: string;
  developer: string;
  iso: string;
  tempC: number;
  dilution: string;
  processMode: ProcessMode;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isValidPhaseShape(phase: unknown): boolean {
  return isRecord(phase) && typeof phase.name === 'string' && 'duration' in phase;
}

function isValidOptionShape(option: unknown): boolean {
  return (
    isRecord(option) &&
    typeof option.film === 'string' &&
    typeof option.developer === 'string' &&
    Array.isArray(option.phases) &&
    option.phases.length > 0 &&
    option.phases.every(isValidPhaseShape)
  );
}

export function buildRecipeLookupSystemPrompt(): string {
  return [
    'You are a darkroom recipe assistant.',
    'Return valid JSON only.',
    'Use published darkroom references when you need to reason about timings.',
    'Keep notes concise and practical.',
    'Few-shot JSON example:',
    JSON.stringify({
      options: [
        {
          film: 'Tri-X 400',
          developer: 'Rodinal',
          dilution: '1+25',
          iso: 400,
          tempC: 20,
          processMode: 'bw',
          phases: [
            {
              name: 'Developer',
              duration: 420,
              agitation: 'Agitate every 1 minute.',
              agitationMode: 'every-60s',
            },
            { name: 'Stop Bath', duration: 30, agitation: 'Stand.', agitationMode: 'stand' },
            { name: 'Fixer', duration: 300, agitation: 'Agitate every 1 minute.', agitationMode: 'every-60s' },
            { name: 'Wash', duration: 600, agitation: 'Stand.', agitationMode: 'stand' },
          ],
          notes: 'Classic high-acutance Rodinal recipe.',
          source: 'Massive Dev Chart',
        },
      ],
      confidence: 'medium',
    }),
  ].join('\n');
}

export function buildRecipeLookupUserPrompt({
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

export function buildRecipeLookupPrompt(context: LookupContext): string {
  return `${buildRecipeLookupSystemPrompt()}\n\n${buildRecipeLookupUserPrompt(context)}`;
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

export function isValidDevResponseShape(parsed: unknown): parsed is Partial<DevResponse> & { options: unknown[] } {
  return isRecord(parsed) && Array.isArray(parsed.options) && parsed.options.every(isValidOptionShape);
}

export function parseJsonResponse(
  text: string | null | undefined,
  fallback: Pick<LookupContext, 'processMode' | 'tempC'>,
): DevResponse | null {
  if (!text) {
    return null;
  }

  try {
    const parsed = JSON.parse(text) as unknown;

    if (!isValidDevResponseShape(parsed)) {
      return null;
    }

    return normalizeDevResponse(parsed, fallback);
  } catch (error) {
    console.error('Failed to parse AI recipe response:', error, text);
    return null;
  }
}
