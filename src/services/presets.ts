import type { DevRecipe } from './recipe';
import type { Preset } from './presetTypes';
import { deleteStoredPreset, getStoredPresets, saveStoredPreset } from './storage';

export type { Preset } from './presetTypes';

export function getPresets(): Promise<Preset[]> {
  return getStoredPresets();
}

export function savePreset(recipe: DevRecipe): Promise<Preset> {
  return saveStoredPreset(recipe);
}

export function deletePreset(id: string): Promise<void> {
  return deleteStoredPreset(id);
}
