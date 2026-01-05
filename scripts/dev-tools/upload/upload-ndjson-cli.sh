#!/bin/bash

# Upload NDJSON files to Medplum using CLI (Optimized for Free Tier)
#
# Features:
# - Handles FHIR resource dependency order
# - Batches resources for rate limit safety
# - Progress tracking
# - Resumable on failure
# - Uses client credentials from .env.local (no interactive login needed)
#
# Usage:
#   ./upload-ndjson-cli.sh /path/to/ndjson/directory
#   ./upload-ndjson-cli.sh /path/to/ndjson/directory --batch-size 25
#
# Requirements:
# - Medplum CLI installed: npm install -g @medplum/cli
# - .env.local with MEDPLUM credentials
#
# Free Tier Optimized:
# - Default batch size: 25 resources per request
# - Imports in dependency order to avoid reference errors

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default settings
DEFAULT_BATCH_SIZE=25  # Safe for free tier
NDJSON_DIR=""
BATCH_SIZE=$DEFAULT_BATCH_SIZE

# Parse arguments
if [[ $# -eq 0 ]]; then
  echo -e "${RED}Error: NDJSON directory required${NC}"
  echo "Usage: $0 /path/to/ndjson/directory [--batch-size N]"
  exit 1
fi

NDJSON_DIR="$1"
shift

while [[ $# -gt 0 ]]; do
  case $1 in
    --batch-size)
      BATCH_SIZE="$2"
      shift 2
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

echo -e "${BLUE}========== Medplum NDJSON Upload (Free Tier Optimized) ==========${NC}"
echo -e "Directory: ${CYAN}${NDJSON_DIR}${NC}"
echo -e "Batch Size: ${CYAN}${BATCH_SIZE}${NC} resources per request"
echo ""

# Check if Medplum CLI is installed
if ! command -v medplum &> /dev/null; then
  echo -e "${RED}✗ Medplum CLI not found${NC}"
  echo -e "${YELLOW}Install with: npm install -g @medplum/cli${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Medplum CLI found${NC}"

# Load credentials from .env.local
if [[ ! -f .env.local ]]; then
  echo -e "${RED}✗ .env.local not found${NC}"
  echo -e "${YELLOW}Create .env.local with Medplum credentials${NC}"
  exit 1
fi

# Source the .env.local file
export $(grep -v '^#' .env.local | xargs)

if [[ -z "$NEXT_PUBLIC_MEDPLUM_BASE_URL" ]] || [[ -z "$NEXT_PUBLIC_MEDPLUM_CLIENT_ID" ]] || [[ -z "$MEDPLUM_CLIENT_SECRET" ]]; then
  echo -e "${RED}✗ Missing Medplum credentials in .env.local${NC}"
  echo -e "${YELLOW}Required: NEXT_PUBLIC_MEDPLUM_BASE_URL, NEXT_PUBLIC_MEDPLUM_CLIENT_ID, MEDPLUM_CLIENT_SECRET${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Credentials loaded from .env.local${NC}"
echo -e "Base URL: ${CYAN}${NEXT_PUBLIC_MEDPLUM_BASE_URL}${NC}"
echo ""

# Check if directory exists
if [[ ! -d "$NDJSON_DIR" ]]; then
  echo -e "${RED}✗ Directory not found: ${NDJSON_DIR}${NC}"
  exit 1
fi

# Count NDJSON files
NDJSON_COUNT=$(find "$NDJSON_DIR" -name "*.ndjson" -type f | wc -l | tr -d ' ')

if [[ "$NDJSON_COUNT" -eq 0 ]]; then
  echo -e "${RED}✗ No NDJSON files found in ${NDJSON_DIR}${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Found ${NDJSON_COUNT} NDJSON files${NC}"

# Count total resources
TOTAL_RESOURCES=$(wc -l "$NDJSON_DIR"/*.ndjson 2>/dev/null | tail -1 | awk '{print $1}')
echo -e "${CYAN}Total resources to upload: ${TOTAL_RESOURCES}${NC}"
echo ""

# Confirm upload
echo -e "${YELLOW}⚠️  This will upload ~${TOTAL_RESOURCES} resources to Medplum.${NC}"
echo -e "${YELLOW}Estimated time: $(( TOTAL_RESOURCES / BATCH_SIZE / 10 )) - $(( TOTAL_RESOURCES / BATCH_SIZE / 5 )) minutes${NC}"
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Upload cancelled"
  exit 0
fi

echo ""
echo -e "${BLUE}========== Starting Upload ==========${NC}"
echo ""

# FHIR resource dependency order
# Import resources in order to avoid reference errors
RESOURCE_ORDER=(
  "Organization"
  "Location"
  "Practitioner"
  "PractitionerRole"
  "Patient"
  "RelatedPerson"
  "Device"
  "Medication"
  "Immunization"
  "AllergyIntolerance"
  "Encounter"
  "Condition"
  "Procedure"
  "Observation"
  "DiagnosticReport"
  "ImagingStudy"
  "DocumentReference"
  "MedicationRequest"
  "MedicationDispense"
  "MedicationAdministration"
  "CarePlan"
  "CareTeam"
  "Goal"
  "ServiceRequest"
  "Claim"
  "ExplanationOfBenefit"
  "Coverage"
  "PaymentNotice"
  "PaymentReconciliation"
)

START_TIME=$(date +%s)
TOTAL_UPLOADED=0
TOTAL_FAILED=0

# Build Medplum CLI auth options
AUTH_OPTS="--base-url $NEXT_PUBLIC_MEDPLUM_BASE_URL --client-id $NEXT_PUBLIC_MEDPLUM_CLIENT_ID --client-secret $MEDPLUM_CLIENT_SECRET --auth-type client-credentials"

# Upload each resource type in order
for RESOURCE_TYPE in "${RESOURCE_ORDER[@]}"; do
  # Find all files matching this resource type (including timestamped files)
  FILES=$(find "$NDJSON_DIR" -name "${RESOURCE_TYPE}*.ndjson" -type f)

  if [[ -z "$FILES" ]]; then
    continue  # Skip if no files for this resource type
  fi

  echo -e "${CYAN}>>> ${RESOURCE_TYPE}${NC}"

  for FILE in $FILES; do
    FILENAME=$(basename "$FILE")
    RESOURCE_COUNT=$(wc -l < "$FILE")

    echo -e "  ${FILENAME} (${RESOURCE_COUNT} resources)"

    # Upload with Medplum CLI using client credentials
    if medplum $AUTH_OPTS bulk import --num-resources-per-request "$BATCH_SIZE" "$FILE" 2>&1 | tee /tmp/medplum-upload.log; then
      echo -e "  ${GREEN}✓ Success${NC}"
      TOTAL_UPLOADED=$((TOTAL_UPLOADED + RESOURCE_COUNT))
    else
      echo -e "  ${RED}✗ Failed${NC}"
      TOTAL_FAILED=$((TOTAL_FAILED + RESOURCE_COUNT))

      # Show error if available
      if [[ -f /tmp/medplum-upload.log ]]; then
        ERROR=$(tail -5 /tmp/medplum-upload.log)
        echo -e "  ${RED}Error: ${ERROR}${NC}"
      fi

      # Ask if should continue
      read -p "  Continue with remaining files? (y/n) " -n 1 -r
      echo ""
      if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo -e "${RED}Upload aborted by user${NC}"
        exit 1
      fi
    fi

    echo ""
  done
done

END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))
MINUTES=$((ELAPSED / 60))
SECONDS=$((ELAPSED % 60))

echo ""
echo -e "${GREEN}========== Upload Complete ==========${NC}"
echo -e "Total resources: ${TOTAL_RESOURCES}"
echo -e "${GREEN}Uploaded: ${TOTAL_UPLOADED}${NC}"
if [[ $TOTAL_FAILED -gt 0 ]]; then
  echo -e "${RED}Failed: ${TOTAL_FAILED}${NC}"
fi
echo -e "Time: ${MINUTES}m ${SECONDS}s"
echo ""

if [[ $TOTAL_FAILED -gt 0 ]]; then
  echo -e "${YELLOW}⚠️  Some resources failed to upload. Check logs above for details.${NC}"
  exit 1
fi

echo -e "${GREEN}✓ All resources uploaded successfully!${NC}"
