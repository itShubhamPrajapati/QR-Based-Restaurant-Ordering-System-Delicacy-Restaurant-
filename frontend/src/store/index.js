import { create } from 'zustand'
import axios from 'axios'

const API_URL = '/api'

// Cart store
export const useCartStore = create((set, get) => ({
  items: [],
  tableNumber: null,
  
  setTableNumber: (tableNumber) => set({ tableNumber }),
  
  addItem: (item, size = 'full', quantity = 1) => {
    const { items } = get()
    const price = size === 'half' ? item.price_half : item.price_full
    
    const existingIndex = items.findIndex(
      (i) => i.id === item.id && i.size === size
    )
    
    if (existingIndex > -1) {
      const newItems = [...items]
      newItems[existingIndex].quantity += quantity
      set({ items: newItems })
    } else {
      set({
        items: [...items, {
          id: item.id,
          name: item.name,
          size,
          price,
          quantity,
          prep_time_minutes: item.prep_time_minutes
        }]
      })
    }
  },
  
  removeItem: (index) => {
    const { items } = get()
    set({ items: items.filter((_, i) => i !== index) })
  },
  
  updateQuantity: (index, quantity) => {
    const { items } = get()
    if (quantity <= 0) {
      set({ items: items.filter((_, i) => i !== index) })
    } else {
      const newItems = [...items]
      newItems[index].quantity = quantity
      set({ items: newItems })
    }
  },
  
  clearCart: () => set({ items: [] }),
  
  getTotal: () => {
    const { items } = get()
    return items.reduce((total, item) => total + (item.price * item.quantity), 0)
  },
  
  getTax: (taxPercentage = 5) => {
    const subtotal = get().getTotal()
    return Math.round(subtotal * (taxPercentage / 100) * 100) / 100
  },
  
  getGrandTotal: (taxPercentage = 5) => {
    const subtotal = get().getTotal()
    const tax = get().getTax(taxPercentage)
    return subtotal + tax
  },
  
  getItemCount: () => {
    const { items } = get()
    return items.reduce((count, item) => count + item.quantity, 0)
  }
}))

// Order store
export const useOrderStore = create((set, get) => ({
  currentOrder: null,
  orders: [],
  
  setCurrentOrder: (order) => set({ currentOrder: order }),
  
  setOrders: (orders) => set({ orders }),
  
  updateOrderStatus: (orderId, status) => {
    const { orders, currentOrder } = get()
    
    if (currentOrder && currentOrder.id === orderId) {
      set({ currentOrder: { ...currentOrder, order_status: status } })
    }
    
    set({
      orders: orders.map(o =>
        o.id === orderId ? { ...o, order_status: status } : o
      )
    })
  },
  
  clearCurrentOrder: () => set({ currentOrder: null })
}))

// Menu store
export const useMenuStore = create((set, get) => ({
  menu: [],
  loading: false,
  error: null,
  filters: {
    category: 'all',
    search: '',
    sortBy: 'popular'
  },
  
  setFilters: (filters) => set({ filters: { ...get().filters, ...filters } }),
  
  fetchMenu: async () => {
    set({ loading: true, error: null })
    try {
      const { filters } = get()
      const params = new URLSearchParams()
      if (filters.category !== 'all') params.append('category', filters.category)
      if (filters.search) params.append('search', filters.search)
      if (filters.sortBy) params.append('sort_by', filters.sortBy)
      
      const response = await axios.get(`${API_URL}/menu?${params}`)
      set({ menu: response.data.menu, loading: false })
    } catch (error) {
      set({ error: error.message, loading: false })
    }
  },
  
  getFilteredMenu: () => {
    const { menu, filters } = get()
    let filtered = [...menu]
    
    if (filters.category !== 'all') {
      filtered = filtered.filter(item => item.category === filters.category)
    }
    
    if (filters.search) {
      const search = filters.search.toLowerCase()
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(search)
      )
    }
    
    if (filters.sortBy === 'price_low') {
      filtered.sort((a, b) => a.price_full - b.price_full)
    } else if (filters.sortBy === 'price_high') {
      filtered.sort((a, b) => b.price_full - a.price_full)
    }
    
    return filtered
  }
}))

// Theme store
export const useThemeStore = create((set) => ({
  darkMode: false,
  
  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
  
  setDarkMode: (value) => set({ darkMode: value })
}))

// Toast store
export const useToastStore = create((set, get) => ({
  toasts: [],
  
  addToast: (message, type = 'info', duration = 3000) => {
    const id = Date.now()
    set({ toasts: [...get().toasts, { id, message, type }] })
    
    setTimeout(() => {
      get().removeToast(id)
    }, duration)
  },
  
  removeToast: (id) => {
    set({ toasts: get().toasts.filter(t => t.id !== id) })
  }
}))

// WebSocket store
export const useWebSocketStore = create((set, get) => ({
  connected: false,
  connectionId: null,
  ws: null,
  
  connect: (connectionType = 'customer') => {
    const connectionId = `${connectionType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const ws = new WebSocket(`${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/${connectionType}/${connectionId}`)
    
    ws.onopen = () => {
      set({ connected: true, connectionId, ws })
    }
    
    ws.onclose = () => {
      set({ connected: false, ws: null })
    }
    
    ws.onerror = () => {
      set({ connected: false })
    }
    
    return { ws, connectionId }
  },
  
  disconnect: () => {
    const { ws } = get()
    if (ws) {
      ws.close()
    }
    set({ connected: false, ws: null })
  },
  
  subscribeToOrder: (orderId) => {
    const { ws } = get()
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'subscribe_order',
        order_id: orderId
      }))
    }
  },
  
  setMessageHandler: (handler) => {
    const { ws } = get()
    if (ws) {
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          handler(data)
        } catch (e) {
          console.error('WebSocket message parse error:', e)
        }
      }
    }
  }
}))
