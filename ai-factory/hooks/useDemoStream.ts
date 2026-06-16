import { useEffect, useRef, useState } from 'react';
import type { DemoStreamEvent } from '@/types/demo-events';
import { getAuthHeaders } from '@/lib/auth-client';

export function useDemoStream(projectId: string | null) {
  const [events, setEvents] = useState<DemoStreamEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!projectId) {
      setEvents([]);
      setConnected(false);
      setIsDone(false);
      return;
    }

    const abort = new AbortController();
    abortRef.current = abort;
    setEvents([]);
    setIsDone(false);
    setError(null);
    setConnected(true);

    const url = `/api/demo/stream?projectId=${encodeURIComponent(projectId)}`;

    const connect = async () => {
      let retries = 0;
      const maxRetries = 3;

      while (retries <= maxRetries && !abort.signal.aborted) {
        try {
          const response = await fetch(url, {
            headers: {
              Accept: 'text/event-stream',
              ...getAuthHeaders(),
            },
            signal: abort.signal,
          });

          if (!response.ok) {
            throw new Error(`SSE connection failed: ${response.status}`);
          }

          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error('ReadableStream not available');
          }

          const decoder = new TextDecoder();
          let buffer = '';

          while (!abort.signal.aborted) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data:')) {
                try {
                  const event: DemoStreamEvent = JSON.parse(line.slice(5).trim());
                  setEvents((prev) => [...prev, event]);

                  if (event.kind === 'done') {
                    setIsDone(true);
                    setConnected(false);
                    return;
                  }
                  if (event.kind === 'error') {
                    setError(event.data.message || '生成过程发生错误');
                  }
                } catch {
                  // ignore malformed SSE data lines
                }
              }
            }
          }

          // If we get here, the stream ended without 'done'
          if (!abort.signal.aborted) {
            retries++;
            if (retries <= maxRetries) {
              const delay = Math.min(1000 * Math.pow(2, retries - 1), 5000);
              await new Promise((resolve) => setTimeout(resolve, delay));
            }
          }
        } catch (err: any) {
          if (abort.signal.aborted) return;
          if (err.name === 'AbortError') return;
          retries++;
          if (retries > maxRetries) {
            setError(err.message || 'SSE 连接失败');
            setConnected(false);
            return;
          }
          const delay = Math.min(1000 * Math.pow(2, retries - 1), 5000);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    };

    void connect();

    return () => {
      abort.abort();
      abortRef.current = null;
      setConnected(false);
    };
  }, [projectId]);

  return { events, connected, error, isDone };
}
