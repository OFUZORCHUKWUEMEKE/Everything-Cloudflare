import { useEffect, useRef, useCallback, useState } from 'react';

interface UseWebSocketProps {
  url: string;
  onMessage?: (data: any) => void;
  onOpen?: () => void;
  onError?: (error: Event) => void;
  onClose?: () => void;
}

export function useWebSocket({
  url,
  onMessage,
  onOpen,
  onError,
  onClose,
}: UseWebSocketProps) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const send = useCallback((data: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  const close = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }
  }, []);

  useEffect(() => {
    if (!url) return;

    const ws = new WebSocket(url);

    ws.onopen = () => {
      setIsConnected(true);
      onOpen?.();
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage?.(data);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      onError?.(error);
    };

    ws.onclose = () => {
      setIsConnected(false);
      onClose?.();
    };

    wsRef.current = ws;

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [url, onMessage, onOpen, onError, onClose]);

  return { send, close, isConnected, ws: wsRef.current };
}
