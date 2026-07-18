import { describe, expect, it } from 'vitest';
import { findDevChartRecipes } from './devChart';
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
    const recipes = findDevChartRecipes('Tri-X 400', 'Rodinal', '1+100', 400, 'bw', DEFAULT_SETTINGS);

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
});
