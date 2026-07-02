import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, ShoppingCart, Minus, Plus, CreditCard } from 'lucide-react'

export default function CartDrawer({
  checkoutMode,
  setCheckoutMode,
  onClose,
  cart,
  total,
  tableNumber,
  onRemove,
  onUpdate,
  onSubmit
}) {
  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-40"
        onClick={onClose}
      />
      
      {checkoutMode ? (
        <CheckoutPage
          cart={cart}
          total={total}
          tableNumber={tableNumber}
          onBack={() => setCheckoutMode(false)}
          onSubmit={onSubmit}
        />
      ) : (
        <CartSidebar
          cart={cart}
          total={total}
          onClose={onClose}
          onRemove={onRemove}
          onUpdate={onUpdate}
          onCheckout={() => setCheckoutMode(true)}
        />
      )}
    </>
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
