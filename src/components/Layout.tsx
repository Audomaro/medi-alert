import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'

export function Layout() {
  return (
    <div className="min-h-screen bg-bg dark:bg-gray-900 text-text dark:text-gray-100 font-sans pb-20">
      <div className="max-w-lg mx-auto px-4 pt-4">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  )
}
