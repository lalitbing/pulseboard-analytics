import { useEffect, useState } from 'react';

// The theme preference is 'system' (follow the OS) or an explicit override.
// The script in index.html applies the same logic before first paint; keep the key in sync.
export type ThemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'pulseboard:theme';
const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)');

function readPreference(): ThemePreference {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

function applyTheme(pref: ThemePreference) {
  const dark = pref === 'dark' || (pref === 'system' && darkQuery().matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}

export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>(readPreference);

  useEffect(() => {
    applyTheme(preference);
    try {
      if (preference === 'system') localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, preference);
    } catch {
      // Storage blocked: the choice still applies for this session.
    }

    if (preference !== 'system') return;
    const mq = darkQuery();
    const onChange = () => applyTheme('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [preference]);

  return { preference, setPreference };
}
