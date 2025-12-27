#!/bin/bash
# Neo4j Development Helper Script
# Usage: ./dev.sh <command>

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
  echo -e "${BLUE}=== $1 ===${NC}"
}

print_success() {
  echo -e "${GREEN}$1${NC}"
}

print_warning() {
  echo -e "${YELLOW}$1${NC}"
}

print_error() {
  echo -e "${RED}$1${NC}"
}

wait_for_neo4j() {
  echo "Waiting for Neo4j to be ready..."
  local max_attempts=30
  local attempt=1
  while [ $attempt -le $max_attempts ]; do
    if curl -s -o /dev/null -w '%{http_code}' "http://localhost:7474" | grep -q "200"; then
      print_success "Neo4j is ready!"
      return 0
    fi
    echo "  Attempt $attempt/$max_attempts..."
    sleep 2
    attempt=$((attempt + 1))
  done
  print_error "Neo4j did not become ready in time"
  return 1
}

COMMAND=$1

case $COMMAND in
  start)
    print_header "Starting Neo4j"
    cd "$PROJECT_DIR"
    docker-compose up -d neo4j
    wait_for_neo4j
    echo ""
    echo "Neo4j Browser: http://localhost:7474"
    echo "Bolt URI: bolt://localhost:7687"
    echo "Credentials: neo4j / ignitehealth2024"
    ;;

  stop)
    print_header "Stopping Neo4j"
    cd "$PROJECT_DIR"
    docker-compose stop neo4j
    print_success "Neo4j stopped"
    ;;

  restart)
    print_header "Restarting Neo4j"
    cd "$PROJECT_DIR"
    docker-compose restart neo4j
    wait_for_neo4j
    ;;

  reset)
    print_header "Resetting Neo4j Database"
    print_warning "This will DELETE all data!"
    read -p "Are you sure? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      cd "$PROJECT_DIR"
      docker-compose down
      docker volume rm ignite-neo4j-data ignite-neo4j-logs 2>/dev/null || true
      docker-compose up -d neo4j
      wait_for_neo4j
      print_success "Database reset complete"
    else
      echo "Cancelled"
    fi
    ;;

  import)
    print_header "Importing Synthea Data"

    # Step 1: Copy CSVs
    echo "Step 1: Copying Synthea CSV files..."
    bash "$SCRIPT_DIR/copy-synthea-csvs.sh"
    echo ""

    # Ensure Neo4j is running
    if ! docker ps | grep -q ignite-neo4j; then
      echo "Starting Neo4j..."
      cd "$PROJECT_DIR"
      docker-compose up -d neo4j
      wait_for_neo4j
    fi

    # Step 2: Create constraints
    echo "Step 2: Creating constraints and indexes..."
    docker exec ignite-neo4j cypher-shell -u neo4j -p ignitehealth2024 < "$SCRIPT_DIR/01-create-constraints.cypher"
    echo ""

    # Step 3: Import data
    echo "Step 3: Importing data (this may take a few minutes)..."
    docker exec ignite-neo4j cypher-shell -u neo4j -p ignitehealth2024 < "$SCRIPT_DIR/02-import-synthea.cypher"
    echo ""

    # Step 4: Validate
    echo "Step 4: Validating import..."
    docker exec ignite-neo4j cypher-shell -u neo4j -p ignitehealth2024 -f /dev/stdin <<< "MATCH (n) WITH labels(n)[0] AS type, count(n) AS count RETURN type, count ORDER BY count DESC;"
    echo ""

    print_success "Import complete!"
    echo ""
    echo "Next steps:"
    echo "  1. Open Neo4j Browser: http://localhost:7474"
    echo "  2. Or connect Neo4j Desktop to: bolt://localhost:7687"
    echo "  3. Use Bloom for visual exploration"
    ;;

  shell)
    print_header "Opening Cypher Shell"
    if ! docker ps | grep -q ignite-neo4j; then
      print_error "Neo4j is not running. Start it with: ./dev.sh start"
      exit 1
    fi
    docker exec -it ignite-neo4j cypher-shell -u neo4j -p ignitehealth2024
    ;;

  backup)
    print_header "Creating Backup"
    bash "$SCRIPT_DIR/backup.sh"
    ;;

  restore)
    if [ -z "$2" ]; then
      print_error "Usage: ./dev.sh restore <backup-file>"
      exit 1
    fi
    print_header "Restoring from Backup"
    bash "$SCRIPT_DIR/restore.sh" "$2"
    ;;

  stats)
    print_header "Database Statistics"
    if ! docker ps | grep -q ignite-neo4j; then
      print_error "Neo4j is not running. Start it with: ./dev.sh start"
      exit 1
    fi
    echo ""
    echo "Node counts:"
    docker exec ignite-neo4j cypher-shell -u neo4j -p ignitehealth2024 \
      "MATCH (n) WITH labels(n)[0] AS type, count(n) AS count RETURN type, count ORDER BY count DESC;"
    echo ""
    echo "Relationship counts:"
    docker exec ignite-neo4j cypher-shell -u neo4j -p ignitehealth2024 \
      "MATCH ()-[r]->() WITH type(r) AS type, count(r) AS count RETURN type, count ORDER BY count DESC;"
    ;;

  logs)
    print_header "Neo4j Logs"
    docker logs -f ignite-neo4j
    ;;

  status)
    print_header "Neo4j Status"
    if docker ps | grep -q ignite-neo4j; then
      print_success "Neo4j is running"
      echo ""
      docker ps --filter name=ignite-neo4j --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    else
      print_warning "Neo4j is not running"
    fi
    ;;

  *)
    echo "Neo4j Development Helper"
    echo ""
    echo "Usage: ./dev.sh <command>"
    echo ""
    echo "Commands:"
    echo "  start     Start Neo4j container"
    echo "  stop      Stop Neo4j container"
    echo "  restart   Restart Neo4j container"
    echo "  reset     Delete all data and restart (WARNING!)"
    echo "  import    Copy CSVs and import into Neo4j"
    echo "  shell     Open Cypher shell"
    echo "  backup    Create database backup"
    echo "  restore   Restore from backup file"
    echo "  stats     Show database statistics"
    echo "  logs      View Neo4j logs"
    echo "  status    Check if Neo4j is running"
    echo ""
    echo "Examples:"
    echo "  ./dev.sh start           # Start Neo4j"
    echo "  ./dev.sh import          # Import Synthea data"
    echo "  ./dev.sh shell           # Open Cypher shell"
    echo "  ./dev.sh backup          # Create backup"
    echo "  ./dev.sh restore backup.dump  # Restore from file"
    ;;
esac
