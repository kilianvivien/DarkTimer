import type { AIProvider } from './userSettings';

export type AIErrorCode =
  | 'auth'
  | 'bad_request'
  | 'rate_limit'
  | 'unavailable'
  | 'network'
  | 'offline'
  | 'invalid_response'
  | 'no_results'
  | 'unknown';

const DEFAULT_MESSAGES: Record<AIErrorCode, string> = {
  auth: 'The AI provider rejected the API key.',
  bad_request: 'The AI provider rejected this request.',
  rate_limit: 'The AI provider is rate-limiting requests right now.',
  unavailable: 'The AI provider is temporarily unavailable.',
  network: 'The AI request could not reach the provider.',
  offline: 'AI lookup requires an internet connection.',
  invalid_response: 'The AI provider returned recipe data DarkTimer could not use.',
  no_results: 'No development recipes were found for that combination.',
  unknown: 'The AI lookup failed. Please try again.',
};

function isRetryable(code: AIErrorCode): boolean {
  return (
    code === 'rate_limit' ||
    code === 'unavailable' ||
    code === 'network' ||
    code === 'unknown' ||
    code === 'invalid_response'
  );
}

export class AIRecipeError extends Error {
  code: AIErrorCode;
  provider: AIProvider;
  retryable: boolean;

  constructor(code: AIErrorCode, provider: AIProvider, message = DEFAULT_MESSAGES[code]) {
    super(message);
    this.name = 'AIRecipeError';
    this.code = code;
    this.provider = provider;
    this.retryable = isRetryable(code);
  }
}

function extractNestedMessage(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const record = value as Record<string, unknown>;
  return (
    extractNestedMessage(record.message) ??
    extractNestedMessage(record.error) ??
    null
  );
}

export function extractProviderErrorMessage(value: string | null | undefined): string | null {
  if (!value?.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return extractNestedMessage(parsed) ?? value;
  } catch {
    return value;
  }
}

export function mapResponseStatusToAIError(
  status: number,
  provider: AIProvider,
  message?: string | null,
): AIRecipeError {
  const providerMessage = extractProviderErrorMessage(message) ?? undefined;

  if (status === 400) {
    return new AIRecipeError('bad_request', provider, providerMessage ?? DEFAULT_MESSAGES.bad_request);
  }

  if (status === 401 || status === 403) {
    return new AIRecipeError('auth', provider, providerMessage ?? DEFAULT_MESSAGES.auth);
  }

  if (status === 429) {
    return new AIRecipeError('rate_limit', provider, providerMessage ?? DEFAULT_MESSAGES.rate_limit);
  }

  if (status >= 500) {
    return new AIRecipeError(
      'unavailable',
      provider,
      providerMessage ?? DEFAULT_MESSAGES.unavailable,
    );
  }

  return new AIRecipeError('unknown', provider, providerMessage ?? DEFAULT_MESSAGES.unknown);
}

export function toAIRecipeError(
  error: unknown,
  provider: AIProvider,
  fallbackCode: AIErrorCode = 'unknown',
): AIRecipeError {
  if (error instanceof AIRecipeError) {
    return error;
  }

  const message = error instanceof Error ? error.message : '';
  const normalized = message.toLowerCase();

  if (normalized.includes('offline')) {
    return new AIRecipeError('offline', provider);
  }

  if (
    normalized.includes('503') ||
    normalized.includes('unavailable') ||
    normalized.includes('overloaded') ||
    normalized.includes('high demand')
  ) {
    return new AIRecipeError(
      'unavailable',
      provider,
      extractProviderErrorMessage(message) ?? DEFAULT_MESSAGES.unavailable,
    );
  }

  if (
    normalized.includes('400') ||
    normalized.includes('bad request') ||
    normalized.includes('invalid request')
  ) {
    return new AIRecipeError(
      'bad_request',
      provider,
      extractProviderErrorMessage(message) ?? DEFAULT_MESSAGES.bad_request,
    );
  }

  if (
    normalized.includes('network') ||
    normalized.includes('failed to fetch') ||
    normalized.includes('load failed')
  ) {
    return new AIRecipeError('network', provider);
  }

  if (
    normalized.includes('api key') ||
    normalized.includes('unauthorized') ||
    normalized.includes('forbidden')
  ) {
    return new AIRecipeError('auth', provider);
  }

  if (normalized.includes('rate limit') || normalized.includes('429')) {
    return new AIRecipeError(
      'rate_limit',
      provider,
      extractProviderErrorMessage(message) ?? DEFAULT_MESSAGES.rate_limit,
    );
  }

  return new AIRecipeError(
    fallbackCode,
    provider,
    extractProviderErrorMessage(message) ?? DEFAULT_MESSAGES[fallbackCode],
  );
}
