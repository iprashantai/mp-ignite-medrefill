#!/bin/bash
# Copy Synthea CSV files to Neo4j import directory
# These CSVs are much easier to import than FHIR JSON bundles

set -e

SOURCE_DIR="/Users/prashantsingh/work/ignite/synthea/synthea/output/medrefills/csv"
DEST_DIR="$(dirname "$0")/../import"

echo "=== Copying Synthea CSV files to Neo4j import directory ==="
echo "Source: $SOURCE_DIR"
echo "Destination: $DEST_DIR"
echo ""

# Create destination if not exists
mkdir -p "$DEST_DIR"

# List of files to copy (core files for medication adherence)
FILES=(
  "patients.csv"
  "medications.csv"
  "encounters.csv"
  "conditions.csv"
  "observations.csv"
  "providers.csv"
  "organizations.csv"
  "payers.csv"
  "allergies.csv"
)

# Copy each file
for file in "${FILES[@]}"; do
  if [ -f "$SOURCE_DIR/$file" ]; then
    echo "Copying $file..."
    cp "$SOURCE_DIR/$file" "$DEST_DIR/"
  else
    echo "Warning: $file not found in source directory"
  fi
done

echo ""
echo "=== Copy Complete ==="
echo "Files in import directory:"
ls -lh "$DEST_DIR"/*.csv 2>/dev/null || echo "No CSV files found"

# Show row counts
echo ""
echo "=== Row Counts ==="
for file in "$DEST_DIR"/*.csv; do
  if [ -f "$file" ]; then
    count=$(wc -l < "$file")
    echo "$(basename "$file"): $((count - 1)) rows"  # Subtract header
  fi
done
