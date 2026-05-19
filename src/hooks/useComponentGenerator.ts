import { useState, useCallback, useEffect, useRef } from 'react';
import type { GeneratedComponent, Provider } from '../types';

const STORAGE_KEY = 'generated-components';

interface UseComponentGeneratorReturn {
  components: GeneratedComponent[];
  isLoading: boolean;
  error: string | null;
  generate: (prompt: string, apiKey: string | undefined, provider: Provider) => Promise<void>;
  generateStream: (prompt: string, apiKey: string | undefined, provider: Provider) => Promise<void>;
  removeComponent: (id: string) => void;
  clearAll: () => void;
}

function isValidComponentArray(data: unknown): data is Array<Omit<GeneratedComponent, 'createdAt'> & { createdAt: string }> {
  if (!Array.isArray(data)) return false;
  return data.every((item) => {
    return (
      typeof item === 'object' &&
      item !== null &&
      typeof item.id === 'string' &&
      typeof item.prompt === 'string' &&
      typeof item.code === 'string' &&
      typeof item.createdAt === 'string'
    );
  });
}

export function useComponentGenerator(): UseComponentGeneratorReturn {
  const isInitialMount = useRef(true);

  const [components, setComponents] = useState<GeneratedComponent[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (!isValidComponentArray(parsed)) {
        console.warn('[useComponentGenerator] Invalid localStorage data, resetting');
        return [];
      }
      return parsed.map((c) => ({ ...c, createdAt: new Date(c.createdAt) }));
    } catch (err) {
      console.warn('[useComponentGenerator] localStorage restore failed:', err instanceof Error ? err.message : 'Unknown error');
      return [];
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const toSave = components.filter((c) => !c.isStreaming);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  }, [components]);

  const generate = useCallback(async (prompt: string, apiKey: string | undefined, provider: Provider) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, ...(apiKey && { apiKey }), provider }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate component');
      }

      const newComponent: GeneratedComponent = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        prompt,
        code: data.code,
        createdAt: new Date(),
      };

      setComponents((prev) => [newComponent, ...prev]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const generateStream = useCallback(async (
    prompt: string,
    apiKey: string | undefined,
    provider: Provider
  ) => {
    setIsLoading(true);
    setError(null);

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setComponents((prev) => [
      { id, prompt, code: '', createdAt: new Date(), isStreaming: true },
      ...prev,
    ]);

    try {
      const res = await fetch('/api/generate-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, ...(apiKey && { apiKey }), provider }),
      });

      if (!res.ok || !res.body) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || 'Failed to generate component');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const blocks = buffer.split('\n\n');
        buffer = blocks.pop() ?? '';

        for (const block of blocks) {
          const lines = block.split('\n');
          const eventLine = lines.find((l) => l.startsWith('event: '));
          const dataLine = lines.find((l) => l.startsWith('data: '));
          if (!eventLine || !dataLine) continue;

          const event = eventLine.slice(7);
          try {
            const data = JSON.parse(dataLine.slice(6)) as {
              text?: string;
              code?: string;
              message?: string;
            };

            if (event === 'text_delta' && data.text) {
              setComponents((prev) =>
                prev.map((c) => (c.id === id ? { ...c, code: c.code + data.text } : c))
              );
            } else if (event === 'done' && data.code) {
              setComponents((prev) =>
                prev.map((c) =>
                  c.id === id ? { ...c, code: data.code as string, isStreaming: false } : c
                )
              );
            } else if (event === 'error') {
              throw new Error(data.message || 'Streaming error');
            }
          } catch (parseErr) {
            if (parseErr instanceof SyntaxError) continue;
            throw parseErr;
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setComponents((prev) => prev.filter((c) => c.id !== id));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const removeComponent = useCallback((id: string) => {
    setComponents((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setComponents([]);
  }, []);

  return { components, isLoading, error, generate, generateStream, removeComponent, clearAll };
}
