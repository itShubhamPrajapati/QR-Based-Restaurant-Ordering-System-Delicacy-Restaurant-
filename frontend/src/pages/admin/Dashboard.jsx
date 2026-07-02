import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  DollarSign, TrendingUp, Clock, RefreshCw, Plus, BarChart3,
  Calendar, ArrowUp, ArrowDown
} from 'lucide-react'
import { getAdminStats, getSalesReport, seedMenu, getAnalytics } from '../../lib/api'
import { useToastStore } from '../../store/store'
import useWebSocket from '../../hooks/useWebSocket'

export default function Dashboard() {
  const [stats, setStats] = useState({
    today_revenue: 0, today_orders: 0, pending_orders: 0,
    preparing_orders: 0, month_revenue: 0, all_time_revenue: 0,
    all_time_orders: 0, menu_items_count: 0
  })
  const [sales, setSales] = useState({ total_revenue: 0, total_orders: 0, items_sold: {} })
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('daily')
  const { addToast } = useToastStore()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [statsData, salesData, analyticsData] = await Promise.all([
        getAdminStats().catch(() => ({})),
        getSalesReport().catch(() => ({ total_revenue: 0, total_orders: 0, items_sold: {} })),
        getAnalytics(period).catch(() => (null))
      ])
      setStats(statsData || {})
      setSales(salesData || { total_revenue: 0, total_orders: 0, items_sold: {} })
      setAnalytics(analyticsData)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => { fetchData() }, [fetchData])

  const handleWebSocketMessage = useCallback((data) => {
    if (data.type === 'new_order' || data.type === 'order_updated' || data.type === 'payment_completed') {
      fetchData()
    }
  }, [fetchData])

  useWebSocket('admin', null, handleWebSocketMessage)

  const handleSeedMenu = async () => {
    try {
      await seedMenu()
      addToast({ type: 'success', message: 'Menu seeded successfully!' })
      fetchData()
    } catch (error) {
      addToast({ type: 'error', message: 'Failed to seed menu' })
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-white/5 border border-white/10 rounded-[32px] animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const statCards = [
    {
      title: "Today's Revenue",
      value: `₹${stats.today_revenue?.toFixed(0) || 0}`,
      icon: <DollarSign className="w-5 h-5 text-emerald-400" />,
      color: 'text-emerald-400',
      trend: '+12%',
      chartPath: "M0,20 Q20,2 45,15 T90,5"
    },
    {
      title: "Today's Orders",
      value: stats.today_orders || 0,
      icon: <TrendingUp className="w-5 h-5 text-indigo-400" />,
      color: 'text-indigo-400',
      trend: '+5%',
      chartPath: "M0,15 T25,25 Q50,5 75,20 T100,5"
    },
    {
      title: 'Pending Orders',
      value: stats.pending_orders || 0,
      icon: <Clock className="w-5 h-5 text-amber-400" />,
      color: 'text-amber-400',
      trend: null,
      chartPath: "M0,10 H30 V25 H60 V10 H90"
    },
    {
      title: 'Menu Items',
      value: stats.menu_items_count || 0,
      icon: <BarChart3 className="w-5 h-5 text-rose-400" />,
      color: 'text-rose-400',
      trend: null,
      chartPath: "M0,25 L15,18 L30,22 L45,10 L60,18 L75,5 L90,15"
    }
  ]

  return (
    <div className="space-y-6 relative z-10">
      {/* Header Container */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-white/[0.02] backdrop-blur-3xl border border-white/10 rounded-[32px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_4px_30px_rgba(0,0,0,0.2)]">
        <div>
          <h1 className="text-2xl font-black tracking-wide text-white uppercase">Sci-Fi Command Deck</h1>
          <p className="text-sm text-gray-400 font-medium mt-0.5">Real-time telemetry and management controls</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-2.5 bg-slate-950/80 border border-white/15 text-slate-100 rounded-2xl focus:outline-none focus:border-indigo-500 text-xs font-bold uppercase tracking-wider cursor-pointer"
          >
            <option value="daily">Telemetry: Daily</option>
            <option value="weekly">Telemetry: Weekly</option>
            <option value="monthly">Telemetry: Monthly</option>
          </select>
          <button
            onClick={fetchData}
            className="p-3 bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 rounded-2xl text-gray-300 hover:text-white transition-all duration-300"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sleek Glass Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, type: 'spring', damping: 20, stiffness: 120 }}
            whileHover={{ y: -4 }}
            className="bg-white/[0.02] backdrop-blur-3xl border border-white/10 rounded-[32px] p-5 flex flex-col justify-between shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_8px_30px_rgba(0,0,0,0.2)] relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] sm:text-xs text-gray-400 font-bold uppercase tracking-wider">{stat.title}</span>
              <div className="p-2 bg-white/5 border border-white/10 rounded-xl">{stat.icon}</div>
            </div>
            
            <div className="flex items-end justify-between mt-2">
              <div>
                <p className="text-3xl font-serif font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-300">
                  {stat.value}
                </p>
                
                {stat.trend && (
                  <div className="flex items-center gap-1 mt-1 text-[10px] font-extrabold uppercase text-emerald-400">
                    <ArrowUp className="w-3 h-3" />
                    <span>{stat.trend}</span>
                  </div>
                )}
              </div>
              
              {/* Animated Mini Sparkline Chart */}
              <div className="w-16 h-8 opacity-70">
                <svg className={stat.color} viewBox="0 0 100 30" fill="none">
                  <motion.path
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 2, delay: i * 0.15, ease: "easeOut" }}
                    d={stat.chartPath}
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Secondary Stats Widgets Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: 'Monthly Gross', value: `₹${stats.month_revenue?.toFixed(0) || 0}`, desc: 'Rolling Revenue' },
          { title: 'All Time Gross', value: `₹${stats.all_time_revenue?.toFixed(0) || 0}`, desc: 'System Total' },
          { title: 'Total Tickets', value: stats.all_time_orders || 0, desc: 'Processed Orders' },
          { title: 'Kitchen Queue', value: stats.preparing_orders || 0, desc: 'Active cooking', isHighlight: true }
        ].map((sec, idx) => (
          <div
            key={idx}
            className="bg-white/[0.01] backdrop-blur-2xl border border-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_4px_20px_rgba(0,0,0,0.1)] rounded-3xl p-4 text-left"
          >
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{sec.title}</p>
            <p className={`text-xl font-extrabold tracking-tight mt-1 ${sec.isHighlight ? 'text-orange-400' : 'text-white'}`}>
              {sec.value}
            </p>
            <p className="text-[10px] text-gray-500 font-medium mt-0.5">{sec.desc}</p>
          </div>
        ))}
      </div>

      {/* Top Sellers Table Block */}
      {sales.items_sold && Object.keys(sales.items_sold).length > 0 && (
        <div className="bg-white/[0.02] backdrop-blur-3xl border border-white/10 rounded-[32px] p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_10px_35px_rgba(0,0,0,0.2)]">
          <h2 className="text-sm font-black text-white mb-4 uppercase tracking-wider border-b border-white/5 pb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
            Top Velocity Menu Items
          </h2>
          <div className="space-y-3">
            {Object.entries(sales.items_sold)
              .sort((a, b) => (b[1]?.revenue || 0) - (a[1]?.revenue || 0))
              .slice(0, 5)
              .map(([name, data], i) => (
                <div key={name} className="flex items-center justify-between p-3.5 bg-white/[0.01] border border-white/5 hover:bg-white/[0.04] rounded-2xl transition-all duration-300">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 bg-white/5 border border-white/10 text-gray-300 rounded-full flex items-center justify-center text-xs font-black shadow-inner">
                      {i + 1}
                    </span>
                    <span className="text-white font-semibold text-sm">{name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-semibold">
                    <span className="text-gray-400">{data?.quantity || 0} unit sales</span>
                    <span className="font-extrabold text-emerald-400">₹{data?.revenue?.toFixed(0) || 0}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Quick Action Masonry Grid */}
      <div className="bg-white/[0.02] backdrop-blur-3xl border border-white/10 rounded-[32px] p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_10px_35px_rgba(0,0,0,0.2)]">
        <h2 className="text-sm font-black text-white mb-5 uppercase tracking-wider border-b border-white/5 pb-3">Operational Command Grid</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.button
            whileHover={{ scale: 1.03, boxShadow: "0 0 20px rgba(99,102,241,0.15)" }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSeedMenu}
            className="p-5 bg-white/[0.02] hover:bg-indigo-500/10 border border-white/10 hover:border-indigo-500/30 rounded-[28px] text-center transition-all duration-300 group flex flex-col items-center justify-center shadow-inner"
          >
            <Plus className="w-6 h-6 text-indigo-400 mb-2 group-hover:scale-110 transition-transform duration-300" />
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-400">Seed menu</p>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.03, boxShadow: "0 0 20px rgba(236,72,153,0.15)" }}
            whileTap={{ scale: 0.95 }}
            onClick={() => window.location.href = '/admin/orders'}
            className="p-5 bg-white/[0.02] hover:bg-rose-500/10 border border-white/10 hover:border-rose-500/30 rounded-[28px] text-center transition-all duration-300 group flex flex-col items-center justify-center shadow-inner"
          >
            <TrendingUp className="w-6 h-6 text-rose-400 mb-2 group-hover:scale-110 transition-transform duration-300" />
            <p className="text-xs font-bold uppercase tracking-wider text-rose-400">View orders</p>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.03, boxShadow: "0 0 20px rgba(34,197,94,0.15)" }}
            whileTap={{ scale: 0.95 }}
            onClick={() => window.location.href = '/admin/analytics'}
            className="p-5 bg-white/[0.02] hover:bg-emerald-500/10 border border-white/10 hover:border-emerald-500/30 rounded-[28px] text-center transition-all duration-300 group flex flex-col items-center justify-center shadow-inner"
          >
            <BarChart3 className="w-6 h-6 text-emerald-400 mb-2 group-hover:scale-110 transition-transform duration-300" />
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">Analytics</p>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.03, boxShadow: "0 0 20px rgba(168,85,247,0.15)" }}
            whileTap={{ scale: 0.95 }}
            onClick={() => window.location.href = '/admin/qr'}
            className="p-5 bg-white/[0.02] hover:bg-purple-500/10 border border-white/10 hover:border-purple-500/30 rounded-[28px] text-center transition-all duration-300 group flex flex-col items-center justify-center shadow-inner"
          >
            <Calendar className="w-6 h-6 text-purple-400 mb-2 group-hover:scale-110 transition-transform duration-300" />
            <p className="text-xs font-bold uppercase tracking-wider text-purple-400">QR codes</p>
          </motion.button>
        </div>
      </div>
    </div>
  )
}
