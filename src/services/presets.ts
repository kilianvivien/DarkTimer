import type { DevRecipe } from './recipe';
import type { Preset } from './presetTypes';
import { deleteStoredPreset, saveStoredPreset, updateStoredPreset } from './storage';

export type { Preset } from './presetTypes';

export function savePreset(recipe: DevRecipe): Promise<Preset> {
  return saveStoredPreset(recipe);
}

export function updatePreset(id: string, recipe: DevRecipe): Promise<Preset> {
  return updateStoredPreset(id, recipe);
}

export function deletePreset(id: string): Promise<void> {
  return deleteStoredPreset(id);
}
