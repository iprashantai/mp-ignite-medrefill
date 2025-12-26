# Ignite Health Setup - Master Index

## File Manifest

```
ignite-health-setup/
│
├── GETTING_STARTED.md          ← START HERE (Project Owner)
├── TEAM_SETUP.md               ← For adding team members
├── CLAUDE.md                   ← Master context for Claude Code
├── FILE_INDEX.md               ← This file
│
├── .env.local.example          ← Environment variable template
│
├── .claude/
│   └── settings.json           ← Claude Code settings
│
├── docs/
│   ├── ARCHITECTURE.md         ← System architecture diagrams
│   ├── FHIR_GUIDE.md           ← FHIR reference for beginners
│   └── IMPLEMENTATION_ROADMAP.md ← 16-week implementation plan
│
├── specs/
│   └── pdc-calculation.md      ← PDC calculation specification
│
├── skills/
│   ├── fhir-resource.md        ← FHIR patterns for Claude Code
│   ├── medplum-bot.md          ← Medplum Bot patterns
│   └── clinical-ai-safety.md   ← AI safety patterns
│
├── mcp-servers/
│   └── MCP_SETUP.md            ← MCP server configuration guide
│
├── prompts/
│   ├── 01-initial-setup.md     ← Project initialization prompt
│   ├── 02-pdc-calculation.md   ← PDC engine prompt
│   ├── 03-command-center-ui.md ← Dashboard UI prompt
│   ├── 04-validation-compliance.md ← Security/compliance prompt
│   └── 05-ai-integration.md    ← AI integration prompt
│
└── scripts/
    └── dev.sh                  ← Development helper scripts
```

---

## Setup Sequence

### Day 1: Foundation

1. **Read** `GETTING_STARTED.md` completely
2. **Create** Medplum account at https://app.medplum.com
3. **Create** OAuth client in Medplum
4. **Copy** all files to your project directory
5. **Run** prompt `01-initial-setup.md` in Claude Code

### Day 2-3: Environment

6. **Configure** `.env.local` with Medplum credentials
7. **Verify** `npm run dev` works
8. **Test** login flow with Medplum

### Week 1: PDC Engine

9. **Read** `specs/pdc-calculation.md`
10. **Run** prompt `02-pdc-calculation.md`
11. **Verify** all PDC tests pass

### Week 2: Testing Data

12. **Download** Synthea
13. **Generate** test patients: `./scripts/dev.sh seed 100`
14. **Verify** data in Medplum App

### Week 3-4: Command Center

15. **Run** prompt `03-command-center-ui.md`
16. **Test** queue display, filtering, patient detail

### Week 5: Compliance

17. **Run** prompt `04-validation-compliance.md`
18. **Run** `./scripts/dev.sh compliance`
19. **Fix** any compliance issues

### Week 6-8: AI Integration

20. **Setup** AWS Bedrock access
21. **Run** prompt `05-ai-integration.md`
22. **Test** AI recommendations with verification

### Week 9+: Integration

23. **Begin** eClinicalWorks SMART on FHIR integration
24. **Deploy** Medplum Bots for production workflows
25. **Conduct** clinical validation with SMEs

---

## Quick Reference

### Key Commands

```bash
# Start development
npm run dev

# Run tests
npm test

# Type check
npx tsc --noEmit

# Lint
npm run lint

# Deploy bots
./scripts/dev.sh deploy-bots

# Compliance check
./scripts/dev.sh compliance

# Seed test data
./scripts/dev.sh seed 50
```

### Medplum CLI

```bash
# Login
npx medplum login

# Check connection
npx medplum whoami

# Deploy a bot
npx medplum bot deploy pdc-calculator

# Import FHIR resources
npx medplum bulk import ./data/*.json
```

### Claude Code Tips

1. **Always reference specs**: "Read specs/pdc-calculation.md first, then..."
2. **Small tasks**: Break large features into focused prompts
3. **Validate often**: Run tests after each implementation
4. **Use skills**: Point Claude to relevant skill files

---

## File Purposes

| File | Purpose | When to Read |
|------|---------|--------------|
| `CLAUDE.md` | Master context | Claude reads automatically |
| `GETTING_STARTED.md` | Human onboarding | Day 1 |
| `docs/FHIR_GUIDE.md` | FHIR reference | When working with FHIR |
| `docs/IMPLEMENTATION_ROADMAP.md` | Project timeline | Planning |
| `specs/pdc-calculation.md` | PDC formula | Implementing PDC |
| `skills/fhir-resource.md` | FHIR patterns | Creating resources |
| `skills/medplum-bot.md` | Bot patterns | Creating bots |
| `skills/clinical-ai-safety.md` | AI safety | AI integration |
| `prompts/*` | Claude Code prompts | Step-by-step dev |

---

## Prompt Dependencies

```
01-initial-setup.md
         ↓
02-pdc-calculation.md
         ↓
03-command-center-ui.md
         ↓
04-validation-compliance.md
         ↓
05-ai-integration.md
```

Run prompts in order. Each builds on the previous.

---

## Support

- **Medplum Docs**: https://docs.medplum.com
- **Medplum Discord**: https://discord.gg/medplum
- **FHIR Spec**: https://hl7.org/fhir/R4
- **Anthropic Docs**: https://docs.anthropic.com

---

## Checklist

### Before Starting

- [ ] Node.js 22+ installed
- [ ] npm 10+ available
- [ ] VS Code with TypeScript extension
- [ ] Claude Code or Cursor
- [ ] Medplum account created
- [ ] OAuth client configured

### After Initial Setup

- [ ] Project runs with `npm run dev`
- [ ] Login page accessible
- [ ] TypeScript compiles without errors
- [ ] ESLint passes

### After PDC Implementation

- [ ] All PDC tests pass
- [ ] PDC calculation is 100% deterministic
- [ ] No AI in PDC code

### After Command Center

- [ ] Queue displays correctly
- [ ] Filters work
- [ ] Patient detail shows
- [ ] Actions complete

### After Compliance Setup

- [ ] Security ESLint rules active
- [ ] PHI logging checks pass
- [ ] Audit logging implemented
- [ ] Pre-commit hooks work

### After AI Integration

- [ ] De-identification works
- [ ] Multi-stage verification works
- [ ] Low confidence escalates
- [ ] Hallucination detection works

### Production Ready

- [ ] All tests pass (>80% coverage)
- [ ] Compliance checks pass
- [ ] Documentation complete
- [ ] Medplum Production tier
- [ ] BAA signed
