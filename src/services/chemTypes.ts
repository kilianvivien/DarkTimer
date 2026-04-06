export type ChemType = 'developer' | 'fixer';
export type ChemProcessMode = 'bw' | 'color' | 'neutral';

export interface StoredChem {
  id: string;
  name: string;
  type: ChemType;
  processMode: ChemProcessMode;
  mixDate: number;
  expirationDate: number | null;
  rollCount: number;
  maxRolls: number | null;
  notes: string;
  createdAt: number;
}
