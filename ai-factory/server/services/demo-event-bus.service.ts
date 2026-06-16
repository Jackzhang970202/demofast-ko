import type { DemoStreamEvent } from '@/types/demo-events';

interface ProjectStream {
  projectId: string;
  events: DemoStreamEvent[];
  listeners: Set<(event: DemoStreamEvent) => void>;
  closed: boolean;
  nextId: number;
}

const streams = new Map<string, ProjectStream>();

export const DemoEventBusService = {
  createStream(projectId: string): void {
    if (streams.has(projectId)) return;
    streams.set(projectId, {
      projectId,
      events: [],
      listeners: new Set(),
      closed: false,
      nextId: 1,
    });
  },

  push(projectId: string, kind: DemoStreamEvent['kind'], data: Record<string, any> = {}): void {
    const stream = streams.get(projectId);
    if (!stream || stream.closed) return;

    const event: DemoStreamEvent = {
      id: stream.nextId++,
      kind,
      ts: Date.now(),
      data,
    };
    stream.events.push(event);

    for (const listener of stream.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('[DemoEventBus] listener error:', err);
      }
    }
  },

  subscribe(projectId: string, callback: (event: DemoStreamEvent) => void): () => void {
    const stream = streams.get(projectId);
    if (!stream) return () => {};

    stream.listeners.add(callback);

    return () => {
      stream.listeners.delete(callback);
    };
  },

  getHistory(projectId: string): DemoStreamEvent[] {
    return streams.get(projectId)?.events || [];
  },

  close(projectId: string): void {
    const stream = streams.get(projectId);
    if (!stream) return;
    stream.closed = true;
    stream.listeners.clear();
    // Keep events in memory for a short while for late subscribers
    setTimeout(() => {
      streams.delete(projectId);
    }, 5 * 60 * 1000);
  },

  isClosed(projectId: string): boolean {
    return streams.get(projectId)?.closed ?? true;
  },
};
