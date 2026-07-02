import { useState } from 'react'
import { motion } from 'framer-motion'
import { Lock, User, ChefHat } from 'lucide-react'
import { adminLogin } from '../lib/api'
import LiquidBackground from './LiquidBackground'

export default function GlassLogin({ onLoginSuccess }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await adminLogin(username, password)
      if (res.access_token) {
        onLoginSuccess()
      } else {
        setError('Authentication failed')
      }
    } catch (err) {
      console.error('Login error:', err)
      setError(err.message || 'Incorrect username or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-[#050505] font-sans">
      <LiquidBackground />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 125 }}
        className="relative bg-white/[0.02] backdrop-blur-3xl border border-white/10 rounded-[32px] p-8 w-full max-w-sm shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_15px_40px_rgba(0,0,0,0.4)] text-slate-100 text-center"
      >
        {/* Header Logo */}
        <div className="w-16 h-16 bg-gradient-to-br from-indigo-500/10 to-rose-500/10 border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
          <ChefHat className="w-8 h-8 text-indigo-400" />
        </div>

        <h2 className="text-xl font-black text-white tracking-wide uppercase">Console Authenticate</h2>
        <p className="text-xs text-gray-400 font-semibold mt-1 uppercase tracking-wider">Access Restrict - Staff Only</p>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs font-bold text-rose-400 text-left"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4 text-left">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
              Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-gray-500 absolute left-4 top-3.5" />
              <input
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm font-semibold transition-all"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-500 absolute left-4 top-3.5" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm font-semibold transition-all"
                required
              />
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full py-3.5 mt-6 bg-gradient-to-r from-indigo-500 to-rose-500 text-white rounded-2xl font-black uppercase tracking-wider shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 disabled:opacity-50 text-xs transition-all"
          >
            {loading ? 'Validating...' : 'Authenticate'}
          </motion.button>
        </form>

        <div className="mt-6 pt-4 border-t border-white/5 text-[10px] text-gray-500 font-bold uppercase tracking-wider">
          Default: <span className="text-gray-300">admin</span> / <span className="text-gray-300">adminpassword</span>
        </div>
      </motion.div>
    </div>
  )
}
