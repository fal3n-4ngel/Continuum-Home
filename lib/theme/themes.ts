export interface ThemeDefinition {
  id: string;
  name: string;
  description: string;
  type: 'light' | 'dark' | 'colored';
  mode: 'light' | 'dark';
  swatches: string[];
}

export const THEMES: ThemeDefinition[] = [
  {
    id: 'continuum',
    name: 'Continuum',
    description: 'The signature architectural warm paper canvas, terracotta, and golden ochre',
    type: 'light',
    mode: 'light',
    swatches: ['#F3EFEA', '#FAF8F5', '#DDD5CB', '#D99419', '#9E5D48'],
  },
  {
    id: 'continuum-dark',
    name: 'Continuum Dark',
    description: 'Architectural CAD blueprint midnight with crisp slate surfaces, ochre, and terracotta',
    type: 'dark',
    mode: 'dark',
    swatches: ['#0F1013', '#181A20', '#2B2E38', '#E5A93C', '#E07A5F'],
  },
  {
    id: 'monochrome-light',
    name: 'Monochrome Light',
    description: 'Pure minimalist gallery white canvas, crisp pitch black typography, and architectural zinc',
    type: 'light',
    mode: 'light',
    swatches: ['#F8F9FA', '#FFFFFF', '#E5E7EB', '#6B7280', '#111111'],
  },
  {
    id: 'monochrome-dark',
    name: 'Monochrome Dark',
    description: 'High-contrast OLED pitch black canvas, pure white typography, and sharp carbon borders',
    type: 'dark',
    mode: 'dark',
    swatches: ['#000000', '#111112', '#242428', '#A1A1AA', '#FFFFFF'],
  },
  {
    id: 'crimson-ronin',
    name: 'Crimson Ronin',
    description: 'Anime scarlet kimono vermilion, deep shadow charcoal, bone ivory text, and golden cord accents',
    type: 'dark',
    mode: 'dark',
    swatches: ['#0E1015', '#181C26', '#2D3344', '#E63946', '#FAF5EE'],
  },
  {
    id: 'cyberpunk-neo',
    name: 'Cyberpunk Neo',
    description: 'High-voltage anime cyberpunk: pitch obsidian, carbon cards, electric neon yellow, and synthwave magenta',
    type: 'colored',
    mode: 'dark',
    swatches: ['#0A0A0E', '#151620', '#25283B', '#FFE600', '#00F0FF'],
  },
  {
    id: 'wabi-sabi',
    name: 'Wabi-Sabi',
    description: 'Japanese minimalist washi paper canvas, sumi calligraphy ink, warm tatami linen, and vermilion hanko seal',
    type: 'light',
    mode: 'light',
    swatches: ['#F4F1EA', '#FAF8F5', '#D8D2C4', '#BC3C29', '#1C1B18'],
  },
  {
    id: 'kyoto-night',
    name: 'Kyoto Night',
    description: 'Sumi inkstone black canvas, charred cedar cards, delicate gold leaf, and cherry blossom rose',
    type: 'dark',
    mode: 'dark',
    swatches: ['#101012', '#1C1D22', '#2E2F37', '#DFB257', '#F2EFE9'],
  },
  {
    id: 'neo-brutalist',
    name: 'Neo-Brutalist',
    description: 'Raw architectural concrete, stark pitch black geometry, high-voltage safety yellow, and cobalt',
    type: 'colored',
    mode: 'light',
    swatches: ['#E8E8EC', '#FFFFFF', '#18181B', '#FFD600', '#0047FF'],
  },
  {
    id: 'industrial-monolith',
    name: 'Industrial Monolith',
    description: 'Stark industrial dark brutalism: matte basalt canvas, raw carbon cards, hazard safety yellow, and steel',
    type: 'colored',
    mode: 'dark',
    swatches: ['#0E0F12', '#1B1C22', '#2F313D', '#FACC15', '#F4F4F5'],
  },
  {
    id: 'nordic-frost',
    name: 'Nordic Frost',
    description: 'Clean Scandinavian porcelain, glacial mist canvas, deep cobalt ink, and ice steel accents',
    type: 'light',
    mode: 'light',
    swatches: ['#F1F5F9', '#FFFFFF', '#CBD5E1', '#2563EB', '#0F172A'],
  },
  {
    id: 'tokyo-midnight',
    name: 'Tokyo Midnight',
    description: 'Deep obsidian night, crisp slate-indigo surfaces, electric cyan, and neon amber accents',
    type: 'dark',
    mode: 'dark',
    swatches: ['#0B0F19', '#141B2D', '#1E293B', '#38BDF8', '#818CF8'],
  },
  {
    id: 'sage-atelier',
    name: 'Sage Atelier',
    description: 'Fresh botanical eucalyptus wash, crisp gallery white cards, pine ink, and warm terracotta',
    type: 'colored',
    mode: 'light',
    swatches: ['#EEF3F0', '#FFFFFF', '#C9D7CE', '#2D6A4F', '#C85A3B'],
  },
  {
    id: 'alpine-emerald',
    name: 'Alpine Emerald',
    description: 'Luxurious deep spruce obsidian, dark forest cards, vibrant mint, and birch gold',
    type: 'dark',
    mode: 'dark',
    swatches: ['#09110E', '#121F1A', '#1E332B', '#10B981', '#F59E0B'],
  },
  {
    id: 'warm-sand',
    name: 'Warm Sand',
    description: 'Sun-washed Mediterranean linen, pristine ivory cards, roasted espresso ink, and amber sienna',
    type: 'colored',
    mode: 'light',
    swatches: ['#F6F2EA', '#FFFFFF', '#DDD4C4', '#D99419', '#C95B32'],
  },
  {
    id: 'cobalt-blueprint',
    name: 'Cobalt Blueprint',
    description: 'Deep maritime navy canvas, midnight cadet cards, electric cyan, and architectural ice-blue',
    type: 'colored',
    mode: 'dark',
    swatches: ['#0A101D', '#131E34', '#1F2E4D', '#38BDF8', '#60A5FA'],
  },
];

export const DEFAULT_THEME_ID = 'continuum';

export function getTheme(id: string): ThemeDefinition {
  // Legacy aliases and seamless migrations
  const migrations: Record<string, string> = {
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
    'olive-umber': 'alpine-emerald',
    'pine-nocturne': 'alpine-emerald',
    'forest-night': 'alpine-emerald',
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
