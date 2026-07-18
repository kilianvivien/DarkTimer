import { describe, expect, it } from 'vitest';
import { BW_DEV_CHART, findDevChartRecipes } from './devChart';
import { FILM_STOCK_OPTIONS } from './searchCatalog';
import { DEFAULT_SETTINGS } from './userSettings';

describe('devChart', () => {
  it('finds a B&W recipe by film and developer with the requested dilution', () => {
    const recipes = findDevChartRecipes('HP5 Plus', 'ID-11', '1+1', 400, 'bw', DEFAULT_SETTINGS);

    expect(recipes).toHaveLength(1);
    expect(recipes[0].dilution).toBe('1+1');
    expect(recipes[0].phases[0]).toMatchObject({ name: 'Developer', duration: 780 });
    expect(recipes[0].phases.map((phase) => phase.name)).toEqual([
      'Developer',
      'Stop Bath',
      'Fixer',
      'Wash',
    ]);
    expect(recipes[0].notes).toMatch(/verify/i);
  });

  it('matches developer aliases like D-76 for ID-11 entries', () => {
    const recipes = findDevChartRecipes('HP5', 'D-76', '', 400, 'bw', DEFAULT_SETTINGS);

    expect(recipes.length).toBeGreaterThan(0);
    expect(recipes.every((recipe) => recipe.developer === 'ID-11')).toBe(true);
  });

  it('returns every dilution when the requested one is not charted', () => {
    const recipes = findDevChartRecipes('Pan F Plus', 'Rodinal', '1+100', 50, 'bw', DEFAULT_SETTINGS);

    expect(recipes.map((recipe) => recipe.dilution).sort()).toEqual(['1+25', '1+50']);
  });

  it('uses the configured stop, fixer, and wash defaults', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      defaultStopBath: 45,
      defaultFixer: 240,
      defaultWash: 300,
    };
    const [recipe] = findDevChartRecipes('FP4 Plus', 'DD-X', '1+4', 125, 'bw', settings);

    expect(recipe.phases[1].duration).toBe(45);
    expect(recipe.phases[2].duration).toBe(240);
    expect(recipe.phases[3].duration).toBe(300);
  });

  it('returns a standard C-41 process for color mode', () => {
    const recipes = findDevChartRecipes('Portra 400', 'C-41', '', 400, 'color', DEFAULT_SETTINGS);

    expect(recipes).toHaveLength(1);
    expect(recipes[0].tempC).toBe(38);
    expect(recipes[0].phases[0]).toMatchObject({ name: 'Developer', duration: 195 });
  });

  it('returns nothing for unknown combinations', () => {
    expect(findDevChartRecipes('Mystery Film', 'Mystery Dev', '', 100, 'bw', DEFAULT_SETTINGS)).toEqual([]);
    expect(findDevChartRecipes('Provia 100F', 'E-6', '', 100, 'color', DEFAULT_SETTINGS)).toEqual([]);
  });

  it('covers newly added popular stocks at box speed without an estimate note', () => {
    const [fomapan] = findDevChartRecipes('Fomapan 400', 'D-76', 'Stock', 400, 'bw', DEFAULT_SETTINGS);
    expect(fomapan.phases[0].duration).toBe(450);
    expect(fomapan.notes).not.toMatch(/rough estimate/i);

    const [panF] = findDevChartRecipes('Pan F Plus', 'Ilfosol 3', '', 50, 'bw', DEFAULT_SETTINGS);
    expect(panF.dilution).toBe('1+14');
    expect(panF.phases[0].duration).toBe(270);

    const [p3200] = findDevChartRecipes('T-Max P3200', 'D-76', 'Stock', 3200, 'bw', DEFAULT_SETTINGS);
    expect(p3200.phases[0].duration).toBe(840);
  });

  it('keeps offline rows limited to selectable B&W films', () => {
    const bwFilms = FILM_STOCK_OPTIONS.filter((film) => film.processModes?.includes('bw'));

    expect(bwFilms).toHaveLength(32);
    for (const entry of BW_DEV_CHART) {
      expect(
        bwFilms.some((film) => film.value === entry.film),
        `offline entry is not selectable: ${entry.film}`,
      ).toBe(true);
    }

    expect(findDevChartRecipes('Adox HR-50', 'XTOL', '1+1', 50, 'bw', DEFAULT_SETTINGS)).toEqual([]);
  });

  it('uses Harman datasheet times and attribution for Kentmere 200', () => {
    const recipes = findDevChartRecipes(
      'Kentmere 200',
      'LC29',
      '1+29',
      200,
      'bw',
      DEFAULT_SETTINGS,
    );

    expect(recipes).toHaveLength(1);
    expect(recipes[0].phases[0].duration).toBe(630);
    expect(recipes[0].source).toBe('HARMAN Kentmere Pan 200 datasheet (March 2025)');
    expect(recipes[0].notes).not.toMatch(/rough estimate/i);
  });

  it('covers the core Ilford developers for additional prelisted films', () => {
    const films = ['HP5 Plus', 'FP4 Plus', 'Delta 100', 'Kentmere 100', 'Kentmere 400'];
    const developers = ['DD-X', 'Ilfosol 3', 'Ilfotec HC', 'LC29', 'ID-11', 'Microphen'];

    for (const film of films) {
      for (const developer of developers) {
        expect(
          BW_DEV_CHART.some((entry) => entry.film === film && entry.developer === developer),
          `missing ${film} in ${developer}`,
        ).toBe(true);
      }
    }
  });

  it('uses the current manufacturer values for corrected FP4 and Delta 100 entries', () => {
    const [fp4] = findDevChartRecipes('FP4 Plus', 'DD-X', '1+4', 125, 'bw', DEFAULT_SETTINGS);
    const [delta100] = findDevChartRecipes(
      'Delta 100',
      'ID-11',
      'Stock',
      100,
      'bw',
      DEFAULT_SETTINGS,
    );

    expect(fp4.phases[0].duration).toBe(600);
    expect(fp4.source).toMatch(/FP4 Plus technical datasheet/i);
    expect(delta100.phases[0].duration).toBe(510);
    expect(delta100.source).toMatch(/Delta 100 technical datasheet/i);
  });

  it('keeps explicit manufacturer attribution on most offline rows', () => {
    const attributedEntries = BW_DEV_CHART.filter((entry) => entry.source);
    const unattributedEntries = BW_DEV_CHART.filter((entry) => !entry.source);

    expect(attributedEntries).toHaveLength(166);
    expect(attributedEntries.every((entry) => /ILFORD|HARMAN|KODAK|FOMA|BERGGER|Rollei|CineStill/.test(entry.source ?? ''))).toBe(true);
    expect(unattributedEntries).toHaveLength(10);
    expect(unattributedEntries.every((entry) => entry.developer === 'XTOL' && entry.dilution === 'Stock')).toBe(true);
  });

  it('uses the current Kodak small-tank bulletin values', () => {
    const [triX] = findDevChartRecipes('Tri-X 400', 'HC-110', '1+31', 400, 'bw', DEFAULT_SETTINGS);
    const [tMax100] = findDevChartRecipes('T-Max 100', 'XTOL', 'Stock', 100, 'bw', DEFAULT_SETTINGS);
    const [tMax400] = findDevChartRecipes('T-Max 400', 'D-76', 'Stock', 400, 'bw', DEFAULT_SETTINGS);

    expect(triX.phases[0].duration).toBe(360);
    expect(tMax100.phases[0].duration).toBe(450);
    expect(tMax400.phases[0].duration).toBe(450);
    expect([triX.source, tMax100.source, tMax400.source]).toEqual([
      'KODAK Processing Black-and-White Films bulletin (March 2023)',
      'KODAK Processing Black-and-White Films bulletin (March 2023)',
      'KODAK Processing Black-and-White Films bulletin (March 2023)',
    ]);
  });

  it('returns the offline XTOL recipe for a previously unsupported stock', () => {
    const [recipe] = findDevChartRecipes(
      'JCH StreetPan 400',
      'XTOL',
      'Stock',
      400,
      'bw',
      DEFAULT_SETTINGS,
    );

    expect(recipe.phases[0].duration).toBe(765);
    expect(recipe.notes).not.toMatch(/rough estimate/i);
  });

  it('matches film aliases like CineStill BwXX for Double-X entries', () => {
    const recipes = findDevChartRecipes('CineStill BwXX', 'HC-110', '', 250, 'bw', DEFAULT_SETTINGS);

    expect(recipes).toHaveLength(1);
    expect(recipes[0].film).toBe('CineStill BwXX');
    expect(recipes[0].phases[0].duration).toBe(360);
  });

  it('shortens the developer time for warmer chemistry and flags it as an estimate', () => {
    const [recipe] = findDevChartRecipes('HP5 Plus', 'ID-11', 'Stock', 400, 'bw', DEFAULT_SETTINGS, 24);

    expect(recipe.tempC).toBe(24);
    expect(recipe.phases[0].duration).toBe(312);
    expect(recipe.phases[0].duration).toBeLessThan(450);
    expect(recipe.notes).toMatch(/rough estimate/i);
    expect(recipe.notes).toMatch(/20°C → 24°C/);
  });

  it('lengthens the developer time for colder chemistry', () => {
    const [recipe] = findDevChartRecipes('HP5 Plus', 'ID-11', 'Stock', 400, 'bw', DEFAULT_SETTINGS, 18);

    expect(recipe.phases[0].duration).toBe(541);
    expect(recipe.phases[0].duration).toBeGreaterThan(450);
    expect(recipe.notes).toMatch(/rough estimate/i);
  });

  it('scales the developer time for pushed ratings', () => {
    const [pushed] = findDevChartRecipes('HP5 Plus', 'ID-11', 'Stock', 800, 'bw', DEFAULT_SETTINGS);

    expect(pushed.iso).toBe(800);
    expect(pushed.phases[0].duration).toBe(630);
    expect(pushed.notes).toMatch(/rough estimate/i);
    expect(pushed.notes).toMatch(/ISO 400 → 800/);
  });

  it('scales the developer time for pulled ratings', () => {
    const [pulled] = findDevChartRecipes('HP5 Plus', 'ID-11', 'Stock', 200, 'bw', DEFAULT_SETTINGS);

    expect(pulled.phases[0].duration).toBe(360);
    expect(pulled.notes).toMatch(/rough estimate/i);
  });

  it('clamps extreme push and pull adjustments', () => {
    const [bigPush] = findDevChartRecipes('HP5 Plus', 'ID-11', 'Stock', 6400, 'bw', DEFAULT_SETTINGS);
    expect(bigPush.phases[0].duration).toBe(1235);

    const [bigPull] = findDevChartRecipes('HP5 Plus', 'ID-11', 'Stock', 25, 'bw', DEFAULT_SETTINGS);
    expect(bigPull.phases[0].duration).toBe(288);
  });

  it('combines temperature and exposure adjustments', () => {
    const [recipe] = findDevChartRecipes('HP5 Plus', 'ID-11', 'Stock', 800, 'bw', DEFAULT_SETTINGS, 24);

    expect(recipe.phases[0].duration).toBe(437);
    expect(recipe.notes).toMatch(/ISO 400 → 800/);
    expect(recipe.notes).toMatch(/20°C → 24°C/);
  });
});
