import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  Search, CheckCircle, Clock, ChefHat, Star, 
  Truck, Download, Home, Utensils
} from 'lucide-react'
import { trackOrder, getBill } from '../lib/api'
import { useToastStore } from '../store/store'

const statusSteps = [
  { key: 'pending', label: 'Order Placed', icon: Clock, color: 'bg-yellow-500' },
  { key: 'accepted', label: 'Confirmed', icon: CheckCircle, color: 'bg-blue-500' },
  { key: 'preparing', label: 'Preparing', icon: ChefHat, color: 'bg-orange-500' },
  { key: 'ready', label: 'Ready', icon: Star, color: 'bg-green-500' },
  { key: 'completed', label: 'Delivered', icon: Truck, color: 'bg-gray-500' },
]

export default function OrderStatusPage() {
  const { orderNumber } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchNumber, setSearchNumber] = useState(orderNumber || '')
  const [showBill, setShowBill] = useState(false)
  const [billData, setBillData] = useState(null)
  const { addToast } = useToastStore()

  useEffect(() => {
    if (orderNumber) {
      fetchOrder(orderNumber)
    }
  }, [orderNumber])

  const fetchOrder = async (orderNum) => {
    if (!orderNum) return
    
    try {
      setLoading(true)
      const data = await trackOrder(orderNum)
      setOrder(data)
    } catch (error) {
      addToast({ type: 'error', message: 'Order not found' })
      setOrder(null)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchNumber.trim()) {
      navigate(`/order/${searchNumber.trim()}`)
      fetchOrder(searchNumber.trim())
    }
  }

  const handleDownloadBill = async () => {
    if (!order) return
    
    try {
      const bill = await getBill(order.order.order_number)
      setBillData(bill)
      setShowBill(true)
      
      // Generate simple text-based bill
      setTimeout(() => {
        downloadBillPDF(bill)
      }, 100)
    } catch (error) {
      addToast({ type: 'error', message: 'Failed to generate bill' })
    }
  }

  const downloadBillPDF = (bill) => {
    // Simple bill generation using window.print
    const billWindow = window.open('', '_blank')
    billWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bill - ${bill.order_number}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .header { text-align: center; margin-bottom: 20px; }
          .title { font-size: 24px; font-weight: bold; }
          .details { margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .total { font-weight: bold; font-size: 18px; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">DELICACY RESTAURANT</div>
          <div>Thank you for dining with us!</div>
        </div>
        <div class="details">
          <p><strong>Order #:</strong> ${bill.order_number}</p>
          <p><strong>Table:</strong> ${bill.table_number}</p>
          <p><strong>Date:</strong> ${bill.date}</p>
          <p><strong>Customer:</strong> ${bill.customer_name}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${bill.items.map(item => `
              <tr>
                <td>${item.name} ${item.half_full ? '(' + item.half_full + ')' : ''}</td>
                <td>${item.quantity}</td>
                <td>₹${item.price}</td>
                <td>₹${(item.price * item.quantity).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="total">
          <p>Subtotal: ₹${bill.subtotal.toFixed(2)}</p>
          <p>GST (5%): ₹${bill.gst.toFixed(2)}</p>
          <p>Total: ₹${bill.total.toFixed(2)}</p>
        </div>
        <div class="footer">
          <p>Payment Status: ${bill.payment_status.toUpperCase()}</p>
          <p>${bill.payment_id ? 'Payment ID: ' + bill.payment_id : ''}</p>
          <p>Visit us again!</p>
        </div>
      </body>
      </html>
    `)
    billWindow.document.close()
    billWindow.print()
  }

  const getCurrentStepIndex = () => {
    if (!order) return 0
    const statusOrder = ['pending', 'accepted', 'preparing', 'ready', 'completed']
    return statusOrder.indexOf(order.order.status)
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 text-white py-6 px-4">
        <div className="max-w-md mx-auto">
          <button
            onClick={() => navigate('/table/1')}
            className="flex items-center gap-2 text-white/90 text-sm mb-4"
          >
            <Home className="w-4 h-4" />
            Back to Menu
          </button>
          <h1 className="text-2xl font-bold mb-2">Track Your Order</h1>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              placeholder="Enter Order Number"
              value={searchNumber}
              onChange={(e) => setSearchNumber(e.target.value)}
              className="flex-1 px-4 py-2 rounded-lg bg-white dark:bg-gray-800 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-white text-orange-500 rounded-lg font-medium"
            >
              Track
            </button>
          </form>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-md mx-auto w-full px-4 py-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Loading order details...</p>
          </div>
        ) : order ? (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="space-y-6"
          >
            {/* Order Info Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Order Number</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{order.order.order_number}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Table</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{order.order.table_number}</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Time Elapsed</span>
                <span className="font-medium text-gray-900 dark:text-white">{order.order.time_elapsed} mins</span>
              </div>
            </div>

            {/* Status Timeline */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Order Status</h2>
              
              <div className="relative">
                {statusSteps.map((step, index) => {
                  const currentIndex = getCurrentStepIndex()
                  const isCompleted = index <= currentIndex
                  const isCurrent = index === currentIndex
                  const Icon = step.icon
                  
                  return (
                    <div key={step.key} className="flex items-start mb-4 last:mb-0">
                      <div className="relative flex flex-col items-center">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            isCompleted ? step.color : 'bg-gray-200 dark:bg-gray-700'
                          } ${isCurrent ? 'ring-4 ring-orange-200 dark:ring-orange-900/30' : ''}`}
                        >
                          <Icon className="w-5 h-5 text-white" />
                        </motion.div>
                        {index < statusSteps.length - 1 && (
                          <div className={`w-0.5 h-8 ${isCompleted ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
                        )}
                      </div>
                      <div className="ml-4 pt-1">
                        <p className={`font-medium ${isCompleted ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
                          {step.label}
                        </p>
                        {isCurrent && order.order.status !== 'completed' && (
                          <p className="text-sm text-orange-500 animate-pulse">
                            In Progress...
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Order Items */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Order Items</h2>
              
              <div className="space-y-2">
                {order.order.items.map((item, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full flex items-center justify-center text-sm font-bold">
                        {item.quantity}
                      </span>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                        {item.half_full && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{item.half_full}</p>
                        )}
                      </div>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">₹{(item.price * item.quantity).toFixed(0)}</span>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900 dark:text-white">Total</span>
                  <span className="text-xl font-bold text-orange-500">₹{order.order.total_amount.toFixed(0)}</span>
                </div>
              </div>
            </div>

            {/* Download Bill Button */}
            {order.order.status === 'completed' && (
              <button
                onClick={handleDownloadBill}
                className="w-full py-4 bg-green-500 text-white rounded-xl font-bold flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                Download Bill
              </button>
            )}

            {/* New Order Button */}
            <button
              onClick={() => navigate(`/table/${order.order.table_number}`)}
              className="w-full py-4 bg-orange-500 text-white rounded-xl font-bold flex items-center justify-center gap-2"
            >
              <Utensils className="w-5 h-5" />
              Order More
            </button>
          </motion.div>
        ) : (
          <div className="text-center py-12">
            <Utensils className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">Enter your order number to track status</p>
            <div className="bg-blue-50 text-blue-700 p-4 rounded-lg text-sm">
              <p>💡 Tip: Your order number is sent to your phone after placing order</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
