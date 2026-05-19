import { describe, it, expect } from 'bun:test';
import { parseSSEChunk, parseSSEData, extractSSEEvents } from './streamUtils';
import type { SSEEvent } from './streamUtils';

describe('parseSSEChunk', () => {
  it('단일 이벤트 블록 파싱', () => {
    const chunk = 'event: text_delta\ndata: {"type":"text_delta","text":"hello"}\n\n';
    const result = parseSSEChunk(chunk);
    expect(result).toHaveLength(1);
    expect(result[0].event).toBe('text_delta');
    expect(result[0].data).toBe('{"type":"text_delta","text":"hello"}');
  });

  it('event 필드 없는 data-only 블록은 event를 빈 문자열로 반환', () => {
    const chunk = 'data: {"text":"hello"}\n\n';
    const result = parseSSEChunk(chunk);
    expect(result).toHaveLength(1);
    expect(result[0].event).toBe('');
    expect(result[0].data).toBe('{"text":"hello"}');
  });

  it('빈 문자열은 빈 배열 반환', () => {
    expect(parseSSEChunk('')).toEqual([]);
  });

  it('여러 이벤트 블록 파싱', () => {
    const chunk =
      'event: text_delta\ndata: {"text":"a"}\n\nevent: done\ndata: {"code":"final"}\n\n';
    const result = parseSSEChunk(chunk);
    expect(result).toHaveLength(2);
    expect(result[0].event).toBe('text_delta');
    expect(result[1].event).toBe('done');
  });

  it(': 로 시작하는 주석 줄은 무시', () => {
    const chunk = ': this is a comment\nevent: text_delta\ndata: {}\n\n';
    const result = parseSSEChunk(chunk);
    expect(result).toHaveLength(1);
    expect(result[0].event).toBe('text_delta');
  });

  it('data 필드 없는 블록은 건너뜀', () => {
    const chunk = 'event: text_delta\n\n';
    const result = parseSSEChunk(chunk);
    expect(result).toHaveLength(0);
  });
});

describe('parseSSEData', () => {
  it('유효한 JSON 파싱', () => {
    const event: SSEEvent = { event: 'text_delta', data: '{"type":"text_delta","text":"hello"}' };
    const result = parseSSEData<{ type: string; text: string }>(event);
    expect(result).toEqual({ type: 'text_delta', text: 'hello' });
  });

  it('잘못된 JSON은 null 반환 (throw 안 함)', () => {
    const event: SSEEvent = { event: 'text_delta', data: 'invalid json' };
    const result = parseSSEData(event);
    expect(result).toBeNull();
  });

  it('[DONE] 같은 특수 값은 null 반환', () => {
    const event: SSEEvent = { event: '', data: '[DONE]' };
    expect(parseSSEData(event)).toBeNull();
  });

  it('빈 data는 null 반환', () => {
    const event: SSEEvent = { event: 'text_delta', data: '' };
    expect(parseSSEData(event)).toBeNull();
  });

  it('중첩 객체 파싱', () => {
    const event: SSEEvent = { event: 'done', data: '{"type":"done","code":"render()"}' };
    const result = parseSSEData<{ type: string; code: string }>(event);
    expect(result?.code).toBe('render()');
  });
});

describe('extractSSEEvents', () => {
  it('완성된 블록만 추출하고 나머지는 버퍼로 반환', () => {
    const buffer = 'event: text_delta\ndata: {"text":"hello"}\n\nevent: t';
    const { events, remainder } = extractSSEEvents(buffer);
    expect(events).toHaveLength(1);
    expect(events[0].event).toBe('text_delta');
    expect(remainder).toBe('event: t');
  });

  it('완성된 블록 없으면 빈 배열과 전체 버퍼 반환', () => {
    const buffer = 'event: text_delta\ndata: {"text":';
    const { events, remainder } = extractSSEEvents(buffer);
    expect(events).toEqual([]);
    expect(remainder).toBe(buffer);
  });

  it('여러 완성 블록 추출', () => {
    const buffer =
      'event: a\ndata: {"x":1}\n\nevent: b\ndata: {"x":2}\n\n';
    const { events, remainder } = extractSSEEvents(buffer);
    expect(events).toHaveLength(2);
    expect(events[0].event).toBe('a');
    expect(events[1].event).toBe('b');
    expect(remainder).toBe('');
  });

  it('빈 버퍼는 빈 결과 반환', () => {
    const { events, remainder } = extractSSEEvents('');
    expect(events).toEqual([]);
    expect(remainder).toBe('');
  });

  it('완성 블록 후 미완성 블록이 있으면 미완성은 버퍼로', () => {
    const buffer = 'event: a\ndata: {}\n\npartial';
    const { events, remainder } = extractSSEEvents(buffer);
    expect(events).toHaveLength(1);
    expect(remainder).toBe('partial');
  });
});
