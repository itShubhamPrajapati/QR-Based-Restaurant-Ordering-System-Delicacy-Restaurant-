import { useEffect, useRef, useCallback } from 'react'

// Get WebSocket URL dynamically based on environment or current host
function getWebSocketUrl() {
  const envUrl = import.meta.env.VITE_API_URL
  let apiBaseUrl = ''
  
  if (envUrl) {
    apiBaseUrl = envUrl
  } else {
    // Dynamic local fallback if not defined
    const hostname = window.location.hostname
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:'
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      apiBaseUrl = 'http://localhost:8000'
    } else {
      apiBaseUrl = `${protocol}//${hostname}:8000`
    }
  }
  
  // Dynamically replace HTTP/HTTPS with WS/WSS
  return apiBaseUrl.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:')
}

export const useWebSocket = (clientType, identifier = null, onMessage) => {
  const wsRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 5
  
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    // Use API URL for WebSocket connection with token query parameters
    const token = localStorage.getItem('admin_token')
    const queryParams = []
    if (identifier) {
      queryParams.push(`identifier=${identifier}`)
    }
    if (token) {
      queryParams.push(`token=${token}`)
    }
    const queryStr = queryParams.length > 0 ? `?${queryParams.join('&')}` : ''
    
    // Resolve dynamic WebSocket URL
    const baseWsUrl = getWebSocketUrl()
    const wsUrl = `${baseWsUrl}/ws/${clientType}${queryStr}`

    
    try {
      wsRef.current = new WebSocket(wsUrl)
      
      wsRef.current.onopen = () => {
        console.log(`WebSocket connected: ${clientType}`)
        reconnectAttemptsRef.current = 0
      }
      
      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          onMessage?.(data)
        } catch (e) {
          console.error('WebSocket message parse error:', e)
        }
      }
      
      wsRef.current.onclose = () => {
        console.log(`WebSocket disconnected: ${clientType}`)
        
        // Attempt reconnection
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000)
          reconnectTimeoutRef.current = setTimeout(connect, delay)
        }
      }
      
      wsRef.current.onerror = (error) => {
        console.error(`WebSocket error (${clientType}):`, error)
      }
    } catch (error) {
      console.error('WebSocket connection failed:', error)
    }
  }, [clientType, identifier, onMessage])

  const sendMessage = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }, [])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
  }, [])

  useEffect(() => {
    connect()
    return () => disconnect()
  }, [connect, disconnect])

  return { sendMessage, disconnect, reconnect: connect }
}

export default useWebSocket
