import { DevRecipe, normalizeRecipe } from './recipe';

export interface Preset extends DevRecipe {
  id: string;
  createdAt: number;
}

const STORAGE_KEY = 'darktimer_presets';

export function getPresets(): Preset[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];

  try {
    const parsed = JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((preset) => ({
      ...normalizeRecipe(preset),
      id: typeof preset?.id === 'string' ? preset.id : crypto.randomUUID(),
      createdAt:
        typeof preset?.createdAt === 'number' && Number.isFinite(preset.createdAt)
          ? preset.createdAt
          : Date.now(),
    }));
  } catch (e) {
    console.error('Failed to parse presets', e);
    return [];
  }
}

export function savePreset(recipe: DevRecipe): Preset {
  const presets = getPresets();
  const newPreset: Preset = {
    ...normalizeRecipe(recipe),
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify([newPreset, ...presets]));
  return newPreset;
}

export function deletePreset(id: string): void {
  const presets = getPresets();
  const filtered = presets.filter(p => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}
