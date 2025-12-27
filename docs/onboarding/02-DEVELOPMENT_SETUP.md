# Development Setup Guide

This guide provides detailed setup instructions for the Ignite Health development environment.

---

## System Requirements

### Minimum Requirements
- **OS**: macOS 12+, Windows 10+, or Ubuntu 20.04+
- **RAM**: 8GB (16GB recommended)
- **Storage**: 10GB free space
- **Node.js**: 20.x LTS or 22.x
- **npm**: 10.x+

### Recommended Tools
- **VS Code** with extensions:
  - ESLint
  - Prettier
  - TypeScript Importer
  - Tailwind CSS IntelliSense
  - FHIR Tools (by Firely)
  - REST Client
- **Docker Desktop** for Neo4j
- **Postman** or **Thunder Client** for API testing

---

## Step-by-Step Setup

### 1. Install Prerequisites

**macOS (using Homebrew):**
```bash
# Install Homebrew if not present
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node@20

# Install Docker Desktop
brew install --cask docker

# Verify installations
node --version  # Should be v20.x.x or v22.x.x
npm --version   # Should be v10.x.x
docker --version
```

**Windows:**
1. Download Node.js LTS from https://nodejs.org
2. Download Docker Desktop from https://docker.com/products/docker-desktop
3. Open PowerShell and verify:
   ```powershell
   node --version
   npm --version
   docker --version
   ```

### 2. Clone Repository

```bash
# Clone the repository
git clone <repository-url>
cd mp-ignite-medrefill

# Verify you're on main branch
git branch
```

### 3. Install Dependencies

```bash
# Install all npm packages
npm install

# Verify installation
npm list --depth=0
```

**Key Dependencies Installed:**
- `@medplum/core`, `@medplum/react`, `@medplum/fhirtypes` - FHIR platform
- `@mantine/core` - UI library for Medplum components
- `next`, `react`, `react-dom` - Frontend framework
- `tailwindcss` - CSS framework
- `zod` - Runtime validation
- `zustand` - State management
- `neo4j-driver` - Graph database client

### 4. Configure Environment

Create `.env.local` file:

```bash
# Create from example (if it exists)
cp .env.local.example .env.local

# Or create manually
touch .env.local
```

Add the following to `.env.local`:

```env
# ============================================
# MEDPLUM CONFIGURATION
# ============================================

# Medplum API endpoint
NEXT_PUBLIC_MEDPLUM_BASE_URL=https://api.medplum.com/

# Client ID (shared across team)
NEXT_PUBLIC_MEDPLUM_CLIENT_ID=06fddd7c-a3c5-415c-83d8-3f5685bfe8ca

# Project ID (shared across team)
NEXT_PUBLIC_MEDPLUM_PROJECT_ID=b62eb198-92f8-43c8-ae13-55c7e221f9ce

# Client Secret (get from team lead - DO NOT COMMIT)
MEDPLUM_CLIENT_SECRET=<your-secret-here>

# ============================================
# NEO4J CONFIGURATION (Local Development)
# ============================================

NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=ignitehealth2024

# ============================================
# AI CONFIGURATION (Optional for now)
# ============================================

# AWS_REGION=us-east-1
# AWS_BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0

# ============================================
# FEATURE FLAGS
# ============================================

# NEXT_PUBLIC_ENABLE_AI_RECOMMENDATIONS=false
# NEXT_PUBLIC_ENABLE_AUTO_APPROVAL=false
```

### 5. Start Development Server

```bash
# Start Next.js dev server with Turbopack
npm run dev
```

Open http://localhost:3000 in your browser.

### 6. Set Up Neo4j (Optional)

For graph database features:

```bash
# Start Neo4j and NeoDash containers
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs neo4j
```

**Access Points:**
- Neo4j Browser: http://localhost:7474
  - Username: `neo4j`
  - Password: `ignitehealth2024`
- NeoDash: http://localhost:5005

**Stop Neo4j:**
```bash
docker-compose down

# To also remove data volumes:
docker-compose down -v
```

### 7. Verify Setup

1. **Login Test**: Navigate to `/login` and sign in with Medplum
2. **Dashboard**: After login, verify you see the dashboard
3. **FHIR Explorer**: Click "FHIR Explorer" in sidebar, verify it loads
4. **Neo4j** (if started): Open Neo4j Browser and run `RETURN 1`

---

## IDE Configuration

### VS Code Settings

Create/update `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.suggest.autoImports": true,
  "tailwindCSS.experimental.classRegex": [
    ["cn\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ],
  "files.associations": {
    "*.css": "tailwindcss"
  }
}
```

### VS Code Extensions

Install these extensions:

```bash
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension bradlc.vscode-tailwindcss
code --install-extension ms-vscode.vscode-typescript-next
code --install-extension christian-kohler.path-intellisense
code --install-extension humao.rest-client
```

---

## Project Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Run production build |
| `npm test` | Run Vitest test suite |
| `npm run test:coverage` | Test coverage report |
| `npm run typecheck` | TypeScript type checking |
| `npm run lint` | ESLint code linting |
| `npm run medplum:login` | Login to Medplum CLI |
| `npm run medplum:deploy` | Deploy Medplum bots |

---

## Medplum CLI Setup

For deploying bots and managing resources:

```bash
# Login to Medplum
npx medplum login

# Select project
npx medplum project set <project-id>

# Verify connection
npx medplum whoami
```

---

## Common Issues & Solutions

### Issue: "Module not found" errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Issue: TypeScript errors after pulling new code

```bash
# Restart TypeScript server in VS Code
# Cmd+Shift+P -> "TypeScript: Restart TS Server"

# Or rebuild
npm run typecheck
```

### Issue: Port 3000 already in use

```bash
# Kill process on port 3000
npx kill-port 3000

# Or use different port
PORT=3001 npm run dev
```

### Issue: Medplum authentication fails

1. Check `.env.local` has correct values
2. Verify client secret is valid
3. Clear browser cookies for localhost
4. Check browser console for detailed errors

### Issue: Neo4j connection refused

```bash
# Check if container is running
docker ps | grep neo4j

# Restart container
docker-compose restart neo4j

# Check logs
docker-compose logs neo4j
```

### Issue: Docker containers won't start

```bash
# Remove all containers and volumes
docker-compose down -v

# Remove orphan containers
docker-compose down --remove-orphans

# Start fresh
docker-compose up -d
```

---

## Environment-Specific Notes

### macOS Apple Silicon (M1/M2/M3)

Docker compose includes platform specification for Neo4j compatibility:
```yaml
platform: linux/amd64
```

No additional configuration needed.

### Windows WSL2

1. Ensure WSL2 is enabled
2. Use Docker Desktop with WSL2 backend
3. Clone repository inside WSL filesystem for best performance

### Linux

```bash
# Add user to docker group (avoid sudo)
sudo usermod -aG docker $USER
newgrp docker
```

---

## Next Steps

After completing setup:

1. **Read CLAUDE.md** - Mandatory context document
2. **Explore the codebase** - `docs/onboarding/03-CODEBASE_GUIDE.md`
3. **Learn FHIR** - `docs/FHIR_GUIDE.md`
4. **Understand Medplum** - `docs/onboarding/04-MEDPLUM_INTEGRATION.md`

---

## Getting Help

- **Team Slack**: #ignite-health-dev
- **Medplum Discord**: https://discord.gg/medplum
- **GitHub Issues**: For bugs and feature requests
