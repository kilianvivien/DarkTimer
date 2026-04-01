import type { ProcessMode } from './recipe';

export interface SearchableOption {
  value: string;
  label: string;
  keywords?: string[];
  processModes?: ProcessMode[];
}

export const ISO_OPTIONS = [1, 2, 3, 6, 12, 25, 50, 64, 100, 125, 200, 250, 320, 400, 800, 1600, 3200];

export const FILM_STOCK_OPTIONS: SearchableOption[] = [
  { value: 'Tri-X 400', label: 'Tri-X 400', keywords: ['trix', 'kodak'], processModes: ['bw'] },
  { value: 'HP5 Plus', label: 'HP5 Plus', keywords: ['hp5', 'ilford'], processModes: ['bw'] },
  { value: 'FP4 Plus', label: 'FP4 Plus', keywords: ['fp4', 'ilford'], processModes: ['bw'] },
  { value: 'Kentmere 400', label: 'Kentmere 400', keywords: ['kentmere'], processModes: ['bw'] },
  { value: 'Kentmere 100', label: 'Kentmere 100', keywords: ['kentmere'], processModes: ['bw'] },
  { value: 'Delta 100', label: 'Delta 100', keywords: ['ilford'], processModes: ['bw'] },
  { value: 'Delta 400', label: 'Delta 400', keywords: ['ilford'], processModes: ['bw'] },
  { value: 'Delta 3200', label: 'Delta 3200', keywords: ['ilford'], processModes: ['bw'] },
  { value: 'TMY-2 400', label: 'TMY-2 400', keywords: ['kodak', 'tmax'], processModes: ['bw'] },
  { value: 'T-Max 100', label: 'T-Max 100', keywords: ['tmax', 'kodak'], processModes: ['bw'] },
  { value: 'T-Max 400', label: 'T-Max 400', keywords: ['tmax', 'kodak'], processModes: ['bw'] },
  { value: 'Fomapan 100', label: 'Fomapan 100', keywords: ['foma'], processModes: ['bw'] },
  { value: 'Fomapan 400', label: 'Fomapan 400', keywords: ['foma'], processModes: ['bw'] },
  { value: 'Rollei Retro 400S', label: 'Rollei Retro 400S', keywords: ['rollei'], processModes: ['bw'] },
  { value: 'Acros II', label: 'Acros II', keywords: ['fujifilm', 'fuji'], processModes: ['bw'] },
  { value: 'Portra 160', label: 'Portra 160', keywords: ['kodak'], processModes: ['color'] },
  { value: 'Portra 400', label: 'Portra 400', keywords: ['kodak'], processModes: ['color'] },
  { value: 'Portra 800', label: 'Portra 800', keywords: ['kodak'], processModes: ['color'] },
  { value: 'Ektar 100', label: 'Ektar 100', keywords: ['kodak'], processModes: ['color'] },
  { value: 'Gold 200', label: 'Gold 200', keywords: ['kodak'], processModes: ['color'] },
  { value: 'UltraMax 400', label: 'UltraMax 400', keywords: ['kodak', 'ultramax'], processModes: ['color'] },
  { value: 'ColorPlus 200', label: 'ColorPlus 200', keywords: ['kodak', 'colorplus'], processModes: ['color'] },
  { value: 'Fujicolor 200', label: 'Fujicolor 200', keywords: ['fuji', 'fujifilm'], processModes: ['color'] },
  { value: 'Superia X-TRA 400', label: 'Superia X-TRA 400', keywords: ['fuji', 'fujifilm', 'superia'], processModes: ['color'] },
  { value: 'CineStill 800T', label: 'CineStill 800T', keywords: ['cinestill'], processModes: ['color'] },
  { value: 'CineStill 400D', label: 'CineStill 400D', keywords: ['cinestill'], processModes: ['color'] },
  { value: 'Provia 100F', label: 'Provia 100F', keywords: ['fujifilm', 'slide'], processModes: ['color'] },
  { value: 'Velvia 50', label: 'Velvia 50', keywords: ['fujifilm', 'slide'], processModes: ['color'] },
  { value: 'Velvia 100', label: 'Velvia 100', keywords: ['fujifilm', 'slide'], processModes: ['color'] },
  { value: 'Ektachrome E100', label: 'Ektachrome E100', keywords: ['kodak', 'slide'], processModes: ['color'] },
];

export const DEVELOPER_OPTIONS: SearchableOption[] = [
  { value: 'Rodinal', label: 'Rodinal', keywords: ['adox', 'agfa'], processModes: ['bw'] },
  { value: 'HC-110', label: 'HC-110', keywords: ['kodak'], processModes: ['bw'] },
  { value: 'ID-11', label: 'ID-11', keywords: ['ilford'], processModes: ['bw'] },
  { value: 'D-76', label: 'D-76', keywords: ['kodak'], processModes: ['bw'] },
  { value: 'DD-X', label: 'DD-X', keywords: ['ilford'], processModes: ['bw'] },
  { value: 'XTOL', label: 'XTOL', keywords: ['kodak'], processModes: ['bw'] },
  { value: 'Microphen', label: 'Microphen', keywords: ['ilford'], processModes: ['bw'] },
  { value: 'Ilfotec HC', label: 'Ilfotec HC', keywords: ['ilford'], processModes: ['bw'] },
  { value: 'Ilfosol 3', label: 'Ilfosol 3', keywords: ['ilford'], processModes: ['bw'] },
  { value: 'Sprint Standard', label: 'Sprint Standard', keywords: ['sprint'], processModes: ['bw'] },
  { value: 'Diafine', label: 'Diafine', keywords: ['two-bath'], processModes: ['bw'] },
  { value: 'D-23', label: 'D-23', keywords: ['kodak'], processModes: ['bw'] },
  { value: 'Perceptol', label: 'Perceptol', keywords: ['ilford'], processModes: ['bw'] },
  { value: 'Pyrocat HD', label: 'Pyrocat HD', keywords: ['pyro'], processModes: ['bw'] },
  { value: 'PMK Pyro', label: 'PMK Pyro', keywords: ['pyro'], processModes: ['bw'] },
  { value: '510-Pyro', label: '510-Pyro', keywords: ['pyro'], processModes: ['bw'] },
  { value: 'C-41', label: 'C-41', keywords: ['color negative'], processModes: ['color'] },
  { value: 'C-41 Press Kit', label: 'C-41 Press Kit', keywords: ['cs41', 'cinestill'], processModes: ['color'] },
  { value: 'ECN-2', label: 'ECN-2', keywords: ['motion picture'], processModes: ['color'] },
  { value: 'E-6', label: 'E-6', keywords: ['slide'], processModes: ['color'] },
  { value: 'Bellini C-41', label: 'Bellini C-41', keywords: ['bellini'], processModes: ['color'] },
  { value: 'Tetenal C-41', label: 'Tetenal C-41', keywords: ['tetenal'], processModes: ['color'] },
  { value: 'Cinestill Cs41', label: 'Cinestill Cs41', keywords: ['cinestill'], processModes: ['color'] },
];

export const DILUTION_OPTIONS: SearchableOption[] = [
  { value: 'Stock', label: 'Stock', keywords: ['undiluted', 'full strength'] },
  { value: '1+1', label: '1+1', keywords: ['one plus one'] },
  { value: '1+3', label: '1+3', keywords: ['one plus three'] },
  { value: '1+4', label: '1+4', keywords: ['one plus four'] },
  { value: '1+7', label: '1+7', keywords: ['one plus seven'] },
  { value: '1+9', label: '1+9', keywords: ['one plus nine'] },
  { value: '1+14', label: '1+14', keywords: ['one plus fourteen'] },
  { value: '1+19', label: '1+19', keywords: ['one plus nineteen'] },
  { value: '1+25', label: '1+25', keywords: ['one plus twenty five'] },
  { value: '1+31', label: '1+31', keywords: ['one plus thirty one'] },
  { value: '1+47', label: '1+47', keywords: ['one plus forty seven'] },
  { value: '1+50', label: '1+50', keywords: ['one plus fifty'] },
  { value: '1+63', label: '1+63', keywords: ['one plus sixty three'] },
  { value: '1+100', label: '1+100', keywords: ['stand dilution'] },
];

export function filterCatalogByProcessMode(
  options: SearchableOption[],
  processMode: ProcessMode,
): SearchableOption[] {
  return options.filter((option) => !option.processModes || option.processModes.includes(processMode));
}
