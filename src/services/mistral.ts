import { AIRecipeError, mapResponseStatusToAIError, toAIRecipeError } from './aiErrors';
import type { ProcessMode } from './recipe';
import {
  type DevResponse,
  buildRecipeLookupSystemPrompt,
  buildRecipeLookupUserPrompt,
  parseJsonResponse,
} from './aiShared';

interface MistralContentChunk {
  type?: string;
  text?: string;
}

interface MistralChatMessage {
  content?: string | MistralContentChunk[];
}

interface MistralChoice {
  message?: MistralChatMessage;
}

interface MistralChatCompletionsResponse {
  choices?: MistralChoice[];
}

const MISTRAL_MODELS = [
  'zai-glm-5-3',
  'mistral-medium-latest',
  'mistral-small-latest',
] as const;

function canTryNextModel(error: AIRecipeError): boolean {
  return (
    error.code === 'bad_request' ||
    error.code === 'rate_limit' ||
    error.code === 'unavailable' ||
    error.code === 'invalid_response' ||
    error.code === 'unknown'
  );
}

function extractMessageText(message: MistralChatMessage | undefined): string | null {
  if (!message) {
    return null;
  }

  if (typeof message.content === 'string') {
    return message.content;
  }

  if (!Array.isArray(message.content)) {
    return null;
  }

  return message.content
    .map((chunk) => (chunk.type === 'text' && typeof chunk.text === 'string' ? chunk.text : ''))
    .join('');
}

export async function getMistralDevTimes(
  apiKey: string,
  film: string,
  developer: string,
  iso: string,
  tempC: number,
  dilution: string,
  processMode: ProcessMode,
): Promise<DevResponse> {
  const messages = [
    { role: 'system', content: buildRecipeLookupSystemPrompt() },
    {
      role: 'user',
      content: buildRecipeLookupUserPrompt({ film, developer, iso, tempC, dilution, processMode }),
    },
  ];

  for (const [index, model] of MISTRAL_MODELS.entries()) {
    try {
      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          ...(model === 'zai-glm-5-3' ? {} : { reasoning_effort: 'medium' }),
          temperature: 0.3,
          response_format: { type: 'json_object' },
          messages,
        }),
      });

      if (!response.ok) {
        throw mapResponseStatusToAIError(response.status, 'mistral', await response.text());
      }

      const payload = (await response.json()) as MistralChatCompletionsResponse;
      const parsed = parseJsonResponse(extractMessageText(payload.choices?.[0]?.message), {
        processMode,
        tempC,
      });

      if (!parsed) {
        throw new AIRecipeError('invalid_response', 'mistral');
      }

      return parsed;
    } catch (error) {
      const normalizedError = toAIRecipeError(error, 'mistral', 'invalid_response');

      if (index < MISTRAL_MODELS.length - 1 && canTryNextModel(normalizedError)) {
        continue;
      }

      console.error('Error fetching Mistral dev times:', error);
      throw normalizedError;
    }
  }

  throw new AIRecipeError('unavailable', 'mistral');
}
