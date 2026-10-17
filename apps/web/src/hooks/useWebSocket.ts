import { useEffect, useRef, useState, useCallback } from 'react';

export interface WsEvent {
  type: string;
  data: unknown;
  ts: number;
}

export function useWebSocket(maxEvents = 200) {
  const [events, setEvents] = useState<WsEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${proto}://${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => {
      setConnected(false);
      setTimeout(connect, 2000);
    };
    ws.onerror = () => ws.close();
    ws.onmessage = (msg) => {
      try {
        const parsed: WsEvent = JSON.parse(msg.data);
        if (parsed.type === 'connected') return;
        setEvents((prev) => {
          const next = [...prev, parsed];
          return next.length > maxEvents ? next.slice(-maxEvents) : next;
        });
      } catch {}
    };
  }, [maxEvents]);

  useEffect(() => {
    connect();
    return () => wsRef.current?.close();
  }, [connect]);

  return { events, connected };
}
