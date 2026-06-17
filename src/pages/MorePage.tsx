import { Construction } from 'lucide-react'

export function MorePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-400 dark:text-gray-500">
      <Construction className="w-16 h-16 mb-4" />
      <p className="text-lg font-medium">En construcción</p>
      <p className="text-sm mt-1">Próximamente más funciones</p>
    </div>
  )
}
