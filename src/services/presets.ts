import { DevRecipe } from './gemini';

export interface Preset extends DevRecipe {
  id: string;
  createdAt: number;
}

const STORAGE_KEY = 'darktimer_presets';

export function getPresets(): Preset[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch (e) {
    console.error('Failed to parse presets', e);
    return [];
  }
}

export function savePreset(recipe: DevRecipe): Preset {
  const presets = getPresets();
  const newPreset: Preset = {
    ...recipe,
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
