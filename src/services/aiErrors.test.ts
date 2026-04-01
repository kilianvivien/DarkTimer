import { describe, expect, it } from 'vitest';
import {
  AIRecipeError,
  extractProviderErrorMessage,
  mapResponseStatusToAIError,
  toAIRecipeError,
} from './aiErrors';

describe('aiErrors helpers', () => {
  it('extracts nested provider messages from JSON payloads', () => {
    expect(
      extractProviderErrorMessage(
        '{"error":{"code":503,"message":"This model is currently experiencing high demand.","status":"UNAVAILABLE"}}',
      ),
    ).toBe('This model is currently experiencing high demand.');
  });

  it('maps HTTP status codes to actionable error categories', () => {
    expect(
      mapResponseStatusToAIError(400, 'mistral', '{"message":"Invalid chat payload"}'),
    ).toMatchObject<Partial<AIRecipeError>>({
      code: 'bad_request',
      provider: 'mistral',
      message: 'Invalid chat payload',
    });

    expect(mapResponseStatusToAIError(503, 'gemini')).toMatchObject<Partial<AIRecipeError>>({
      code: 'unavailable',
      provider: 'gemini',
    });
  });

  it('normalizes provider exceptions into retryable availability errors', () => {
    const error = toAIRecipeError(
      new Error(
        '{"error":{"code":503,"message":"This model is currently experiencing high demand.","status":"UNAVAILABLE"}}',
      ),
      'gemini',
      'invalid_response',
    );

    expect(error).toMatchObject<Partial<AIRecipeError>>({
      code: 'unavailable',
      provider: 'gemini',
      retryable: true,
      message: 'This model is currently experiencing high demand.',
    });
  });
});
