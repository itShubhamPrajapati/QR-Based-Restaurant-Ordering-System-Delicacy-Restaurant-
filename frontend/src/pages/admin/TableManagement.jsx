import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Users, Trash2, RefreshCw } from 'lucide-react'
import { getTables, createTable, updateTableStatus, deleteTable } from '../../lib/api'
import { useToastStore } from '../../store/store'

const statusColors = {
  available: 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400',
  occupied: 'bg-rose-500/10 border border-rose-500/20 text-rose-400',
  reserved: 'bg-amber-500/10 border border-amber-500/20 text-amber-400',
  maintenance: 'bg-white/5 border border-white/10 text-slate-400'
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
    <div className="space-y-6 relative z-10">
      {/* Header Container */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-white/[0.02] backdrop-blur-3xl border border-white/10 rounded-[32px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_4px_25px_rgba(0,0,0,0.2)]">
        <div>
          <h1 className="text-2xl font-black tracking-wide text-white uppercase">Table Layout</h1>
          <p className="text-sm text-gray-400 font-medium mt-0.5">Real-time store table seating layouts</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchTables}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white rounded-2xl transition-all duration-300 font-semibold text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-500 to-pink-500 hover:from-primary-600 hover:to-pink-600 text-white rounded-2xl shadow-md shadow-primary-500/10 hover:shadow-lg hover:shadow-primary-500/20 transition-all duration-300 font-extrabold text-sm uppercase tracking-wider"
          >
            <Plus className="w-4 h-4" />
            Add Table
          </button>
        </div>
      </div>

      {/* Grid container with glass indicators */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-36 bg-white/[0.02] border border-white/10 backdrop-blur-3xl rounded-[32px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)] animate-pulse" />
          ))}
        </div>
      ) : tables.length === 0 ? (
        <div className="text-center py-16 bg-white/[0.01] border border-white/5 backdrop-blur-3xl rounded-[32px] max-w-md mx-auto shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_8px_30px_rgba(0,0,0,0.2)]">
          <Users className="w-12 h-12 text-gray-500 mx-auto mb-4 opacity-50" />
          <p className="text-gray-300 font-bold">No active tables found</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-4 px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-2xl font-bold transition-all text-xs uppercase"
          >
            Add First Table
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
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

      {/* Glassmorphic Add table Modal overlay */}
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
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white/[0.02] backdrop-blur-3xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_10px_30px_rgba(0,0,0,0.25)] hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.12),0_15px_40px_rgba(0,0,0,0.35)] transition-all duration-300 rounded-[32px] p-5 flex flex-col justify-between h-full"
    >
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-primary-500/10 to-pink-500/10 border border-primary-500/20 rounded-2xl flex items-center justify-center shadow-inner">
            <span className="text-lg font-black text-white">{table.table_number}</span>
          </div>
          
          <select
            value={table.status}
            onChange={(e) => onStatusChange(table.id, e.target.value)}
            className={`text-[10px] px-2.5 py-1.5 rounded-full cursor-pointer font-extrabold uppercase tracking-wider bg-slate-950 border focus:ring-0 ${statusColors[table.status]}`}
          >
            {statuses.map((s) => (
              <option key={s} value={s} className="bg-slate-950 text-slate-100 font-semibold">{s}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 text-gray-400 mb-4 px-1">
          <Users className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-semibold">Capacity: {table.capacity} guests</span>
        </div>
      </div>

      <div className="border-t border-white/5 pt-3">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onDelete(table.id)}
          className="w-full py-2 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 text-rose-400 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete
        </motion.button>
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
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm" 
        onClick={onClose} 
      />
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="relative bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-6 w-full max-w-sm shadow-2xl text-slate-100"
      >
        <h2 className="text-lg font-bold text-white mb-6 tracking-wide uppercase border-b border-white/10 pb-3">Add New Table</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
              Table Number
            </label>
            <input
              type="number"
              value={formData.table_number}
              onChange={(e) => setFormData({ ...formData, table_number: e.target.value })}
              className="w-full px-4 py-2.5 rounded-2xl border border-white/10 bg-slate-950/60 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 text-sm font-semibold"
              required
              min="1"
            />
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
              Capacity (Guests)
            </label>
            <input
              type="number"
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
              className="w-full px-4 py-2.5 rounded-2xl border border-white/10 bg-slate-950/60 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 text-sm font-semibold"
              required
              min="1"
              max="20"
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-white/5 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 border border-white/10 rounded-2xl text-xs font-bold uppercase tracking-wider hover:bg-white/5 transition-all text-gray-300 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 px-4 bg-gradient-to-r from-primary-500 to-pink-500 text-white rounded-2xl hover:opacity-90 disabled:opacity-50 text-xs font-extrabold uppercase tracking-wider shadow-md shadow-primary-500/20"
            >
              {loading ? 'Adding...' : 'Add Table'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
