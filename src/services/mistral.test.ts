import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getMistralDevTimes } from './mistral';

const fetchMock = vi.fn();
const recipeResponse = {
  choices: [{
    message: {
      content: JSON.stringify({
        options: [{
          film: 'Tri-X 400',
          developer: 'Rodinal',
          phases: [{ name: 'Developer', duration: 420 }],
        }],
      }),
    },
  }],
};

function response(status: number, payload: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(payload),
    json: async () => payload,
  };
}

async function lookup() {
  return getMistralDevTimes('key', 'Tri-X 400', 'Rodinal', '400', 20, '1+25', 'bw');
}

function requestBody(index: number): Record<string, unknown> {
  const [, init] = fetchMock.mock.calls[index] as [string, RequestInit];
  return JSON.parse(init.body as string) as Record<string, unknown>;
}

describe('Mistral recipe lookup', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses GLM 5.3 first without an unverified reasoning parameter', async () => {
    fetchMock.mockResolvedValue(response(200, recipeResponse));

    await expect(lookup()).resolves.toMatchObject({ options: [{ film: 'Tri-X 400' }] });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(requestBody(0)).toMatchObject({
      model: 'zai-glm-5-3',
      response_format: { type: 'json_object' },
    });
    expect(requestBody(0)).not.toHaveProperty('reasoning_effort');
  });

  it('falls back to Medium then Small with medium reasoning effort', async () => {
    fetchMock
      .mockResolvedValueOnce(response(503, { message: 'Unavailable' }))
      .mockResolvedValueOnce(response(404, { message: 'Model not found' }))
      .mockResolvedValueOnce(response(200, recipeResponse));

    await expect(lookup()).resolves.toMatchObject({ options: [{ film: 'Tri-X 400' }] });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(requestBody(1)).toMatchObject({ model: 'mistral-medium-latest', reasoning_effort: 'medium' });
    expect(requestBody(2)).toMatchObject({ model: 'mistral-small-latest', reasoning_effort: 'medium' });
  });

  it('does not retry another model for an invalid API key', async () => {
    fetchMock.mockResolvedValue(response(401, { message: 'Unauthorized' }));

    await expect(lookup()).rejects.toMatchObject({ code: 'auth', provider: 'mistral' });
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
