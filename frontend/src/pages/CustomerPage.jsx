import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, ShoppingCart, Plus, Minus, X, 
  CheckCircle, Clock, Utensils, Leaf, Flame, 
  CreditCard, ChevronRight, Star, MapPin, ChefHat,
  Phone, Home, Wifi, MicOff, Filter
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { getMenu, createOrder, createPaymentOrder, verifyPayment } from '../lib/api'
import { useCartStore, useThemeStore, useToastStore } from '../store/store'

// Categories with proper hierarchy
const categories = [
  { id: 'all', name: 'All Items', icon: '🍽️', subcategories: [] },
  { id: 'soup', name: 'Soups', icon: '🥣', subcategories: ['veg', 'non-veg'] },
  { id: 'starters', name: 'Starters', icon: '🍗', subcategories: ['chicken', 'veg', 'tandoori', 'kebab'] },
  { id: 'rice_noodles', name: 'Rice & Noodles', icon: '🍚', subcategories: ['veg', 'chicken', 'egg'] },
  { id: 'main_course', name: 'Main Course', icon: '🍛', subcategories: ['veg', 'chicken', 'mutton'] },
  { id: 'biryani', name: 'Biryani', icon: '🍲', subcategories: ['veg', 'chicken', 'mutton', 'egg', 'fish', 'prawns'] },
  { id: 'rolls', name: 'Rolls & Shawarma', icon: '🌯', subcategories: ['paneer', 'chicken', 'egg', 'shawarma', 'frankie'] },
  { id: 'breads', name: 'Breads', icon: '🫓', subcategories: ['roti', 'naan', 'paratha', 'kulcha', 'extras'] },
  { id: 'combos', name: 'Combos', icon: '📦', subcategories: ['thali', 'pack', 'rice_combo', 'noodles_combo', 'platter', 'biryani_combo', 'breakfast', 'kids', 'lunchbox', 'chinese_combo'] },
  { id: 'south_indian', name: 'South Indian', icon: '🍛', subcategories: ['dosa', 'idli', 'vada', 'uttapam', 'rice'] },
  { id: 'beverages', name: 'Beverages', icon: '🥤', subcategories: ['tea', 'coffee', 'lassi', 'cold_drink', 'water', 'lime', 'ice_cream', 'falooda', 'milk'] },
]

const vegFilterOptions = [
  { id: 'all', name: 'All', icon: '🍽️' },
  { id: 'veg', name: 'Veg Only', icon: '🥬' },
  { id: 'non-veg', name: 'Non-Veg Only', icon: '🍗' },
]

const statusSteps = [
  { key: 'pending', label: 'Order Placed', icon: Clock },
  { key: 'accepted', label: 'Confirmed', icon: CheckCircle },
  { key: 'preparing', label: 'Preparing', icon: ChefHat },
  { key: 'ready', label: 'Ready', icon: Star },
]

export default function CustomerPage() {
  const { tableNumber } = useParams()
  const navigate = useNavigate()
  const [menu, setMenu] = useState([])
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
  const [orderStatus, setOrderStatus] = useState('pending')
  const [isOnline, setIsOnline] = useState(true) // Default to true, only show offline if confirmed

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
    // More robust online/offline detection
    const handleOnline = () => {
      setIsOnline(true)
      addToast({ type: 'success', message: 'Back online!' })
    }
    const handleOffline = () => {
      // Don't immediately set offline - verify with a ping
      const verifyOffline = async () => {
        try {
          await fetch('http://localhost:8000/api/menu', { mode: 'cors', cache: 'no-store' })
          // If fetch succeeds, we're actually online
          setIsOnline(true)
        } catch (e) {
          // Only set offline if ping also fails
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
  }, [])
  
  useEffect(() => {
    filterMenu()
  }, [menu, search, selectedCategory, selectedSubcategory, vegFilter, sortBy])
  
  const [retryCount, setRetryCount] = useState(0)
  const [errorDetails, setErrorDetails] = useState(null)
  
  const fetchMenu = async () => {
    try {
      setLoading(true)
      setErrorDetails(null)
      const data = await getMenu()
      console.log('Menu loaded successfully:', data.length, 'items')
      setMenu(data)
      setFilteredMenu(data)
      setIsOnline(true) // Menu loaded successfully, we're online
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
  
  const handleRetry = () => {
    setRetryCount(prev => prev + 1)
    fetchMenu()
  }
  
  const filterMenu = useCallback(() => {
    let filtered = [...menu]
    
    if (search) {
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(search.toLowerCase())
      )
    }
    
    if (selectedCategory !== 'all') {
      // Match by category_id from database or category name
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
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 text-white py-6 px-4"
      >
        <h1 className="text-xl sm:text-2xl font-bold mb-1">Delicacy Restaurant</h1>
        {tableNumber && (
          <p className="text-white/90 flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4" /> Table {tableNumber}
          </p>
        )}
      </motion.div>
      
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
        
        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategory(cat.id)
                setSelectedSubcategory(null)
              }}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium ${
                selectedCategory === cat.id
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>
        
        {/* Subcategory Tabs */}
        {selectedCategory !== 'all' && categories.find(c => c.id === selectedCategory)?.subcategories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mt-2">
            <button
              onClick={() => setSelectedSubcategory(null)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium ${
                selectedSubcategory === null
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}
            >
              All
            </button>
            {categories.find(c => c.id === selectedCategory)?.subcategories.map((sub) => (
              <button
                key={sub}
                onClick={() => setSelectedSubcategory(sub)}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium capitalize ${
                  selectedSubcategory === sub
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        )}
        
        {/* Filters Row */}
        <div className="flex items-center justify-between pt-2 gap-2">
          {/* Veg/Non-Veg Filter */}
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
          
          {/* Sort Dropdown */}
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
      
      <div className="flex-1 max-w-7xl mx-auto px-4 py-4 w-full">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-xl p-4 skeleton h-40 bg-white dark:bg-gray-800" />
            ))}
          </div>
        ) : filteredMenu.length === 0 && !errorDetails ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            <Utensils className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>No dishes found</p>
          </div>
        ) : filteredMenu.length === 0 && errorDetails ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            <Utensils className="w-16 h-16 mx-auto mb-4 text-red-400" />
            <p className="text-red-500 mb-4">Failed to load menu</p>
            <p className="text-sm mb-4 opacity-70">{errorDetails}</p>
            <button
              onClick={handleRetry}
              className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
            >
              Retry ({retryCount})
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMenu.map((item, index) => (
              <MenuCard
                key={item.id}
                item={item}
                index={index}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        )}
      </div>
      
      <AnimatePresence>
        {(showCart || checkoutMode) && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 bg-black/60 z-40"
              onClick={() => { setShowCart(false); setCheckoutMode(false) }}
            />
            {checkoutMode ? (
              <CheckoutPage
                cart={cart}
                total={cartTotal}
                tableNumber={tableNumber}
                onBack={() => setCheckoutMode(false)}
                onSubmit={handleCheckout}
              />
            ) : (
              <CartSidebar
                cart={cart}
                total={cartTotal}
                onClose={() => setShowCart(false)}
                onRemove={removeFromCart}
                onUpdate={updateQuantity}
                onCheckout={() => setCheckoutMode(true)}
              />
            )}
          </>
        )}
      </AnimatePresence>
      
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

function MenuCard({ item, index, onAddToCart }) {
  const [showHalfFull, setShowHalfFull] = useState(false)
  
  const handleAdd = (halfFull) => {
    onAddToCart(item, halfFull)
    setShowHalfFull(false)
  }
  
  return (
    <motion.div
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all bg-white dark:bg-gray-800"
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            {item.is_vegetarian ? (
              <span className="text-xl" title="Veg">🥬</span>
            ) : (
              <span className="text-xl" title="Non-Veg">🍗</span>
            )}
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white">{item.name}</h3>
              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <Clock className="w-3 h-3" />{item.preparation_time}min
              </div>
            </div>
          </div>
        </div>
        
        <p className="text-sm mb-3 line-clamp-2 text-gray-500 dark:text-gray-400">{item.description}</p>
        
        <div className="flex items-center justify-between">
          <div className="text-sm">
            {item.has_half_full ? (
              <div className="flex gap-3">
                <span className="text-gray-400">Half: ₹{item.price_half}</span>
                <span className="font-bold text-primary-600 dark:text-orange-400">Full: ₹{item.price_full}</span>
              </div>
            ) : (
              <span className="text-lg font-bold text-primary-600 dark:text-orange-400">₹{item.price}</span>
            )}
          </div>
          
          <button
            onClick={() => setShowHalfFull(true)}
            className="flex items-center gap-1 px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </div>
      
      <AnimatePresence>
        {showHalfFull && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-2"
            onClick={() => setShowHalfFull(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              className="rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 max-w-sm w-full bg-white dark:bg-gray-800"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold mb-1 text-gray-900 dark:text-white">{item.name}</h3>
              <p className="text-sm mb-4 text-gray-500 dark:text-gray-400">Select size</p>
              
              <div className="space-y-2 sm:space-y-3">
                {item.has_half_full ? (
                  <>
                    <button onClick={() => handleAdd('half')} className="w-full p-3 sm:p-4 border-2 rounded-xl hover:border-primary-500 flex items-center justify-between border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
                      <div><p className="font-semibold text-gray-900 dark:text-white">Half</p><p className="text-sm text-gray-500 dark:text-gray-400">₹{item.price_half}</p></div>
                      <Plus className="w-5 h-5 text-primary-600" />
                    </button>
                    <button onClick={() => handleAdd('full')} className="w-full p-3 sm:p-4 border-2 rounded-xl hover:border-primary-500 flex items-center justify-between border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
                      <div><p className="font-semibold text-gray-900 dark:text-white">Full</p><p className="text-sm text-gray-500 dark:text-gray-400">₹{item.price_full}</p></div>
                      <Plus className="w-5 h-5 text-primary-600" />
                    </button>
                  </>
                ) : (
                  <button onClick={() => handleAdd(null)} className="w-full p-3 sm:p-4 border-2 rounded-xl hover:border-primary-500 flex items-center justify-between border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
                    <div><p className="font-semibold text-gray-900 dark:text-white">Add</p><p className="text-sm text-gray-500 dark:text-gray-400">₹{item.price}</p></div>
                    <Plus className="w-5 h-5 text-primary-600" />
                  </button>
                )}
              </div>
              
              <button
                onClick={() => setShowHalfFull(false)}
                className="mt-4 w-full py-2 text-gray-500 dark:text-gray-400"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function CartSidebar({ cart, total, onClose, onRemove, onUpdate, onCheckout }) {
  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      className="fixed right-0 top-0 h-full w-full max-w-sm shadow-2xl z-50 flex flex-col bg-white dark:bg-gray-800"
    >
      <div className="p-4 border-b flex items-center justify-between border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Your Cart</h2>
        <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
          <X className="w-5 h-5 text-gray-500 dark:text-white" />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 bg-white dark:bg-gray-800">
        {cart.length === 0 ? (
          <div className="text-center py-8">
            <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Your cart is empty</p>
          </div>
        ) : (
          <div className="space-y-4">
            {cart.map((item, index) => (
              <div key={index} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 dark:text-white">{item.name}</h4>
                  {item.halfFull && <p className="text-xs capitalize text-gray-500 dark:text-gray-400">{item.halfFull}</p>}
                  <p className="font-medium text-primary-600 dark:text-orange-400">₹{item.price}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onUpdate(item.id, item.halfFull, item.quantity - 1)}
                    className="w-8 h-8 rounded-full flex items-center justify-center shadow-sm bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center font-medium text-gray-900 dark:text-white">{item.quantity}</span>
                  <button
                    onClick={() => onUpdate(item.id, item.halfFull, item.quantity + 1)}
                    className="w-8 h-8 rounded-full flex items-center justify-center shadow-sm bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {cart.length > 0 && (
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center justify-between mb-4 text-gray-900 dark:text-white">
            <span className="font-medium">Subtotal</span>
            <span className="text-xl font-bold">₹{total.toFixed(0)}</span>
          </div>
          <button
            onClick={onCheckout}
            className="w-full py-4 bg-primary-500 text-white rounded-xl font-bold flex items-center justify-center gap-2"
          >
            <CreditCard className="w-5 h-5" />
            Checkout
          </button>
        </div>
      )}
    </motion.div>
  )
}

function CheckoutPage({ cart, total, tableNumber, onBack, onSubmit }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    notes: ''
  })
  const [loading, setLoading] = useState(false)
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    await onSubmit(formData)
    setLoading(false)
  }
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-2 overflow-y-auto"
      onClick={onBack}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        className="rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 max-w-sm w-full max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4 text-gray-900 dark:text-white">
          <h2 className="text-lg font-bold">Checkout</h2>
          <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400"
              placeholder="Your name"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Phone</label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400"
              placeholder="Your phone number"
              minLength="10"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Notes (optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400"
              placeholder="Any special instructions..."
              rows="2"
            />
          </div>
          
          <div className="p-4 rounded-xl space-y-2 bg-gray-50 dark:bg-gray-700">
            <div className="flex justify-between text-gray-900 dark:text-white">
              <span>Items</span>
              <span>{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white">
              <span>Total</span>
              <span>₹{total.toFixed(0)}</span>
            </div>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-primary-500 text-white rounded-xl font-bold flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                Pay & Place Order
              </>
            )}
          </button>
        </form>
      </motion.div>
    </motion.div>
  )
}
