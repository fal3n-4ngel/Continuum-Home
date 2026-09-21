export interface ThemeDefinition {
  id: string;
  name: string;
  description: string;
  type: 'light' | 'dark' | 'colored';
  mode: 'light' | 'dark';
  swatches: string[];
  chartPalette: string[];
}

export const THEMES: ThemeDefinition[] = [
  {
    id: 'continuum',
    name: 'Continuum',
    description: 'The signature architectural warm paper canvas, terracotta, and golden ochre',
    type: 'light',
    mode: 'light',
    swatches: ['#F3EFEA', '#FAF8F5', '#DDD5CB', '#D99419', '#9E5D48'],
    chartPalette: ['#9E5D48', '#D99419', '#7C98A6', '#556B2F', '#CF7538', '#6A7B82', '#C5BFA0', '#B07A65', '#4A6D7C', '#8C4835'],
  },
  {
    id: 'continuum-dark',
    name: 'Continuum Dark',
    description: 'Architectural CAD blueprint midnight with crisp slate surfaces, ochre, and terracotta',
    type: 'dark',
    mode: 'dark',
    swatches: ['#0F1013', '#181A20', '#2B2E38', '#E5A93C', '#E07A5F'],
    chartPalette: ['#E07A5F', '#E5A93C', '#7C98A6', '#6BA385', '#E58C4A', '#89A4B8', '#D6826B', '#9FB67E', '#4E7D96', '#C7935B'],
  },
  {
    id: 'monochrome-light',
    name: 'Monochrome Light',
    description: 'Pure minimalist gallery white canvas, crisp pitch black typography, and architectural zinc',
    type: 'light',
    mode: 'light',
    swatches: ['#F8F9FA', '#FFFFFF', '#E5E7EB', '#6B7280', '#111111'],
    chartPalette: ['#111111', '#383838', '#5E5E5E', '#7E7E7E', '#9E9E9E', '#2B2B2B', '#4D4D4D', '#6E6E6E', '#8F8F8F', '#1F1F1F'],
  },
  {
    id: 'monochrome-dark',
    name: 'Monochrome Dark',
    description: 'High-contrast OLED pitch black canvas, pure white typography, and sharp carbon borders',
    type: 'dark',
    mode: 'dark',
    swatches: ['#000000', '#111112', '#242428', '#A1A1AA', '#FFFFFF'],
    chartPalette: ['#FFFFFF', '#D4D4D8', '#A1A1AA', '#71717A', '#E4E4E7', '#B4B4B8', '#8E8E93', '#F4F4F5', '#636366', '#AEAEB2'],
  },
  {
    id: 'material-ui-light',
    name: 'Material UI Light',
    description: 'Google Material Design 3 / Material You: tonal lavender surface, Surface Container cards, and primary indigo',
    type: 'light',
    mode: 'light',
    swatches: ['#F7F2FA', '#FFFFFF', '#E6E0E9', '#6750A4', '#00639B'],
    chartPalette: ['#6750A4', '#00639B', '#7D5260', '#386A20', '#B3261E', '#006874', '#7C5800', '#5B5B7E', '#825500', '#4A6267'],
  },
  {
    id: 'material-ui-dark',
    name: 'Material UI Dark',
    description: 'Google Material Design 3 / Material You Dark: deep tonal basalt, Surface Container High, and radiant lavender',
    type: 'dark',
    mode: 'dark',
    swatches: ['#141218', '#2B2930', '#36343B', '#D0BCFF', '#9ECAFF'],
    chartPalette: ['#D0BCFF', '#9ECAFF', '#EFB8C8', '#A1D38A', '#F2B8B5', '#80D5E3', '#F9BD49', '#BEC2EB', '#F2BF46', '#B1CBD0'],
  },
  {
    id: 'wabi-sabi',
    name: 'Wabi-Sabi',
    description: 'Japanese minimalist washi paper canvas, sumi calligraphy ink, warm tatami linen, and vermilion hanko seal',
    type: 'light',
    mode: 'light',
    swatches: ['#F4F1EA', '#FAF8F5', '#D8D2C4', '#BC3C29', '#1C1B18'],
    chartPalette: ['#BC3C29', '#C49746', '#657463', '#8C5345', '#4A5848', '#A87C4F', '#D49B55', '#3B3A36', '#8F5A47', '#5E7052'],
  },
    {
    id: 'crimson-ronin',
    name: 'Crimson Ronin',
    description: 'Anime scarlet kimono vermilion, deep shadow charcoal, bone ivory text, and golden cord accents',
    type: 'dark',
    mode: 'dark',
    swatches: ['#0E1015', '#181C26', '#2D3344', '#E63946', '#FAF5EE'],
    chartPalette: ['#E63946', '#E5A93C', '#48526C', '#FF4D4D', '#C1121F', '#F4A261', '#D90429', '#780001', '#E76F51', '#3A405A'],
  },
  {
    id: 'neo-brutalist',
    name: 'Neo-Brutalist',
    description: 'Raw concrete washi canvas, stark sumi geometry, vermilion hanko seal, and bamboo gold',
    type: 'colored',
    mode: 'light',
    swatches: ['#ECE7DE', '#FFFFFF', '#1C1B18', '#BC3C29', '#C49746'],
    chartPalette: ['#BC3C29', '#C49746', '#1C1B18', '#657463', '#8C5345', '#4A5848', '#D49B55', '#9C3322', '#A87C4F', '#5E7052'],
  },
  {
    id: 'kyoto-night',
    name: 'Kyoto Night',
    description: 'Sumi inkstone black canvas, charred cedar cards, delicate gold leaf, and cherry blossom rose',
    type: 'dark',
    mode: 'dark',
    swatches: ['#101012', '#1C1D22', '#2E2F37', '#DFB257', '#F2EFE9'],
    chartPalette: ['#DFB257', '#D65A5A', '#E06D53', '#D47A8A', '#7D8A99', '#C99738', '#9E5466', '#E59866', '#6C7A89', '#B55A67'],
  },
  {
    id: 'nordic-frost',
    name: 'Nordic Frost',
    description: 'Clean Scandinavian porcelain, glacial mist canvas, deep cobalt ink, and ice steel accents',
    type: 'light',
    mode: 'light',
    swatches: ['#F1F5F9', '#FFFFFF', '#CBD5E1', '#2563EB', '#0F172A'],
    chartPalette: ['#2563EB', '#0284C7', '#D97706', '#E11D48', '#4F46E5', '#0891B2', '#059669', '#3B82F6', '#D946EF', '#64748B'],
  },
  {
    id: 'tokyo-midnight',
    name: 'Tokyo Midnight',
    description: 'Deep obsidian night, crisp slate-indigo surfaces, electric cyan, and neon amber accents',
    type: 'dark',
    mode: 'dark',
    swatches: ['#0B0F19', '#141B2D', '#1E293B', '#38BDF8', '#818CF8'],
    chartPalette: ['#38BDF8', '#818CF8', '#FBBF24', '#FB7185', '#34D399', '#A78BFA', '#F43F5E', '#60A5FA', '#E879F9', '#4ADE80'],
  },
  {
    id: 'warm-sand',
    name: 'Warm Sand',
    description: 'Sun-washed Mediterranean linen, pristine ivory cards, roasted espresso ink, and amber sienna',
    type: 'colored',
    mode: 'light',
    swatches: ['#F6F2EA', '#FFFFFF', '#DDD4C4', '#D99419', '#C95B32'],
    chartPalette: ['#C95B32', '#D99419', '#2E798A', '#A4482D', '#8C6D46', '#5A7D7C', '#BA683C', '#C48B47', '#3B6B75', '#736048'],
  },
  {
    id: 'sage-atelier',
    name: 'Sage Atelier',
    description: 'Fresh botanical eucalyptus wash, crisp gallery white cards, pine ink, and warm terracotta',
    type: 'colored',
    mode: 'light',
    swatches: ['#EEF3F0', '#FFFFFF', '#C9D7CE', '#2D6A4F', '#C85A3B'],
    chartPalette: ['#2D6A4F', '#CF5C36', '#C88627', '#52796F', '#84A98C', '#A24835', '#6B7F42', '#B07D62', '#40916C', '#DDA15E'],
  },
];

export const DEFAULT_THEME_ID = 'continuum';

export function getTheme(id: string): ThemeDefinition {
  // Legacy aliases and seamless migrations
  const migrations: Record<string, string> = {
    'ios-glass-light': 'material-ui-light',
    'ios-glass-dark': 'material-ui-dark',
    'ios-glass': 'material-ui-dark',
    'ios': 'material-ui-light',
    'material-ui': 'material-ui-light',
    'material': 'material-ui-light',
    'material-dark': 'material-ui-dark',
    'cyberpunk-neo': 'crimson-ronin',
    'industrial-monolith': 'monochrome-dark',
    'alpine-emerald': 'sage-atelier',
    'cobalt-blueprint': 'tokyo-midnight',
    'continuum-paper': 'continuum',
    'paper-classic': 'continuum',
    'nordic-linen': 'sage-atelier',
    'botanical-matcha': 'sage-atelier',
    'isabelline-botanical': 'sage-atelier',
    'espresso-crema': 'warm-sand',
    'tuscan-terracotta': 'warm-sand',
    'parchment-academia': 'warm-sand',
    'travertine-stone': 'warm-sand',
    'terracotta-dune': 'warm-sand',
    'olive-umber': 'sage-atelier',
    'pine-nocturne': 'sage-atelier',
    'forest-night': 'sage-atelier',
    'obsidian-noir': 'continuum-dark',
    'obsidian': 'continuum-dark',
    'monolith-dark': 'continuum-dark',
    'monolith-slate': 'continuum-dark',
    'monolith': 'continuum-dark',
    'dark-academia': 'continuum-dark',
    'espresso-dark': 'continuum-dark',
    'github-dark': 'tokyo-midnight',
    'tokyo-night': 'tokyo-midnight',
    'holst': 'tokyo-midnight',
    'black-kite': 'monochrome-dark',
    'dracula': 'monochrome-dark',
    'amoled-pure': 'monochrome-dark',
  };

  const resolvedId = migrations[id] || id;
  const found = THEMES.find((t) => t.id === resolvedId);
  return found || THEMES[0];
}

const CATEGORY_SLOT_MAP: Record<string, number> = {
  Food: 0,
  Dining: 0,
  Groceries: 0,
  Transport: 1,
  Travel: 1,
  Commute: 1,
  Housing: 2,
  Rent: 2,
  Home: 2,
  Shopping: 3,
  Retail: 3,
  Entertainment: 4,
  Leisure: 4,
  Hobbies: 4,
  'Personal Care': 5,
  Health: 5,
  Medical: 5,
  Utilities: 6,
  Bills: 6,
  Subscriptions: 6,
  Gifts: 7,
  Donations: 7,
  Drinks: 8,
  Social: 8,
  Other: 9,
  General: 9,
  Uncategorized: 9,
};

export function getThemeChartPalette(themeId: string): string[] {
  const theme = getTheme(themeId);
  return theme.chartPalette || THEMES[0].chartPalette;
}

export function getThemeCategoryColor(themeId: string, category: string, index: number): string {
  const palette = getThemeChartPalette(themeId);
  if (category && typeof CATEGORY_SLOT_MAP[category] === 'number') {
    const slot = CATEGORY_SLOT_MAP[category];
    return palette[slot % palette.length];
  }
  return palette[index % palette.length];
}
