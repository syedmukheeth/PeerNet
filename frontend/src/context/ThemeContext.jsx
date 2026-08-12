import { createContext, useContext, useState, useEffect } from 'react'
/* eslint-disable react-refresh/only-export-components */

const ThemeContext = createContext()

const STORAGE_KEY = 'pn-theme'

const systemTheme = () =>
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'

export function ThemeProvider({ children }) {
    // Whether the user has made an explicit choice. Tracked separately so the
    // OS listener below can be ignored once they have.
    const [explicit, setExplicit] = useState(() => {
        const stored = localStorage.getItem(STORAGE_KEY)
        return stored === 'dark' || stored === 'light'
    })

    const [theme, setTheme] = useState(() => {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored === 'dark' || stored === 'light') return stored
        return systemTheme()
    })

    useEffect(() => {
        const root = document.documentElement
        root.setAttribute('data-theme', theme)
        // Tells the browser which palette its own widgets should use. Without
        // it, native scrollbars, date pickers, and form controls stayed light
        // while the rest of the app was dark.
        root.style.colorScheme = theme
        if (explicit) localStorage.setItem(STORAGE_KEY, theme)
    }, [theme, explicit])

    // Follow the OS while the user has not chosen for themselves. The initial
    // value was read once at mount and never updated, so someone on the system
    // default stayed on whichever theme was current when the tab opened.
    useEffect(() => {
        if (explicit) return
        const query = window.matchMedia('(prefers-color-scheme: dark)')
        const onChange = (e) => setTheme(e.matches ? 'dark' : 'light')
        query.addEventListener('change', onChange)
        return () => query.removeEventListener('change', onChange)
    }, [explicit])

    const toggle = () => {
        setExplicit(true)
        setTheme(t => (t === 'dark' ? 'light' : 'dark'))
    }

    return (
        <ThemeContext.Provider value={{ theme, toggle, isDark: theme === 'dark' }}>
            {children}
        </ThemeContext.Provider>
    )
}

export const useTheme = () => useContext(ThemeContext)
