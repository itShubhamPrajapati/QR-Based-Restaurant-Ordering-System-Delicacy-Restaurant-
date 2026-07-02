import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, ShoppingCart, CheckCircle, Clock, Utensils, 
  MapPin, ChefHat, MicOff
} from 'lucide-react'

import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { getMenu, getCategories, createOrder, createPaymentOrder, verifyPayment } from '../lib/api'
import { useCartStore, useToastStore } from '../store/store'

// Import modular customer page components
import GlassHeader from '../components/customer/GlassHeader'
import CategoryTabs from '../components/customer/CategoryTabs'
import MenuGrid from '../components/customer/MenuGrid'
import CartDrawer from '../components/customer/CartDrawer'

const vegFilterOptions = [
  { id: 'all', name: 'All', icon: '🍽️' },
  { id: 'veg', name: 'Veg Only', icon: '🥬' },
  { id: 'non-veg', name: 'Non-Veg Only', icon: '🍗' },
]

export default function CustomerPage() {
  const { tableNumber } = useParams()
  const navigate = useNavigate()
  const [menu, setMenu] = useState([])
  const [categories, setCategories] = useState([])
  const [filteredMenu, setFilteredMenu] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedSubcategory, setSelectedSubcategory] = useState(null)
  const [vegFilter, setVegFilter] = useState('all')
  const [sortBy, setSortBy] = useState('name')
  const [showCart, setShowCart] = useState(false)
  const [checkoutMode, setCheckoutMode] = useState(false)
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [currentOrder, setCurrentOrder] = useState(null)
  const [isOnline, setIsOnline] = useState(true)
  const [retryCount, setRetryCount] = useState(0)
  const [errorDetails, setErrorDetails] = useState(null)

  const { cart, addToCart, removeFromCart, updateQuantity, clearCart, setTableNumber, getTotal } = useCartStore()
  const { addToast } = useToastStore()

  useEffect(() => {
    if (tableNumber) {
      setTableNumber(parseInt(tableNumber))
    } else {
      navigate('/table/1', { replace: true })
    }
  }, [tableNumber, navigate])

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      addToast({ type: 'success', message: 'Back online!' })
    }
    const handleOffline = () => {
      const verifyOffline = async () => {
        try {
          await fetch('http://localhost:8000/api/menu', { mode: 'cors', cache: 'no-store' })
          setIsOnline(true)
        } catch (e) {
          console.log('Connection check failed, might be offline')
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
  }, [addToast])

  useEffect(() => {
    fetchMenu()
    fetchCategories()
  }, [])
  
  useEffect(() => {
    filterMenu()
  }, [menu, search, selectedCategory, selectedSubcategory, vegFilter, sortBy])
  
  const fetchMenu = async () => {
    try {
      setLoading(true)
      setErrorDetails(null)
      const data = await getMenu()
      console.log('Menu loaded successfully:', data.length, 'items')
      setMenu(data)
      setFilteredMenu(data)
      setIsOnline(true)
      if (data.length === 0) {
        addToast({ type: 'warning', message: 'Menu is empty. Please ask staff to add items.' })
      }
    } catch (error) {
      console.error('Failed to load menu:', error)
      setErrorDetails(error.message || 'Unknown error')
      if (error.response) {
        if (error.response.status === 404) {
          addToast({ type: 'error', message: 'Menu endpoint not found. Is the server running?' })
        } else if (error.response.status === 500) {
          addToast({ type: 'error', message: 'Server error. Please try again later.' })
        } else {
          addToast({ type: 'error', message: `Error: ${error.response.status}` })
        }
      } else if (error.request) {
        addToast({ type: 'error', message: 'Cannot connect to server. Is the backend running on port 8000?' })
      } else {
        addToast({ type: 'error', message: 'Failed to load menu' })
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const data = await getCategories()
      setCategories(data)
    } catch (error) {
      console.error('Failed to load categories:', error)
    }
  }
  
  const handleRetry = () => {
    setRetryCount(prev => prev + 1)
    fetchMenu()
    fetchCategories()
  }
  
  const filterMenu = useCallback(() => {
    let filtered = [...menu]
    
    if (search) {
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(search.toLowerCase())
      )
    }
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => 
        item.category_id === parseInt(selectedCategory) || 
        item.category === selectedCategory
      )
    }
    
    if (selectedSubcategory) {
      filtered = filtered.filter(item => item.subcategory === selectedSubcategory)
    }
    
    if (vegFilter === 'veg') {
      filtered = filtered.filter(item => item.is_vegetarian)
    } else if (vegFilter === 'non-veg') {
      filtered = filtered.filter(item => !item.is_vegetarian)
    }
    
    if (sortBy === 'price-low') {
      filtered.sort((a, b) => (a.price_half || a.price) - (b.price_half || b.price))
    } else if (sortBy === 'price-high') {
      filtered.sort((a, b) => (b.price_half || b.price) - (a.price_half || a.price))
    } else if (sortBy === 'name') {
      filtered.sort((a, b) => a.name.localeCompare(b.name))
    }
    
    setFilteredMenu(filtered)
  }, [menu, search, selectedCategory, selectedSubcategory, vegFilter, sortBy])
  
  const handleAddToCart = (item, halfFull) => {
    const price = halfFull === 'half' ? item.price_half : item.price_full || item.price
    addToCart({
      id: item.id,
      name: item.name,
      price: price,
      halfFull: halfFull,
      hasHalfFull: item.has_half_full
    })
    addToast({ type: 'success', message: `${item.name} added!` })
  }
  
  const handleCheckout = async (formData) => {
    if (cart.length === 0) {
      addToast({ type: 'error', message: 'Cart is empty!' })
      return
    }
    
    if (!isOnline) {
      addToast({ type: 'error', message: 'Please check your internet connection' })
      return
    }
    
    try {
      const orderData = {
        table_number: parseInt(tableNumber) || 1,
        customer_name: formData.name,
        customer_phone: formData.phone,
        items: cart.map(item => ({
          menu_item_id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          half_full: item.halfFull
        })),
        notes: formData.notes
      }
      
      const orderResult = await createOrder(orderData)
      setCurrentOrder(orderResult)
      
      const paymentResult = await createPaymentOrder(orderResult.order_id, getTotal())
      
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_SEULnJj6ZBfPb4',
        amount: paymentResult.amount,
        currency: paymentResult.currency,
        order_id: paymentResult.order_id,
        name: 'Delicacy Restaurant',
        description: `Order #${orderResult.order_number}`,
        handler: async (response) => {
          try {
            await verifyPayment({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature
            })
            setOrderPlaced(true)
            setCheckoutMode(false)
            clearCart()
            addToast({ type: 'success', message: 'Payment successful! Order placed.' })
          } catch (err) {
            addToast({ type: 'error', message: 'Payment verification failed' })
          }
        },
        prefill: {
          name: formData.name,
          phone: formData.phone
        },
        theme: { color: '#ed751d' }
      }
      
      if (window.Razorpay) {
        const razorpay = new window.Razorpay(options)
        razorpay.open()
      } else {
        addToast({ type: 'error', message: 'Payment system loading' })
      }
      
    } catch (error) {
      addToast({ type: 'error', message: 'Failed to place order' })
    }
  }
  
  const cartTotal = getTotal()
  
  if (orderPlaced && currentOrder) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-900">
        <Navbar showCart={false} />
        <div className="flex-1 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center max-w-md w-full"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="w-32 h-32 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl"
            >
              <CheckCircle className="w-16 h-16 text-white" />
            </motion.div>
            
            <motion.h2
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-3xl font-bold mb-2 text-white"
            >
              Order Confirmed!
            </motion.h2>
            
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="mb-2 text-gray-400"
            >
              Order #{currentOrder.order_number}
            </motion.p>
            
            <motion.button
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              onClick={() => navigate(`/order/${currentOrder.order_number}`)}
              className="w-full py-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-bold mb-3"
            >
              Track Order
            </motion.button>
            
            <motion.button
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              onClick={() => {
                setOrderPlaced(false)
                setCurrentOrder(null)
              }}
              className="w-full py-4 rounded-xl font-bold bg-gray-800 text-white"
            >
              Back to Menu
            </motion.button>
          </motion.div>
        </div>
        <Footer />
      </div>
    )
  }
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {!isOnline && (
        <motion.div
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          className="bg-red-500 text-white px-4 py-2 flex items-center justify-center gap-2"
        >
          <MicOff className="w-4 h-4" />
          <span className="text-sm">Offline</span>
        </motion.div>
      )}
      
      <Navbar />
      
      {/* Top Banner (GlassHeader) */}
      <GlassHeader tableNumber={tableNumber} />
      
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-16 z-30 shadow-md px-4 py-3 bg-white dark:bg-gray-800"
      >
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search dishes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl focus:ring-2 focus:ring-primary-500 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
          />
        </div>
        
        {/* Dynamic Category Tabs */}
        <CategoryTabs
          categories={categories}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          selectedSubcategory={selectedSubcategory}
          setSelectedSubcategory={setSelectedSubcategory}
          menu={menu}
        />
        
        {/* Filters Row */}
        <div className="flex items-center justify-between pt-2 gap-2">
          <div className="flex gap-1">
            {vegFilterOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setVegFilter(opt.id)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
                  vegFilter === opt.id
                    ? opt.id === 'veg' 
                      ? 'bg-green-100 text-green-700 border border-green-300 dark:bg-green-900/30 dark:text-green-400'
                      : opt.id === 'non-veg'
                        ? 'bg-red-100 text-red-700 border border-red-300 dark:bg-red-900/30 dark:text-red-400'
                        : 'bg-gray-700 text-white'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                }`}
              >
                {opt.icon}
              </button>
            ))}
          </div>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-sm px-2 py-1.5 rounded-lg border-0 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="name">Sort: Name</option>
            <option value="price-low">Price: Low</option>
            <option value="price-high">Price: High</option>
          </select>
        </div>
      </motion.div>
      
      {/* Menu Grid section */}
      <div className="flex-1 max-w-7xl mx-auto px-4 py-4 w-full">
        <MenuGrid
          loading={loading}
          filteredMenu={filteredMenu}
          errorDetails={errorDetails}
          retryCount={retryCount}
          onRetry={handleRetry}
          onAddToCart={handleAddToCart}
        />
      </div>
      
      {/* Cart Drawer */}
      <AnimatePresence>
        {(showCart || checkoutMode) && (
          <CartDrawer
            checkoutMode={checkoutMode}
            setCheckoutMode={setCheckoutMode}
            onClose={() => { setShowCart(false); setCheckoutMode(false); }}
            cart={cart}
            total={cartTotal}
            tableNumber={tableNumber}
            onRemove={removeFromCart}
            onUpdate={updateQuantity}
            onSubmit={handleCheckout}
          />
        )}
      </AnimatePresence>
      
      {/* Floating Cart Button */}
      {!showCart && !checkoutMode && cart.length > 0 && (
        <motion.button
          initial={{ scale: 0, y: 100 }}
          animate={{ scale: 1, y: 0 }}
          onClick={() => setShowCart(true)}
          className="fixed bottom-6 right-6 z-30 bg-primary-500 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-3"
        >
          <ShoppingCart className="w-5 h-5" />
          <span className="font-bold">{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
          <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
            ₹{cartTotal.toFixed(0)}
          </span>
        </motion.button>
      )}
      
      <Footer />
    </div>
  )
}
