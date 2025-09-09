"use client";
import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface UseMonitoringSocketOptions {
  url?: string; // override for tests
  onMention?: (m: any)=> void; // eslint-disable-line
  enabled?: boolean;
  maxBackoffMs?: number;
}

interface SocketState {
  status: 'connecting' | 'open' | 'closed' | 'error' | 'reconnecting';
  attempts: number;
  lastMessageAt?: number;
}

export function useMonitoringSocket(opts: UseMonitoringSocketOptions = {}) {
  const { url = '/api/v1/monitoring/ws/live', onMention, enabled = true, maxBackoffMs = 15000 } = opts;
  const qc = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const queueRef = useRef<string[]>([]);
  const [state,setState] = useState<SocketState>({ status: 'connecting', attempts: 0 });
  const backoffRef = useRef(1000);
  const manualCloseRef = useRef(false);

  const flushQueue = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    while(queueRef.current.length) {
      const msg = queueRef.current.shift();
      if (msg) wsRef.current.send(msg);
    }
  };

  const send = useCallback((data: any) => { // eslint-disable-line
    const payload = JSON.stringify(data);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(payload);
    } else {
      queueRef.current.push(payload);
    }
  },[]);

  // Build final websocket URL considering env override.
  const resolveUrl = useCallback(() => {
    const envBase = process.env.NEXT_PUBLIC_WS_URL; // Can be full ws(s) URL or http(s) origin or full path.
    let base = url;
    // If explicit override passed in opts use as-is.
    if (!opts.url && envBase) {
      // If envBase looks like a full ws/http URL AND already points to a ws endpoint (contains '/ws') assume complete.
      if (/^(ws|wss|http|https):\/\//i.test(envBase) && /\/ws\//i.test(envBase)) {
        base = envBase;
      } else if (/^(ws|wss|http|https):\/\//i.test(envBase)) {
        // Treat envBase as origin; append path if current base is a leading slash path.
        if (base.startsWith('/')) base = envBase.replace(/\/$/, '') + base;
        else base = base; // already absolute
      } else {
        // envBase is likely a host w/o protocol, add current window protocol if available.
        if (typeof window !== 'undefined') {
          const locProto = window.location.protocol === 'https:' ? 'https://' : 'http://';
          base = locProto + envBase.replace(/\/$/, '') + (base.startsWith('/') ? base : '/' + base);
        }
      }
    } else if (/^\//.test(base) && typeof window !== 'undefined') {
      // Relative path -> use current origin.
      base = window.location.origin + base;
    }
    // Normalize to ws/wss protocol.
    if (/^http:/.test(base)) base = base.replace(/^http:/, 'ws:');
    else if (/^https:/.test(base)) base = base.replace(/^https:/, 'wss:');
    else if (!/^(ws|wss):\/\//.test(base) && typeof window !== 'undefined') {
      // Missing protocol; infer from page.
      const secure = window.location.protocol === 'https:';
      base = `${secure ? 'wss://' : 'ws://'}${base.replace(/^\/*/, '')}`;
    }
    return base;
  }, [url, opts.url]);

  const connect = useCallback(()=>{
    if (!enabled) return;
    manualCloseRef.current = false;
    setState(s=> ({...s, status: 'connecting'}));
    const finalUrl = resolveUrl();
    const socket = new WebSocket(finalUrl);
    wsRef.current = socket;

    socket.onopen = () => {
      setState(s=> ({...s, status: 'open'}));
      backoffRef.current = 1000;
      // Send an identifying client hello for server-side diagnostics
      try { socket.send(JSON.stringify({ event: 'client_hello', ts: Date.now(), ua: navigator.userAgent })); } catch {}
      flushQueue();
    };

    socket.onmessage = (ev) => {
      setState(s=> ({...s, lastMessageAt: Date.now()}));
      try {
        const msg = JSON.parse(ev.data);
        if (msg.event === 'connected') return;
        if (msg.event === 'ping') {
          // respond with pong to keep alive
          try { socket.send(JSON.stringify('pong')); } catch {}
          return;
        }
        if (msg.event === 'pong') return;
        if (msg.event === 'message') {
          if (msg.content?.type === 'mention') {
            onMention?.(msg.content);
            // Optimistically prepend to mentions query cache (if used elsewhere)
            qc.setQueryData(['monitoring','mentions'], (old: any)=>{ // eslint-disable-line
              if (!old) return old;
              return { ...old, items: [msg.content, ...(old.items||[])].slice(0,200) };
            });
          }
        }
      } catch { /* ignore */ }
    };

    socket.onerror = () => {
      setState(s=> ({...s, status: 'error'}));
    };

    socket.onclose = (ev) => {
      // Basic console diagnostics (can be removed later)
      if (process.env.NODE_ENV !== 'production') {
        console.debug('Monitoring WS closed', { code: ev.code, reason: ev.reason, wasClean: ev.wasClean });
      }
      if (manualCloseRef.current) { setState(s=> ({...s, status: 'closed'})); return; }
      setState(s=> ({...s, status: 'reconnecting', attempts: s.attempts + 1}));
      const wait = backoffRef.current;
      backoffRef.current = Math.min(maxBackoffMs, backoffRef.current * 2);
      setTimeout(()=> connect(), wait + Math.random()*500);
    };
  },[enabled, onMention, qc, maxBackoffMs, resolveUrl]);

  useEffect(()=> {
    if (!enabled) return;
  let visibilityHandler: (() => void) | null = null;
    connect();
    if (typeof document !== 'undefined') {
      visibilityHandler = () => {
        if (document.hidden) {
          // Pause connection when tab hidden to save resources
          manualCloseRef.current = true;
          wsRef.current?.close();
        } else if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
          manualCloseRef.current = false;
          connect();
        }
      };
      document.addEventListener('visibilitychange', visibilityHandler);
    }
    return () => {
      manualCloseRef.current = true; wsRef.current?.close();
  if (visibilityHandler) document.removeEventListener('visibilitychange', visibilityHandler);
    };
  },[connect, enabled]);

  return {
    status: state.status,
    attempts: state.attempts,
    lastMessageAt: state.lastMessageAt,
    send,
    isConnected: state.status === 'open',
  };
}
