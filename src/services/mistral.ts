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
  try {
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: buildRecipeLookupSystemPrompt(),
          },
          {
            role: 'user',
            content: buildRecipeLookupUserPrompt({
              film,
              developer,
              iso,
              tempC,
              dilution,
              processMode,
            }),
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw mapResponseStatusToAIError(response.status, 'mistral', errorText);
    }

    const payload = (await response.json()) as MistralChatCompletionsResponse;
    const message = payload.choices?.[0]?.message;

    const parsed = parseJsonResponse(extractMessageText(message), {
      processMode,
      tempC,
    });

    if (!parsed) {
      throw new AIRecipeError('invalid_response', 'mistral');
    }

    return parsed;
  } catch (error) {
    console.error('Error fetching Mistral dev times:', error);
    throw toAIRecipeError(error, 'mistral', 'invalid_response');
  }
}
