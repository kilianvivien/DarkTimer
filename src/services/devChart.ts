import type { DevPhase, DevRecipe, ProcessMode } from './recipe';
import type { UserSettings } from './userSettings';

/**
 * Built-in offline development chart.
 *
 * A small, curated set of published manufacturer starting points so the app
 * can still suggest a recipe with no network and no API key. Times are for
 * box speed at the listed temperature. They are STARTING POINTS — the UI must
 * always tell users to verify against the current datasheet for their batch.
 */

export interface DevChartEntry {
  film: string;
  developer: string;
  dilution: string;
  iso: number;
  /** Developer phase duration in seconds at `tempC`. */
  devSeconds: number;
  tempC: number;
  agitationMode: 'every-60s' | 'every-30s' | 'stand';
  note?: string;
}

const CHART_SOURCE = 'Built-in chart (manufacturer starting point)';
const VERIFY_NOTE = 'Offline starting point — verify against the current datasheet for your batch.';

// Developer name aliases: queries for any name in a group match entries for
// the others. D-76 and ID-11 are the classic near-identical formulas.
const DEVELOPER_ALIASES: string[][] = [
  ['d76', 'id11'],
  ['rodinal', 'r09', 'adonal'],
  ['hc110', 'ilfotechc'],
  ['ddx'],
  ['ilfosol3', 'ilfosol'],
  ['xtol'],
  ['microphen'],
];

export const BW_DEV_CHART: DevChartEntry[] = [
  // Ilford HP5 Plus (ISO 400)
  { film: 'HP5 Plus', developer: 'ID-11', dilution: 'Stock', iso: 400, devSeconds: 450, tempC: 20, agitationMode: 'every-60s' },
  { film: 'HP5 Plus', developer: 'ID-11', dilution: '1+1', iso: 400, devSeconds: 780, tempC: 20, agitationMode: 'every-60s' },
  { film: 'HP5 Plus', developer: 'DD-X', dilution: '1+4', iso: 400, devSeconds: 540, tempC: 20, agitationMode: 'every-60s' },
  { film: 'HP5 Plus', developer: 'Ilfosol 3', dilution: '1+9', iso: 400, devSeconds: 390, tempC: 20, agitationMode: 'every-60s' },
  { film: 'HP5 Plus', developer: 'Rodinal', dilution: '1+25', iso: 400, devSeconds: 360, tempC: 20, agitationMode: 'every-60s' },
  { film: 'HP5 Plus', developer: 'Rodinal', dilution: '1+50', iso: 400, devSeconds: 660, tempC: 20, agitationMode: 'every-60s' },
  // Ilford FP4 Plus (ISO 125)
  { film: 'FP4 Plus', developer: 'ID-11', dilution: 'Stock', iso: 125, devSeconds: 390, tempC: 20, agitationMode: 'every-60s' },
  { film: 'FP4 Plus', developer: 'ID-11', dilution: '1+1', iso: 125, devSeconds: 660, tempC: 20, agitationMode: 'every-60s' },
  { film: 'FP4 Plus', developer: 'DD-X', dilution: '1+4', iso: 125, devSeconds: 480, tempC: 20, agitationMode: 'every-60s' },
  { film: 'FP4 Plus', developer: 'Rodinal', dilution: '1+50', iso: 125, devSeconds: 900, tempC: 20, agitationMode: 'every-60s' },
  // Ilford Delta 100
  { film: 'Delta 100', developer: 'ID-11', dilution: 'Stock', iso: 100, devSeconds: 420, tempC: 20, agitationMode: 'every-60s' },
  { film: 'Delta 100', developer: 'DD-X', dilution: '1+4', iso: 100, devSeconds: 720, tempC: 20, agitationMode: 'every-60s' },
  // Ilford Delta 400
  { film: 'Delta 400', developer: 'ID-11', dilution: 'Stock', iso: 400, devSeconds: 480, tempC: 20, agitationMode: 'every-60s' },
  { film: 'Delta 400', developer: 'DD-X', dilution: '1+4', iso: 400, devSeconds: 480, tempC: 20, agitationMode: 'every-60s' },
  // Ilford Delta 3200 at EI 3200
  { film: 'Delta 3200', developer: 'DD-X', dilution: '1+4', iso: 3200, devSeconds: 570, tempC: 20, agitationMode: 'every-60s' },
  { film: 'Delta 3200', developer: 'Microphen', dilution: 'Stock', iso: 3200, devSeconds: 540, tempC: 20, agitationMode: 'every-60s' },
  // Kentmere 400
  { film: 'Kentmere 400', developer: 'ID-11', dilution: 'Stock', iso: 400, devSeconds: 390, tempC: 20, agitationMode: 'every-60s' },
  // Kodak Tri-X 400
  { film: 'Tri-X 400', developer: 'D-76', dilution: 'Stock', iso: 400, devSeconds: 405, tempC: 20, agitationMode: 'every-60s' },
  { film: 'Tri-X 400', developer: 'D-76', dilution: '1+1', iso: 400, devSeconds: 585, tempC: 20, agitationMode: 'every-60s' },
  { film: 'Tri-X 400', developer: 'HC-110', dilution: '1+31', iso: 400, devSeconds: 225, tempC: 20, agitationMode: 'every-60s', note: 'Dilution B. Short time — consider dilution H (1+63) at roughly double the time for more control.' },
  { film: 'Tri-X 400', developer: 'Rodinal', dilution: '1+25', iso: 400, devSeconds: 420, tempC: 20, agitationMode: 'every-60s' },
  { film: 'Tri-X 400', developer: 'Rodinal', dilution: '1+50', iso: 400, devSeconds: 780, tempC: 20, agitationMode: 'every-60s' },
  // Kodak T-Max 100
  { film: 'T-Max 100', developer: 'D-76', dilution: 'Stock', iso: 100, devSeconds: 390, tempC: 20, agitationMode: 'every-60s' },
  { film: 'T-Max 100', developer: 'XTOL', dilution: 'Stock', iso: 100, devSeconds: 390, tempC: 20, agitationMode: 'every-60s' },
  // Kodak T-Max 400
  { film: 'T-Max 400', developer: 'D-76', dilution: 'Stock', iso: 400, devSeconds: 465, tempC: 20, agitationMode: 'every-60s' },
  { film: 'T-Max 400', developer: 'XTOL', dilution: 'Stock', iso: 400, devSeconds: 420, tempC: 20, agitationMode: 'every-60s' },
];

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function developerMatches(query: string, entryDeveloper: string): boolean {
  const q = normalizeName(query);
  const e = normalizeName(entryDeveloper);

  if (!q || !e) {
    return false;
  }

  if (q === e || q.includes(e) || e.includes(q)) {
    return true;
  }

  return DEVELOPER_ALIASES.some(
    (group) =>
      group.some((alias) => q === alias || q.includes(alias)) &&
      group.some((alias) => e === alias || e.includes(alias)),
  );
}

function filmMatches(query: string, entryFilm: string): boolean {
  const q = normalizeName(query);
  const e = normalizeName(entryFilm);
  return Boolean(q && e && (q === e || q.includes(e) || e.includes(q)));
}

function buildBwRecipe(entry: DevChartEntry, settings: UserSettings): DevRecipe {
  const phases: DevPhase[] = [
    {
      name: 'Developer',
      duration: entry.devSeconds,
      agitation: 'Agitate every 1 minute.',
      agitationMode: entry.agitationMode,
    },
    { name: 'Stop Bath', duration: settings.defaultStopBath, agitation: 'Stand.', agitationMode: 'stand' },
    { name: 'Fixer', duration: settings.defaultFixer, agitation: 'Agitate every 1 minute.', agitationMode: 'every-60s' },
    { name: 'Wash', duration: settings.defaultWash, agitation: 'Stand.', agitationMode: 'stand' },
  ];

  return {
    film: entry.film,
    developer: entry.developer,
    dilution: entry.dilution,
    iso: entry.iso,
    tempC: entry.tempC,
    processMode: 'bw',
    phases,
    notes: [entry.note, VERIFY_NOTE].filter(Boolean).join(' '),
    source: CHART_SOURCE,
  };
}

function buildColorRecipes(film: string, iso: number, settings: UserSettings): DevRecipe[] {
  // Standard C-41 is film-independent: 3:15 developer at 37.8 °C.
  const c41: DevRecipe = {
    film: film || 'Color Negative',
    developer: 'C-41',
    dilution: 'Kit',
    iso: iso || 400,
    tempC: 38,
    processMode: 'color',
    phases: [
      {
        name: 'Developer',
        duration: 195,
        agitation: 'Agitate first 10 seconds, then every 30 seconds.',
        agitationMode: 'every-30s',
      },
      { name: 'Blix', duration: settings.defaultColorBlix, agitation: 'Agitate every 30 seconds.', agitationMode: 'every-30s' },
      { name: 'Wash', duration: settings.defaultColorWash, agitation: 'Stand.', agitationMode: 'stand' },
    ],
    notes: `Standard C-41 process at 38°C. Blix and wash times follow common home kits. ${VERIFY_NOTE}`,
    source: CHART_SOURCE,
  };

  return [c41];
}

/**
 * Look up offline starting-point recipes. Stop/fix/wash phases use the user's
 * configured defaults; only the developer time comes from the chart.
 */
export function findDevChartRecipes(
  film: string,
  developer: string,
  dilution: string,
  iso: number,
  processMode: ProcessMode,
  settings: UserSettings,
): DevRecipe[] {
  if (processMode === 'color') {
    const dev = normalizeName(developer);
    // Only claim a match for C-41-style processes; E-6/ECN-2 vary too much by kit.
    if (!dev || dev.includes('c41') || dev.includes('cs41')) {
      return buildColorRecipes(film, iso, settings);
    }

    return [];
  }

  const matches = BW_DEV_CHART.filter(
    (entry) => filmMatches(film, entry.film) && developerMatches(developer, entry.developer),
  );

  if (matches.length === 0) {
    return [];
  }

  // Prefer the requested dilution when the chart has it.
  const dilutionMatches = dilution.trim()
    ? matches.filter((entry) => normalizeName(entry.dilution) === normalizeName(dilution))
    : [];
  const selected = dilutionMatches.length > 0 ? dilutionMatches : matches;

  return selected.map((entry) => buildBwRecipe(entry, settings));
}
