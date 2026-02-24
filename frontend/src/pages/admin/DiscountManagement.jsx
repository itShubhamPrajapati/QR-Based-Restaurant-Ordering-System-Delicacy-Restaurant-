import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Trash2, RefreshCw, Tag, Percent } from 'lucide-react'
import { getDiscounts, createDiscount, deleteDiscount } from '../../lib/api'
import { useToastStore } from '../../store/store'

export default function DiscountManagement() {
  const [discounts, setDiscounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const { addToast } = useToastStore()

  const fetchDiscounts = async () => {
    setLoading(true)
    try {
      const data = await getDiscounts()
      setDiscounts(data || [])
    } catch (error) {
      console.error('Failed to fetch discounts:', error)
      addToast({ type: 'error', message: 'Failed to load discounts' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchDiscounts() }, [])

  const handleAddDiscount = async (data) => {
    try {
      await createDiscount(data)
      addToast({ type: 'success', message: 'Discount created successfully' })
      setShowAddModal(false)
      fetchDiscounts()
    } catch (error) {
      addToast({ type: 'error', message: error.message || 'Failed to create discount' })
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this discount?')) return
    try {
      await deleteDiscount(id)
      addToast({ type: 'success', message: 'Discount deleted' })
      fetchDiscounts()
    } catch (error) {
      addToast({ type: 'error', message: 'Failed to delete discount' })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Discount Management</h1>
          <p className="text-gray-500">Manage coupons and discounts</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchDiscounts}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            <RefreshCw className="w-5 h-5" />
            Refresh
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
          >
            <Plus className="w-5 h-5" />
            Add Discount
          </button>
        </div>
      </div>

      {/* Discounts Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 skeleton rounded-xl" />
          ))}
        </div>
      ) : discounts.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl">
          <Tag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No discounts added yet</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-4 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
          >
            Add First Discount
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {discounts.map((discount) => (
            <DiscountCard
              key={discount.id}
              discount={discount}
              onDelete={() => handleDelete(discount.id)}
            />
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <AddDiscountModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddDiscount}
        />
      )}
    </div>
  )
}

function DiscountCard({ discount, onDelete }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
            <Tag className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{discount.name}</h3>
            <code className="text-sm text-primary-600 bg-primary-50 dark:bg-primary-900/20 px-2 py-0.5 rounded">
              {discount.code}
            </code>
          </div>
        </div>
        <button
          onClick={onDelete}
          className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{discount.description}</p>

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-1">
          <Percent className="w-4 h-4 text-green-500" />
          <span className="font-bold text-green-600">
            {discount.discount_type === 'percentage' 
              ? `${discount.discount_value}%` 
              : `₹${discount.discount_value}`}
          </span>
        </div>
        <span className="text-gray-500">
          {discount.usage_count}/{discount.usage_limit || '∞'} used
        </span>
      </div>

      {discount.min_order_amount > 0 && (
        <div className="mt-2 text-xs text-gray-500">
          Min. order: ₹{discount.min_order_amount}
        </div>
      )}
    </motion.div>
  )
}

function AddDiscountModal({ onClose, onAdd }) {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    discount_type: 'percentage',
    discount_value: '',
    min_order_amount: '',
    max_discount: '',
    usage_limit: ''
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onAdd({
        ...formData,
        discount_value: parseFloat(formData.discount_value),
        min_order_amount: parseFloat(formData.min_order_amount) || 0,
        max_discount: formData.max_discount ? parseFloat(formData.max_discount) : null,
        usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Add New Discount</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Code
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                required
                placeholder="SAVE10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Type
              </label>
              <select
                value={formData.discount_type}
                onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
              >
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
              required
              placeholder="Save 10%"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
              rows={2}
              placeholder="Get 10% off on orders above ₹500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {formData.discount_type === 'percentage' ? 'Percentage' : 'Amount'} (₹)
              </label>
              <input
                type="number"
                value={formData.discount_value}
                onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                required
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Min Order (₹)
              </label>
              <input
                type="number"
                value={formData.min_order_amount}
                onChange={(e) => setFormData({ ...formData, min_order_amount: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                min="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max Discount (₹)
              </label>
              <input
                type="number"
                value={formData.max_discount}
                onChange={(e) => setFormData({ ...formData, max_discount: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Usage Limit
              </label>
              <input
                type="number"
                value={formData.usage_limit}
                onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                min="0"
                placeholder="Leave empty for unlimited"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 px-4 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
