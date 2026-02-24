import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { useToastStore } from '../store/store'
import { motion, AnimatePresence } from 'framer-motion'

const icons = {
  success: <CheckCircle className="w-5 h-5 text-green-500" />,
  error: <AlertCircle className="w-5 h-5 text-red-500" />,
  warning: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
  info: <Info className="w-5 h-5 text-blue-500" />
}

const bgColors = {
  success: 'bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-800',
  error: 'bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-800',
  warning: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/30 dark:border-yellow-800',
  info: 'bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800'
}

export default function Toast() {
  const { toasts, removeToast } = useToastStore()
  
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg ${bgColors[toast.type] || bgColors.info} max-w-sm`}
          >
            {icons[toast.type] || icons.info}
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200 flex-1">
              {toast.message}
            </p>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
