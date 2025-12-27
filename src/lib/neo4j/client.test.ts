/**
 * Neo4j Client - Unit Tests
 *
 * Note: Full integration tests require a running Neo4j instance.
 * These tests verify module exports and configuration without database.
 *
 * For integration tests, use a test Neo4j container with:
 *   docker run -d -p 7687:7687 -e NEO4J_AUTH=neo4j/test neo4j:5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock neo4j-driver before importing client
vi.mock('neo4j-driver', () => ({
  default: {
    driver: vi.fn(() => ({
      session: vi.fn(() => ({
        run: vi.fn(),
        close: vi.fn(),
      })),
      close: vi.fn(),
    })),
    auth: {
      basic: vi.fn((user, pass) => ({ user, pass })),
    },
    session: {
      READ: 'READ',
      WRITE: 'WRITE',
    },
    isInt: vi.fn(() => false),
    isDate: vi.fn(() => false),
    isDateTime: vi.fn(() => false),
    isDuration: vi.fn(() => false),
    integer: {
      toNumber: vi.fn((val) => val),
    },
  },
}));

describe('Neo4j Client Module', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('module exports', () => {
    it('should export getNeo4jDriver function', async () => {
      const { getNeo4jDriver } = await import('./client');
      expect(typeof getNeo4jDriver).toBe('function');
    });

    it('should export closeNeo4jDriver function', async () => {
      const { closeNeo4jDriver } = await import('./client');
      expect(typeof closeNeo4jDriver).toBe('function');
    });

    it('should export neo4jHealthCheck function', async () => {
      const { neo4jHealthCheck } = await import('./client');
      expect(typeof neo4jHealthCheck).toBe('function');
    });

    it('should export readQuery function', async () => {
      const { readQuery } = await import('./client');
      expect(typeof readQuery).toBe('function');
    });

    it('should export writeQuery function', async () => {
      const { writeQuery } = await import('./client');
      expect(typeof writeQuery).toBe('function');
    });

    it('should export withTransaction function', async () => {
      const { withTransaction } = await import('./client');
      expect(typeof withTransaction).toBe('function');
    });

    it('should export getDatabaseStats function', async () => {
      const { getDatabaseStats } = await import('./client');
      expect(typeof getDatabaseStats).toBe('function');
    });
  });

  describe('getNeo4jDriver', () => {
    it('should return a driver instance (singleton)', async () => {
      const { getNeo4jDriver } = await import('./client');

      const driver1 = getNeo4jDriver();
      const driver2 = getNeo4jDriver();

      expect(driver1).toBeDefined();
      expect(driver1).toBe(driver2); // Same instance (singleton)
    });
  });

  describe('closeNeo4jDriver', () => {
    it('should close the driver without error', async () => {
      const { getNeo4jDriver, closeNeo4jDriver } = await import('./client');

      // Initialize driver first
      getNeo4jDriver();

      // Should not throw
      await expect(closeNeo4jDriver()).resolves.not.toThrow();
    });

    it('should handle closing when no driver exists', async () => {
      // Fresh module import - no driver initialized
      vi.resetModules();
      const { closeNeo4jDriver } = await import('./client');

      // Should not throw
      await expect(closeNeo4jDriver()).resolves.not.toThrow();
    });
  });
});

/**
 * Integration Test Notes (requires running Neo4j):
 *
 * describe('Neo4j Integration', () => {
 *   it('should pass health check with valid connection', async () => {
 *     const healthy = await neo4jHealthCheck();
 *     expect(healthy).toBe(true);
 *   });
 *
 *   it('should execute read queries', async () => {
 *     const result = await readQuery<{ count: number }>(
 *       'MATCH (n) RETURN count(n) as count'
 *     );
 *     expect(result[0]).toHaveProperty('count');
 *   });
 *
 *   it('should convert Neo4j Integer to number', async () => {
 *     const result = await readQuery<{ num: number }>(
 *       'RETURN 42 as num'
 *     );
 *     expect(result[0].num).toBe(42);
 *     expect(typeof result[0].num).toBe('number');
 *   });
 *
 *   it('should convert Neo4j Date to ISO string', async () => {
 *     const result = await readQuery<{ date: string }>(
 *       'RETURN date("2024-01-15") as date'
 *     );
 *     expect(result[0].date).toBe('2024-01-15');
 *   });
 * });
 */
