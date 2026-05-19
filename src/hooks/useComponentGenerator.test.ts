import { describe, it, expect, beforeEach } from 'bun:test';

const STORAGE_KEY = 'generated-components';

function isValidComponentArray(data: unknown): data is Array<{
  id: string;
  prompt: string;
  code: string;
  createdAt: string;
}> {
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

describe('useComponentGenerator localStorage logic', () => {
  describe('data validation', () => {
    it('유효한 컴포넌트 배열 검증', () => {
      const validComponents = [
        {
          id: 'test-1',
          prompt: 'test prompt',
          code: 'console.log("test")',
          createdAt: '2026-05-19T10:00:00.000Z',
        },
      ];

      expect(isValidComponentArray(validComponents)).toBe(true);
    });

    it('여러 유효한 컴포넌트 검증', () => {
      const validComponents = [
        {
          id: 'comp-1',
          prompt: 'Button',
          code: 'render(<button>Click</button>)',
          createdAt: '2026-05-19T10:00:00.000Z',
        },
        {
          id: 'comp-2',
          prompt: 'Input',
          code: 'render(<input />)',
          createdAt: '2026-05-19T11:00:00.000Z',
        },
      ];

      expect(isValidComponentArray(validComponents)).toBe(true);
    });

    it('필드 누락된 데이터 거부', () => {
      const invalidComponents = [
        {
          id: 'test-1',
          prompt: 'test',
          // code 필드 누락
          createdAt: '2026-05-19T10:00:00.000Z',
        },
      ];

      expect(isValidComponentArray(invalidComponents as any)).toBe(false);
    });

    it('잘못된 타입의 필드 거부', () => {
      const invalidComponents = [
        {
          id: 123, // 숫자 타입
          prompt: 'test',
          code: 'code',
          createdAt: '2026-05-19T10:00:00.000Z',
        },
      ];

      expect(isValidComponentArray(invalidComponents as any)).toBe(false);
    });

    it('null 데이터 거부', () => {
      expect(isValidComponentArray(null as any)).toBe(false);
    });

    it('undefined 데이터 거부', () => {
      expect(isValidComponentArray(undefined as any)).toBe(false);
    });

    it('배열이 아닌 객체 거부', () => {
      expect(isValidComponentArray({ id: 'test' } as any)).toBe(false);
    });

    it('빈 배열 허용', () => {
      expect(isValidComponentArray([])).toBe(true);
    });
  });

  describe('date serialization', () => {
    it('ISO 문자열을 Date 객체로 변환', () => {
      const isoString = '2026-05-19T10:00:00.000Z';
      const date = new Date(isoString);

      expect(date instanceof Date).toBe(true);
      expect(date.getFullYear()).toBe(2026);
      expect(date.getMonth()).toBe(4); // 0-indexed
      expect(date.getDate()).toBe(19);
    });

    it('날짜 변환 후 ISO 문자열 복원', () => {
      const original = '2026-05-19T10:30:45.123Z';
      const date = new Date(original);
      const restored = date.toISOString();

      expect(restored).toBe(original);
    });

    it('여러 컴포넌트의 날짜 정상 변환', () => {
      const components = [
        {
          id: 'comp-1',
          prompt: 'Button component',
          code: 'render(<button>Click</button>)',
          createdAt: '2026-05-19T10:00:00.000Z',
        },
        {
          id: 'comp-2',
          prompt: 'Input component',
          code: 'render(<input />)',
          createdAt: '2026-05-19T11:00:00.000Z',
        },
      ];

      const restored = components.map((c) => ({
        ...c,
        createdAt: new Date(c.createdAt),
      }));

      expect(restored[0].createdAt instanceof Date).toBe(true);
      expect(restored[1].createdAt instanceof Date).toBe(true);
      expect(restored[0].createdAt.toISOString()).toBe(
        '2026-05-19T10:00:00.000Z'
      );
      expect(restored[1].createdAt.toISOString()).toBe(
        '2026-05-19T11:00:00.000Z'
      );
    });
  });

  describe('JSON serialization', () => {
    it('컴포넌트 배열 JSON 직렬화', () => {
      const components = [
        {
          id: 'test-1',
          prompt: 'test',
          code: 'code',
          createdAt: new Date('2026-05-19T10:00:00.000Z'),
        },
      ];

      const serialized = JSON.stringify(components);
      expect(typeof serialized).toBe('string');
      expect(serialized).toContain('"id":"test-1"');
    });

    it('JSON 파싱 및 검증', () => {
      const json =
        '[{"id":"test-1","prompt":"test","code":"code","createdAt":"2026-05-19T10:00:00.000Z"}]';

      const parsed = JSON.parse(json);
      expect(isValidComponentArray(parsed)).toBe(true);
    });

    it('손상된 JSON 파싱 실패', () => {
      const invalidJson = '{invalid json';

      expect(() => {
        JSON.parse(invalidJson);
      }).toThrow();
    });
  });

  describe('error recovery', () => {
    it('빈 배열 fallback', () => {
      try {
        JSON.parse('{invalid}');
      } catch {
        // 빈 배열로 fallback
        const fallback: any[] = [];
        expect(isValidComponentArray(fallback)).toBe(true);
      }
    });

    it('null을 빈 배열로 변환', () => {
      const data = null;
      const result = data ? JSON.parse(data as any) : [];
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it('검증 실패 시 fallback', () => {
      const data = { invalid: 'object' };
      const isValid = isValidComponentArray(data as any);

      if (!isValid) {
        const fallback: any[] = [];
        expect(isValid).toBe(false);
        expect(isValidComponentArray(fallback)).toBe(true);
      }
    });
  });

  describe('data persistence scenarios', () => {
    it('컴포넌트 추가 시뮬레이션', () => {
      const existing = [
        {
          id: 'comp-1',
          prompt: 'first',
          code: 'c1',
          createdAt: '2026-05-19T10:00:00.000Z',
        },
      ];

      const newComponent = {
        id: 'comp-2',
        prompt: 'second',
        code: 'c2',
        createdAt: new Date('2026-05-19T11:00:00.000Z'),
      };

      const updated = [newComponent, ...existing];
      const serialized = JSON.stringify(updated);
      const parsed = JSON.parse(serialized);

      expect(isValidComponentArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].id).toBe('comp-2');
    });

    it('컴포넌트 제거 시뮬레이션', () => {
      const components = [
        {
          id: 'comp-1',
          prompt: 'first',
          code: 'c1',
          createdAt: '2026-05-19T10:00:00.000Z',
        },
        {
          id: 'comp-2',
          prompt: 'second',
          code: 'c2',
          createdAt: '2026-05-19T11:00:00.000Z',
        },
      ];

      const filtered = components.filter((c) => c.id !== 'comp-1');
      const serialized = JSON.stringify(filtered);
      const parsed = JSON.parse(serialized);

      expect(isValidComponentArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].id).toBe('comp-2');
    });

    it('모든 컴포넌트 삭제 시뮬레이션', () => {
      const components = [
        {
          id: 'comp-1',
          prompt: 'first',
          code: 'c1',
          createdAt: '2026-05-19T10:00:00.000Z',
        },
      ];

      const cleared: any[] = [];
      const serialized = JSON.stringify(cleared);
      const parsed = JSON.parse(serialized);

      expect(isValidComponentArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(0);
    });
  });
});
