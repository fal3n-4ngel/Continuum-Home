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
    description: 'The original signature warm paper canvas and ivory card',
    type: 'light',
    swatches: ['#F5F1EB', '#FAF7F2', '#DCD8D0', '#E5B85C', '#1A1A1A'],
  },
  {
    id: 'obsidian-noir',
    name: 'Obsidian Noir',
    description: 'Deep volcanic obsidian with silver mist text and crisp slate borders',
    type: 'dark',
    swatches: ['#0C0D0E', '#18191D', '#25272E', '#60A5FA', '#F4F5F7'],
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
    description: 'Deep midnight sumi ink with warm ivory parchment text',
    type: 'dark',
    swatches: ['#0F1012', '#1A1B20', '#262830', '#60A5FA', '#F3F4F6'],
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
