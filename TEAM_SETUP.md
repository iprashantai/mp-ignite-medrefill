# Team Setup Guide

## For Project Owner (You - One Time Setup)

### Step 1: Create Medplum Project

1. Go to https://app.medplum.com
2. Create account with your email
3. Create new Project: **"Ignite Health Dev"**
4. Note your **Project ID** (shown in URL after login)

### Step 2: Create OAuth Client

1. In Medplum App → **Admin** → **Clients**
2. Click **Create Client**
3. Fill in:
   - Name: `Ignite Health Local Dev`
   - Redirect URI: `http://localhost:3000/api/auth/callback`
4. Click **Save**
5. Note the **Client ID** (you'll share this with team)

### Step 3: Setup Local Project

```bash
# Create project folder
mkdir ignite-health
cd ignite-health

# Extract setup files (from zip)
unzip ignite-health-setup.zip
mv ignite-health-setup/* .
rm -rf ignite-health-setup

# Run bootstrap
chmod +x scripts/bootstrap.sh
./scripts/bootstrap.sh
```

### Step 4: Configure Your Environment

```bash
# Copy template
cp .env.local.example .env.local

# Edit with your details
nano .env.local  # or code .env.local
```

Fill in:
```env
# Shared by all developers (same values)
NEXT_PUBLIC_MEDPLUM_BASE_URL=https://api.medplum.com/
NEXT_PUBLIC_MEDPLUM_CLIENT_ID=<client-id-from-step-2>
NEXT_PUBLIC_MEDPLUM_PROJECT_ID=<project-id-from-step-1>

# Your personal credentials (each developer different)
MEDPLUM_CLIENT_SECRET=<your-secret>
```

### Step 5: Verify It Works

```bash
npm run dev
```

Open http://localhost:3000 - you should see login page.

### Step 6: Push to GitHub

```bash
git init
git add .
git commit -m "Initial setup"

# Create repo on GitHub, then:
git remote add origin https://github.com/ignite-health/ignite-health.git
git push -u origin main
```

### Step 7: Create Team Config File

Create `TEAM_CONFIG.md` (this goes in repo):

```markdown
# Ignite Health - Team Configuration

## Medplum Project Details

- **Project Name**: Ignite Health Dev
- **Project ID**: <your-project-id>
- **Base URL**: https://api.medplum.com/
- **Client ID**: <your-client-id>

## Setup Instructions

See TEAM_SETUP.md for onboarding steps.

## Team Members

| Name | Email | Medplum Role | GitHub Username |
|------|-------|--------------|-----------------|
| [Your Name] | you@example.com | Admin | @yourusername |

(Add team members as they join)
```

### Step 8: Invite Team to GitHub

1. Go to your GitHub repo → Settings → Collaborators
2. Add team members by email/username

---

## For Team Members (Each Person)

### Step 1: Create Medplum Account

1. Go to https://app.medplum.com
2. Create account with your email
3. **DO NOT create a new project** - you'll be invited to existing one

### Step 2: Get Invited to Project

Ask the project owner to invite you:
1. Owner goes to Medplum App → **Project** → **Invite**
2. Owner enters your email
3. You'll receive email invitation
4. Accept invitation

### Step 3: Get Your Client Secret

Once you're in the project:
1. Go to Medplum App → **Admin** → **Clients**
2. Click on **"Ignite Health Local Dev"** client
3. Click **"Create Secret"** to generate YOUR personal secret
4. Copy and save it securely (you won't see it again)

### Step 4: Clone Repository

```bash
git clone https://github.com/ignite-health/ignite-health.git
cd ignite-health
npm install
```

### Step 5: Create Your .env.local

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with values from `TEAM_CONFIG.md` + your personal secret:

```env
# From TEAM_CONFIG.md (same for everyone)
NEXT_PUBLIC_MEDPLUM_BASE_URL=https://api.medplum.com/
NEXT_PUBLIC_MEDPLUM_CLIENT_ID=<from-team-config>
NEXT_PUBLIC_MEDPLUM_PROJECT_ID=<from-team-config>

# Your personal secret (from Step 3)
MEDPLUM_CLIENT_SECRET=<your-personal-secret>
```

### Step 6: Run the App

```bash
npm run dev
```

Open http://localhost:3000 - login with your Medplum credentials.

### Step 7: Verify Access

You should see:
- ✅ Login works
- ✅ Can see shared test data (if any exists)
- ✅ Can create/edit resources

---

## How Shared Development Works

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Developer A     │     │  Developer B     │     │  Developer C     │
│  localhost:3000  │     │  localhost:3000  │     │  localhost:3000  │
│                  │     │                  │     │                  │
│  .env.local:     │     │  .env.local:     │     │  .env.local:     │
│  SECRET=aaa111   │     │  SECRET=bbb222   │     │  SECRET=ccc333   │
└────────┬─────────┘     └────────┬─────────┘     └────────┬─────────┘
         │                        │                        │
         └────────────────────────┼────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │   Medplum Cloud         │
                    │   (Shared DEV Project)  │
                    │                         │
                    │   • Same FHIR data      │
                    │   • Same Bots           │
                    │   • Same everything     │
                    └─────────────────────────┘
```

**What's Shared:**
- All FHIR data (Patients, Tasks, etc.)
- All deployed Bots
- All configurations

**What's Personal:**
- Your .env.local file (never commit this!)
- Your Medplum login credentials
- Your client secret

---

## Important Rules

### ✅ DO:
- Pull latest code before starting work: `git pull`
- Communicate before deploying bots
- Use feature branches for big changes
- Test your changes locally first

### ❌ DON'T:
- Commit .env.local (it's in .gitignore)
- Deploy bots without telling the team
- Delete test data others might be using
- Share your personal client secret

---

## Deploying Bots (Coordinate First!)

Since bots are shared, coordinate with team before deploying:

```bash
# 1. Announce in team chat: "Deploying PDC bot in 5 mins"

# 2. Pull latest code
git pull

# 3. Login to Medplum CLI
npx medplum login

# 4. Deploy
npx medplum bot deploy pdc-calculator

# 5. Announce: "PDC bot deployed ✅"
```

---

## Troubleshooting

### "Invalid client secret"
- Make sure you created YOUR OWN secret in Step 3
- Secrets are personal - you can't use someone else's

### "Project not found"
- Make sure you accepted the project invitation
- Check NEXT_PUBLIC_MEDPLUM_PROJECT_ID matches TEAM_CONFIG.md

### "Cannot see data that others created"
- This shouldn't happen in shared project
- Check you're logged into correct Medplum project
- Try logging out and back in

### "Bot deployment failed"
- Make sure you're logged in: `npx medplum whoami`
- Check you have the bot ID in medplum.config.json
