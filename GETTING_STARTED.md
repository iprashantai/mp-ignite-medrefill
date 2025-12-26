# Ignite Health - Getting Started Guide

## Prerequisites

Before you begin, ensure you have:

- [ ] Node.js 22+ installed (`node -v` should show v22+)
- [ ] npm 10+ package manager
- [ ] VS Code or Cursor (with Claude)
- [ ] Git installed

---

## Quick Start (Project Owner)

**If you're joining an existing team, skip to "Team Member Setup" below.**

### Step 1: Create Project Directory

```bash
mkdir ignite-health
cd ignite-health
```

### Step 2: Extract Setup Files

```bash
# Extract the zip file contents here
unzip ignite-health-setup.zip
mv ignite-health-setup/* .
rm -rf ignite-health-setup ignite-health-setup.zip
```

### Step 3: Create Medplum Project

1. Go to https://app.medplum.com
2. Create account with your email
3. Create new Project: **"Ignite Health Dev"**
4. Note your **Project ID** (visible in URL)

### Step 4: Create OAuth Client

1. In Medplum App → **Admin** → **Clients**
2. Click **Create Client**
3. Fill in:
   - Name: `Ignite Health Local Dev`
   - Redirect URI: `http://localhost:3000/api/auth/callback`
4. Save and note the **Client ID**
5. Click **Create Secret** and save it securely

### Step 5: Run Bootstrap Script

```bash
chmod +x scripts/bootstrap.sh
./scripts/bootstrap.sh
```

This installs all dependencies and creates the project structure.

### Step 6: Configure Environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_MEDPLUM_BASE_URL=https://api.medplum.com/
NEXT_PUBLIC_MEDPLUM_CLIENT_ID=<your-client-id>
NEXT_PUBLIC_MEDPLUM_PROJECT_ID=<your-project-id>
MEDPLUM_CLIENT_SECRET=<your-secret>
```

### Step 7: Start Development Server

```bash
npm run dev
```

Open http://localhost:3000 - you should see the login page.

### Step 8: Push to GitHub

```bash
git init
git add .
git commit -m "Initial Ignite Health setup"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_ORG/ignite-health.git
git push -u origin main
```

### Step 9: Create Team Config

Create `TEAM_CONFIG.md` in your repo root:

```markdown
# Ignite Health - Team Configuration

## Medplum Project Details
- **Project ID**: <your-project-id>
- **Client ID**: <your-client-id>
- **Base URL**: https://api.medplum.com/

## Team Members
| Name | Role | GitHub |
|------|------|--------|
| Your Name | Owner | @yourusername |
```

Commit and push this file.

### Step 10: Invite Team Members

1. **GitHub**: Repo → Settings → Collaborators → Add people
2. **Medplum**: App → Project → Invite → Enter their email

---

## Team Member Setup

**For developers joining an existing project.**

### Step 1: Create Medplum Account

1. Go to https://app.medplum.com
2. Create account with your email
3. **Wait for project invitation** from the owner
4. Accept the invitation email

### Step 2: Get Your Client Secret

1. Log into Medplum App
2. Go to **Admin** → **Clients**
3. Click on **"Ignite Health Local Dev"**
4. Click **Create Secret**
5. Copy and save your personal secret

### Step 3: Clone and Setup

```bash
git clone https://github.com/YOUR_ORG/ignite-health.git
cd ignite-health
npm install
```

### Step 4: Configure Your Environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with values from `TEAM_CONFIG.md` + your personal secret:
```env
NEXT_PUBLIC_MEDPLUM_BASE_URL=https://api.medplum.com/
NEXT_PUBLIC_MEDPLUM_CLIENT_ID=<from-TEAM_CONFIG.md>
NEXT_PUBLIC_MEDPLUM_PROJECT_ID=<from-TEAM_CONFIG.md>
MEDPLUM_CLIENT_SECRET=<your-personal-secret-from-step-2>
```

### Step 5: Run

```bash
npm run dev
```

Open http://localhost:3000 and login with your Medplum credentials.

---

## Loading Test Data (Optional)

```bash
# Login to Medplum CLI
npx medplum login

# Option 1: Use Synthea (requires Java)
# Download from: https://github.com/synthetichealth/synthea/releases
java -jar synthea-with-dependencies.jar -p 50
npx medplum bulk import ./output/fhir/*.json

# Option 2: Use sample data (coming soon)
# npx medplum bulk import ./test-data/sample-patients.json
```

---

## Development Workflow

### Using Claude Code Effectively

**Best Practice: Small, Focused Tasks**

Instead of: "Build the entire command center"

Do this:
1. "Create the QueueItem TypeScript type with proper FHIR mappings"
2. "Create the useQueue hook that fetches tasks from Medplum"
3. "Create the RefillQueue component that displays tasks in a table"
4. "Add filtering to the RefillQueue component"

**Best Practice: Reference Specs**

Always tell Claude Code to read relevant specs:

```
Read specs/pdc-calculation.md first, then implement the calculatePDC function.
```

**Best Practice: Validate Often**

After each implementation:
```bash
# Run TypeScript check
npx tsc --noEmit

# Run tests
npm test

# Run lint
npm run lint
```

### Prompt Sequence

Follow the prompts in order:

1. **01-initial-setup.md** - Project foundation
2. **02-pdc-calculation.md** - Core PDC engine (deterministic)
3. **03-command-center-ui.md** - Main dashboard
4. **04-validation-compliance.md** - Security & compliance

Each prompt builds on the previous. Don't skip ahead.

---

## Project Structure

After setup, your project should look like:

```
ignite-health/
├── .claude/                    # Claude Code context
├── .env.local                  # Environment variables (not in git)
├── .eslintrc.json
├── .gitignore
├── CLAUDE.md                   # Master context
├── docs/
├── next.config.js
├── package.json
├── prompts/
├── skills/
├── specs/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── callback/
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   └── queue/
│   │   ├── api/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── command-center/
│   │   ├── fhir/
│   │   └── ui/
│   ├── hooks/
│   ├── lib/
│   │   ├── ai/
│   │   ├── compliance/
│   │   ├── medplum/
│   │   ├── pdc/
│   │   ├── safety/
│   │   └── validation/
│   ├── schemas/
│   ├── stores/
│   ├── test/
│   └── types/
├── tailwind.config.js
├── tsconfig.json
└── vitest.config.ts
```

---

## Key Concepts

### FHIR Resources We Use

| Resource | Purpose |
|----------|---------|
| Patient | Patient demographics |
| MedicationRequest | Prescriptions |
| MedicationDispense | Pharmacy fills (PDC source) |
| Task | Refill review workflow items |
| Observation | PDC scores, risk assessments |
| Condition | Diagnoses |
| AllergyIntolerance | Safety checking |
| AuditEvent | Compliance logging |

### Deterministic vs AI

**Always Deterministic:**
- PDC calculation
- Drug-drug interactions (database lookup)
- Lab threshold alerts
- Formulary eligibility

**AI-Enhanced:**
- Risk stratification
- Clinical reasoning explanation
- Patient communication drafts
- Trend analysis

### Confidence Routing

| Confidence | Action |
|------------|--------|
| > 0.95 | Recommend with minimal review |
| 0.85 - 0.95 | Standard review |
| 0.70 - 0.85 | Enhanced review |
| < 0.70 | Pharmacist escalation |

---

## Common Issues

### "Cannot find module '@medplum/core'"

```bash
npm install @medplum/core @medplum/react @medplum/fhirtypes
```

### OAuth redirect fails

Check that your redirect URI in Medplum matches exactly:
- Development: `http://localhost:3000/callback`
- Production: `https://your-domain.com/callback`

### TypeScript errors with FHIR types

Ensure you're importing from correct package:
```typescript
// Correct
import { Patient, Task } from '@medplum/fhirtypes';

// Wrong
import { Patient } from '@medplum/core'; // This is wrong!
```

### Tests fail with "MedplumClient not found"

Use MockClient in tests:
```typescript
import { MockClient } from '@medplum/mock';

const medplum = new MockClient();
```

---

## Next Steps

After completing basic setup:

1. **Week 1-2**: Complete PDC calculation with tests
2. **Week 3-4**: Build Command Center UI
3. **Week 5-6**: Add safety checking (drug interactions)
4. **Week 7-8**: Integrate AI recommendations
5. **Week 9-10**: eClinicalWorks SMART on FHIR integration

See `docs/IMPLEMENTATION_ROADMAP.md` for detailed timeline.

---

## Resources

- [Medplum Documentation](https://docs.medplum.com)
- [Medplum Discord](https://discord.gg/medplum)
- [FHIR R4 Specification](https://hl7.org/fhir/R4)
- [US Core Implementation Guide](https://hl7.org/fhir/us/core)
- [SMART App Launch](https://hl7.org/fhir/smart-app-launch)

---

## Support

If you get stuck:

1. Check the error message carefully
2. Read the relevant spec/skill file
3. Ask Claude Code with full context
4. Check Medplum Discord for community help
5. Review Medplum docs for specific API questions
