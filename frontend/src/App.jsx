import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import { useThemeStore } from './store/store'

// Pages
import CustomerPage from './pages/CustomerPage'
import KitchenPage from './pages/KitchenPage'
import AdminPage from './pages/AdminPage'
import OrderStatusPage from './pages/OrderStatusPage'

// Components
import Toast from './components/Toast'

function App() {
  useEffect(() => {
    // Always apply dark mode class
    document.documentElement.classList.add('dark')
  }, [])
  
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
        <Routes>
          <Route path="/" element={<CustomerPage />} />
          <Route path="/table/:tableNumber" element={<CustomerPage />} />
          <Route path="/order/:orderNumber" element={<OrderStatusPage />} />
          <Route path="/kitchen" element={<KitchenPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/*" element={<AdminPage />} />
        </Routes>
        <Toast />
      </div>
    </BrowserRouter>
  )
}

export default App
