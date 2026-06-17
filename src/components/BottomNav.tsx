import { House, Pill, Ellipsis } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'

const tabs = [
  { path: '/', label: 'Inicio', icon: House },
  { path: '/meds', label: 'Medicamentos', icon: Pill },
  { path: '/more', label: 'Más', icon: Ellipsis },
]

export function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 pb-safe">
      <div className="grid grid-cols-3 max-w-lg mx-auto">
        {tabs.map((t) => {
          const active = location.pathname === t.path
          const Icon = t.icon
          return (
            <button
              key={t.path}
              onClick={() => navigate(t.path)}
              className={`flex flex-col items-center py-3 cursor-pointer transition-colors duration-200 ${
                active ? 'text-primary' : 'text-gray-400 dark:text-gray-500'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium mt-0.5">{t.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
