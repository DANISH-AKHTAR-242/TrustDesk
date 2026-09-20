// Theme: dark by default; the choice is persisted under localStorage 'trustdesk_theme' and applied
// as the `dark` class on <html> (index.html applies the stored value before the first paint).
import { useCallback, useEffect, useState } from 'react'

export type Theme = 'dark' | 'light'
export const THEME_KEY = 'trustdesk_theme'

export function readTheme(): Theme {
  try {
    return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    // blocked storage: the class still applies for this page load
  }
}

export function useTheme(): { theme: Theme; toggle: () => void } {
  const [theme, setTheme] = useState<Theme>(readTheme)
  useEffect(() => {
    applyTheme(theme)
  }, [theme])
  const toggle = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), [])
  return { theme, toggle }
}
