import { ProcessMode } from './recipe';
import { DevResponse, buildRecipeLookupPrompt, parseJsonResponse } from './aiShared';

interface MistralMessageChunk {
  type?: string;
  text?: string;
}

interface MistralMessageOutput {
  type?: string;
  content?: string | MistralMessageChunk[];
}

interface MistralConversationResponse {
  outputs?: MistralMessageOutput[];
}

function extractMessageText(output: MistralMessageOutput | undefined): string | null {
  if (!output) {
    return null;
  }

  if (typeof output.content === 'string') {
    return output.content;
  }

  if (!Array.isArray(output.content)) {
    return null;
  }

  return output.content
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
): Promise<DevResponse | null> {
  try {
    const response = await fetch('https://api.mistral.ai/v1/conversations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        store: false,
        tools: [{ type: 'web_search' }],
        instructions:
          'You are a darkroom recipe assistant. Search the web when needed and answer with valid JSON only.',
        completion_args: {
          temperature: 0.2,
          response_format: { type: 'json_object' },
        },
        inputs: buildRecipeLookupPrompt({
          film,
          developer,
          iso,
          tempC,
          dilution,
          processMode,
        }),
      }),
    });

    if (!response.ok) {
      throw new Error(`Mistral API request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as MistralConversationResponse;
    const message = payload.outputs?.find((entry) => entry.type === 'message.output');

    return parseJsonResponse(extractMessageText(message), {
      processMode,
      tempC,
    });
  } catch (error) {
    console.error('Error fetching Mistral dev times:', error);
    return null;
  }
}
