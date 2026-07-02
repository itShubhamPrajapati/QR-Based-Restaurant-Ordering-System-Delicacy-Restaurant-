import { useState } from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import {
  Settings, QrCode, RefreshCw, BarChart3,
  Home, Menu, X, Tag, PieChart, FileText, Table as TableIcon
} from 'lucide-react'
import Navbar from '../components/Navbar'
import LiquidBackground from '../components/LiquidBackground'
import GlassLogin from '../components/GlassLogin'

// Sub-pages
import Dashboard from './admin/Dashboard'
import MenuManagement from './admin/MenuManagement'
import OrderManagement from './admin/OrderManagement'
import TableManagement from './admin/TableManagement'
import DiscountManagement from './admin/DiscountManagement'
import Analytics from './admin/Analytics'
import QRGenerator from './admin/QRGenerator'

export default function AdminPage() {
  const location = useLocation()
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('admin_token'))
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (!isAuthenticated) {
    return <GlassLogin onLoginSuccess={() => setIsAuthenticated(true)} />
  }

  const navItems = [
    { path: '/admin', icon: <BarChart3 className="w-5 h-5" />, label: 'Dashboard', exact: true },
    { path: '/admin/orders', icon: <FileText className="w-5 h-5" />, label: 'Orders' },
    { path: '/admin/menu', icon: <Menu className="w-5 h-5" />, label: 'Menu' },
    { path: '/admin/tables', icon: <TableIcon className="w-5 h-5" />, label: 'Tables' },
    { path: '/admin/discounts', icon: <Tag className="w-5 h-5" />, label: 'Discounts' },
    { path: '/admin/analytics', icon: <PieChart className="w-5 h-5" />, label: 'Analytics' },
    { path: '/admin/qr', icon: <QrCode className="w-5 h-5" />, label: 'QR Codes' },
  ]

  return (
    <div className="min-h-screen text-slate-100 relative overflow-x-hidden font-sans">
      <LiquidBackground />

      <Navbar showCart={false} />

      <div className="flex max-w-7xl mx-auto px-4 lg:px-6 py-6 gap-6 relative z-10">
        {/* Mobile Sidebar Trigger */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden fixed bottom-6 left-6 z-50 p-4 bg-gradient-to-r from-indigo-500 to-rose-500 text-white rounded-full shadow-lg shadow-indigo-500/20"
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>

        {/* Floating Glassmorphic Dock Sidebar */}
        <aside className={`
          fixed lg:sticky top-24 lg:top-6 h-[calc(100vh-140px)] lg:h-[calc(100vh-112px)] w-64 
          bg-white/[0.02] backdrop-blur-3xl border border-white/10 
          shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_0_25px_rgba(0,0,0,0.4)] rounded-[32px] z-40 
          transition-all duration-300 flex flex-col justify-between p-5
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <div>
            <div className="p-3 border-b border-white/10 mb-5">
              <h2 className="text-sm font-black text-white flex items-center gap-2 tracking-wider uppercase">
                <Settings className="w-4 h-4 text-indigo-400" />
                Console
              </h2>
            </div>



            {/* Nav Menu */}
            <nav className="space-y-1.5 px-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  icon={item.icon}
                  label={item.label}
                  active={item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path)}
                  onClick={() => setSidebarOpen(false)}
                />
              ))}
            </nav>
          </div>

          {/* Quick Shortcuts */}
          <div className="space-y-2 border-t border-white/10 pt-4 px-1">
            <Link
              to="/kitchen"
              className="flex items-center gap-3 px-4 py-3 rounded-2xl text-gray-400 hover:text-white hover:bg-white/[0.04] border border-transparent transition-all text-sm font-medium"
              onClick={() => setSidebarOpen(false)}
            >
              <RefreshCw className="w-5 h-5 text-indigo-400" />
              <span>Kitchen View</span>
            </Link>
            <Link
              to="/table/1"
              className="flex items-center gap-3 px-4 py-3 rounded-2xl text-gray-400 hover:text-white hover:bg-white/[0.04] border border-transparent transition-all text-sm font-medium"
              onClick={() => setSidebarOpen(false)}
            >
              <Home className="w-5 h-5 text-rose-400" />
              <span>Customer View</span>
            </Link>
          </div>
        </aside>

        {/* Mobile Backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-30 lg:hidden animate-fade-in"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content Pane */}
        <main className="flex-1 min-h-[calc(100vh-140px)] w-full overflow-y-visible">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/orders" element={<OrderManagement />} />
            <Route path="/menu" element={<MenuManagement />} />
            <Route path="/tables" element={<TableManagement />} />
            <Route path="/discounts" element={<DiscountManagement />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/qr" element={<QRGenerator />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

function NavLink({ to, icon, label, active, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 border ${
        active
          ? 'bg-white/[0.08] text-white border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_0_15px_rgba(255,255,255,0.02)]'
          : 'text-gray-400 hover:text-white hover:bg-white/[0.04] border-transparent hover:border-white/5'
      }`}
    >
      <span className={active ? 'text-indigo-400' : ''}>{icon}</span>
      <span className="font-semibold text-sm tracking-wide">{label}</span>
    </Link>
  )
}
