import { useToastStore } from '../store'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore()
  
  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />
      default:
        return <Info className="w-5 h-5 text-blue-500" />
    }
  }
  
  const getBgColor = (type) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 dark:bg-green-900/50 border-green-200 dark:border-green-700'
      case 'error':
        return 'bg-red-50 dark:bg-red-900/50 border-red-200 dark:border-red-700'
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/50 border-yellow-200 dark:border-yellow-700'
      default:
        return 'bg-blue-50 dark:bg-blue-900/50 border-blue-200 dark:border-blue-700'
    }
  }
  
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast ${getBgColor(toast.type)} border flex items-center gap-3 min-w-[280px] max-w-md`}
        >
          {getIcon(toast.type)}
          <p className="flex-1 text-gray-800 dark:text-gray-200 text-sm">
            {toast.message}
          </p>
          <button
            onClick={() => removeToast(toast.id)}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      ))}
    </div>
  )
}
