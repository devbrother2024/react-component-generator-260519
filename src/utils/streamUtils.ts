export interface SSEEvent {
  event: string;
  data: string;
}

export function parseSSEChunk(chunk: string): SSEEvent[] {
  const events: SSEEvent[] = [];
  const blocks = chunk.split('\n\n');

  for (const block of blocks) {
    if (!block.trim()) continue;

    let event = '';
    let data = '';

    for (const line of block.split('\n')) {
      if (line.startsWith(':')) continue;
      if (line.startsWith('event: ')) {
        event = line.slice(7);
      } else if (line.startsWith('data: ')) {
        data = line.slice(6);
      }
    }

    if (data !== '') {
      events.push({ event, data });
    }
  }

  return events;
}

export function parseSSEData<T>(event: SSEEvent): T | null {
  if (!event.data) return null;
  try {
    return JSON.parse(event.data) as T;
  } catch {
    return null;
  }
}

export function extractSSEEvents(buffer: string): { events: SSEEvent[]; remainder: string } {
  const parts = buffer.split('\n\n');
  const remainder = parts.pop() ?? '';
  const events = parseSSEChunk(parts.join('\n\n') + (parts.length > 0 ? '\n\n' : ''));
  return { events, remainder };
}
