#!/bin/bash
# Restore Neo4j database from backup
# Usage: ./restore.sh <backup-file.dump>
#
# For Neo4j Community Edition, we must stop the container
# to restore from a backup.

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP_DIR="$SCRIPT_DIR/../backups"

if [ -z "$1" ]; then
  echo "Usage: ./restore.sh <backup-file.dump>"
  echo ""
  echo "Available backups:"
  ls -la "$BACKUP_DIR"/*.dump 2>/dev/null || echo "  No backups found"
  exit 1
fi

BACKUP_FILE="$1"

# Handle relative paths
if [[ ! "$BACKUP_FILE" = /* ]]; then
  BACKUP_FILE="$(pwd)/$BACKUP_FILE"
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: Backup file not found: $BACKUP_FILE"
  exit 1
fi

echo "=== Neo4j Restore ==="
echo "Restoring from: $BACKUP_FILE"
echo ""

# Check if Neo4j container exists
if ! docker ps -a | grep -q ignite-neo4j; then
  echo "Error: ignite-neo4j container does not exist"
  echo "Start it with: docker-compose up -d neo4j"
  exit 1
fi

echo "Stopping Neo4j container..."
docker stop ignite-neo4j 2>/dev/null || true
sleep 3

# Copy backup to temp location accessible by docker
TEMP_DIR=$(mktemp -d)
cp "$BACKUP_FILE" "$TEMP_DIR/neo4j.dump"

echo "Restoring database using temporary container..."
docker run --rm \
  -v ignite-neo4j-data:/data \
  -v "$TEMP_DIR":/backups \
  neo4j:5.15.0-community \
  neo4j-admin database load neo4j --from-path=/backups/neo4j.dump --overwrite-destination=true

# Cleanup
rm -rf "$TEMP_DIR"

echo "Starting Neo4j container..."
docker start ignite-neo4j

# Wait for Neo4j to be healthy
echo "Waiting for Neo4j to become healthy..."
for i in {1..30}; do
  if docker exec ignite-neo4j cypher-shell -u neo4j -p ignitehealth2024 "RETURN 1" >/dev/null 2>&1; then
    echo "Neo4j is ready!"
    break
  fi
  sleep 2
done

echo ""
echo "=== Restore Complete ==="
echo ""
echo "Access Neo4j Browser: http://localhost:7474"
echo "Credentials: neo4j / ignitehealth2024"
