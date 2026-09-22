'use client';

import { useState, useEffect, useCallback } from 'react';
import { THEMES, DEFAULT_THEME_ID, getTheme, ThemeDefinition } from './themes';
import { safeLocalStorage } from '@/lib/utils/storage';

export type CardRadiusOption = 'sharp' | 'subtle' | 'rounded' | 'soft';
export type CardShadowOption = 'flat' | 'subtle' | 'elevated';
export type HeadingFontOption = 'serif' | 'sans' | 'mono';

const STORAGE_KEY = 'continuum_theme';
const PREF_DARK_KEY = 'continuum_preferred_dark';
const RADIUS_KEY = 'continuum_card_radius';
const SHADOW_KEY = 'continuum_card_shadow';
const FONT_KEY = 'continuum_heading_font';

const EVENT_NAME = 'continuum-theme-change';
const APPEARANCE_EVENT_NAME = 'continuum-appearance-change';

const RADIUS_MAP: Record<CardRadiusOption, { card: string; button: string }> = {
  sharp: { card: '0px', button: '0px' },
  subtle: { card: '4px', button: '2px' },
  rounded: { card: '8px', button: '4px' },
  soft: { card: '14px', button: '8px' },
};

const FONT_MAP: Record<HeadingFontOption, string> = {
  serif: "'Playfair Display', serif",
  sans: "'Plus Jakarta Sans', sans-serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
};

function applyCardRadius(r: CardRadiusOption) {
  if (typeof document === 'undefined') return;
  const radius = RADIUS_MAP[r] || RADIUS_MAP.subtle;
  document.documentElement.style.setProperty('--radius-card', radius.card);
  document.documentElement.style.setProperty('--radius-button', radius.button);
}

function applyCardShadow(s: CardShadowOption) {
  if (typeof document === 'undefined') return;
  if (s === 'flat') {
    document.documentElement.style.setProperty('--shadow-subtle', 'none');
  } else if (s === 'elevated') {
    document.documentElement.style.setProperty('--shadow-subtle', '0 8px 24px -4px rgba(0, 0, 0, 0.18), 0 3px 8px -2px rgba(0, 0, 0, 0.1)');
  } else {
    document.documentElement.style.removeProperty('--shadow-subtle');
  }
}

function applyHeadingFont(f: HeadingFontOption) {
  if (typeof document === 'undefined') return;
  const font = FONT_MAP[f] || FONT_MAP.serif;
  document.documentElement.style.setProperty('--font-serif', font);
}

export interface ThemeTransitionOrigin {
  x: number;
  y: number;
}

export function useTheme() {
  const [themeId, setThemeIdState] = useState<string>(DEFAULT_THEME_ID);
  const [cardRadius, setCardRadiusState] = useState<CardRadiusOption>('subtle');
  const [cardShadow, setCardShadowState] = useState<CardShadowOption>('subtle');
  const [headingFont, setHeadingFontState] = useState<HeadingFontOption>('serif');
  const [mounted, setMounted] = useState(false);

  const applyTheme = useCallback((id: string, animate = false, origin?: ThemeTransitionOrigin) => {
    if (typeof document === 'undefined') return;
    const mutateDom = () => {
      document.documentElement.setAttribute('data-theme', id);
      const themeDef = getTheme(id);
      if (themeDef.mode === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    if (!animate) {
      mutateDom();
      return;
    }

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const doc = document as any;
    if (typeof doc.startViewTransition === 'function' && !prefersReducedMotion) {
      const transition = doc.startViewTransition(() => {
        mutateDom();
      });

      if (transition && typeof transition.ready?.then === 'function') {
        transition.ready
          .then(() => {
            const x = origin?.x ?? (typeof window !== 'undefined' ? window.innerWidth / 2 : 0);
            const y = origin?.y ?? (typeof window !== 'undefined' ? window.innerHeight / 2 : 0);
            const endRadius = Math.hypot(
              Math.max(x, window.innerWidth - x),
              Math.max(y, window.innerHeight - y)
            );

            document.documentElement.animate(
              {
                clipPath: [
                  `circle(0px at ${x}px ${y}px)`,
                  `circle(${endRadius}px at ${x}px ${y}px)`,
                ],
              },
              {
                duration: 480,
                easing: 'cubic-bezier(0.2, 0, 0, 1)',
                pseudoElement: '::view-transition-new(root)',
              }
            );
          })
          .catch(() => {
            // Ignored if transition aborted or cancelled
          });
      }
      return;
    }

    document.documentElement.classList.add('theme-transition');
    mutateDom();
    window.setTimeout(() => {
      document.documentElement.classList.remove('theme-transition');
    }, 400);
  }, []);

  useEffect(() => {
    setMounted(true);
    let initial = DEFAULT_THEME_ID;
    try {
      const docAttr = typeof document !== 'undefined' ? document.documentElement.getAttribute('data-theme') : null;
      const stored = safeLocalStorage.getItem(STORAGE_KEY);
      if (stored) {
        initial = getTheme(stored).id;
      } else if (docAttr) {
        initial = getTheme(docAttr).id;
      } else {
        const prefersDark =
          typeof window !== 'undefined' &&
          window.matchMedia &&
          window.matchMedia('(prefers-color-scheme: dark)').matches;
        initial = prefersDark ? 'continuum-dark' : DEFAULT_THEME_ID;
      }

      const storedRadius = (safeLocalStorage.getItem(RADIUS_KEY) as CardRadiusOption) || 'subtle';
      const storedShadow = (safeLocalStorage.getItem(SHADOW_KEY) as CardShadowOption) || 'subtle';
      const storedFont = (safeLocalStorage.getItem(FONT_KEY) as HeadingFontOption) || 'serif';

      if (['sharp', 'subtle', 'rounded', 'soft'].includes(storedRadius)) {
        setCardRadiusState(storedRadius);
        applyCardRadius(storedRadius);
      }
      if (['flat', 'subtle', 'elevated'].includes(storedShadow)) {
        setCardShadowState(storedShadow);
        applyCardShadow(storedShadow);
      }
      if (['serif', 'sans', 'mono'].includes(storedFont)) {
        setHeadingFontState(storedFont);
        applyHeadingFont(storedFont);
      }
    } catch {}

    setThemeIdState(initial);
    applyTheme(initial, false);

    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      const next = customEvent.detail;
      if (next) {
        const canonical = getTheme(next).id;
        setThemeIdState(canonical);
        applyTheme(canonical, true);
      }
    };

    const handleAppearanceSync = () => {
      try {
        const r = (safeLocalStorage.getItem(RADIUS_KEY) as CardRadiusOption) || 'subtle';
        const s = (safeLocalStorage.getItem(SHADOW_KEY) as CardShadowOption) || 'subtle';
        const f = (safeLocalStorage.getItem(FONT_KEY) as HeadingFontOption) || 'serif';
        setCardRadiusState(r);
        applyCardRadius(r);
        setCardShadowState(s);
        applyCardShadow(s);
        setHeadingFontState(f);
        applyHeadingFont(f);
      } catch {}
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        const canonical = getTheme(e.newValue).id;
        setThemeIdState(canonical);
        applyTheme(canonical, true);
      }
      if ([RADIUS_KEY, SHADOW_KEY, FONT_KEY].includes(e.key || '')) {
        handleAppearanceSync();
      }
    };

    window.addEventListener(EVENT_NAME, handleSync);
    window.addEventListener(APPEARANCE_EVENT_NAME, handleAppearanceSync);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(EVENT_NAME, handleSync);
      window.removeEventListener(APPEARANCE_EVENT_NAME, handleAppearanceSync);
      window.removeEventListener('storage', handleStorage);
    };
  }, [applyTheme]);

  const setTheme = useCallback((id: string, originOrEvent?: React.MouseEvent | MouseEvent | ThemeTransitionOrigin, skipTransition = false) => {
    const target = getTheme(id).id;
    if (!THEMES.some((t) => t.id === target)) return;
    setThemeIdState(target);

    let origin: ThemeTransitionOrigin | undefined;
    if (originOrEvent) {
      if ('clientX' in originOrEvent && typeof originOrEvent.clientX === 'number') {
        origin = { x: originOrEvent.clientX, y: originOrEvent.clientY };
      } else if ('x' in originOrEvent && typeof originOrEvent.x === 'number') {
        origin = originOrEvent;
      }
    }

    applyTheme(target, !skipTransition, origin);
    try {
      safeLocalStorage.setItem(STORAGE_KEY, target);
      const def = getTheme(target);
      if (def.mode === 'dark') {
        safeLocalStorage.setItem(PREF_DARK_KEY, target);
      }
    } catch {}
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: target }));
  }, [applyTheme]);

  const setCardRadius = useCallback((r: CardRadiusOption) => {
    setCardRadiusState(r);
    applyCardRadius(r);
    try {
      safeLocalStorage.setItem(RADIUS_KEY, r);
    } catch {}
    window.dispatchEvent(new CustomEvent(APPEARANCE_EVENT_NAME));
  }, []);

  const setCardShadow = useCallback((s: CardShadowOption) => {
    setCardShadowState(s);
    applyCardShadow(s);
    try {
      safeLocalStorage.setItem(SHADOW_KEY, s);
    } catch {}
    window.dispatchEvent(new CustomEvent(APPEARANCE_EVENT_NAME));
  }, []);

  const setHeadingFont = useCallback((f: HeadingFontOption) => {
    setHeadingFontState(f);
    applyHeadingFont(f);
    try {
      safeLocalStorage.setItem(FONT_KEY, f);
    } catch {}
    window.dispatchEvent(new CustomEvent(APPEARANCE_EVENT_NAME));
  }, []);

  const toggleTheme = useCallback((originOrEvent?: React.MouseEvent | MouseEvent | ThemeTransitionOrigin) => {
    const current = getTheme(themeId);
    if (current.mode === 'light') {
      let preferredDark = 'continuum-dark';
      try {
        const storedDark = safeLocalStorage.getItem(PREF_DARK_KEY);
        if (storedDark) {
          const resolved = getTheme(storedDark);
          if (resolved.mode === 'dark') {
            preferredDark = resolved.id;
          }
        }
      } catch {}
      setTheme(preferredDark, originOrEvent);
    } else {
      setTheme('continuum', originOrEvent);
    }
  }, [themeId, setTheme]);

  return {
    theme: getTheme(themeId),
    themeId,
    setTheme,
    toggleTheme,
    themes: THEMES,
    cardRadius,
    setCardRadius,
    cardShadow,
    setCardShadow,
    headingFont,
    setHeadingFont,
    mounted,
  };
}
