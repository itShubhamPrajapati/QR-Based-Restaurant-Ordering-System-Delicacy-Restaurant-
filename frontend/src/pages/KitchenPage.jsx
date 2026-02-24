import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Clock, CheckCircle, XCircle, ChefHat, Bell, 
  Timer, AlertTriangle, RefreshCw, Volume2, VolumeX,
  Home, Wifi, MicOff
} from 'lucide-react'
import { getKitchenOrders, updateOrderStatus, getKitchenStats } from '../lib/api'
import useWebSocket from '../hooks/useWebSocket'

const statusConfig = {
  pending: { label: 'New', color: 'bg-yellow-500', text: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/30', action: 'accept' },
  accepted: { label: 'Confirmed', color: 'bg-blue-500', text: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30', action: 'start' },
  preparing: { label: 'Preparing', color: 'bg-orange-500', text: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30', action: 'ready' },
  ready: { label: 'Ready', color: 'bg-green-500', text: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30', action: 'complete' },
  completed: { label: 'Done', color: 'bg-gray-500', text: 'text-gray-600', bg: 'bg-gray-100 dark:bg-gray-700', action: null },
  cancelled: { label: 'Cancelled', color: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30', action: null }
}

export default function KitchenPage() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [stats, setStats] = useState({ 
    pending_orders: 0, 
    preparing_orders: 0, 
    ready_orders: 0, 
    completed_today: 0, 
    total_revenue_today: 0 
  })
  const [loading, setLoading] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [filter, setFilter] = useState('all')
  const [isOnline, setIsOnline] = useState(true) // Default to true, only show offline if confirmed
  const [newOrderAlert, setNewOrderAlert] = useState(false)
  const [lastOrderCount, setLastOrderCount] = useState(0)
  const audioRef = useRef(null)
  const processedOrdersRef = useRef(new Set())
  
  const fetchOrders = useCallback(async () => {
    try {
      const [ordersData, statsData] = await Promise.all([
        getKitchenOrders(filter !== 'all' ? filter : null),
        getKitchenStats()
      ])
      
      // Deduplicate orders by ID to prevent duplicates
      const uniqueOrdersMap = new Map()
      ordersData.forEach(order => {
        if (!uniqueOrdersMap.has(order.id)) {
          uniqueOrdersMap.set(order.id, order)
        }
      })
      const uniqueOrders = Array.from(uniqueOrdersMap.values())
      
      const currentPending = uniqueOrders.filter(o => o.status === 'pending')
      const newOrders = currentPending.filter(o => !processedOrdersRef.current.has(o.id))
      
      if (newOrders.length > 0 && lastOrderCount > 0) {
        setNewOrderAlert(true)
        if (soundEnabled && audioRef.current) {
          audioRef.current.play().catch(() => {})
        }
        if (navigator.vibrate) {
          navigator.vibrate([200, 100, 200])
        }
      }
      
      newOrders.forEach(o => processedOrdersRef.current.add(o.id))
      
      const recentOrderIds = new Set(uniqueOrders.map(o => o.id))
      processedOrdersRef.current.forEach(id => {
        if (!recentOrderIds.has(id)) {
          processedOrdersRef.current.delete(id)
        }
      })
      
      setOrders(uniqueOrders)
      setStats(statsData)
      setIsOnline(true) // Successfully fetched, so we're online
      
      const pendingCount = currentPending.length
      setLastOrderCount(pendingCount)
      
    } catch (error) {
      console.error('Failed to fetch orders:', error)
    } finally {
      setLoading(false)
    }
  }, [filter, lastOrderCount, soundEnabled])
  
  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 3000)
    return () => clearInterval(interval)
  }, [fetchOrders])
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => {
      // Verify offline status with a ping
      const verifyOffline = async () => {
        try {
          await getKitchenOrders()
          setIsOnline(true)
        } catch (e) {
          setIsOnline(false)
        }
      }
      verifyOffline()
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])
  
  const handleWebSocketMessage = useCallback((data) => {
    if (data.type === 'new_order') {
      processedOrdersRef.current.add(data.order.id)
      fetchOrders()
      setNewOrderAlert(true)
      if (soundEnabled && audioRef.current) {
        audioRef.current.play().catch(() => {})
      }
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200])
      }
    } else if (data.type === 'order_updated' || data.type === 'payment_completed') {
      fetchOrders()
    }
  }, [fetchOrders, soundEnabled])
  
  useWebSocket('kitchen', null, handleWebSocketMessage)
  
  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus)
      fetchOrders()
    } catch (error) {
      console.error('Failed to update order:', error)
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {!isOnline && (
        <motion.div
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          className="bg-red-500 text-white px-4 py-2 flex items-center justify-center gap-2 sticky top-0 z-50"
        >
          <MicOff className="w-4 h-4" />
          <span className="text-sm font-medium">Offline - Changes may not sync</span>
        </motion.div>
      )}
      
      <header className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-40">
        <div className="px-3 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/table/1')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <Home className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
                <ChefHat className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-gray-900 dark:text-white">Kitchen Display</h1>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  {isOnline ? <Wifi className="w-3 h-3 text-green-500" /> : <MicOff className="w-3 h-3 text-red-500" />}
                  Live
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-2 rounded-lg ${soundEnabled ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}
              >
                {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeOff className="w-5 h-5" />}
              </button>
              
              <button
                onClick={fetchOrders}
                className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-1">
            {[
              { label: 'Pending', value: stats.pending_orders, color: 'bg-yellow-500' },
              { label: 'Cooking', value: stats.preparing_orders, color: 'bg-orange-500' },
              { label: 'Ready', value: stats.ready_orders, color: 'bg-green-500' },
              { label: 'Done', value: stats.completed_today, color: 'bg-gray-500' }
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex-shrink-0 bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2 text-center"
              >
                <p className={`text-lg font-bold ${stat.color.replace('bg-', 'text-')}`}>{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>
          
          <div className="flex gap-2 mt-3 overflow-x-auto">
            {['all', 'pending', 'accepted', 'preparing', 'ready'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  filter === status
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                {status === 'all' ? 'All' : statusConfig[status]?.label || status}
              </button>
            ))}
          </div>
        </div>
        
        <AnimatePresence>
          {newOrderAlert && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="bg-yellow-500 text-white px-3 py-2 flex items-center justify-center gap-2 overflow-hidden"
            >
              <Bell className="w-4 h-4 animate-bounce" />
              <span className="font-bold text-sm">New Order Received!</span>
              <button
                onClick={() => setNewOrderAlert(false)}
                className="ml-auto p-1"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
      
      <main className="p-3">
        {loading && orders.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 skeleton h-40" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16">
            <ChefHat className="w-20 h-20 text-gray-300 mx-auto mb-4" />
            <p className="text-xl text-gray-500">No orders yet</p>
            <p className="text-gray-400">New orders will appear here</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {orders.map((order, index) => (
              <KitchenOrderCard
                key={order.id}
                order={order}
                index={index}
                onStatusUpdate={handleStatusUpdate}
              />
            ))}
          </div>
        )}
      </main>
      
      <audio ref={audioRef} src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleAs7ndeui0YVJjWcx66NWRglN5u0sJ1aGiY4ma+nhFYYJj2XsaecWSIlOpS0rZdgGiY9maujmm1CJDiWsaWbbkMlPJazqJxvRCQ8lq+imnFCJTyWraGddEQkO5Swn5yCRiM7lK2hnYVGJDuTq6Ceh0YkO5OooJ6HRiQ7k6agnodGJDqSqaCeh0YkOpKooJ6HRiQ6kqignodGJDo=" preload="auto" />
    </div>
  )
}

function KitchenOrderCard({ order, index, onStatusUpdate }) {
  const config = statusConfig[order.status] || statusConfig.pending
  // Use time_elapsed from backend (calculated in UTC) to avoid timezone issues
  const elapsedMinutes = order.time_elapsed || Math.floor((new Date() - new Date(order.created_at)) / 60000)
  const isUrgent = elapsedMinutes > 15 && !['ready', 'completed', 'cancelled'].includes(order.status)
  
  // Format time as HH:MM
  const formatTime = (date) => {
    const d = new Date(date)
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  }
  
  // Format elapsed time in a more readable way
  const formatElapsedTime = (minutes) => {
    if (minutes < 60) {
      return `${minutes}m`
    }
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }
  
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: index * 0.05 }}
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-md border-2 overflow-hidden ${
        isUrgent ? 'border-red-500 animate-pulse' : 'border-transparent'
      }`}
    >
      <div className={`px-4 py-3 flex items-center justify-between ${config.bg}`}>
        <div className="flex items-center gap-2">
          <span className="font-bold text-gray-900 dark:text-white">Table {order.table_number}</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
            {config.label}
          </span>
        </div>
        
        <div className={`flex items-center gap-1 ${isUrgent ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
          <Timer className="w-4 h-4" />
          <span className="text-sm font-medium">{formatElapsedTime(elapsedMinutes)}</span>
          {isUrgent && <AlertTriangle className="w-4 h-4" />}
        </div>
      </div>
      
      <div className="p-4">
        <div className="space-y-2 mb-3">
          {order.items.map((item, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-xs font-bold">
                  {item.quantity}
                </span>
                <span className="text-gray-900 dark:text-white text-sm">
                  {item.name}
                  {item.half_full && <span className="text-gray-400 ml-1">({item.half_full})</span>}
                </span>
              </div>
            </div>
          ))}
        </div>
        
        {order.notes && (
          <div className="mb-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <p className="text-xs text-yellow-700 dark:text-yellow-300">Note: {order.notes}</p>
          </div>
        )}
        
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
          <span className={`text-xs px-2 py-1 rounded-full ${
            order.payment_status === 'paid'
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          }`}>
            {order.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
          </span>
          
          {config.action && (
            <button
              onClick={() => onStatusUpdate(order.id, config.action === 'accept' ? 'accepted' : config.action === 'start' ? 'preparing' : config.action === 'ready' ? 'ready' : 'completed')}
              className={`px-4 py-2 rounded-lg text-white text-sm font-medium ${
                config.action === 'accept' ? 'bg-blue-500 hover:bg-blue-600' :
                config.action === 'start' ? 'bg-orange-500 hover:bg-orange-600' :
                config.action === 'ready' ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-500'
              }`}
            >
              {config.action === 'accept' ? 'Accept' :
               config.action === 'start' ? 'Start' :
               config.action === 'ready' ? 'Ready' : 'Done'}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
