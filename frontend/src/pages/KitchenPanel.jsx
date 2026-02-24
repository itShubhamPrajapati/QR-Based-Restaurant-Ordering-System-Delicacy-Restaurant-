import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Clock, CheckCircle, XCircle, ChefHat, Bell, 
  RefreshCw, Volume2, VolumeX, Home, BarChart3 
} from 'lucide-react'
import axios from 'axios'
import { useWebSocketStore } from '../store'

export default function KitchenPanel() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [filter, setFilter] = useState('active')
  const audioRef = useRef(null)
  
  const { connect, setMessageHandler, disconnect } = useWebSocketStore()
  
  useEffect(() => {
    fetchOrders()
    
    // Connect to WebSocket
    const { ws } = connect('kitchen')
    
    setMessageHandler((data) => {
      if (data.type === 'new_order') {
        playSound()
        fetchOrders()
      }
    })
    
    return () => {
      disconnect()
    }
  }, [])
  
  const playSound = () => {
    if (soundEnabled) {
      // Create a simple beep sound
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.frequency.value = 800
      oscillator.type = 'sine'
      gainNode.gain.value = 0.3
      
      oscillator.start()
      
      setTimeout(() => {
        oscillator.stop()
        audioContext.close()
      }, 200)
    }
  }
  
  const fetchOrders = async () => {
    try {
      const response = await axios.get('/api/kitchen/orders')
      setOrders(response.data.orders)
    } catch (error) {
      console.error('Failed to fetch orders:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const handleStatusUpdate = async (orderId, status) => {
    try {
      await axios.put(`/api/orders/${orderId}/status`, { status })
      fetchOrders()
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }
  
  const getFilteredOrders = () => {
    if (filter === 'active') {
      return orders.filter(o => ['pending', 'accepted', 'preparing'].includes(o.order_status))
    }
    return orders
  }
  
  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-500',
      accepted: 'bg-blue-500',
      preparing: 'bg-orange-500',
      ready: 'bg-green-500',
      completed: 'bg-gray-500',
      rejected: 'bg-red-500'
    }
    return styles[status] || 'bg-gray-500'
  }
  
  const getTimeSinceOrder = (createdAt) => {
    const minutes = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000)
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes} min ago`
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m ago`
  }
  
  const stats = {
    pending: orders.filter(o => o.order_status === 'pending').length,
    preparing: orders.filter(o => o.order_status === 'preparing').length,
    ready: orders.filter(o => o.order_status === 'ready').length
  }
  
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-gray-900 text-white sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700"
                >
                  <Home className="w-5 h-5" />
                </motion.button>
              </Link>
              <h1 className="text-xl font-bold">🍳 Kitchen Panel</h1>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Stats */}
              <div className="hidden sm:flex items-center gap-3">
                <div className="flex items-center gap-1 bg-yellow-500/20 px-3 py-1 rounded-full">
                  <Clock className="w-4 h-4 text-yellow-500" />
                  <span className="font-semibold">{stats.pending}</span>
                </div>
                <div className="flex items-center gap-1 bg-orange-500/20 px-3 py-1 rounded-full">
                  <ChefHat className="w-4 h-4 text-orange-500" />
                  <span className="font-semibold">{stats.preparing}</span>
                </div>
                <div className="flex items-center gap-1 bg-green-500/20 px-3 py-1 rounded-full">
                  <Bell className="w-4 h-4 text-green-500" />
                  <span className="font-semibold">{stats.ready}</span>
                </div>
              </div>
              
              {/* Sound Toggle */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-2 rounded-xl ${soundEnabled ? 'bg-green-500' : 'bg-gray-700'}`}
              >
                {soundEnabled ? (
                  <Volume2 className="w-5 h-5" />
                ) : (
                  <VolumeX className="w-5 h-5" />
                )}
              </motion.button>
              
              {/* Refresh */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={fetchOrders}
                className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700"
              >
                <RefreshCw className="w-5 h-5" />
              </motion.button>
              
              {/* Admin Link */}
              <Link to="/admin">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  className="p-2 rounded-xl bg-primary-500 hover:bg-primary-600"
                >
                  <BarChart3 className="w-5 h-5" />
                </motion.button>
              </Link>
            </div>
          </div>
        </div>
      </header>
      
      {/* Filter Tabs */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-4 py-2">
          <div className="flex gap-2">
            {[
              { id: 'active', label: 'Active' },
              { id: 'pending', label: 'Pending' },
              { id: 'accepted', label: 'Accepted' },
              { id: 'preparing', label: 'Preparing' },
              { id: 'ready', label: 'Ready' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === tab.id
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Orders Grid */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full"
            />
          </div>
        ) : getFilteredOrders().length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <ChefHat className="w-12 h-12 text-gray-400" />
            </div>
            <h2 className="text-xl font-bold mb-2 dark:text-white">No Active Orders</h2>
            <p className="text-gray-500">New orders will appear here</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {getFilteredOrders().map((order, index) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                  className="card overflow-hidden"
                >
                  {/* Order Header */}
                  <div className={`${getStatusBadge(order.order_status)} text-white p-4`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-lg">Table {order.table_number}</h3>
                        <p className="text-sm opacity-80">{order.order_number}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">{getTimeSinceOrder(order.created_at)}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Order Items */}
                  <div className="p-4">
                    <div className="space-y-2 mb-4">
                      {order.items.map((item, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <span className="font-semibold text-primary-600 dark:text-primary-400 w-6">
                            {item.quantity}x
                          </span>
                          <span className="flex-1 dark:text-gray-300">
                            {item.name}
                          </span>
                          <span className="text-xs text-gray-500 uppercase">
                            {item.size}
                          </span>
                        </div>
                      ))}
                    </div>
                    
                    {/* Special Notes */}
                    {order.special_notes && (
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded-lg mb-4">
                        <p className="text-xs text-yellow-800 dark:text-yellow-300">
                          📝 {order.special_notes}
                        </p>
                      </div>
                    )}
                    
                    {/* Customer Info */}
                    <p className="text-sm text-gray-500 mb-4">
                      Customer: {order.customer_name} • {order.customer_phone}
                    </p>
                    
                    {/* Actions */}
                    <div className="flex gap-2">
                      {order.order_status === 'pending' && (
                        <>
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleStatusUpdate(order.id, 'accepted')}
                            className="flex-1 btn-success py-2 flex items-center justify-center gap-1"
                          >
                            <CheckCircle className="w-4 h-4" /> Accept
                          </motion.button>
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleStatusUpdate(order.id, 'rejected')}
                            className="flex-1 btn-danger py-2 flex items-center justify-center gap-1"
                          >
                            <XCircle className="w-4 h-4" /> Reject
                          </motion.button>
                        </>
                      )}
                      
                      {order.order_status === 'accepted' && (
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleStatusUpdate(order.id, 'preparing')}
                          className="w-full btn-primary py-2 flex items-center justify-center gap-1"
                        >
                          <ChefHat className="w-4 h-4" /> Start Preparing
                        </motion.button>
                      )}
                      
                      {order.order_status === 'preparing' && (
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleStatusUpdate(order.id, 'ready')}
                          className="w-full btn-success py-2 flex items-center justify-center gap-1"
                        >
                          <Bell className="w-4 h-4" /> Mark Ready
                        </motion.button>
                      )}
                      
                      {order.order_status === 'ready' && (
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleStatusUpdate(order.id, 'completed')}
                          className="w-full btn-secondary py-2"
                        >
                          Complete Order
                        </motion.button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
