import { GoogleGenAI, Type } from "@google/genai";
import { ProcessMode } from './recipe';
import { DevResponse, buildRecipeLookupPrompt, parseJsonResponse } from './aiShared';

function getClient(apiKey: string): GoogleGenAI {
  return new GoogleGenAI({ apiKey });
}

export async function getGeminiDevTimes(
  apiKey: string,
  film: string,
  developer: string,
  iso: string,
  tempC: number,
  dilution: string,
  processMode: ProcessMode,
): Promise<DevResponse | null> {
  try {
    const response = await getClient(apiKey).models.generateContent({
      model: "gemini-3-flash-preview",
      contents: buildRecipeLookupPrompt({
        film,
        developer,
        iso,
        tempC,
        dilution,
        processMode,
      }),
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

    return parseJsonResponse(response.text, {
      processMode,
      tempC,
    });
  } catch (error) {
    console.error("Error fetching dev times:", error);
    return null;
  }
}
