import { useState, useEffect, useRef, useCallback } from 'react'

interface DocumentMessage {
  type: 'join' | 'leave' | 'edit' | 'cursor' | 'sync';
  userId?: string;
  userName?: string;
  content?: string;
  position?: number;
  length?: number;
  cursor?: number;
  version?: number;
  fullContent?: string;
  users?: any[];
}

interface EditorCallbacks {
  onSync?: (state: any) => void;
  onJoin?: (userId: string, name: string) => void;
  onLeave?: (userId: string) => void;
  onCursor?: (userId: string, cursor: number) => void;
}

export function useEditor(
  docId: string,
  userName: string,
  callbacks: EditorCallbacks = {}
) {
  const [content, setContent] = useState('')
  const [cursor, setCursor] = useState(0)
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const userIdRef = useRef(`user-${Date.now()}-${Math.random()}`)

  // Connect to WebSocket
  useEffect(() => {
    const userId = userIdRef.current
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/api/docs/${docId}/ws?userId=${userId}&userName=${encodeURIComponent(userName)}`

    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      console.log('Connected to document')
      setConnected(true)
    }

    ws.onmessage = (event) => {
      const message: DocumentMessage = JSON.parse(event.data)

      switch (message.type) {
        case 'sync':
          setContent(message.fullContent || '')
          if (callbacks.onSync) {
            callbacks.onSync({
              content: message.fullContent,
              version: message.version,
              users: message.users,
            })
          }
          break

        case 'edit':
          // Apply remote edit
          if (message.position !== undefined && message.content !== undefined) {
            setContent((prev) => {
              const before = prev.slice(0, message.position)
              const after = prev.slice((message.position || 0) + (message.length || 0))
              return before + (message.content || '') + after
            })
          }
          break

        case 'join':
          if (callbacks.onJoin) {
            callbacks.onJoin(message.userId || '', message.userName || 'Guest')
          }
          break

        case 'leave':
          if (callbacks.onLeave) {
            callbacks.onLeave(message.userId || '')
          }
          break

        case 'cursor':
          if (callbacks.onCursor && message.userId !== userId) {
            callbacks.onCursor(message.userId || '', message.cursor || 0)
          }
          break
      }
    }

    ws.onclose = () => {
      console.log('Disconnected from document')
      setConnected(false)
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      setConnected(false)
    }

    wsRef.current = ws

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close()
      }
    }
  }, [docId, userName, callbacks])

  const sendEdit = useCallback((text: string, position: number, length: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'edit',
        position,
        content: text,
        length,
      }))
    }
    setContent(text)
  }, [])

  const sendCursor = useCallback((position: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'cursor',
        cursor: position,
      }))
    }
    setCursor(position)
  }, [])

  return { content, cursor, sendEdit, sendCursor, connected }
}
