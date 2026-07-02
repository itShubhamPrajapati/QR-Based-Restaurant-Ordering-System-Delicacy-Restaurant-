import { Utensils } from 'lucide-react'
import MenuItemCard from './MenuItemCard'

export default function MenuGrid({
  loading,
  filteredMenu,
  errorDetails,
  retryCount,
  onRetry,
  onAddToCart
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="rounded-xl p-4 skeleton h-40 bg-white dark:bg-gray-800 animate-pulse" />
        ))}
      </div>
    )
  }

  if (filteredMenu.length === 0 && !errorDetails) {
    return (
      <div className="text-center py-16 text-gray-500 dark:text-gray-400">
        <Utensils className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <p>No dishes found</p>
      </div>
    )
  }

  if (filteredMenu.length === 0 && errorDetails) {
    return (
      <div className="text-center py-16 text-gray-500 dark:text-gray-400">
        <Utensils className="w-16 h-16 mx-auto mb-4 text-red-400" />
        <p className="text-red-500 mb-4">Failed to load menu</p>
        <p className="text-sm mb-4 opacity-70">{errorDetails}</p>
        <button
          onClick={onRetry}
          className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 font-medium"
        >
          Retry ({retryCount})
        </button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {filteredMenu.map((item, index) => (
        <MenuItemCard
          key={item.id}
          item={item}
          index={index}
          onAddToCart={onAddToCart}
        />
      ))}
    </div>
  )
}
