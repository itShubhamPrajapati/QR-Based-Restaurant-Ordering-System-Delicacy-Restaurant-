import { useMemo } from 'react'

export default function CategoryTabs({
  categories,
  selectedCategory,
  setSelectedCategory,
  selectedSubcategory,
  setSelectedSubcategory,
  menu
}) {
  const categoryIcons = {
    all: '🍽️',
    soup: '🥣',
    soups: '🥣',
    starters: '🍗',
    starter: '🍗',
    rice_noodles: '🍚',
    main_course: '🍛',
    biryani: '🍲',
    rolls: '🌯',
    breads: '🫓',
    combos: '📦',
    south_indian: '🍛',
    beverages: '🥤'
  }

  const getIcon = (catName) => {
    const key = catName.toLowerCase().replace(' & ', '_').replace(' ', '_')
    return categoryIcons[key] || '🍽️'
  }

  // Calculate unique subcategories for the selected category from menu items
  const subcategories = useMemo(() => {
    if (selectedCategory === 'all') return []
    const subcats = new Set()
    menu.forEach(item => {
      const isMatch = item.category_id === parseInt(selectedCategory) || 
                      item.category_id === selectedCategory ||
                      item.category === selectedCategory
      if (isMatch && item.subcategory) {
        subcats.add(item.subcategory)
      }
    })
    return Array.from(subcats)
  }, [selectedCategory, menu])

  return (
    <div className="category-tabs-container">
      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => {
            setSelectedCategory('all')
            setSelectedSubcategory(null)
          }}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium ${
            selectedCategory === 'all'
              ? 'bg-primary-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
          }`}
        >
          🍽️ All Items
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => {
              setSelectedCategory(cat.id.toString())
              setSelectedSubcategory(null)
            }}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium ${
              selectedCategory === cat.id.toString() || selectedCategory === cat.id
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
            }`}
          >
            {getIcon(cat.name)} {cat.name.charAt(0).toUpperCase() + cat.name.slice(1).replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Subcategory Tabs */}
      {selectedCategory !== 'all' && subcategories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mt-2">
          <button
            onClick={() => setSelectedSubcategory(null)}
            className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium ${
              selectedSubcategory === null
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
            }`}
          >
            All
          </button>
          {subcategories.map((sub) => (
            <button
              key={sub}
              onClick={() => setSelectedSubcategory(sub)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium capitalize ${
                selectedSubcategory === sub
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}
            >
              {sub.replace('_', ' ')}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
