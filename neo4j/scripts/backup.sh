#!/bin/bash
# Backup Neo4j database
# Creates a dump file that can be restored on any machine
#
# For Neo4j Community Edition, we must stop the container
# to create a consistent backup.

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR/../.."
BACKUP_DIR="$SCRIPT_DIR/../backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="ignite-neo4j-$TIMESTAMP.dump"

echo "=== Neo4j Backup ==="
echo "Timestamp: $TIMESTAMP"
echo ""

# Create backup directory if not exists
mkdir -p "$BACKUP_DIR"

# Check if Neo4j container exists
if ! docker ps -a | grep -q ignite-neo4j; then
  echo "Error: ignite-neo4j container does not exist"
  echo "Start it with: docker-compose up -d neo4j"
  exit 1
fi

echo "Stopping Neo4j container for consistent backup..."
docker stop ignite-neo4j 2>/dev/null || true
sleep 3

echo "Creating database dump using temporary container..."
docker run --rm \
  -v ignite-neo4j-data:/data \
  -v "$(cd "$BACKUP_DIR" && pwd)":/backups \
  neo4j:5.15.0-community \
  neo4j-admin database dump neo4j --to-path=/backups --overwrite-destination=true

# Rename to timestamped file
mv "$BACKUP_DIR/neo4j.dump" "$BACKUP_DIR/$BACKUP_NAME"

echo "Restarting Neo4j container..."
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

# Create a 'latest' symlink
ln -sf "$BACKUP_NAME" "$BACKUP_DIR/ignite-latest.dump"

echo ""
echo "=== Backup Complete ==="
echo "Backup saved to: $BACKUP_DIR/$BACKUP_NAME"
echo "Latest symlink: $BACKUP_DIR/ignite-latest.dump"
echo ""
echo "File size: $(ls -lh "$BACKUP_DIR/$BACKUP_NAME" | awk '{print $5}')"
echo ""
echo "To restore on another machine:"
echo "  ./neo4j/scripts/restore.sh neo4j/backups/$BACKUP_NAME"
