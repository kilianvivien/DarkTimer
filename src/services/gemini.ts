import { GoogleGenAI, Type } from "@google/genai";
import { getGeminiApiKey } from "./settings";
import {
  DevRecipe,
  ProcessMode,
  formatTemperature,
  getProcessLabel,
  normalizeRecipe,
} from './recipe';

function getClient(): GoogleGenAI {
  const key = getGeminiApiKey();
  return new GoogleGenAI({ apiKey: key });
}

export interface DevResponse {
  options: DevRecipe[];
  confidence: string;
}

export async function getDevTimes(
  film: string,
  developer: string,
  iso: string,
  tempC: number,
  dilution: string,
  processMode: ProcessMode,
): Promise<DevResponse | null> {
  try {
    const response = await getClient().models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Find the standard development times for ${film} at ISO ${iso} using ${developer} at ${formatTemperature(tempC)} for ${getProcessLabel(processMode)} processing${dilution ? ` with dilution ${dilution}` : ''}. 
      Return a structured JSON object with an array of "options". 
      If there are multiple common times (e.g. different dilutions or sources), include up to 3 options.
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
      
      Include standard phases: Developer, Stop Bath (30s), Fixer (300s), Wash (600s).`,
      config: {
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

    const text = response.text;
    if (!text) return null;

    const parsed = JSON.parse(text) as Partial<DevResponse>;

    return {
      options: Array.isArray(parsed.options)
        ? parsed.options.map((option) =>
            normalizeRecipe(option, {
              processMode,
              tempC,
            }),
          )
        : [],
      confidence: typeof parsed.confidence === 'string' ? parsed.confidence : '',
    };
  } catch (error) {
    console.error("Error fetching dev times:", error);
    return null;
  }
}
