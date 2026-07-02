import { motion } from 'framer-motion'
import { MapPin } from 'lucide-react'

export default function GlassHeader({ tableNumber }) {
  return (
    <motion.div
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 100, damping: 15 }}
      className="sticky top-16 z-20 backdrop-blur-md bg-white/70 dark:bg-black/50 border-t border-b border-gray-200/40 dark:border-white/10 py-5 px-6 flex items-center justify-between shadow-sm"
    >
      <div>
        <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 bg-clip-text text-transparent">
          Delicacy Restaurant
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Welcome! Tap items to add to your order.</p>
      </div>
      {tableNumber && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/20 text-xs sm:text-sm font-semibold shadow-inner">
          <MapPin className="w-3.5 h-3.5" /> Table {tableNumber}
        </div>
      )}
    </motion.div>
  )
}
