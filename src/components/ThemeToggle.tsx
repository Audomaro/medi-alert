import { Sun, Moon } from 'lucide-react'
import { useThemeStore } from '../stores/themeStore'

export function ThemeToggle() {
  const { dark, toggle } = useThemeStore()
  return (
    <button
      onClick={toggle}
      className="cursor-pointer p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
    >
      {dark ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-primary" />}
    </button>
  )
}
