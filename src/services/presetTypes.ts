import type { DevRecipe } from './recipe';

export interface Preset extends DevRecipe {
  id: string;
  createdAt: number;
}
