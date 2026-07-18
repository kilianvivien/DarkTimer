import type { DevPhase, DevRecipe, ProcessMode } from './recipe';
import type { UserSettings } from './userSettings';

/**
 * Built-in offline development chart.
 *
 * A curated set of published manufacturer starting points so the app can
 * still suggest a recipe with no network and no API key. Times are for box
 * speed at the listed temperature, compiled from manufacturer datasheets.
 * They are STARTING POINTS — the UI must always tell users to verify against
 * the current datasheet for their batch.
 *
 * When the requested temperature or EI differs from the chart entry, the
 * lookup scales the developer time with generic compensation factors
 * (temperature + push/pull) and flags the recipe as a rough estimate.
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

// Generic compensation factors for off-chart temperatures and pushed/pulled
// ratings. Temperature scaling follows a Q10-style curve sitting between the
// published Kodak and Ilford time/temperature charts; push/pull uses per-stop
// multipliers. Both are clamped to sane ranges and always flagged as rough
// estimates in the recipe notes.
const TEMP_Q10 = 2.5;
const MIN_TEMP_FACTOR = 0.4;
const MAX_TEMP_FACTOR = 2.5;
const PUSH_FACTOR_PER_STOP = 1.4;
const PULL_FACTOR_PER_STOP = 0.8;
const MAX_PUSH_STOPS = 3;
const MAX_PULL_STOPS = 2;
const DEFAULT_CHART_TEMP_C = 20;

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

// Film name aliases: Double-X is sold as CineStill BwXX (Eastman 5222), and
// T-Max P3200 is often shortened to TMZ.
const FILM_ALIASES: string[][] = [
  ['doublex', 'bwxx', '5222'],
  ['tmaxp3200', 'tmz'],
];

export const BW_DEV_CHART: DevChartEntry[] = [
  // Ilford HP5 Plus (ISO 400)
  { film: 'HP5 Plus', developer: 'ID-11', dilution: 'Stock', iso: 400, devSeconds: 450, tempC: 20, agitationMode: 'every-60s' },
  { film: 'HP5 Plus', developer: 'ID-11', dilution: '1+1', iso: 400, devSeconds: 780, tempC: 20, agitationMode: 'every-60s' },
  { film: 'HP5 Plus', developer: 'DD-X', dilution: '1+4', iso: 400, devSeconds: 540, tempC: 20, agitationMode: 'every-60s' },
  { film: 'HP5 Plus', developer: 'XTOL', dilution: 'Stock', iso: 400, devSeconds: 480, tempC: 20, agitationMode: 'every-60s' },
  { film: 'HP5 Plus', developer: 'Ilfosol 3', dilution: '1+9', iso: 400, devSeconds: 390, tempC: 20, agitationMode: 'every-60s' },
  { film: 'HP5 Plus', developer: 'Rodinal', dilution: '1+25', iso: 400, devSeconds: 360, tempC: 20, agitationMode: 'every-60s' },
  { film: 'HP5 Plus', developer: 'Rodinal', dilution: '1+50', iso: 400, devSeconds: 660, tempC: 20, agitationMode: 'every-60s' },
  // Ilford FP4 Plus (ISO 125)
  { film: 'FP4 Plus', developer: 'ID-11', dilution: 'Stock', iso: 125, devSeconds: 390, tempC: 20, agitationMode: 'every-60s' },
  { film: 'FP4 Plus', developer: 'ID-11', dilution: '1+1', iso: 125, devSeconds: 660, tempC: 20, agitationMode: 'every-60s' },
  { film: 'FP4 Plus', developer: 'DD-X', dilution: '1+4', iso: 125, devSeconds: 480, tempC: 20, agitationMode: 'every-60s' },
  { film: 'FP4 Plus', developer: 'XTOL', dilution: 'Stock', iso: 125, devSeconds: 510, tempC: 20, agitationMode: 'every-60s' },
  { film: 'FP4 Plus', developer: 'Rodinal', dilution: '1+50', iso: 125, devSeconds: 900, tempC: 20, agitationMode: 'every-60s' },
  // Ilford Delta 100
  { film: 'Delta 100', developer: 'ID-11', dilution: 'Stock', iso: 100, devSeconds: 420, tempC: 20, agitationMode: 'every-60s' },
  { film: 'Delta 100', developer: 'DD-X', dilution: '1+4', iso: 100, devSeconds: 720, tempC: 20, agitationMode: 'every-60s' },
  { film: 'Delta 100', developer: 'XTOL', dilution: 'Stock', iso: 100, devSeconds: 450, tempC: 20, agitationMode: 'every-60s' },
  // Ilford Delta 400
  { film: 'Delta 400', developer: 'ID-11', dilution: 'Stock', iso: 400, devSeconds: 480, tempC: 20, agitationMode: 'every-60s' },
  { film: 'Delta 400', developer: 'DD-X', dilution: '1+4', iso: 400, devSeconds: 480, tempC: 20, agitationMode: 'every-60s' },
  { film: 'Delta 400', developer: 'XTOL', dilution: 'Stock', iso: 400, devSeconds: 450, tempC: 20, agitationMode: 'every-60s' },
  // Ilford Delta 3200 at EI 3200
  { film: 'Delta 3200', developer: 'DD-X', dilution: '1+4', iso: 3200, devSeconds: 570, tempC: 20, agitationMode: 'every-60s' },
  { film: 'Delta 3200', developer: 'Microphen', dilution: 'Stock', iso: 3200, devSeconds: 540, tempC: 20, agitationMode: 'every-60s' },
  { film: 'Delta 3200', developer: 'XTOL', dilution: 'Stock', iso: 3200, devSeconds: 450, tempC: 20, agitationMode: 'every-60s' },
  // Ilford Pan F Plus (ISO 50)
  { film: 'Pan F Plus', developer: 'ID-11', dilution: 'Stock', iso: 50, devSeconds: 390, tempC: 20, agitationMode: 'every-60s' },
  { film: 'Pan F Plus', developer: 'ID-11', dilution: '1+1', iso: 50, devSeconds: 510, tempC: 20, agitationMode: 'every-60s' },
  { film: 'Pan F Plus', developer: 'XTOL', dilution: 'Stock', iso: 50, devSeconds: 405, tempC: 20, agitationMode: 'every-60s' },
  { film: 'Pan F Plus', developer: 'Ilfosol 3', dilution: '1+14', iso: 50, devSeconds: 270, tempC: 20, agitationMode: 'every-60s' },
  { film: 'Pan F Plus', developer: 'Rodinal', dilution: '1+25', iso: 50, devSeconds: 360, tempC: 20, agitationMode: 'every-60s' },
  { film: 'Pan F Plus', developer: 'Rodinal', dilution: '1+50', iso: 50, devSeconds: 660, tempC: 20, agitationMode: 'every-60s' },
  // Ilford SFX 200 (ISO 200)
  { film: 'SFX 200', developer: 'ID-11', dilution: 'Stock', iso: 200, devSeconds: 600, tempC: 20, agitationMode: 'every-60s' },
  { film: 'SFX 200', developer: 'ID-11', dilution: '1+1', iso: 200, devSeconds: 1020, tempC: 20, agitationMode: 'every-60s' },
  { film: 'SFX 200', developer: 'Ilfosol 3', dilution: '1+9', iso: 200, devSeconds: 360, tempC: 20, agitationMode: 'every-60s' },
  { film: 'SFX 200', developer: 'Ilfosol 3', dilution: '1+14', iso: 200, devSeconds: 540, tempC: 20, agitationMode: 'every-60s' },
  { film: 'SFX 200', developer: 'XTOL', dilution: 'Stock', iso: 200, devSeconds: 420, tempC: 20, agitationMode: 'every-60s' },
  // Ilford Ortho Plus (ISO 80)
  { film: 'Ortho Plus', developer: 'ID-11', dilution: 'Stock', iso: 80, devSeconds: 480, tempC: 20, agitationMode: 'every-60s' },
  { film: 'Ortho Plus', developer: 'ID-11', dilution: '1+1', iso: 80, devSeconds: 630, tempC: 20, agitationMode: 'every-60s' },
  { film: 'Ortho Plus', developer: 'Ilfosol 3', dilution: '1+9', iso: 80, devSeconds: 300, tempC: 20, agitationMode: 'every-60s' },
  { film: 'Ortho Plus', developer: 'Ilfosol 3', dilution: '1+14', iso: 80, devSeconds: 420, tempC: 20, agitationMode: 'every-60s' },
  { film: 'Ortho Plus', developer: 'XTOL', dilution: '1+1', iso: 80, devSeconds: 600, tempC: 20, agitationMode: 'every-60s' },
  // Kentmere 100 (ISO 100)
  { film: 'Kentmere 100', developer: 'ID-11', dilution: 'Stock', iso: 100, devSeconds: 540, tempC: 20, agitationMode: 'every-60s' },
  { film: 'Kentmere 100', developer: 'ID-11', dilution: '1+1', iso: 100, devSeconds: 690, tempC: 20, agitationMode: 'every-60s' },
  { film: 'Kentmere 100', developer: 'Rodinal', dilution: '1+25', iso: 100, devSeconds: 540, tempC: 20, agitationMode: 'every-60s' },
  { film: 'Kentmere 100', developer: 'XTOL', dilution: 'Stock', iso: 100, devSeconds: 480, tempC: 20, agitationMode: 'every-60s' },
  // Kentmere 400 (ISO 400)
  { film: 'Kentmere 400', developer: 'ID-11', dilution: 'Stock', iso: 400, devSeconds: 570, tempC: 20, agitationMode: 'every-60s' },
  { film: 'Kentmere 400', developer: 'ID-11', dilution: '1+1', iso: 400, devSeconds: 990, tempC: 20, agitationMode: 'every-60s' },
  { film: 'Kentmere 400', developer: 'Rodinal', dilution: '1+25', iso: 400, devSeconds: 450, tempC: 20, agitationMode: 'every-60s' },
  { film: 'Kentmere 400', developer: 'Rodinal', dilution: '1+50', iso: 400, devSeconds: 1050, tempC: 20, agitationMode: 'every-60s' },
  { film: 'Kentmere 400', developer: 'XTOL', dilution: 'Stock', iso: 400, devSeconds: 540, tempC: 20, agitationMode: 'every-60s' },
  // Kodak Tri-X 400
  { film: 'Tri-X 400', developer: 'D-76', dilution: 'Stock', iso: 400, devSeconds: 405, tempC: 20, agitationMode: 'every-60s' },
  { film: 'Tri-X 400', developer: 'D-76', dilution: '1+1', iso: 400, devSeconds: 585, tempC: 20, agitationMode: 'every-60s' },
  { film: 'Tri-X 400', developer: 'HC-110', dilution: '1+31', iso: 400, devSeconds: 225, tempC: 20, agitationMode: 'every-60s', note: 'Dilution B. Short time — consider dilution H (1+63) at roughly double the time for more control.' },
  { film: 'Tri-X 400', developer: 'Rodinal', dilution: '1+25', iso: 400, devSeconds: 420, tempC: 20, agitationMode: 'every-60s' },
  { film: 'Tri-X 400', developer: 'Rodinal', dilution: '1+50', iso: 400, devSeconds: 780, tempC: 20, agitationMode: 'every-60s' },
  { film: 'Tri-X 400', developer: 'XTOL', dilution: 'Stock', iso: 400, devSeconds: 420, tempC: 20, agitationMode: 'every-60s' },
  // Kodak T-Max 100
  { film: 'T-Max 100', developer: 'D-76', dilution: 'Stock', iso: 100, devSeconds: 390, tempC: 20, agitationMode: 'every-60s' },
  { film: 'T-Max 100', developer: 'XTOL', dilution: 'Stock', iso: 100, devSeconds: 390, tempC: 20, agitationMode: 'every-60s' },
  // Kodak T-Max 400
  { film: 'T-Max 400', developer: 'D-76', dilution: 'Stock', iso: 400, devSeconds: 465, tempC: 20, agitationMode: 'every-60s' },
  { film: 'T-Max 400', developer: 'XTOL', dilution: 'Stock', iso: 400, devSeconds: 420, tempC: 20, agitationMode: 'every-60s' },
  // Kodak T-Max P3200 at EI 3200
  { film: 'T-Max P3200', developer: 'D-76', dilution: 'Stock', iso: 3200, devSeconds: 840, tempC: 20, agitationMode: 'every-60s' },
  { film: 'T-Max P3200', developer: 'XTOL', dilution: 'Stock', iso: 3200, devSeconds: 810, tempC: 20, agitationMode: 'every-60s' },
  // Kodak Double-X (ISO 250, also sold as CineStill BwXX)
  { film: 'Double-X', developer: 'D-76', dilution: 'Stock', iso: 250, devSeconds: 420, tempC: 20, agitationMode: 'every-60s' },
  { film: 'Double-X', developer: 'D-76', dilution: '1+1', iso: 250, devSeconds: 600, tempC: 20, agitationMode: 'every-60s' },
  { film: 'Double-X', developer: 'HC-110', dilution: '1+31', iso: 250, devSeconds: 360, tempC: 20, agitationMode: 'every-60s', note: 'Dilution B.' },
  { film: 'Double-X', developer: 'Rodinal', dilution: '1+25', iso: 250, devSeconds: 345, tempC: 20, agitationMode: 'every-60s' },
  { film: 'Double-X', developer: 'Rodinal', dilution: '1+50', iso: 250, devSeconds: 540, tempC: 20, agitationMode: 'every-60s' },
  { film: 'Double-X', developer: 'XTOL', dilution: 'Stock', iso: 250, devSeconds: 420, tempC: 20, agitationMode: 'every-60s' },
  // Fujifilm Acros II (ISO 100)
  { film: 'Acros II', developer: 'XTOL', dilution: 'Stock', iso: 100, devSeconds: 480, tempC: 20, agitationMode: 'every-60s' },
  // Fomapan 100 (ISO 100)
  { film: 'Fomapan 100', developer: 'D-76', dilution: 'Stock', iso: 100, devSeconds: 420, tempC: 20, agitationMode: 'every-60s' },
  { film: 'Fomapan 100', developer: 'D-76', dilution: '1+1', iso: 100, devSeconds: 600, tempC: 20, agitationMode: 'every-60s' },
  { film: 'Fomapan 100', developer: 'Rodinal', dilution: '1+50', iso: 100, devSeconds: 510, tempC: 20, agitationMode: 'every-60s' },
  { film: 'Fomapan 100', developer: 'XTOL', dilution: 'Stock', iso: 100, devSeconds: 360, tempC: 20, agitationMode: 'every-60s', note: 'Published time is 5–6 minutes; this recipe uses the upper end of the range.' },
  // Fomapan 200 (ISO 200)
  { film: 'Fomapan 200', developer: 'D-76', dilution: 'Stock', iso: 200, devSeconds: 330, tempC: 20, agitationMode: 'every-60s' },
  { film: 'Fomapan 200', developer: 'D-76', dilution: '1+1', iso: 200, devSeconds: 510, tempC: 20, agitationMode: 'every-60s' },
  { film: 'Fomapan 200', developer: 'Rodinal', dilution: '1+25', iso: 200, devSeconds: 300, tempC: 20, agitationMode: 'every-60s' },
  { film: 'Fomapan 200', developer: 'Rodinal', dilution: '1+50', iso: 200, devSeconds: 540, tempC: 20, agitationMode: 'every-60s' },
  { film: 'Fomapan 200', developer: 'XTOL', dilution: 'Stock', iso: 200, devSeconds: 360, tempC: 20, agitationMode: 'every-60s' },
  // Fomapan 400 (ISO 400)
  { film: 'Fomapan 400', developer: 'D-76', dilution: 'Stock', iso: 400, devSeconds: 450, tempC: 20, agitationMode: 'every-60s' },
  { film: 'Fomapan 400', developer: 'D-76', dilution: '1+1', iso: 400, devSeconds: 630, tempC: 20, agitationMode: 'every-60s' },
  { film: 'Fomapan 400', developer: 'Rodinal', dilution: '1+25', iso: 400, devSeconds: 330, tempC: 20, agitationMode: 'every-60s' },
  { film: 'Fomapan 400', developer: 'Rodinal', dilution: '1+50', iso: 400, devSeconds: 660, tempC: 20, agitationMode: 'every-60s' },
  { film: 'Fomapan 400', developer: 'XTOL', dilution: 'Stock', iso: 400, devSeconds: 420, tempC: 20, agitationMode: 'every-60s' },
  // Bergger Pancro 400 (ISO 400)
  { film: 'Bergger Pancro 400', developer: 'ID-11', dilution: 'Stock', iso: 400, devSeconds: 540, tempC: 20, agitationMode: 'every-60s' },
  { film: 'Bergger Pancro 400', developer: 'ID-11', dilution: '1+1', iso: 400, devSeconds: 1020, tempC: 20, agitationMode: 'every-60s' },
  { film: 'Bergger Pancro 400', developer: 'Rodinal', dilution: '1+25', iso: 400, devSeconds: 480, tempC: 20, agitationMode: 'every-60s' },
  { film: 'Bergger Pancro 400', developer: 'Rodinal', dilution: '1+50', iso: 400, devSeconds: 1320, tempC: 20, agitationMode: 'every-60s' },
  { film: 'Bergger Pancro 400', developer: 'XTOL', dilution: 'Stock', iso: 400, devSeconds: 600, tempC: 20, agitationMode: 'every-60s' },
  // Rollei RPX 100 (ISO 100)
  { film: 'Rollei RPX 100', developer: 'D-76', dilution: 'Stock', iso: 100, devSeconds: 510, tempC: 20, agitationMode: 'every-60s' },
  { film: 'Rollei RPX 100', developer: 'D-76', dilution: '1+1', iso: 100, devSeconds: 660, tempC: 20, agitationMode: 'every-60s' },
  { film: 'Rollei RPX 100', developer: 'Rodinal', dilution: '1+25', iso: 100, devSeconds: 540, tempC: 20, agitationMode: 'every-60s' },
  { film: 'Rollei RPX 100', developer: 'XTOL', dilution: 'Stock', iso: 100, devSeconds: 480, tempC: 20, agitationMode: 'every-60s' },
  // Rollei RPX 400 (ISO 400)
  { film: 'Rollei RPX 400', developer: 'D-76', dilution: 'Stock', iso: 400, devSeconds: 480, tempC: 20, agitationMode: 'every-60s' },
  { film: 'Rollei RPX 400', developer: 'D-76', dilution: '1+1', iso: 400, devSeconds: 840, tempC: 20, agitationMode: 'every-60s' },
  { film: 'Rollei RPX 400', developer: 'Rodinal', dilution: '1+25', iso: 400, devSeconds: 720, tempC: 20, agitationMode: 'every-60s' },
  { film: 'Rollei RPX 400', developer: 'Rodinal', dilution: '1+50', iso: 400, devSeconds: 1260, tempC: 20, agitationMode: 'every-60s' },
  { film: 'Rollei RPX 400', developer: 'XTOL', dilution: 'Stock', iso: 400, devSeconds: 540, tempC: 20, agitationMode: 'every-60s' },
  // Rollei Retro 80S (ISO 80)
  { film: 'Rollei Retro 80S', developer: 'Rodinal', dilution: '1+25', iso: 80, devSeconds: 480, tempC: 20, agitationMode: 'every-60s' },
  { film: 'Rollei Retro 80S', developer: 'Rodinal', dilution: '1+50', iso: 80, devSeconds: 840, tempC: 20, agitationMode: 'every-60s' },
  { film: 'Rollei Retro 80S', developer: 'XTOL', dilution: 'Stock', iso: 80, devSeconds: 540, tempC: 20, agitationMode: 'every-60s' },
  // Rollei Retro 400S (ISO 400)
  { film: 'Rollei Retro 400S', developer: 'D-76', dilution: 'Stock', iso: 400, devSeconds: 630, tempC: 20, agitationMode: 'every-60s' },
  { film: 'Rollei Retro 400S', developer: 'D-76', dilution: '1+1', iso: 400, devSeconds: 960, tempC: 20, agitationMode: 'every-60s' },
  { film: 'Rollei Retro 400S', developer: 'Rodinal', dilution: '1+25', iso: 400, devSeconds: 630, tempC: 20, agitationMode: 'every-60s' },
  { film: 'Rollei Retro 400S', developer: 'Rodinal', dilution: '1+50', iso: 400, devSeconds: 1320, tempC: 20, agitationMode: 'every-60s' },
  { film: 'Rollei Retro 400S', developer: 'XTOL', dilution: 'Stock', iso: 400, devSeconds: 720, tempC: 20, agitationMode: 'every-60s' },
  // AgfaPhoto APX 100 (ISO 100)
  { film: 'AgfaPhoto APX 100', developer: 'ID-11', dilution: 'Stock', iso: 100, devSeconds: 540, tempC: 20, agitationMode: 'every-60s' },
  { film: 'AgfaPhoto APX 100', developer: 'ID-11', dilution: '1+1', iso: 100, devSeconds: 690, tempC: 20, agitationMode: 'every-60s' },
  { film: 'AgfaPhoto APX 100', developer: 'Rodinal', dilution: '1+25', iso: 100, devSeconds: 330, tempC: 20, agitationMode: 'every-60s' },
  { film: 'AgfaPhoto APX 100', developer: 'Rodinal', dilution: '1+50', iso: 100, devSeconds: 600, tempC: 20, agitationMode: 'every-60s' },
  { film: 'AgfaPhoto APX 100', developer: 'XTOL', dilution: 'Stock', iso: 100, devSeconds: 480, tempC: 20, agitationMode: 'every-60s' },
  // AgfaPhoto APX 400 (ISO 400)
  { film: 'AgfaPhoto APX 400', developer: 'ID-11', dilution: 'Stock', iso: 400, devSeconds: 570, tempC: 20, agitationMode: 'every-60s' },
  { film: 'AgfaPhoto APX 400', developer: 'ID-11', dilution: '1+1', iso: 400, devSeconds: 990, tempC: 20, agitationMode: 'every-60s' },
  { film: 'AgfaPhoto APX 400', developer: 'Rodinal', dilution: '1+25', iso: 400, devSeconds: 690, tempC: 20, agitationMode: 'every-60s' },
  { film: 'AgfaPhoto APX 400', developer: 'Rodinal', dilution: '1+50', iso: 400, devSeconds: 1260, tempC: 20, agitationMode: 'every-60s' },
  { film: 'AgfaPhoto APX 400', developer: 'XTOL', dilution: 'Stock', iso: 400, devSeconds: 540, tempC: 20, agitationMode: 'every-60s' },
  // Adox specialty films
  { film: 'Adox HR-50', developer: 'XTOL', dilution: '1+1', iso: 50, devSeconds: 570, tempC: 20, agitationMode: 'every-60s' },
  { film: 'Adox CMS 20 II', developer: 'XTOL', dilution: 'Stock', iso: 25, devSeconds: 390, tempC: 20, agitationMode: 'every-60s', note: 'Published XTOL time is for EI 20; this entry uses the catalog rating of ISO 25 as a close starting point.' },
  // JCH, Kosmo Foto, and Lomography
  { film: 'JCH StreetPan 400', developer: 'XTOL', dilution: 'Stock', iso: 400, devSeconds: 765, tempC: 20, agitationMode: 'every-60s' },
  { film: 'Kosmo Foto Mono 100', developer: 'XTOL', dilution: 'Stock', iso: 100, devSeconds: 360, tempC: 20, agitationMode: 'every-60s', note: 'Published time is 5–6 minutes; this recipe uses the upper end of the range.' },
  { film: 'Lomography Lady Grey 400', developer: 'XTOL', dilution: 'Stock', iso: 400, devSeconds: 390, tempC: 20, agitationMode: 'every-60s' },
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

  if (!q || !e) {
    return false;
  }

  if (q === e || q.includes(e) || e.includes(q)) {
    return true;
  }

  return FILM_ALIASES.some(
    (group) =>
      group.some((alias) => q === alias || q.includes(alias)) &&
      group.some((alias) => e === alias || e.includes(alias)),
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Generic temperature compensation: time scales by Q10^((chart - target)/10),
 * i.e. warmer chemistry works faster. Sits between the published Kodak and
 * Ilford time/temperature curves. Rough estimate only.
 */
function temperatureFactor(chartTempC: number, targetTempC: number): number {
  return clamp(
    Math.pow(TEMP_Q10, (chartTempC - targetTempC) / 10),
    MIN_TEMP_FACTOR,
    MAX_TEMP_FACTOR,
  );
}

/**
 * Generic push/pull compensation: +1 stop ≈ ×1.4, −1 stop ≈ ×0.8, clamped to
 * +3/−2 stops. Rough estimate only.
 */
function exposureFactor(chartIso: number, targetIso: number): number {
  const stops = Math.log2(targetIso / chartIso);
  return stops >= 0
    ? Math.pow(PUSH_FACTOR_PER_STOP, Math.min(stops, MAX_PUSH_STOPS))
    : Math.pow(PULL_FACTOR_PER_STOP, Math.min(-stops, MAX_PULL_STOPS));
}

interface RecipeAdjustment {
  devSeconds: number;
  iso: number;
  tempC: number;
  estimateNote: string;
}

function buildBwRecipe(
  entry: DevChartEntry,
  settings: UserSettings,
  adjustment?: RecipeAdjustment,
): DevRecipe {
  const phases: DevPhase[] = [
    {
      name: 'Developer',
      duration: adjustment?.devSeconds ?? entry.devSeconds,
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
    iso: adjustment?.iso ?? entry.iso,
    tempC: adjustment?.tempC ?? entry.tempC,
    processMode: 'bw',
    phases,
    notes: [entry.note, adjustment?.estimateNote, VERIFY_NOTE].filter(Boolean).join(' '),
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
 *
 * When the requested `iso` or `tempC` differs from the chart entry (box speed,
 * 20 °C), the developer time is scaled with generic compensation factors and
 * the recipe notes flag it as a rough estimate to verify before use.
 */
export function findDevChartRecipes(
  film: string,
  developer: string,
  dilution: string,
  iso: number,
  processMode: ProcessMode,
  settings: UserSettings,
  tempC: number = DEFAULT_CHART_TEMP_C,
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

  const targetIso = Number.isFinite(iso) && iso > 0 ? iso : undefined;
  const targetTempC = Number.isFinite(tempC) && tempC > 0 ? tempC : DEFAULT_CHART_TEMP_C;

  return selected.map((entry) => {
    const adjustIso = targetIso !== undefined && targetIso !== entry.iso;
    const adjustTemp = targetTempC !== entry.tempC;

    if (!adjustIso && !adjustTemp) {
      return buildBwRecipe(entry, settings);
    }

    const factor =
      (adjustTemp ? temperatureFactor(entry.tempC, targetTempC) : 1) *
      (adjustIso ? exposureFactor(entry.iso, targetIso) : 1);

    const parts: string[] = [];
    if (adjustIso) {
      parts.push(`ISO ${entry.iso} → ${targetIso}`);
    }
    if (adjustTemp) {
      parts.push(`${entry.tempC}°C → ${targetTempC}°C`);
    }

    return buildBwRecipe(entry, settings, {
      devSeconds: Math.round(entry.devSeconds * factor),
      iso: targetIso ?? entry.iso,
      tempC: targetTempC,
      estimateNote: `Rough estimate (${parts.join(', ')}) — developer time scaled with generic compensation factors. Treat with caution and verify before committing chemistry.`,
    });
  });
}
