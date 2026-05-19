import { describe, it, expect } from 'bun:test';
import { capitalize } from './stringUtils';

describe('stringUtils', () => {
  it('capitalize: "hello"를 "Hello"로 변환', () => {
    expect(capitalize('hello')).toBe('Hello');
  });

  it('capitalize: 빈 문자열은 그대로 반환', () => {
    expect(capitalize('')).toBe('');
  });

  it('capitalize: 이미 대문자면 유지', () => {
    expect(capitalize('Hello')).toBe('Hello');
  });
});
