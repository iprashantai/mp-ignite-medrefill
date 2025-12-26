# Claude Code Prompt: Initial Project Setup

Copy this entire prompt and paste it into Claude Code (or use it as the first message in a new Claude Code session).

---

## Prompt

I'm starting the Ignite Health project - a medication adherence platform for healthcare providers. 

**Read the project context first:**
- Read `CLAUDE.md` for overall project context
- Read `docs/IMPLEMENTATION_ROADMAP.md` for the implementation plan
- Read `docs/FHIR_GUIDE.md` if you need FHIR reference

**Your task:** Set up the initial Next.js project with Medplum integration.

**Step 1: Create the Next.js project**
```bash
# Use Next.js 15 to match enterprise project
npx create-next-app@15.5.9 . --typescript --tailwind --app --src-dir --import-alias "@/*"

# Install React 19 (matching enterprise versions)
npm install react@^19.2.1 react-dom@^19.2.1
```

**Step 2: Install required dependencies**
```bash
# Medplum packages
npm install @medplum/core @medplum/react @medplum/fhirtypes

# Development tools (matching enterprise versions)
npm install -D @medplum/cli vitest@^4.0.12 @testing-library/react@^16.0.1 @testing-library/jest-dom@^6.6.3 typescript@^5.7.2

# Utilities (matching enterprise versions)
npm install zod@^3.23.8 zustand@^5.0.0 @tanstack/react-query@^5.59.0 date-fns@^4.1.0

# UI components (matching enterprise versions)
npm install lucide-react@^0.454.0 clsx@^2.1.1 tailwind-merge@^2.5.4 class-variance-authority@^0.7.0
npx shadcn@latest init -y
npx shadcn@latest add button card input label table badge alert dialog
```

**Step 3: Create the Medplum client configuration**

Create `src/lib/medplum/client.ts`:
- Export a singleton MedplumClient
- Handle authentication state
- Include proper TypeScript types

Create `src/lib/medplum/hooks.ts`:
- Create custom hooks for common Medplum operations
- `usePatient(id)` - fetch patient by ID
- `useMedications(patientId)` - fetch active medications
- `useTasks(filters)` - fetch tasks with filters
- Use React Query for caching

Create `src/lib/medplum/provider.tsx`:
- MedplumProvider component that wraps the app
- Handle authentication flow
- Provide medplum client context

**Step 4: Create the auth flow**

Create `src/app/(auth)/login/page.tsx`:
- Login form using Medplum's OAuth
- Redirect to dashboard on success

Create `src/app/(auth)/callback/page.tsx`:
- Handle OAuth callback
- Store tokens securely

**Step 5: Create basic layout structure**

Create `src/app/(dashboard)/layout.tsx`:
- Sidebar navigation
- Header with user info
- Protected route (redirect to login if not authenticated)

Create `src/app/(dashboard)/page.tsx`:
- Dashboard home with summary stats
- Quick links to main features

**Step 6: Set up environment variables**

Create `.env.local.example`:
```
NEXT_PUBLIC_MEDPLUM_BASE_URL=https://api.medplum.com/
NEXT_PUBLIC_MEDPLUM_CLIENT_ID=your-client-id
MEDPLUM_CLIENT_SECRET=your-client-secret
```

**Step 7: Create initial types**

Create `src/types/index.ts`:
- Export custom types for our application
- Include extension types for custom FHIR extensions

Create `src/schemas/index.ts`:
- Zod schemas for validation
- Task creation schema
- PDC calculation input/output schemas

**Requirements:**
- Use TypeScript strict mode
- Use Zod for all external data validation
- Use proper FHIR types from @medplum/fhirtypes
- Follow the patterns in the skills files
- Add proper error handling with Result pattern
- Include JSDoc comments for public functions

**After setup, verify:**
1. `npm run dev` starts without errors
2. Can navigate to login page
3. TypeScript compilation succeeds
4. All dependencies are correctly installed

Let me know when you're ready to start, and I'll guide you through each step.

---

## Usage Notes

When Claude Code completes this setup:

1. **Create Medplum Account**: Go to https://app.medplum.com and create a free account

2. **Create Client Application**: In Medplum App, go to Admin > Clients and create a new OAuth client

3. **Update Environment Variables**: Copy `.env.local.example` to `.env.local` and fill in your values

4. **Run Development Server**: `npm run dev`

5. **Test Login**: Navigate to http://localhost:3000/login and verify OAuth flow works
