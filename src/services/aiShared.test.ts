import { describe, expect, it } from 'vitest';
import { buildRecipeLookupPrompt, normalizeDevResponse, parseJsonResponse } from './aiShared';

describe('aiShared helpers', () => {
  it('builds a lookup prompt with the selected process details', () => {
    const prompt = buildRecipeLookupPrompt({
      film: 'Tri-X',
      developer: 'Rodinal',
      iso: '400',
      tempC: 20,
      dilution: '1+25',
      processMode: 'bw',
    });

    expect(prompt).toContain('Tri-X');
    expect(prompt).toContain('Rodinal');
    expect(prompt).toContain('ISO 400');
    expect(prompt).toContain('1+25');
    expect(prompt).toContain('Black & White');
  });

  it('normalizes parsed recipe options against fallback values', () => {
    const response = normalizeDevResponse(
      {
        options: [
          {
            film: 'Portra 400',
            developer: 'C-41',
            dilution: '',
            iso: 400,
            tempC: 38,
            processMode: 'color',
            phases: [{ name: 'Developer', duration: 210, agitationMode: 'every-60s' }],
            notes: '',
          },
        ],
      },
      { processMode: 'color', tempC: 38 },
    );

    expect(response.options[0]).toMatchObject({
      film: 'Portra 400',
      dilution: 'N/A',
      tempC: 38,
      processMode: 'color',
    });
  });

  it('parses valid JSON and returns null for invalid responses', () => {
    expect(
      parseJsonResponse(
        JSON.stringify({
          options: [
            {
              film: 'HP5',
              developer: 'DD-X',
              dilution: '1+4',
              iso: 400,
              tempC: 20,
              processMode: 'bw',
              phases: [],
            },
          ],
        }),
        { processMode: 'bw', tempC: 20 },
      ),
    )?.toMatchObject({
      options: [{ film: 'HP5', developer: 'DD-X' }],
    });

    expect(parseJsonResponse('not-json', { processMode: 'bw', tempC: 20 })).toBeNull();
  });
});
