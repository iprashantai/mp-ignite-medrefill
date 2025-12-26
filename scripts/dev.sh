#!/bin/bash

# Ignite Health Development Scripts
# =================================

# This file contains helper scripts for development workflow.
# Copy individual scripts or run them directly.

# --------------------------------------------------
# Script 1: Initial Setup
# --------------------------------------------------

setup_project() {
    echo "🚀 Setting up Ignite Health project..."
    
    # Check prerequisites
    command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required"; exit 1; }
    command -v npm >/dev/null 2>&1 || { echo "❌ npm is required"; exit 1; }
    
    # Create Next.js project
    echo "📦 Creating Next.js project..."
    npx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*" --use-npm
    
    # Install Medplum
    echo "📦 Installing Medplum packages..."
    npm install @medplum/core @medplum/react @medplum/fhirtypes
    npm install -D @medplum/cli @medplum/mock
    
    # Install utilities
    echo "📦 Installing utilities..."
    npm install zod zustand @tanstack/react-query date-fns recharts lucide-react clsx tailwind-merge
    
    # Install testing
    echo "📦 Installing testing tools..."
    npm install -D vitest @testing-library/react @testing-library/jest-dom @vitejs/plugin-react jsdom
    
    # Install security
    echo "📦 Installing security tools..."
    npm install -D eslint-plugin-security husky lint-staged
    
    # Setup shadcn/ui
    echo "🎨 Setting up shadcn/ui..."
    npx shadcn-ui@latest init -y
    npx shadcn-ui@latest add button card input label table badge alert dialog tabs
    
    # Setup husky
    echo "🔧 Setting up git hooks..."
    npx husky install
    
    echo "✅ Setup complete!"
}

# --------------------------------------------------
# Script 2: Seed Test Data with Synthea
# --------------------------------------------------

seed_test_data() {
    echo "🏥 Seeding test data..."
    
    # Check for Synthea
    if [ ! -f "synthea-with-dependencies.jar" ]; then
        echo "📥 Downloading Synthea..."
        wget -q https://github.com/synthetichealth/synthea/releases/download/master-branch-latest/synthea-with-dependencies.jar
    fi
    
    # Generate patients
    echo "👥 Generating synthetic patients..."
    java -jar synthea-with-dependencies.jar \
        -p ${1:-50} \
        -m diabetes \
        -m hypertension \
        --exporter.fhir.export true \
        --exporter.years_of_history 3
    
    # Check if logged in to Medplum
    echo "☁️ Uploading to Medplum..."
    npx medplum bulk import ./output/fhir/*.json
    
    echo "✅ Test data seeded!"
}

# --------------------------------------------------
# Script 3: Deploy Medplum Bots
# --------------------------------------------------

deploy_bots() {
    echo "🤖 Deploying Medplum Bots..."
    
    # Build bots
    echo "🔨 Building bots..."
    npm run build:bots
    
    # Deploy each bot
    for bot_dir in src/bots/*/; do
        bot_name=$(basename "$bot_dir")
        echo "  Deploying $bot_name..."
        npx medplum bot deploy "$bot_name"
    done
    
    echo "✅ Bots deployed!"
}

# --------------------------------------------------
# Script 4: Run Full Test Suite
# --------------------------------------------------

run_tests() {
    echo "🧪 Running test suite..."
    
    # Type check
    echo "📝 Type checking..."
    npx tsc --noEmit
    
    # Lint
    echo "🔍 Linting..."
    npm run lint
    
    # Unit tests
    echo "🧪 Unit tests..."
    npm test -- --coverage
    
    # Integration tests (if Medplum is configured)
    if [ -n "$MEDPLUM_CLIENT_ID" ]; then
        echo "🔗 Integration tests..."
        npm run test:integration
    fi
    
    echo "✅ All tests passed!"
}

# --------------------------------------------------
# Script 5: HIPAA Compliance Check
# --------------------------------------------------

check_compliance() {
    echo "🔒 Running HIPAA compliance checks..."
    
    # Check for PHI in logs
    echo "  Checking for PHI patterns in code..."
    grep -rn "console.log.*name\|console.log.*ssn\|console.log.*dob\|console.log.*address" src/ && {
        echo "❌ Potential PHI logging detected!"
        exit 1
    } || echo "  ✓ No obvious PHI logging"
    
    # Check for hardcoded credentials
    echo "  Checking for hardcoded credentials..."
    grep -rn "password\s*=\s*['\"]" src/ && {
        echo "❌ Hardcoded credentials detected!"
        exit 1
    } || echo "  ✓ No hardcoded credentials"
    
    # Check environment variables
    echo "  Checking environment configuration..."
    if [ -f ".env.local" ]; then
        grep -q "MEDPLUM_CLIENT_SECRET" .env.local && echo "  ✓ Secrets in env file"
    fi
    
    # Check HTTPS
    echo "  Checking for HTTP usage..."
    grep -rn "http://" src/ --include="*.ts" --include="*.tsx" | grep -v "localhost" && {
        echo "⚠️ Non-HTTPS URLs detected (review required)"
    } || echo "  ✓ No non-HTTPS URLs (except localhost)"
    
    echo "✅ Compliance check complete!"
}

# --------------------------------------------------
# Script 6: Generate API Documentation
# --------------------------------------------------

generate_docs() {
    echo "📚 Generating documentation..."
    
    # TypeDoc for API docs
    npx typedoc src/lib --out docs/api
    
    echo "✅ Documentation generated in docs/api/"
}

# --------------------------------------------------
# Script 7: Prepare for Production
# --------------------------------------------------

prepare_production() {
    echo "🚀 Preparing for production..."
    
    # Run all checks
    run_tests
    check_compliance
    
    # Build
    echo "🔨 Building..."
    npm run build
    
    # Generate docs
    generate_docs
    
    echo "✅ Ready for production deployment!"
}

# --------------------------------------------------
# Usage
# --------------------------------------------------

print_usage() {
    echo "Ignite Health Development Scripts"
    echo ""
    echo "Usage: ./scripts/dev.sh <command>"
    echo ""
    echo "Commands:"
    echo "  setup           - Initial project setup"
    echo "  seed [n]        - Seed n test patients (default: 50)"
    echo "  deploy-bots     - Deploy Medplum bots"
    echo "  test            - Run full test suite"
    echo "  compliance      - Run HIPAA compliance checks"
    echo "  docs            - Generate API documentation"
    echo "  production      - Prepare for production"
    echo ""
}

# Main
case "$1" in
    setup)
        setup_project
        ;;
    seed)
        seed_test_data "$2"
        ;;
    deploy-bots)
        deploy_bots
        ;;
    test)
        run_tests
        ;;
    compliance)
        check_compliance
        ;;
    docs)
        generate_docs
        ;;
    production)
        prepare_production
        ;;
    *)
        print_usage
        ;;
esac
