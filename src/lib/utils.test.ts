/**
 * Utility Functions - Unit Tests
 *
 * Tests for the cn() class name merging utility.
 */

import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn (class name merger)', () => {
  it('should merge multiple class strings', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('should handle empty inputs', () => {
    expect(cn()).toBe('');
    expect(cn('')).toBe('');
  });

  it('should filter out falsy values', () => {
    expect(cn('foo', null, 'bar', undefined, false)).toBe('foo bar');
  });

  it('should handle conditional classes', () => {
    const isActive = true;
    const isDisabled = false;
    expect(cn('base', isActive && 'active', isDisabled && 'disabled')).toBe('base active');
  });

  it('should merge Tailwind conflicting classes (last wins)', () => {
    // twMerge should resolve conflicts
    expect(cn('px-4', 'px-6')).toBe('px-6');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
    expect(cn('bg-white', 'bg-gray-100')).toBe('bg-gray-100');
  });

  it('should preserve non-conflicting classes', () => {
    expect(cn('px-4', 'py-2', 'text-sm')).toBe('px-4 py-2 text-sm');
  });

  it('should handle array inputs', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar');
    expect(cn(['foo'], ['bar'])).toBe('foo bar');
  });

  it('should handle object inputs for conditional classes', () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz');
  });

  it('should handle mixed input types', () => {
    expect(cn('base', ['array-class'], { 'object-class': true })).toBe(
      'base array-class object-class'
    );
  });
});
