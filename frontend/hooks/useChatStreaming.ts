/**
 * Hook for managing real-time chat streaming with SSE
 * Handles reconnection, background streaming, and session switching
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { api } from '@/lib/api';

interface StreamEvent {
  type: 'chunk' | 'complete' | 'error';
  message_id: string;
  content?: string;
  index?: number;
  error?: string;
  tokens?: number;
  latency_ms?: number;
}

interface StreamOptions {
  sessionId: string;
  messageId: string;
  onChunk: (content: string, index: number) => void;
  onComplete: (fullContent: string, meta: { tokens?: number; latency_ms?: number }) => void;
  onError: (error: string) => void;
}

export function useChatStreaming() {
  const activeStreams = useRef<Map<string, EventSource>>(new Map());
  const contentBuffers = useRef<Map<string, string>>(new Map());

  /**
   * Connect to SSE stream for a message
   */
  const connectStream = useCallback((options: StreamOptions) => {
    const { sessionId, messageId, onChunk, onComplete, onError } = options;
    const streamKey = `${sessionId}:${messageId}`;

    // Close existing stream if any
    const existing = activeStreams.current.get(streamKey);
    if (existing) {
      existing.close();
    }

    // Initialize content buffer
    contentBuffers.current.set(streamKey, '');

    // Create SSE connection
    const eventSource = new EventSource(
      `${api.defaults.baseURL}/chat/stream/${sessionId}?message_id=${messageId}`,
      { withCredentials: true }
    );

    eventSource.onmessage = (event) => {
      try {
        const data: StreamEvent = JSON.parse(event.data);

        if (data.type === 'chunk' && data.content) {
          // Append chunk to buffer
          const currentContent = contentBuffers.current.get(streamKey) || '';
          const newContent = currentContent + data.content;
          contentBuffers.current.set(streamKey, newContent);

          // Notify about new chunk
          onChunk(data.content, data.index || 0);
        } else if (data.type === 'complete') {
          // Stream completed
          const fullContent = contentBuffers.current.get(streamKey) || data.content || '';
          onComplete(fullContent, {
            tokens: data.tokens,
            latency_ms: data.latency_ms,
          });

          // Cleanup
          eventSource.close();
          activeStreams.current.delete(streamKey);
          contentBuffers.current.delete(streamKey);
        } else if (data.type === 'error') {
          // Stream error
          onError(data.error || 'Unknown streaming error');

          // Cleanup
          eventSource.close();
          activeStreams.current.delete(streamKey);
          contentBuffers.current.delete(streamKey);
        }
      } catch (err) {
        console.error('Error parsing SSE message:', err);
        onError('Failed to parse streaming response');
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      onError('Connection lost. Please refresh.');

      // Cleanup
      eventSource.close();
      activeStreams.current.delete(streamKey);
      contentBuffers.current.delete(streamKey);
    };

    // Store active stream
    activeStreams.current.set(streamKey, eventSource);

    return () => {
      eventSource.close();
      activeStreams.current.delete(streamKey);
      contentBuffers.current.delete(streamKey);
    };
  }, []);

  /**
   * Disconnect a specific stream
   */
  const disconnectStream = useCallback((sessionId: string, messageId: string) => {
    const streamKey = `${sessionId}:${messageId}`;
    const stream = activeStreams.current.get(streamKey);

    if (stream) {
      stream.close();
      activeStreams.current.delete(streamKey);
      contentBuffers.current.delete(streamKey);
    }
  }, []);

  /**
   * Disconnect all active streams
   */
  const disconnectAll = useCallback(() => {
    activeStreams.current.forEach((stream) => {
      stream.close();
    });
    activeStreams.current.clear();
    contentBuffers.current.clear();
  }, []);

  /**
   * Get number of active streams
   */
  const getActiveStreamCount = useCallback(() => {
    return activeStreams.current.size;
  }, []);

  /**
   * Check if a specific stream is active
   */
  const isStreamActive = useCallback((sessionId: string, messageId: string) => {
    const streamKey = `${sessionId}:${messageId}`;
    return activeStreams.current.has(streamKey);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectAll();
    };
  }, [disconnectAll]);

  return {
    connectStream,
    disconnectStream,
    disconnectAll,
    getActiveStreamCount,
    isStreamActive,
  };
}

/**
 * Hook for polling active streams across all sessions
 * Enables background chat generation when switching sessions
 */
export function useBackgroundStreamMonitor(onStreamUpdate: (sessionId: string, messageId: string) => void) {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  const startMonitoring = useCallback(() => {
    if (isMonitoring) return;

    setIsMonitoring(true);

    // Poll for active streams every 3 seconds
    pollingInterval.current = setInterval(async () => {
      try {
        const response = await api.get('/chat/active-streams');
        const activeStreams = response.data.active_streams || [];

        // Notify about each active stream
        activeStreams.forEach((stream: any) => {
          onStreamUpdate(stream.session_id, stream.message_id);
        });
      } catch (error) {
        console.error('Failed to poll active streams:', error);
      }
    }, 3000);
  }, [isMonitoring, onStreamUpdate]);

  const stopMonitoring = useCallback(() => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
    setIsMonitoring(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, [stopMonitoring]);

  return {
    startMonitoring,
    stopMonitoring,
    isMonitoring,
  };
}
