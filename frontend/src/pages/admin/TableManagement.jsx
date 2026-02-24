import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Users, Trash2, RefreshCw } from 'lucide-react'
import { getTables, createTable, updateTableStatus, deleteTable } from '../../lib/api'
import { useToastStore } from '../../store/store'

const statusColors = {
  available: 'bg-green-100 text-green-800',
  occupied: 'bg-red-100 text-red-800',
  reserved: 'bg-yellow-100 text-yellow-800',
  maintenance: 'bg-gray-100 text-gray-800'
}

export default function TableManagement() {
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const { addToast } = useToastStore()

  const fetchTables = async () => {
    setLoading(true)
    try {
      const data = await getTables()
      setTables(data || [])
    } catch (error) {
      console.error('Failed to fetch tables:', error)
      addToast({ type: 'error', message: 'Failed to load tables' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTables() }, [])

  const handleAddTable = async (data) => {
    try {
      await createTable(data)
      addToast({ type: 'success', message: 'Table added successfully' })
      setShowAddModal(false)
      fetchTables()
    } catch (error) {
      addToast({ type: 'error', message: 'Failed to add table' })
    }
  }

  const handleStatusChange = async (tableId, status) => {
    try {
      await updateTableStatus(tableId, status)
      addToast({ type: 'success', message: 'Table status updated' })
      fetchTables()
    } catch (error) {
      addToast({ type: 'error', message: 'Failed to update status' })
    }
  }

  const handleDelete = async (tableId) => {
    if (!window.confirm('Are you sure you want to delete this table?')) return
    try {
      await deleteTable(tableId)
      addToast({ type: 'success', message: 'Table deleted' })
      fetchTables()
    } catch (error) {
      addToast({ type: 'error', message: 'Failed to delete table' })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Table Management</h1>
          <p className="text-gray-500">Manage restaurant tables</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchTables}
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
            Add Table
          </button>
        </div>
      </div>

      {/* Table Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-32 skeleton rounded-xl" />
          ))}
        </div>
      ) : tables.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl">
          <p className="text-gray-500">No tables added yet</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-4 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
          >
            Add First Table
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {tables.map((table) => (
            <TableCard
              key={table.id}
              table={table}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <AddTableModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddTable}
        />
      )}
    </div>
  )
}

function TableCard({ table, onStatusChange, onDelete }) {
  const statuses = ['available', 'occupied', 'reserved', 'maintenance']

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
          <span className="text-xl font-bold text-primary-600">{table.table_number}</span>
        </div>
        <select
          value={table.status}
          onChange={(e) => onStatusChange(table.id, e.target.value)}
          className={`text-xs px-2 py-1 rounded-full border-0 cursor-pointer ${statusColors[table.status]}`}
        >
          {statuses.map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-3">
        <Users className="w-4 h-4" />
        <span className="text-sm">Capacity: {table.capacity}</span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onDelete(table.id)}
          className="flex-1 py-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg text-sm"
        >
          <Trash2 className="w-4 h-4 mx-auto" />
        </button>
      </div>
    </motion.div>
  )
}

function AddTableModal({ onClose, onAdd }) {
  const [formData, setFormData] = useState({
    table_number: '',
    capacity: 4
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onAdd({
        table_number: parseInt(formData.table_number),
        capacity: parseInt(formData.capacity)
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-sm">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Add New Table</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Table Number
            </label>
            <input
              type="number"
              value={formData.table_number}
              onChange={(e) => setFormData({ ...formData, table_number: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
              required
              min="1"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Capacity
            </label>
            <input
              type="number"
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
              required
              min="1"
              max="20"
            />
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
              {loading ? 'Adding...' : 'Add Table'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
