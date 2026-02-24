import { useEffect, useRef, useCallback } from 'react'

// Get WebSocket URL dynamically
function getWebSocketUrl() {
  const hostname = window.location.hostname
  const port = 8000 // Backend port
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${hostname}:${port}`
}

function getApiBaseUrl() {
  const hostname = window.location.hostname
  const port = 8000
  const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:'
  return `${protocol}//${hostname}:${port}`
}

export const useWebSocket = (clientType, identifier = null, onMessage) => {
  const wsRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 5
  const wsUrlRef = useRef(getWebSocketUrl())
  const apiUrlRef = useRef(getApiBaseUrl())

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    // Use API URL for WebSocket connection
    const wsUrl = `${apiUrlRef.current.replace('http://', 'ws://').replace('https://', 'wss://')}/ws/${clientType}${identifier ? `?identifier=${identifier}` : ''}`
    
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
