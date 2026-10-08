import { createContext, useContext, useEffect, useState, useCallback } from 'react'

const KEY = 'cs-theme'
const Ctx = createContext({ theme: 'system', resolved: 'light', setTheme: () => {} })
export const useTheme = () => useContext(Ctx)

const read = () => { try { return localStorage.getItem(KEY) || 'system' } catch { return 'system' } }
const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches
const resolve = (t) => (t === 'system' ? (systemDark() ? 'dark' : 'light') : t)

export function ThemeProvider({ children }) {
  const [theme, set] = useState(read)
  const [resolved, setResolved] = useState(() => resolve(read()))

  useEffect(() => {
    const apply = () => {
      const r = resolve(theme)
      setResolved(r)
      document.documentElement.dataset.theme = r
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', r === 'dark' ? '#000000' : '#ffffff')
    }
    apply()
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])

  const setTheme = useCallback((t) => { try { localStorage.setItem(KEY, t) } catch {} set(t) }, [])
  return <Ctx.Provider value={{ theme, resolved, setTheme }}>{children}</Ctx.Provider>
}
