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
  const { darkMode, setDarkMode, resetDarkMode } = useThemeStore()
  
  useEffect(() => {
    // FIX: Reset dark mode to light mode (one-time fix)
    // Only reset if dark mode was stored and hasn't been reset yet
    const hasReset = sessionStorage.getItem('darkModeResetDone')
    const storedTheme = localStorage.getItem('delicacy-theme')
    
    if (!hasReset && storedTheme) {
      try {
        const parsed = JSON.parse(storedTheme)
        // If darkMode is true, reset to false (light mode)
        if (parsed.state && parsed.state.darkMode === true) {
          resetDarkMode() // This will clear localStorage and set to false
          sessionStorage.setItem('darkModeResetDone', 'true')
        }
      } catch (e) {
        // If parsing fails, reset to light mode
        resetDarkMode()
        sessionStorage.setItem('darkModeResetDone', 'true')
      }
    } else if (!hasReset && !storedTheme) {
      // No stored preference, check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (prefersDark) {
        setDarkMode(true)
      }
      sessionStorage.setItem('darkModeResetDone', 'true')
    }
  }, [])
  
  useEffect(() => {
    // Apply dark mode class to html
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])
  
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
