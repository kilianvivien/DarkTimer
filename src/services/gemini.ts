import { GoogleGenAI, Type } from "@google/genai";
import { AIRecipeError, toAIRecipeError } from './aiErrors';
import type { ProcessMode } from './recipe';
import { DevResponse, buildRecipeLookupPrompt, parseJsonResponse } from './aiShared';

const GEMINI_PRIMARY_MODEL = 'gemini-3-flash-preview';
const GEMINI_FALLBACK_MODELS = ['gemini-3.1-flash-lite-preview'] as const;
const MAX_UNAVAILABLE_RETRIES = 2;

function getClient(apiKey: string): GoogleGenAI {
  return new GoogleGenAI({ apiKey });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}

export async function getGeminiDevTimes(
  apiKey: string,
  film: string,
  developer: string,
  iso: string,
  tempC: number,
  dilution: string,
  processMode: ProcessMode,
): Promise<DevResponse> {
  const candidateModels = [GEMINI_PRIMARY_MODEL, ...GEMINI_FALLBACK_MODELS];

  for (let modelIndex = 0; modelIndex < candidateModels.length; modelIndex += 1) {
    const model = candidateModels[modelIndex];
    let attempt = 0;

    while (attempt <= MAX_UNAVAILABLE_RETRIES) {
      try {
        const response = await getClient(apiKey).models.generateContent({
          model,
          contents: buildRecipeLookupPrompt({
            film,
            developer,
            iso,
            tempC,
            dilution,
            processMode,
          }),
          config: {
            temperature: 0.3,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                options: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      film: { type: Type.STRING },
                      developer: { type: Type.STRING },
                      dilution: { type: Type.STRING },
                      iso: { type: Type.NUMBER },
                      tempC: { type: Type.NUMBER },
                      processMode: { type: Type.STRING },
                      source: { type: Type.STRING },
                      phases: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            name: { type: Type.STRING },
                            duration: { type: Type.NUMBER },
                            agitation: { type: Type.STRING },
                            agitationMode: { type: Type.STRING }
                          },
                          required: ["name", "duration"]
                        }
                      },
                      notes: { type: Type.STRING }
                    },
                    required: ["film", "developer", "phases"]
                  }
                },
                confidence: { type: Type.STRING }
              },
              required: ["options"]
            }
          }
        });

        const parsed = parseJsonResponse(response.text, {
          processMode,
          tempC,
        });

        if (!parsed) {
          throw new AIRecipeError('invalid_response', 'gemini');
        }

        return parsed;
      } catch (error) {
        const normalizedError = toAIRecipeError(error, 'gemini', 'invalid_response');

        if (normalizedError.code === 'unavailable' && attempt < MAX_UNAVAILABLE_RETRIES) {
          await sleep(350 * (attempt + 1));
          attempt += 1;
          continue;
        }

        if (normalizedError.code === 'unavailable' && modelIndex < candidateModels.length - 1) {
          break;
        }

        console.error("Error fetching dev times:", error);
        throw normalizedError;
      }
    }
  }

  throw new AIRecipeError('unavailable', 'gemini');
}
