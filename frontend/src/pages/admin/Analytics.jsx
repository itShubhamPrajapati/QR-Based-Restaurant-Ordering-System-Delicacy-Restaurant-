import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, TrendingUp, DollarSign, ShoppingCart, Calendar, Download } from 'lucide-react'
import { getAnalytics, getSalesReport, exportData } from '../../lib/api'
import { useToastStore } from '../../store/store'

export default function Analytics() {
  const [period, setPeriod] = useState('daily')
  const [analytics, setAnalytics] = useState(null)
  const [sales, setSales] = useState(null)
  const [loading, setLoading] = useState(true)
  const { addToast } = useToastStore()

  useEffect(() => {
    fetchData()
  }, [period])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [analyticsData, salesData] = await Promise.all([
        getAnalytics(period).catch(() => null),
        getSalesReport().catch(() => null)
      ])
      setAnalytics(analyticsData)
      setSales(salesData)
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    try {
      const { blob, filename } = await exportData('csv')
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      addToast({ type: 'success', message: 'Report exported successfully' })
    } catch (error) {
      addToast({ type: 'error', message: 'Failed to export report' })
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-64 skeleton rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 skeleton rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  const periodData = analytics?.period_data || {}
  const periodLabels = Object.keys(periodData).sort()
  const periodRevenue = periodLabels.map(d => periodData[d]?.revenue || 0)
  const periodOrders = periodLabels.map(d => periodData[d]?.orders || 0)
  const maxRevenue = Math.max(...periodRevenue, 1)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
          <p className="text-gray-500">Revenue and order analytics</p>
        </div>
        <div className="flex gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
          >
            <option value="daily">Last 7 Days</option>
            <option value="weekly">Last 4 Weeks</option>
            <option value="monthly">Last 3 Months</option>
          </select>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
          >
            <Download className="w-5 h-5" />
            Export
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-green-400 to-green-600 rounded-xl p-4 text-white"
        >
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5" />
            <span className="text-sm text-green-100">Total Revenue</span>
          </div>
          <p className="text-2xl font-bold">₹{analytics?.total_revenue?.toFixed(0) || 0}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl p-4 text-white"
        >
          <div className="flex items-center gap-2 mb-2">
            <ShoppingCart className="w-5 h-5" />
            <span className="text-sm text-blue-100">Total Orders</span>
          </div>
          <p className="text-2xl font-bold">{analytics?.total_orders || 0}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl p-4 text-white"
        >
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5" />
            <span className="text-sm text-orange-100">Avg Order Value</span>
          </div>
          <p className="text-2xl font-bold">
            ₹{analytics?.total_orders > 0 
              ? (analytics.total_revenue / analytics.total_orders).toFixed(0) 
              : 0}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl p-4 text-white"
        >
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-5 h-5" />
            <span className="text-sm text-purple-100">Items Tracked</span>
          </div>
          <p className="text-2xl font-bold">{analytics?.top_items?.length || 0}</p>
        </motion.div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Revenue Over Time
        </h2>
        {periodLabels.length > 0 ? (
          <div className="h-64 flex items-end gap-2">
            {periodLabels.map((label, i) => (
              <div key={label} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex flex-col items-center justify-end h-48">
                  <div
                    className="w-full max-w-16 bg-primary-500 rounded-t-lg transition-all duration-500"
                    style={{ height: `${(periodRevenue[i] / maxRevenue) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 truncate w-full text-center">
                  {period === 'monthly' ? label : label.slice(5)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center">
            <p className="text-gray-500">No data available</p>
          </div>
        )}
      </div>

      {/* Top Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Top Selling Items
          </h2>
          {analytics?.top_items && analytics.top_items.length > 0 ? (
            <div className="space-y-3">
              {analytics.top_items.slice(0, 10).map(([name, quantity], i) => (
                <div key={name} className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-primary-100 dark:bg-primary-900/30 text-primary-600 rounded-full flex items-center justify-center text-sm font-bold">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-gray-900 dark:text-white font-medium">{name}</p>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
                      <div
                        className="bg-primary-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${(quantity / analytics.top_items[0][1]) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm text-gray-500">{quantity}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No sales data available</p>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Sales Summary
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <span className="text-gray-600 dark:text-gray-300">Total Revenue</span>
              <span className="font-bold text-gray-900 dark:text-white">
                ₹{sales?.total_revenue?.toFixed(2) || 0}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <span className="text-gray-600 dark:text-gray-300">Total Orders</span>
              <span className="font-bold text-gray-900 dark:text-white">
                {sales?.total_orders || 0}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <span className="text-gray-600 dark:text-gray-300">Avg Order Value</span>
              <span className="font-bold text-gray-900 dark:text-white">
                ₹{sales?.total_orders > 0 
                  ? (sales.total_revenue / sales.total_orders).toFixed(2) 
                  : 0}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <span className="text-gray-600 dark:text-gray-300">Period</span>
              <span className="font-bold text-gray-900 dark:text-white capitalize">{period}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
