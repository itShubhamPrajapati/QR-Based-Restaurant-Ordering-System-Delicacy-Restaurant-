import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Filter, Leaf, Drumstick, Star, ArrowLeft } from 'lucide-react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import MenuItemCard from '../components/MenuItemCard'
import { useMenuStore, useCartStore } from '../store'

export default function MenuPage() {
  const { tableNumber } = useParams()
  const navigate = useNavigate()
  const { menu, loading, filters, setFilters, getFilteredMenu, fetchMenu } = useMenuStore()
  const { tableNumber: cartTableNumber } = useCartStore()
  
  const [showFilters, setShowFilters] = useState(false)
  const [localSearch, setLocalSearch] = useState('')
  
  useEffect(() => {
    fetchMenu()
  }, [filters.category, filters.sortBy])
  
  useEffect(() => {
    const timeout = setTimeout(() => {
      setFilters({ search: localSearch })
    }, 300)
    return () => clearTimeout(timeout)
  }, [localSearch])
  
  const filteredMenu = getFilteredMenu()
  
  const categories = [
    { id: 'all', label: 'All', icon: Star },
    { id: 'veg', label: 'Veg', icon: Leaf },
    { id: 'non-veg', label: 'Non-Veg', icon: Drumstick },
  ]
  
  const sortOptions = [
    { id: 'popular', label: 'Popular' },
    { id: 'price_low', label: 'Price: Low to High' },
    { id: 'price_high', label: 'Price: High to Low' },
  ]
  
  // Show warning if table number doesn't match
  if (tableNumber && cartTableNumber && parseInt(tableNumber) !== cartTableNumber) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-4">Table Number Mismatch</h2>
          <p className="text-gray-500 mb-4">
            Your cart is for Table {cartTableNumber}, but you scanned Table {tableNumber}
          </p>
          <Link to={`/table/${tableNumber}`} className="btn-primary">
            Start Fresh for Table {tableNumber}
          </Link>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="gradient-orange py-6 px-4 text-white">
        <div className="max-w-4xl mx-auto">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold mb-1"
          >
            🍽️ Menu
          </motion.h1>
          {tableNumber && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-primary-100"
            >
              Table {tableNumber} - Order now!
            </motion.p>
          )}
          
          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-4 relative"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search dishes..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white"
            />
          </motion.div>
        </div>
      </div>
      
      {/* Categories */}
      <div className="sticky top-[73px] z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setFilters({ category: cat.id })}
                className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                  filters.category === cat.id
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <cat.icon className="w-4 h-4" />
                {cat.label}
              </button>
            ))}
            
            {/* Sort Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                <Filter className="w-4 h-4" />
                Sort
              </button>
              
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute top-full right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden z-50 min-w-[180px]"
                >
                  {sortOptions.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => {
                        setFilters({ sortBy: opt.id })
                        setShowFilters(false)
                      }}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 ${
                        filters.sortBy === opt.id ? 'text-primary-600' : ''
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Menu Items */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        {loading ? (
          // Loading Skeleton
          <div className="grid gap-4 sm:grid-cols-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card p-4">
                <div className="skeleton h-4 w-20 mb-2"></div>
                <div className="skeleton h-6 w-full mb-2"></div>
                <div className="skeleton h-4 w-3/4 mb-4"></div>
                <div className="flex justify-between">
                  <div className="skeleton h-6 w-20"></div>
                  <div className="skeleton h-10 w-20 rounded-xl"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredMenu.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No items found</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <AnimatePresence>
              {filteredMenu.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <MenuItemCard item={item} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
      
      {/* Floating Cart Button (Mobile) */}
      <div className="fixed bottom-24 right-4 sm:hidden">
        <Link to={tableNumber ? `/table/${tableNumber}/cart` : '/cart'}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="btn-primary shadow-lg"
          >
            View Cart
          </motion.button>
        </Link>
      </div>
    </div>
  )
}
