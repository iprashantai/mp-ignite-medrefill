# Quick Start Guide - Ignite Health

**Time to complete: 15-20 minutes**

This guide gets you running the Ignite Health medication adherence platform locally.

---

## Prerequisites

- **Node.js** 20+ ([download](https://nodejs.org))
- **npm** 10+ (comes with Node.js)
- **Git** ([download](https://git-scm.com))
- **Docker Desktop** (optional, for Neo4j) ([download](https://docker.com/products/docker-desktop))
- **VS Code** (recommended) ([download](https://code.visualstudio.com))

---

## Step 1: Clone & Install (2 min)

```bash
# Clone the repository
git clone <repository-url>
cd mp-ignite-medrefill

# Install dependencies
npm install
```

---

## Step 2: Configure Environment (3 min)

Create `.env.local` in the project root:

```bash
# Medplum Configuration (shared across team)
NEXT_PUBLIC_MEDPLUM_BASE_URL=https://api.medplum.com/
NEXT_PUBLIC_MEDPLUM_CLIENT_ID=06fddd7c-a3c5-415c-83d8-3f5685bfe8ca
NEXT_PUBLIC_MEDPLUM_PROJECT_ID=b62eb198-92f8-43c8-ae13-55c7e221f9ce

# Get your personal client secret from team lead
MEDPLUM_CLIENT_SECRET=<your-client-secret>

# Neo4j (local Docker)
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=ignitehealth2024
```

> **Note**: Contact team lead for `MEDPLUM_CLIENT_SECRET` if you don't have it.

---

## Step 3: Start Development Server (1 min)

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Step 4: Create Your Medplum Account (5 min)

1. Navigate to `http://localhost:3000/login`
2. Click **"Sign in with Medplum"**
3. On Medplum's page:
   - Create new account OR sign in with Google
   - Accept invite to the Ignite Health project (if prompted)
4. You'll be redirected back to the dashboard

---

## Step 5: Verify Everything Works

After login, you should see:
- Welcome message with your name
- System Status: "Connected to Medplum" badge
- Stats cards (may show 0 initially)
- Sidebar navigation

**Test the FHIR Explorer:**
1. Click **"FHIR Explorer"** in Developer Tools section
2. Select "Patient" resource type
3. You should see a search interface (may be empty if no test data)

---

## Step 6: Start Neo4j (Optional, 5 min)

For graph database features:

```bash
# Start Neo4j and NeoDash
docker-compose up -d

# Verify containers are running
docker-compose ps
```

Access points:
- **Neo4j Browser**: http://localhost:7474 (login: `neo4j/ignitehealth2024`)
- **NeoDash**: http://localhost:5005

---

## Common Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm test` | Run tests |
| `npm run typecheck` | TypeScript validation |
| `docker-compose up -d` | Start Neo4j |
| `docker-compose down` | Stop Neo4j |

---

## Troubleshooting

### "Cannot find module" error
```bash
rm -rf node_modules package-lock.json
npm install
```

### Port 3000 already in use
```bash
npx kill-port 3000
npm run dev
```

### Medplum login fails
- Verify `.env.local` variables are correct
- Check browser console for error details
- Ensure you have access to the Medplum project

### Neo4j won't start
```bash
docker-compose down -v  # Remove volumes
docker-compose up -d    # Fresh start
```

---

## Next Steps

1. **Read `CLAUDE.md`** - Master context document (mandatory)
2. **Review Architecture** - `docs/ARCHITECTURE.md`
3. **Learn FHIR** - `docs/FHIR_GUIDE.md`
4. **Understand the codebase** - `docs/onboarding/03-CODEBASE_GUIDE.md`

---

## Getting Help

- **Slack**: #ignite-health-dev
- **Medplum Discord**: https://discord.gg/medplum
- **FHIR Spec**: https://hl7.org/fhir/R4

---

*Welcome to Ignite Health! You're building software that improves patient outcomes.*
