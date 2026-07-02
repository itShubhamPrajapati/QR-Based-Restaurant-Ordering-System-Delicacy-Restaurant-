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
import LiquidBackground from '../components/LiquidBackground'
import GlassLogin from '../components/GlassLogin'

const statusConfig = {
  pending: { label: 'New', color: 'bg-amber-500 shadow-[0_0_10px_#f59e0b]', text: 'text-amber-400', bg: 'bg-amber-500/10 border border-amber-500/20', action: 'accept' },
  accepted: { label: 'Confirmed', color: 'bg-blue-500 shadow-[0_0_10px_#3b82f6]', text: 'text-blue-400', bg: 'bg-blue-500/10 border border-blue-500/20', action: 'start' },
  preparing: { label: 'Cooking', color: 'bg-orange-500 shadow-[0_0_10px_#f97316]', text: 'text-orange-400', bg: 'bg-orange-500/10 border border-orange-500/20', action: 'ready' },
  ready: { label: 'Ready', color: 'bg-emerald-500 shadow-[0_0_10px_#10b981]', text: 'text-emerald-400', bg: 'bg-emerald-500/10 border border-emerald-500/20', action: 'complete' },
  completed: { label: 'Done', color: 'bg-slate-500', text: 'text-slate-400', bg: 'bg-white/5 border border-white/10', action: null },
  cancelled: { label: 'Cancelled', color: 'bg-rose-500', text: 'text-rose-400', bg: 'bg-rose-500/10 border border-rose-500/20', action: null }
}

export default function KitchenPage() {
  const navigate = useNavigate()
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('admin_token'))
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
  const [isOnline, setIsOnline] = useState(true)
  const [newOrderAlert, setNewOrderAlert] = useState(false)
  const [lastOrderCount, setLastOrderCount] = useState(0)
  const audioRef = useRef(null)
  const processedOrdersRef = useRef(new Set())
  
  const fetchOrders = useCallback(async () => {
    if (!localStorage.getItem('admin_token')) {
      setIsAuthenticated(false)
      return
    }
    try {
      const [ordersData, statsData] = await Promise.all([
        getKitchenOrders(filter !== 'all' ? filter : null),
        getKitchenStats()
      ])
      
      const ordersArray = Array.isArray(ordersData) ? ordersData : []
      const uniqueOrdersMap = new Map()
      ordersArray.forEach(order => {
        if (order && order.id) {
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
      setStats(statsData || {
        pending_orders: 0, 
        preparing_orders: 0, 
        ready_orders: 0, 
        completed_today: 0, 
        total_revenue_today: 0
      })
      setIsOnline(true)
      
      const pendingCount = currentPending.length
      setLastOrderCount(pendingCount)
      
    } catch (error) {
      console.error('KitchenPage: Failed to fetch orders/stats:', error.message || error)
    } finally {
      setLoading(false)
    }
  }, [filter, lastOrderCount, soundEnabled])
  
  useEffect(() => {
    if (!isAuthenticated) return
    fetchOrders()
    const interval = setInterval(fetchOrders, 3000)
    return () => clearInterval(interval)
  }, [fetchOrders, isAuthenticated])
  
  useEffect(() => {
    if (!isAuthenticated) return
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => {
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
  }, [isAuthenticated])
  
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
  
  if (!isAuthenticated) {
    return <GlassLogin onLoginSuccess={() => setIsAuthenticated(true)} />
  }

  return (
    <div className="min-h-screen text-slate-100 relative overflow-x-hidden font-sans pb-16">
      <LiquidBackground />

      {!isOnline && (
        <motion.div
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          className="bg-rose-500/90 text-white px-4 py-2 flex items-center justify-center gap-2 sticky top-0 z-50 backdrop-blur-md"
        >
          <MicOff className="w-4 h-4 animate-pulse" />
          <span className="text-sm font-semibold">Offline Mode - Sync Suspended</span>
        </motion.div>
      )}
      
      {/* Floating Pill-Shaped Glass Header */}
      <header className="max-w-7xl mx-auto mt-6 px-4">
        <div className="bg-white/[0.02] backdrop-blur-3xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_4px_30px_rgba(0,0,0,0.2)] rounded-[32px] p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/table/1')}
                className="p-3 bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 rounded-2xl text-gray-300 hover:text-white transition-all duration-300"
              >
                <Home className="w-5 h-5" />
              </button>
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-rose-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/10">
                <ChefHat className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  Kitchen Live Dashboard
                </h1>
                <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-0.5 font-medium">
                  {isOnline ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                      <span className="text-emerald-400">WebSocket Connected</span>
                    </>
                  ) : (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      <span className="text-rose-400">Offline</span>
                    </>
                  )}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 self-end sm:self-center">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-3 rounded-2xl border transition-all duration-300 ${
                  soundEnabled 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20' 
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20'
                }`}
              >
                {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
              
              <button
                onClick={fetchOrders}
                className="p-3 bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 rounded-2xl text-gray-300 hover:text-white transition-all duration-300"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
          
          {/* Quick Glass Stats Indicators */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            {[
              { label: 'Pending', value: stats.pending_orders, color: 'text-amber-400', border: 'border-amber-500/20', bg: 'bg-amber-500/5' },
              { label: 'Cooking', value: stats.preparing_orders, color: 'text-orange-400', border: 'border-orange-500/20', bg: 'bg-orange-500/5' },
              { label: 'Ready', value: stats.ready_orders, color: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-500/5' },
              { label: 'Done Today', value: stats.completed_today, color: 'text-slate-300', border: 'border-white/10', bg: 'bg-white/5' }
            ].map((stat) => (
              <div
                key={stat.label}
                className={`rounded-2xl p-3.5 border backdrop-blur-3xl ${stat.bg} ${stat.border}`}
              >
                <p className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${stat.color}`}>{stat.value}</p>
                <p className="text-[10px] sm:text-xs text-gray-400 font-bold uppercase tracking-wider mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
          
          {/* Live Quick Filters */}
          <div className="flex gap-2.5 mt-5 overflow-x-auto pb-1">
            {['all', 'pending', 'accepted', 'preparing', 'ready'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 border ${
                  filter === status
                    ? 'bg-gradient-to-r from-indigo-500 to-rose-500 text-white border-transparent shadow-lg shadow-indigo-500/20'
                    : 'bg-white/[0.03] text-gray-400 border-white/5 hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                {status === 'all' ? 'All Orders' : statusConfig[status]?.label || status}
              </button>
            ))}
          </div>
        </div>
        
        {/* New Order Banner Alarm */}
        <AnimatePresence>
          {newOrderAlert && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-4 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold px-5 py-3 rounded-2xl flex items-center justify-center gap-2 overflow-hidden shadow-lg shadow-amber-500/10"
            >
              <Bell className="w-5 h-5 animate-bounce" />
              <span className="text-sm tracking-wider uppercase">New Order Received! Action Required</span>
              <button
                onClick={() => setNewOrderAlert(false)}
                className="ml-auto p-1 hover:bg-slate-950/10 rounded-full"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
      
      {/* Live Orders Floating Grid */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {loading && orders.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 rounded-[32px] bg-white/[0.02] border border-white/10 backdrop-blur-3xl animate-pulse shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          /* Sleek Glowing SVG Empty State */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20 bg-white/[0.01] border border-white/5 backdrop-blur-3xl rounded-[32px] max-w-md mx-auto mt-12 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_10px_40px_rgba(0,0,0,0.3)]"
          >
            <motion.div
              animate={{ scale: [1, 1.06, 1], rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-indigo-500/10 to-rose-500/10 border border-white/10 rounded-full flex items-center justify-center shadow-lg"
            >
              <ChefHat className="w-11 h-11 text-indigo-400" />
            </motion.div>
            <h3 className="text-xl font-extrabold text-white tracking-wide uppercase">All Caught Up</h3>
            <p className="text-sm text-gray-400 mt-2 px-8 leading-relaxed">
              Incoming orders will float in here automatically. Keep your blades polished and cooking fires high!
            </p>
          </motion.div>
        ) : (
          <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {orders.map((order, index) => (
                <KitchenOrderCard
                  key={order.id}
                  order={order}
                  index={index}
                  onStatusUpdate={handleStatusUpdate}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </main>
      
      <audio ref={audioRef} src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleAs7ndeui0YVJjWcx66NWRglN5u0sJ1aGiY4ma+nhFYYJj2XsaecWSIlOpS0rZdgGiY9maujmm1CJDiWsaWbbkMlPJazqJxvRCQ8lq+imnFCJTyWraGddEQkO5Swn5yCRiM7lK2hnYVGJDuTq6Ceh0YkO5OooJ6HRiQ7k6agnodGJDqSqaCeh0YkOpKooJ6HRiQ6kqignodGJDo=" preload="auto" />
    </div>
  )
}

function KitchenOrderCard({ order, index, onStatusUpdate }) {
  const config = statusConfig[order.status] || statusConfig.pending
  const elapsedMinutes = order.time_elapsed || Math.floor((new Date() - new Date(order.created_at)) / 60000)
  const isUrgent = elapsedMinutes > 15 && !['ready', 'completed', 'cancelled'].includes(order.status)
  
  const formatElapsedTime = (minutes) => {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }
  
  return (
    <motion.div
      layout
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      transition={{ type: 'spring', damping: 20, stiffness: 120 }}
      className={`relative bg-white/[0.02] backdrop-blur-3xl border border-white/10 rounded-[32px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_10px_30px_rgba(0,0,0,0.3)] hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.12),0_15px_40px_rgba(0,0,0,0.4)] transition-all duration-300 overflow-hidden flex flex-col justify-between h-full ${
        isUrgent ? 'ring-2 ring-rose-500/30' : ''
      }`}
    >
      <div>
        {/* Card Header with glass colors */}
        <div className={`px-5 py-4 flex items-center justify-between border-b border-white/5 ${config.bg}`}>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-white text-base tracking-wide">T-{order.table_number}</span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${config.bg} ${config.text}`}>
              {config.label}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {isUrgent ? (
              <div className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 px-2.5 py-0.5 rounded-full text-xs font-semibold shadow-[0_0_15px_rgba(244,63,94,0.3)]">
                {/* Pulsating red urgency dot */}
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500 shadow-[0_0_8px_#ef4444]"></span>
                </span>
                Overdue ({formatElapsedTime(elapsedMinutes)})
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-white/5 border border-white/5 text-gray-300 px-2.5 py-0.5 rounded-full text-xs font-medium">
                {/* Pulsating amber/yellow dot for normal cooking items */}
                {order.status === 'preparing' && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500 shadow-[0_0_8px_#f59e0b]"></span>
                  </span>
                )}
                <Timer className="w-3.5 h-3.5" />
                <span>{formatElapsedTime(elapsedMinutes)}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Order Items list */}
        <div className="p-5 space-y-3">
          {order.items.map((item, i) => (
            <div key={i} className="flex items-center justify-between border-b border-white/5 pb-2.5 last:border-0 last:pb-0">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 bg-white/10 border border-white/10 rounded-full flex items-center justify-center text-xs font-extrabold text-white">
                  {item.quantity}
                </span>
                <span className="text-white font-medium text-sm">
                  {item.name}
                  {item.half_full && <span className="text-xs text-indigo-400 ml-1.5 uppercase font-bold">({item.half_full})</span>}
                </span>
              </div>
            </div>
          ))}
        </div>
        
        {/* Spec instructions */}
        {order.notes && (
          <div className="mx-5 mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
            <p className="text-xs text-amber-400 leading-relaxed"><span className="font-bold">Instructions:</span> {order.notes}</p>
          </div>
        )}
      </div>
      
      {/* Footer controls inside Card */}
      <div className="p-5 border-t border-white/5 flex items-center justify-between bg-white/[0.01]">
        <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider border ${
          order.payment_status === 'paid'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
        }`}>
          {order.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
        </span>
        
        {config.action && (
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => onStatusUpdate(order.id, config.action === 'accept' ? 'accepted' : config.action === 'start' ? 'preparing' : config.action === 'ready' ? 'ready' : 'completed')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold uppercase tracking-wider text-white shadow-lg transition-all duration-300 ${
              config.action === 'accept' ? 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 shadow-blue-500/10' :
              config.action === 'start' ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-orange-500/10' :
              config.action === 'ready' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-emerald-500/10' : 'bg-slate-650'
            }`}
          >
            {config.action === 'accept' ? 'Accept' :
             config.action === 'start' ? 'Cook' :
             config.action === 'ready' ? 'Deliver' : 'Done'}
          </motion.button>
        )}
      </div>
    </motion.div>
  )
}
