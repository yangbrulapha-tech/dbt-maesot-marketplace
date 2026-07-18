import { useState, useEffect } from 'react'

export default function useDarkMode() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    // Check local storage first
    const savedMode = localStorage.getItem('theme')
    if (savedMode === 'dark') {
      setIsDark(true)
      document.documentElement.classList.add('dark')
    } else if (savedMode === 'light') {
      setIsDark(false)
      document.documentElement.classList.remove('dark')
    } else {
      // If no local storage, check OS preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (prefersDark) {
        setIsDark(true)
        document.documentElement.classList.add('dark')
      }
    }
  }, [])

  const toggleDarkMode = () => {
    setIsDark(prev => {
      const newMode = !prev
      if (newMode) {
        document.documentElement.classList.add('dark')
        localStorage.setItem('theme', 'dark')
      } else {
        document.documentElement.classList.remove('dark')
        localStorage.setItem('theme', 'light')
      }
      return newMode
    })
  }

  return [isDark, toggleDarkMode]
}
