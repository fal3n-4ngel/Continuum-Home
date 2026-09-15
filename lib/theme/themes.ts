export interface ThemeDefinition {
  id: string;
  name: string;
  description: string;
  type: 'light' | 'dark';
  swatches: string[];
}

export const THEMES: ThemeDefinition[] = [
  {
    id: 'continuum',
    name: 'Continuum',
    description: 'The signature architectural warm paper canvas, terracotta, and golden ochre',
    type: 'light',
    swatches: ['#F3EFEA', '#FAF8F5', '#DDD5CB', '#D99419', '#9E5D48'],
  },
  {
    id: 'obsidian-noir',
    name: 'Obsidian Noir',
    description: 'Deep volcanic obsidian with silver mist text and crisp slate borders',
    type: 'dark',
    swatches: ['#0C0D0E', '#18191D', '#25272E', '#7C98A6', '#F4F5F7'],
  },
  {
    id: 'amoled-pure',
    name: 'AMOLED Pure Black',
    description: 'True deep pitch black canvas with elevated cards and razor-sharp contrast',
    type: 'dark',
    swatches: ['#000000', '#121212', '#222222', '#3B82F6', '#FFFFFF'],
  },
  {
    id: 'github-dark',
    name: 'GitHub Dark',
    description: 'Iconic developer dark mode with deep slate canvas and crisp muted borders',
    type: 'dark',
    swatches: ['#0D1117', '#161B22', '#30363D', '#58A6FF', '#E6EDF3'],
  },
  {
    id: 'continuum-dark',
    name: 'Continuum Dark',
    description: 'Deep architectural CAD midnight with warm parchment, terracotta, and ochre',
    type: 'dark',
    swatches: ['#0C0D0E', '#18191D', '#25272E', '#F59E0B', '#E07A5F'],
  },
  {
    id: 'dracula',
    name: 'Dracula Midnight',
    description: 'Classic midnight palette with rich indigo surfaces, gothic violet, and cyan accents',
    type: 'dark',
    swatches: ['#21222C', '#282A36', '#44475A', '#BD93F9', '#F8F8F2'],
  },
  {
    id: 'botanical-matcha',
    name: 'Botanical Matcha',
    description: 'Calm Kyoto green tea and deep evergreen ink',
    type: 'light',
    swatches: ['#F3F5F2', '#FCFDFC', '#D4DCD2', '#3B7A57', '#1A241C'],
  },
  {
    id: 'espresso-crema',
    name: 'Espresso Crema',
    description: 'Rich roasted coffee, warm froth cream, and caramel',
    type: 'light',
    swatches: ['#F6F3EE', '#FFFFFF', '#DED6CE', '#966041', '#28201C'],
  },
  {
    id: 'nordic-linen',
    name: 'Nordic Linen',
    description: 'Clean Scandinavian bleached linen, oat canvas, and soft pebble',
    type: 'light',
    swatches: ['#F7F5F0', '#FFFFFF', '#DCD8CD', '#6A8CA6', '#1E1E1C'],
  },
  {
    id: 'tuscan-terracotta',
    name: 'Tuscan Terracotta',
    description: 'Sun-baked Sienna clay, warm peach parchment, and earth',
    type: 'light',
    swatches: ['#F8F3EE', '#FFFDFB', '#E2D5CA', '#B85D43', '#2C1E18'],
  },
];

export const DEFAULT_THEME_ID = 'continuum';

export function getTheme(id: string): ThemeDefinition {
  if (id === 'continuum-paper' || id === 'paper-classic') {
    return THEMES.find((t) => t.id === 'continuum') || THEMES[0];
  }
  if (id === 'monolith-dark' || id === 'obsidian') {
    return THEMES.find((t) => t.id === 'obsidian-noir') || THEMES[1];
  }
  if (id === 'tokyo-night' || id === 'forest-night' || id === 'espresso-dark' || id === 'monolith-slate' || id === 'monolith') {
    return THEMES.find((t) => t.id === 'continuum-dark') || THEMES[0];
  }
  const found = THEMES.find((t) => t.id === id);
  return found || THEMES[0];
}
