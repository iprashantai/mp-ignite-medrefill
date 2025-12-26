#!/bin/bash

# Ignite Health Project Bootstrap Script
# Run this script in an empty directory to set up the project
# Uses same package versions as ignite-medrefills-enterprise

set -e

echo "🚀 Ignite Health Project Bootstrap"
echo "=================================="
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required. Please install Node.js 22+"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm is required. Please install npm 10+"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 22 ]; then
    echo "❌ Node.js 22+ is required. You have $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"
echo "✅ npm $(npm -v) detected"
echo ""

# Create Next.js project with specific version (Next.js 15)
echo "📦 Creating Next.js 15 project..."
npx create-next-app@15.5.9 . --typescript --tailwind --app --src-dir --import-alias "@/*" --yes

# Override React to specific versions matching enterprise project
echo "📦 Installing React 19 (matching enterprise versions)..."
npm install react@^19.2.1 react-dom@^19.2.1

# Install Medplum packages
echo "📦 Installing Medplum packages..."
npm install @medplum/core @medplum/react @medplum/fhirtypes

# Install utilities with specific versions (matching enterprise)
echo "📦 Installing utilities (enterprise versions)..."
npm install \
  zod@^3.23.8 \
  zustand@^5.0.0 \
  @tanstack/react-query@^5.59.0 \
  date-fns@^4.1.0 \
  recharts@^2.13.0 \
  lucide-react@^0.454.0 \
  clsx@^2.1.1 \
  tailwind-merge@^2.5.4 \
  class-variance-authority@^0.7.0

# Install development tools with specific versions (matching enterprise)
echo "📦 Installing development tools (enterprise versions)..."
npm install -D \
  @medplum/cli \
  typescript@^5.7.2 \
  vitest@^4.0.12 \
  @vitejs/plugin-react@^5.1.1 \
  @testing-library/react@^16.0.1 \
  @testing-library/jest-dom@^6.6.3 \
  @vitest/coverage-v8@^4.0.12 \
  eslint@^8.57.0 \
  eslint-config-next@^15.0.3 \
  @types/node@^22.0.0 \
  @types/react@^19.0.0 \
  @types/react-dom@^19.0.0

# Install shadcn/ui
echo "🎨 Setting up shadcn/ui..."
npx shadcn@latest init -y
npx shadcn@latest add button card input label table badge alert dialog tabs

# Install AWS SDK for Bedrock
echo "📦 Installing AWS SDK..."
npm install @aws-sdk/client-bedrock-runtime

# Install ESLint security plugin
echo "🔒 Installing security tools..."
npm install -D eslint-plugin-security husky@^9.0.0 lint-staged@^15.5.2

# Install MCP SDK
echo "🔌 Installing MCP SDK..."
npm install @modelcontextprotocol/sdk

# Create directory structure
echo "📁 Creating directory structure..."
mkdir -p src/app/\(auth\)/login
mkdir -p src/app/\(auth\)/callback
mkdir -p src/app/\(dashboard\)/queue
mkdir -p src/app/\(dashboard\)/patients
mkdir -p src/app/\(dashboard\)/analytics
mkdir -p src/app/api
mkdir -p src/components/ui
mkdir -p src/components/fhir
mkdir -p src/components/command-center
mkdir -p src/lib/medplum
mkdir -p src/lib/fhir
mkdir -p src/lib/pdc
mkdir -p src/lib/safety
mkdir -p src/lib/ai/prompts
mkdir -p src/lib/ai/verification
mkdir -p src/lib/ai/confidence
mkdir -p src/lib/compliance
mkdir -p src/lib/validation
mkdir -p src/schemas
mkdir -p src/stores
mkdir -p src/hooks
mkdir -p src/types
mkdir -p src/bots/pdc-calculator
mkdir -p src/bots/ai-recommendation
mkdir -p src/test
mkdir -p tests/unit
mkdir -p tests/integration
mkdir -p tests/fixtures/synthea

# Create .env.local.example
echo "🔐 Creating environment template..."
cat > .env.local.example << 'EOF'
# Medplum Configuration
NEXT_PUBLIC_MEDPLUM_BASE_URL=https://api.medplum.com/
NEXT_PUBLIC_MEDPLUM_CLIENT_ID=your-client-id
MEDPLUM_CLIENT_SECRET=your-client-secret

# AWS Bedrock (for AI)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0

# Session Configuration
SESSION_TIMEOUT=3600

# Feature Flags
ENABLE_AI_RECOMMENDATIONS=true
ENABLE_AUTO_APPROVAL=false

# Development
NODE_ENV=development
EOF

# Create vitest config
echo "🧪 Creating test configuration..."
cat > vitest.config.ts << 'EOF'
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/test/', '.next/'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
EOF

# Create test setup
cat > src/test/setup.ts << 'EOF'
import '@testing-library/jest-dom';

// Mock environment variables
process.env.NEXT_PUBLIC_MEDPLUM_BASE_URL = 'https://api.medplum.com/';
process.env.NODE_ENV = 'test';
EOF

# Create initial types
echo "📝 Creating initial type definitions..."
cat > src/types/index.ts << 'EOF'
// Re-export FHIR types
export type {
  Patient,
  MedicationRequest,
  MedicationDispense,
  Task,
  Observation,
  Condition,
  AllergyIntolerance,
  AuditEvent,
  Bundle,
} from '@medplum/fhirtypes';

// Custom extension types
export type MedicationClass = 'MAD' | 'MAC' | 'MAH';
export type Priority = 'routine' | 'urgent' | 'asap' | 'stat';
export type TaskAction = 'approve' | 'deny' | 'escalate' | 'review';
export type ConfidenceCategory = 'high' | 'standard' | 'enhanced' | 'escalate';

// PDC types
export interface PDCScore {
  patientId: string;
  medicationClass: MedicationClass;
  score: number;
  daysInPeriod: number;
  daysCovered: number;
  isAdherent: boolean;
  calculatedAt: string;
}

// Queue types
export interface QueueItem {
  taskId: string;
  patientId: string;
  patientName: string;
  medicationClass: MedicationClass;
  medicationName: string;
  pdcScore: number;
  daysUntilGap: number;
  priority: Priority;
  aiRecommendation?: {
    recommendation: TaskAction;
    confidence: number;
    reasoning: string;
  };
  safetyAlerts: Array<{
    type: string;
    severity: 'high' | 'medium' | 'low';
    message: string;
  }>;
  createdAt: string;
}

// Result pattern
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };
EOF

# Update package.json scripts
echo "📝 Updating package.json scripts..."
npm pkg set scripts.test="vitest"
npm pkg set scripts.test:coverage="vitest run --coverage"
npm pkg set scripts.lint="next lint && eslint . --ext .ts,.tsx"
npm pkg set scripts.typecheck="tsc --noEmit"
npm pkg set scripts.medplum:login="npx medplum login"
npm pkg set scripts.medplum:deploy="npx medplum bot deploy"

# Skip husky for now - add later when team is larger
echo "📝 Skipping pre-commit hooks (add later with: npx husky install)"

# Final message
echo ""
echo "✅ Ignite Health project setup complete!"
echo ""
echo "📋 Next steps:"
echo ""
echo "1. Create Medplum account at https://app.medplum.com"
echo "2. Create OAuth client in Medplum Admin > Clients"
echo "3. Copy .env.local.example to .env.local and fill in values"
echo "4. Run 'npm run dev' to start development server"
echo "5. Open http://localhost:3000"
echo ""
echo "📚 Read the documentation:"
echo "   - CLAUDE.md - Master context for Claude Code"
echo "   - docs/GETTING_STARTED.md - Quick start guide"
echo "   - docs/FHIR_GUIDE.md - FHIR reference"
echo "   - docs/IMPLEMENTATION_ROADMAP.md - Full roadmap"
echo ""
echo "🤖 Use the prompts in order with Claude Code:"
echo "   1. prompts/01-initial-setup.md"
echo "   2. prompts/02-pdc-calculation.md"
echo "   3. prompts/03-command-center-ui.md"
echo "   4. prompts/04-validation-compliance.md"
echo "   5. prompts/05-ai-integration.md"
echo ""
echo "Happy coding! 🚀"
