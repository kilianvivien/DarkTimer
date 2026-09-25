import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getGeminiDevTimes } from './gemini';

const generateContent = vi.hoisted(() => vi.fn());
const recipeResponse = {
  text: JSON.stringify({
    options: [{
      film: 'Tri-X 400',
      developer: 'Rodinal',
      phases: [{ name: 'Developer', duration: 420 }],
    }],
  }),
};

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent };
  },
  ThinkingLevel: { LOW: 'LOW' },
  Type: { OBJECT: 'OBJECT', ARRAY: 'ARRAY', STRING: 'STRING', NUMBER: 'NUMBER' },
}));

describe('Gemini recipe lookup', () => {
  beforeEach(() => {
    generateContent.mockReset();
  });

  it('uses Gemini 3.8 Flash with low thinking for recipe lookups', async () => {
    generateContent.mockResolvedValue(recipeResponse);

    await getGeminiDevTimes('key', 'Tri-X 400', 'Rodinal', '400', 20, '1+25', 'bw');

    expect(generateContent).toHaveBeenCalledOnce();
    expect(generateContent).toHaveBeenCalledWith(expect.objectContaining({
      model: 'gemini-3.8-flash',
      config: expect.objectContaining({
        thinkingConfig: { thinkingLevel: 'LOW' },
        responseMimeType: 'application/json',
      }),
    }));
  });

  it('keeps Gemini 3.5 Flash-Lite as the unavailable fallback', async () => {
    generateContent
      .mockRejectedValueOnce(new Error('503 unavailable'))
      .mockRejectedValueOnce(new Error('503 unavailable'))
      .mockRejectedValueOnce(new Error('503 unavailable'))
      .mockResolvedValueOnce(recipeResponse);

    await getGeminiDevTimes('key', 'Tri-X 400', 'Rodinal', '400', 20, '1+25', 'bw');

    expect(generateContent).toHaveBeenCalledTimes(4);
    expect(generateContent.mock.calls[3][0]).toMatchObject({
      model: 'gemini-3.5-flash-lite',
      config: { thinkingConfig: undefined },
    });
  });
});
