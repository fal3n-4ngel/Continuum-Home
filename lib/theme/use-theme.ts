'use client';

import { useState, useEffect, useCallback } from 'react';
import { THEMES, DEFAULT_THEME_ID, getTheme, ThemeDefinition } from './themes';

const STORAGE_KEY = 'continuum_theme';
const PREF_DARK_KEY = 'continuum_preferred_dark';
const EVENT_NAME = 'continuum-theme-change';

export function useTheme() {
  const [themeId, setThemeIdState] = useState<string>(DEFAULT_THEME_ID);
  const [mounted, setMounted] = useState(false);

  const applyTheme = useCallback((id: string, animate = false) => {
    if (typeof document === 'undefined') return;
    const mutateDom = () => {
      document.documentElement.setAttribute('data-theme', id);
      const themeDef = getTheme(id);
      if (themeDef.type === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    if (!animate) {
      mutateDom();
      return;
    }

    const doc = document as any;
    if (typeof doc.startViewTransition === 'function') {
      doc.startViewTransition(() => {
        mutateDom();
      });
      return;
    }

    document.documentElement.classList.add('theme-transition');
    mutateDom();
    window.setTimeout(() => {
      document.documentElement.classList.remove('theme-transition');
    }, 300);
  }, []);

  useEffect(() => {
    setMounted(true);
    let initial = DEFAULT_THEME_ID;
    try {
      const docAttr = typeof document !== 'undefined' ? document.documentElement.getAttribute('data-theme') : null;
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        if (stored === 'continuum-paper' || stored === 'paper-classic') {
          initial = 'continuum';
        } else if (stored === 'monolith-dark' || stored === 'obsidian') {
          initial = 'obsidian-noir';
        } else if (THEMES.some((t) => t.id === stored)) {
          initial = stored;
        }
      } else if (docAttr && THEMES.some((t) => t.id === docAttr)) {
        initial = docAttr;
      } else {
        const prefersDark =
          typeof window !== 'undefined' &&
          window.matchMedia &&
          window.matchMedia('(prefers-color-scheme: dark)').matches;
        initial = prefersDark ? 'continuum-dark' : DEFAULT_THEME_ID;
      }
    } catch {}
    setThemeIdState(initial);
    applyTheme(initial, false);

    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      const next = customEvent.detail;
      if (next && THEMES.some((t) => t.id === next)) {
        setThemeIdState(next);
        applyTheme(next, true);
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        if (THEMES.some((t) => t.id === e.newValue)) {
          setThemeIdState(e.newValue);
          applyTheme(e.newValue, true);
        }
      }
    };

    window.addEventListener(EVENT_NAME, handleSync);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(EVENT_NAME, handleSync);
      window.removeEventListener('storage', handleStorage);
    };
  }, [applyTheme]);

  const setTheme = useCallback((id: string) => {
    const target = (id === 'continuum-paper' || id === 'paper-classic')
      ? 'continuum'
      : (id === 'monolith-dark' || id === 'obsidian')
      ? 'obsidian-noir'
      : id;
    if (!THEMES.some((t) => t.id === target)) return;
    setThemeIdState(target);
    applyTheme(target, true);
    try {
      localStorage.setItem(STORAGE_KEY, target);
      const def = getTheme(target);
      if (def.type === 'dark') {
        localStorage.setItem(PREF_DARK_KEY, target);
      }
    } catch {}
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: target }));
  }, [applyTheme]);

  const toggleTheme = useCallback(() => {
    const current = getTheme(themeId);
    if (current.type === 'light') {
      let preferredDark = 'obsidian-noir';
      try {
        const storedDark = localStorage.getItem(PREF_DARK_KEY);
        if (storedDark && THEMES.some((t) => t.id === storedDark && t.type === 'dark')) {
          preferredDark = storedDark;
        }
      } catch {}
      setTheme(preferredDark);
    } else {
      setTheme('continuum');
    }
  }, [themeId, setTheme]);

  return {
    theme: getTheme(themeId),
    themeId,
    setTheme,
    toggleTheme,
    themes: THEMES,
    mounted,
  };
}
