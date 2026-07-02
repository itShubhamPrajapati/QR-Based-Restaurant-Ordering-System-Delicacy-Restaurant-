import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, Plus } from 'lucide-react'

export default function MenuItemCard({ item, index, onAddToCart }) {
  const [showHalfFull, setShowHalfFull] = useState(false)
  
  const handleAdd = (halfFull) => {
    onAddToCart(item, halfFull)
    setShowHalfFull(false)
  }
  
  return (
    <motion.div
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 80, damping: 12 }}
      whileHover={{ y: -5 }}
      whileTap={{ scale: 0.98 }}
      className="relative rounded-[2rem] p-6 shadow-lg shadow-gray-200/50 dark:shadow-black/20 hover:shadow-xl transition-shadow bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 flex flex-col justify-between h-full group"
    >
      <div>
        {/* Floating Veg/Non-Veg Badge */}
        <div className="flex items-center justify-between mb-4">
          {item.is_vegetarian ? (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 backdrop-blur-sm flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Veg
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 backdrop-blur-sm flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              Non-Veg
            </span>
          )}
          
          {/* Floating Prep Time Badge */}
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-500/20 backdrop-blur-sm flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {item.preparation_time} min
          </span>
        </div>

        {/* Item Title and Description */}
        <h3 className="font-bold text-lg text-gray-900 dark:text-white mt-1 group-hover:text-primary-500 transition-colors">
          {item.name}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-2 leading-relaxed">
          {item.description}
        </p>
      </div>
      
      {/* Price & Add to Cart Container */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100 dark:border-gray-700/40">
        <div>
          {item.has_half_full ? (
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Sizes available</span>
              <span className="font-extrabold text-base sm:text-lg text-primary-500 dark:text-orange-400">
                ₹{item.price_half} - ₹{item.price_full}
              </span>
            </div>
          ) : (
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Price</span>
              <span className="text-base sm:text-lg font-extrabold text-primary-500 dark:text-orange-400">
                ₹{item.price}
              </span>
            </div>
          )}
        </div>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowHalfFull(true)}
          className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-2xl text-sm font-semibold shadow-md shadow-primary-500/10 hover:shadow-lg hover:shadow-primary-500/20 transition-all duration-200"
        >
          <Plus className="w-4 h-4" /> Add
        </motion.button>
      </div>
      
      {/* size selection overlay */}
      <AnimatePresence>
        {showHalfFull && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
            onClick={() => setShowHalfFull(false)}
          >
            <motion.div
              initial={{ y: '100%', scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: '100%', scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 max-w-sm w-full bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border border-white/20 dark:border-white/10 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{item.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Select your preferred size</p>
              
              <div className="space-y-3">
                {item.has_half_full ? (
                  <>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleAdd('half')}
                      className="w-full p-4 border border-gray-100 dark:border-gray-800 rounded-2xl flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50 hover:bg-orange-500/5 hover:border-orange-500/30 transition-all duration-200"
                    >
                      <div className="text-left">
                        <p className="font-semibold text-gray-900 dark:text-white">Half Portion</p>
                        <p className="text-sm text-primary-500 font-medium">₹{item.price_half}</p>
                      </div>
                      <Plus className="w-5 h-5 text-primary-500" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleAdd('full')}
                      className="w-full p-4 border border-gray-100 dark:border-gray-800 rounded-2xl flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50 hover:bg-orange-500/5 hover:border-orange-500/30 transition-all duration-200"
                    >
                      <div className="text-left">
                        <p className="font-semibold text-gray-900 dark:text-white">Full Portion</p>
                        <p className="text-sm text-primary-500 font-medium">₹{item.price_full}</p>
                      </div>
                      <Plus className="w-5 h-5 text-primary-500" />
                    </motion.button>
                  </>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleAdd(null)}
                    className="w-full p-4 border border-gray-100 dark:border-gray-800 rounded-2xl flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50 hover:bg-orange-500/5 hover:border-orange-500/30 transition-all duration-200"
                  >
                    <div className="text-left">
                      <p className="font-semibold text-gray-900 dark:text-white">Standard Portion</p>
                      <p className="text-sm text-primary-500 font-medium">₹{item.price}</p>
                    </div>
                    <Plus className="w-5 h-5 text-primary-500" />
                  </motion.button>
                )}
              </div>
              
              <button
                onClick={() => setShowHalfFull(false)}
                className="mt-6 w-full py-2.5 text-gray-400 hover:text-gray-650 dark:hover:text-gray-200 font-medium text-sm transition-colors duration-200"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
