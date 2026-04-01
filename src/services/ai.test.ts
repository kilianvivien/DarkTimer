import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getDevTimes } from './ai';
import { AIRecipeError } from './aiErrors';

const getGeminiDevTimesMock = vi.fn();
const getMistralDevTimesMock = vi.fn();

vi.mock('./gemini', () => ({
  getGeminiDevTimes: (...args: unknown[]) => getGeminiDevTimesMock(...args),
}));

vi.mock('./mistral', () => ({
  getMistralDevTimes: (...args: unknown[]) => getMistralDevTimesMock(...args),
}));

describe('ai service', () => {
  beforeEach(() => {
    getGeminiDevTimesMock.mockReset();
    getMistralDevTimesMock.mockReset();
  });

  it('returns provider results when recipe options exist', async () => {
    getGeminiDevTimesMock.mockResolvedValue({
      options: [
        {
          film: 'Tri-X 400',
          developer: 'Rodinal',
          dilution: '1+25',
          iso: 400,
          tempC: 20,
          processMode: 'bw',
          phases: [{ name: 'Developer', duration: 420, agitationMode: 'every-60s' }],
          notes: '',
        },
      ],
      confidence: 'medium',
    });

    await expect(
      getDevTimes('gemini', 'key', 'Tri-X 400', 'Rodinal', '400', 20, '1+25', 'bw'),
    ).resolves.toMatchObject({
      options: [{ film: 'Tri-X 400', developer: 'Rodinal' }],
    });
  });

  it('throws a no-results error when the provider returns an empty list', async () => {
    getMistralDevTimesMock.mockResolvedValue({
      options: [],
      confidence: 'low',
    });

    await expect(
      getDevTimes('mistral', 'key', 'Unknown Film', 'Unknown Dev', '400', 20, '', 'bw'),
    ).rejects.toMatchObject({
      code: 'no_results',
      provider: 'mistral',
    });
  });
});
