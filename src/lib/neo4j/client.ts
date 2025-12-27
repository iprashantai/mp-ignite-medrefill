/**
 * Neo4j Client for Ignite Health
 *
 * Provides typed access to Neo4j graph database for
 * medication adherence analysis and FHIR visualization.
 */

import neo4j, { Driver, Session, Record as Neo4jRecord, Integer } from 'neo4j-driver';

// Singleton driver instance
let driver: Driver | null = null;

/**
 * Neo4j connection configuration
 */
interface Neo4jConfig {
  uri: string;
  user: string;
  password: string;
}

/**
 * Get Neo4j configuration from environment variables
 */
function getConfig(): Neo4jConfig {
  return {
    uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
    user: process.env.NEO4J_USER || 'neo4j',
    password: process.env.NEO4J_PASSWORD || 'ignitehealth2024',
  };
}

/**
 * Get or create Neo4j driver instance (singleton pattern)
 */
export function getNeo4jDriver(): Driver {
  if (!driver) {
    const config = getConfig();

    driver = neo4j.driver(config.uri, neo4j.auth.basic(config.user, config.password), {
      maxConnectionPoolSize: 50,
      connectionAcquisitionTimeout: 30000,
      connectionTimeout: 30000,
      logging: {
        level: 'warn',
        logger: (level, message) => console.warn(`[Neo4j ${level}] ${message}`),
      },
    });
  }
  return driver;
}

/**
 * Close the Neo4j driver connection
 * Call this when shutting down the application
 */
export async function closeNeo4jDriver(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = null;
  }
}

/**
 * Health check for Neo4j connection
 */
export async function neo4jHealthCheck(): Promise<boolean> {
  try {
    const result = await readQuery<{ health: number }>('RETURN 1 as health');
    return result.length > 0 && result[0].health === 1;
  } catch (error) {
    console.error('Neo4j health check failed:', error);
    return false;
  }
}

/**
 * Execute a read-only Cypher query
 * Uses READ access mode for optimal routing in clusters
 */
export async function readQuery<T = Record<string, unknown>>(
  cypher: string,
  params: Record<string, unknown> = {}
): Promise<T[]> {
  const session = getNeo4jDriver().session({
    defaultAccessMode: neo4j.session.READ,
  });

  try {
    const result = await session.run(cypher, params);
    return result.records.map((record: Neo4jRecord) => {
      const obj: Record<string, unknown> = {};
      record.keys.forEach((key) => {
        obj[String(key)] = convertNeo4jValue(record.get(key));
      });
      return obj as T;
    });
  } finally {
    await session.close();
  }
}

/**
 * Execute a write Cypher query
 * Uses WRITE access mode
 */
export async function writeQuery<T = Record<string, unknown>>(
  cypher: string,
  params: Record<string, unknown> = {}
): Promise<T[]> {
  const session = getNeo4jDriver().session({
    defaultAccessMode: neo4j.session.WRITE,
  });

  try {
    const result = await session.run(cypher, params);
    return result.records.map((record: Neo4jRecord) => {
      const obj: Record<string, unknown> = {};
      record.keys.forEach((key) => {
        obj[String(key)] = convertNeo4jValue(record.get(key));
      });
      return obj as T;
    });
  } finally {
    await session.close();
  }
}

/**
 * Execute a query within a transaction
 * Useful for multiple related writes
 */
export async function withTransaction<T>(work: (tx: Session) => Promise<T>): Promise<T> {
  const session = getNeo4jDriver().session({
    defaultAccessMode: neo4j.session.WRITE,
  });

  try {
    return await session.executeWrite((tx) => work(tx as unknown as Session));
  } finally {
    await session.close();
  }
}

/**
 * Convert Neo4j Date to ISO date string
 */
function convertNeo4jDate(value: { year: Integer; month: Integer; day: Integer }): string {
  return new Date(
    neo4j.integer.toNumber(value.year),
    neo4j.integer.toNumber(value.month) - 1,
    neo4j.integer.toNumber(value.day)
  )
    .toISOString()
    .split('T')[0];
}

/**
 * Convert Neo4j DateTime to ISO datetime string
 */
function convertNeo4jDateTime(value: {
  year: Integer;
  month: Integer;
  day: Integer;
  hour: Integer;
  minute: Integer;
  second: Integer;
}): string {
  return new Date(
    neo4j.integer.toNumber(value.year),
    neo4j.integer.toNumber(value.month) - 1,
    neo4j.integer.toNumber(value.day),
    neo4j.integer.toNumber(value.hour),
    neo4j.integer.toNumber(value.minute),
    neo4j.integer.toNumber(value.second)
  ).toISOString();
}

/**
 * Convert Neo4j Duration to plain object
 */
function convertNeo4jDuration(value: { days: Integer; months: Integer }): {
  days: number;
  months: number;
} {
  return {
    days: neo4j.integer.toNumber(value.days),
    months: neo4j.integer.toNumber(value.months),
  };
}

/**
 * Convert Neo4j values to JavaScript values
 * Handles Neo4j Integer, Date, DateTime, Duration, Node, Relationship types
 */
function convertNeo4jValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  // Primitive Neo4j types
  if (neo4j.isInt(value)) return neo4j.integer.toNumber(value);
  if (neo4j.isDate(value))
    return convertNeo4jDate(value as { year: Integer; month: Integer; day: Integer });
  if (neo4j.isDateTime(value))
    return convertNeo4jDateTime(
      value as {
        year: Integer;
        month: Integer;
        day: Integer;
        hour: Integer;
        minute: Integer;
        second: Integer;
      }
    );
  if (neo4j.isDuration(value))
    return convertNeo4jDuration(value as { days: Integer; months: Integer });

  // Complex types require object check
  if (!value || typeof value !== 'object') return value;

  // Neo4j Node
  if ('labels' in value && 'properties' in value) {
    const node = value as { labels: string[]; properties: Record<string, unknown> };
    return { labels: node.labels, ...convertNeo4jProperties(node.properties) };
  }

  // Neo4j Relationship
  if ('type' in value && 'properties' in value) {
    const rel = value as { type: string; properties: Record<string, unknown> };
    return { type: rel.type, ...convertNeo4jProperties(rel.properties) };
  }

  // Arrays
  if (Array.isArray(value)) return value.map(convertNeo4jValue);

  // Plain objects
  return convertNeo4jProperties(value as Record<string, unknown>);
}

/**
 * Convert all properties in an object
 */
function convertNeo4jProperties(props: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    result[key] = convertNeo4jValue(value);
  }
  return result;
}

/**
 * Get database statistics
 */
export async function getDatabaseStats(): Promise<{
  nodeCount: number;
  relationshipCount: number;
  nodesByLabel: Record<string, number>;
  relationshipsByType: Record<string, number>;
}> {
  const [nodes, rels] = await Promise.all([
    readQuery<{ label: string; count: number }>(
      `MATCH (n) WITH labels(n)[0] AS label, count(n) AS count RETURN label, count ORDER BY count DESC`
    ),
    readQuery<{ type: string; count: number }>(
      `MATCH ()-[r]->() WITH type(r) AS type, count(r) AS count RETURN type, count ORDER BY count DESC`
    ),
  ]);

  const nodesByLabel: Record<string, number> = {};
  const relationshipsByType: Record<string, number> = {};

  let nodeCount = 0;
  let relationshipCount = 0;

  for (const row of nodes) {
    nodesByLabel[row.label] = row.count;
    nodeCount += row.count;
  }

  for (const row of rels) {
    relationshipsByType[row.type] = row.count;
    relationshipCount += row.count;
  }

  return { nodeCount, relationshipCount, nodesByLabel, relationshipsByType };
}
