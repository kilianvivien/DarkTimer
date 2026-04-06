import type { ProcessMode } from './recipe';

export interface SearchableOption {
  value: string;
  label: string;
  keywords?: string[];
  processModes?: ProcessMode[];
  iso?: number;
}

export const ISO_OPTIONS = [1, 2, 3, 6, 12, 25, 50, 64, 100, 125, 200, 250, 320, 400, 800, 1600, 3200];

export const FILM_STOCK_OPTIONS: SearchableOption[] = [
  // Black & White — Ilford
  { value: 'HP5 Plus', label: 'HP5 Plus', keywords: ['hp5', 'ilford'], processModes: ['bw'], iso: 400 },
  { value: 'FP4 Plus', label: 'FP4 Plus', keywords: ['fp4', 'ilford'], processModes: ['bw'], iso: 125 },
  { value: 'Delta 100', label: 'Delta 100', keywords: ['ilford'], processModes: ['bw'], iso: 100 },
  { value: 'Delta 400', label: 'Delta 400', keywords: ['ilford'], processModes: ['bw'], iso: 400 },
  { value: 'Delta 3200', label: 'Delta 3200', keywords: ['ilford'], processModes: ['bw'], iso: 3200 },
  { value: 'Kentmere 100', label: 'Kentmere 100', keywords: ['kentmere', 'ilford'], processModes: ['bw'], iso: 100 },
  { value: 'Kentmere 400', label: 'Kentmere 400', keywords: ['kentmere', 'ilford'], processModes: ['bw'], iso: 400 },
  { value: 'SFX 200', label: 'SFX 200', keywords: ['sfx', 'infrared', 'ilford'], processModes: ['bw'], iso: 200 },
  { value: 'Ortho Plus', label: 'Ortho Plus', keywords: ['ortho', 'ilford'], processModes: ['bw'] },
  // Black & White — Kodak
  { value: 'Tri-X 400', label: 'Tri-X 400', keywords: ['trix', 'kodak'], processModes: ['bw'], iso: 400 },
  { value: 'T-Max 100', label: 'T-Max 100', keywords: ['tmax', 'kodak'], processModes: ['bw'], iso: 100 },
  { value: 'T-Max 400', label: 'T-Max 400', keywords: ['tmax', 'kodak', 'tmy2'], processModes: ['bw'], iso: 400 },
  { value: 'T-Max P3200', label: 'T-Max P3200', keywords: ['p3200', 'tmz', 'kodak', 'tmax'], processModes: ['bw'], iso: 3200 },
  { value: 'Double-X', label: 'Double-X', keywords: ['xx', 'kodak', 'cinestill', 'bwxx'], processModes: ['bw'], iso: 250 },
  // Black & White — Fujifilm
  { value: 'Acros II', label: 'Acros II', keywords: ['acros', 'fujifilm', 'fuji'], processModes: ['bw'], iso: 100 },
  // Black & White — Foma
  { value: 'Fomapan 100', label: 'Fomapan 100', keywords: ['foma'], processModes: ['bw'], iso: 100 },
  { value: 'Fomapan 200', label: 'Fomapan 200', keywords: ['foma'], processModes: ['bw'], iso: 200 },
  { value: 'Fomapan 400', label: 'Fomapan 400', keywords: ['foma'], processModes: ['bw'], iso: 400 },
  // Black & White — Rollei / Agfa / Adox
  { value: 'Rollei RPX 100', label: 'Rollei RPX 100', keywords: ['rollei', 'rpx'], processModes: ['bw'], iso: 100 },
  { value: 'Rollei RPX 400', label: 'Rollei RPX 400', keywords: ['rollei', 'rpx'], processModes: ['bw'], iso: 400 },
  { value: 'Rollei Retro 400S', label: 'Rollei Retro 400S', keywords: ['rollei', 'retro'], processModes: ['bw'], iso: 400 },
  { value: 'Adox HR-50', label: 'Adox HR-50', keywords: ['adox', 'hr50'], processModes: ['bw'], iso: 50 },
  { value: 'Adox CMS 20 II', label: 'Adox CMS 20 II', keywords: ['adox', 'cms20'], processModes: ['bw'], iso: 25 },
  // Black & White — Bergger / JCH / Kosmo / Lomography
  { value: 'Bergger Pancro 400', label: 'Bergger Pancro 400', keywords: ['bergger', 'pancro'], processModes: ['bw'], iso: 400 },
  { value: 'JCH StreetPan 400', label: 'JCH StreetPan 400', keywords: ['jch', 'streetpan', 'japan camera hunter'], processModes: ['bw'], iso: 400 },
  { value: 'Kosmo Foto Mono 100', label: 'Kosmo Foto Mono 100', keywords: ['kosmo'], processModes: ['bw'], iso: 100 },
  { value: 'Lomography Lady Grey 400', label: 'Lomography Lady Grey 400', keywords: ['lomo', 'lomography', 'ladygrey'], processModes: ['bw'], iso: 400 },
  // Color Negative — Kodak
  { value: 'Portra 160', label: 'Portra 160', keywords: ['kodak'], processModes: ['color'] },
  { value: 'Portra 400', label: 'Portra 400', keywords: ['kodak'], processModes: ['color'], iso: 400 },
  { value: 'Portra 800', label: 'Portra 800', keywords: ['kodak'], processModes: ['color'], iso: 800 },
  { value: 'Ektar 100', label: 'Ektar 100', keywords: ['kodak'], processModes: ['color'], iso: 100 },
  { value: 'Gold 200', label: 'Gold 200', keywords: ['kodak'], processModes: ['color'], iso: 200 },
  { value: 'Gold 400', label: 'Gold 400', keywords: ['kodak'], processModes: ['color'], iso: 400 },
  { value: 'UltraMax 400', label: 'UltraMax 400', keywords: ['kodak', 'ultramax'], processModes: ['color'], iso: 400 },
  { value: 'ColorPlus 200', label: 'ColorPlus 200', keywords: ['kodak', 'colorplus'], processModes: ['color'], iso: 200 },
  { value: 'Pro Image 100', label: 'Pro Image 100', keywords: ['kodak', 'proimage'], processModes: ['color'], iso: 100 },
  { value: 'Vision3 250D', label: 'Vision3 250D', keywords: ['kodak', 'vision3', 'motion picture', 'ecn2'], processModes: ['color'], iso: 250 },
  { value: 'Vision3 500T', label: 'Vision3 500T', keywords: ['kodak', 'vision3', 'motion picture', 'ecn2'], processModes: ['color'] },
  // Color Negative — Fujifilm
  { value: 'Fujifilm 400', label: 'Fujifilm 400', keywords: ['fuji', 'fujifilm'], processModes: ['color'], iso: 400 },
  { value: 'Fujicolor 200', label: 'Fujicolor 200', keywords: ['fuji', 'fujifilm'], processModes: ['color'], iso: 200 },
  { value: 'Superia X-TRA 400', label: 'Superia X-TRA 400', keywords: ['fuji', 'fujifilm', 'superia'], processModes: ['color'], iso: 400 },
  // Color Negative — CineStill
  { value: 'CineStill 50D', label: 'CineStill 50D', keywords: ['cinestill'], processModes: ['color'], iso: 50 },
  { value: 'CineStill 400D', label: 'CineStill 400D', keywords: ['cinestill'], processModes: ['color'], iso: 400 },
  { value: 'CineStill 800T', label: 'CineStill 800T', keywords: ['cinestill'], processModes: ['color'], iso: 800 },
  // Color Negative — Harman / Lomography
  { value: 'Harman Phoenix 200', label: 'Harman Phoenix 200', keywords: ['harman', 'phoenix', 'ilford'], processModes: ['color'], iso: 200 },
  { value: 'Lomography Color Negative 100', label: 'Lomography Color Negative 100', keywords: ['lomo', 'lomography'], processModes: ['color'], iso: 100 },
  { value: 'Lomography Color Negative 400', label: 'Lomography Color Negative 400', keywords: ['lomo', 'lomography'], processModes: ['color'], iso: 400 },
  { value: 'Lomography Color Negative 800', label: 'Lomography Color Negative 800', keywords: ['lomo', 'lomography'], processModes: ['color'], iso: 800 },
  // Slide / Reversal (E-6)
  { value: 'Provia 100F', label: 'Provia 100F', keywords: ['fujifilm', 'slide', 'e6', 'reversal'], processModes: ['color'], iso: 100 },
  { value: 'Velvia 50', label: 'Velvia 50', keywords: ['fujifilm', 'slide', 'e6', 'reversal'], processModes: ['color'], iso: 50 },
  { value: 'Velvia 100', label: 'Velvia 100', keywords: ['fujifilm', 'slide', 'e6', 'reversal'], processModes: ['color'], iso: 100 },
  { value: 'Velvia 100F', label: 'Velvia 100F', keywords: ['fujifilm', 'slide', 'e6', 'reversal'], processModes: ['color'], iso: 100 },
  { value: 'Ektachrome E100', label: 'Ektachrome E100', keywords: ['kodak', 'slide', 'e6', 'reversal'], processModes: ['color'], iso: 100 },
];

export const DEVELOPER_OPTIONS: SearchableOption[] = [
  // B&W — Ilford
  { value: 'ID-11', label: 'ID-11', keywords: ['ilford', 'd76'], processModes: ['bw'] },
  { value: 'DD-X', label: 'DD-X', keywords: ['ilford', 'ddx'], processModes: ['bw'] },
  { value: 'Microphen', label: 'Microphen', keywords: ['ilford', 'speed increasing'], processModes: ['bw'] },
  { value: 'Ilfotec HC', label: 'Ilfotec HC', keywords: ['ilford', 'hc110'], processModes: ['bw'] },
  { value: 'Ilfosol 3', label: 'Ilfosol 3', keywords: ['ilford', 'one shot'], processModes: ['bw'] },
  { value: 'Perceptol', label: 'Perceptol', keywords: ['ilford', 'fine grain'], processModes: ['bw'] },
  { value: 'LC29', label: 'LC29', keywords: ['ilford', 'lc29'], processModes: ['bw'] },
  // B&W — Kodak
  { value: 'D-76', label: 'D-76', keywords: ['kodak'], processModes: ['bw'] },
  { value: 'HC-110', label: 'HC-110', keywords: ['kodak'], processModes: ['bw'] },
  { value: 'XTOL', label: 'XTOL', keywords: ['kodak'], processModes: ['bw'] },
  { value: 'D-19', label: 'D-19', keywords: ['kodak', 'high contrast'], processModes: ['bw'] },
  { value: 'D-23', label: 'D-23', keywords: ['kodak', 'two bath'], processModes: ['bw'] },
  { value: 'Microdol-X', label: 'Microdol-X', keywords: ['kodak', 'fine grain'], processModes: ['bw'] },
  // B&W — Adox / Agfa / Rollei
  { value: 'Rodinal', label: 'Rodinal', keywords: ['adox', 'agfa', 'r09', 'adonal'], processModes: ['bw'] },
  { value: 'Atomal 49', label: 'Atomal 49', keywords: ['adox', 'atomal'], processModes: ['bw'] },
  // B&W — Pyro / Specialty
  { value: 'Pyrocat HD', label: 'Pyrocat HD', keywords: ['pyro', 'pyrocat'], processModes: ['bw'] },
  { value: 'PMK Pyro', label: 'PMK Pyro', keywords: ['pyro', 'pmk'], processModes: ['bw'] },
  { value: '510-Pyro', label: '510-Pyro', keywords: ['pyro'], processModes: ['bw'] },
  { value: 'FX-39 II', label: 'FX-39 II', keywords: ['paterson', 'fx39'], processModes: ['bw'] },
  { value: 'Diafine', label: 'Diafine', keywords: ['two-bath', 'two bath'], processModes: ['bw'] },
  { value: 'Sprint Standard', label: 'Sprint Standard', keywords: ['sprint'], processModes: ['bw'] },
  { value: 'Acufine', label: 'Acufine', keywords: ['acufine', 'speed push'], processModes: ['bw'] },
  // B&W — Monobath
  { value: 'Cinestill Df96', label: 'Cinestill Df96', keywords: ['cinestill', 'df96', 'monobath'], processModes: ['bw'] },
  // B&W — DIY
  { value: 'Caffenol-C', label: 'Caffenol-C', keywords: ['caffenol', 'coffee', 'diy'], processModes: ['bw'] },
  // Color Negative (C-41)
  { value: 'C-41', label: 'C-41', keywords: ['color negative', 'generic'], processModes: ['color'] },
  { value: 'Cinestill Cs41', label: 'Cinestill Cs41', keywords: ['cinestill', 'cs41'], processModes: ['color'] },
  { value: 'Unicolor C-41', label: 'Unicolor C-41', keywords: ['unicolor'], processModes: ['color'] },
  { value: 'Arista C-41', label: 'Arista C-41', keywords: ['arista'], processModes: ['color'] },
  { value: 'Rollei Digibase C-41', label: 'Rollei Digibase C-41', keywords: ['rollei', 'digibase'], processModes: ['color'] },
  { value: 'Bellini C-41', label: 'Bellini C-41', keywords: ['bellini'], processModes: ['color'] },
  { value: 'Tetenal C-41', label: 'Tetenal C-41', keywords: ['tetenal'], processModes: ['color'] },
  { value: 'Fuji Hunt C-41', label: 'Fuji Hunt C-41', keywords: ['fuji', 'fujihunt', 'hunt'], processModes: ['color'] },
  // Motion Picture (ECN-2)
  { value: 'ECN-2', label: 'ECN-2', keywords: ['motion picture', 'vision3', 'ecn2'], processModes: ['color'] },
  // Slide / Reversal (E-6)
  { value: 'E-6', label: 'E-6', keywords: ['slide', 'reversal', 'e6'], processModes: ['color'] },
  { value: 'Rollei Digibase E-6', label: 'Rollei Digibase E-6', keywords: ['rollei', 'digibase', 'slide', 'e6'], processModes: ['color'] },
  { value: 'Tetenal E-6', label: 'Tetenal E-6', keywords: ['tetenal', 'slide', 'e6'], processModes: ['color'] },
];

export const FIXER_OPTIONS: SearchableOption[] = [
  // B&W — Ilford
  { value: 'Ilford Rapid Fixer', label: 'Ilford Rapid Fixer', keywords: ['ilford', 'rapid'], processModes: ['bw'] },
  { value: 'Hypam', label: 'Hypam', keywords: ['ilford', 'hypam'], processModes: ['bw'] },
  { value: 'Ilford Fixer', label: 'Ilford Fixer', keywords: ['ilford'], processModes: ['bw'] },
  // B&W — Kodak
  { value: 'Kodak Rapid Fixer', label: 'Kodak Rapid Fixer', keywords: ['kodak', 'rapid'], processModes: ['bw'] },
  { value: 'Kodak Fixer', label: 'Kodak Fixer', keywords: ['kodak'], processModes: ['bw'] },
  { value: 'Kodak Unifix', label: 'Kodak Unifix', keywords: ['kodak', 'unifix', 'powder'], processModes: ['bw'] },
  // B&W — Adox / Adofix
  { value: 'Adofix Plus', label: 'Adofix Plus', keywords: ['adox', 'adofix'], processModes: ['bw'] },
  { value: 'Adofix', label: 'Adofix', keywords: ['adox', 'adofix'], processModes: ['bw'] },
  // B&W — Tetenal / Agfa / Rollei
  { value: 'Tetenal Superfix Plus', label: 'Tetenal Superfix Plus', keywords: ['tetenal', 'superfix'], processModes: ['bw'] },
  { value: 'Agfa Agefix', label: 'Agfa Agefix', keywords: ['agfa', 'agefix'], processModes: ['bw'] },
  { value: 'Rollei RFX Plus', label: 'Rollei RFX Plus', keywords: ['rollei', 'rfx'], processModes: ['bw'] },
  // B&W — Paterson / Sprint / Formulary
  { value: 'Paterson Acufix', label: 'Paterson Acufix', keywords: ['paterson', 'acufix'], processModes: ['bw'] },
  { value: 'Sprint Record Fixer', label: 'Sprint Record Fixer', keywords: ['sprint', 'record'], processModes: ['bw'] },
  { value: 'TF-4 Alkaline Fixer', label: 'TF-4 Alkaline Fixer', keywords: ['formulary', 'tf4', 'alkaline'], processModes: ['bw'] },
  { value: 'TF-5', label: 'TF-5', keywords: ['formulary', 'tf5', 'alkaline'], processModes: ['bw'] },
  // B&W — Foma / Others
  { value: 'Fomafix', label: 'Fomafix', keywords: ['foma', 'fomafix'], processModes: ['bw'] },
  { value: 'Cinestill Df96 Monobath', label: 'Cinestill Df96 Monobath', keywords: ['cinestill', 'df96', 'monobath'], processModes: ['bw'] },
  // Color — C-41 Blix / Fixer (for kits that have separate fixer step)
  { value: 'Cinestill Cs41 Blix', label: 'Cinestill Cs41 Blix', keywords: ['cinestill', 'cs41', 'blix', 'color'], processModes: ['color'] },
  { value: 'Tetenal C-41 Blix', label: 'Tetenal C-41 Blix', keywords: ['tetenal', 'blix', 'color'], processModes: ['color'] },
  { value: 'Unicolor C-41 Blix', label: 'Unicolor C-41 Blix', keywords: ['unicolor', 'blix', 'color'], processModes: ['color'] },
  { value: 'Rollei Digibase C-41 Blix', label: 'Rollei Digibase C-41 Blix', keywords: ['rollei', 'digibase', 'blix', 'color'], processModes: ['color'] },
  // Color — E-6 Fixer
  { value: 'Tetenal E-6 Fixer', label: 'Tetenal E-6 Fixer', keywords: ['tetenal', 'e6', 'slide', 'fixer'], processModes: ['color'] },
  { value: 'Rollei Digibase E-6 Fixer', label: 'Rollei Digibase E-6 Fixer', keywords: ['rollei', 'digibase', 'e6', 'slide', 'fixer'], processModes: ['color'] },
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
