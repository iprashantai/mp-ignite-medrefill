# Ignite Health Documentation

Welcome to the Ignite Health documentation. This folder contains all technical documentation for the medication adherence management platform.

---

## Documentation Index

### Developer Onboarding

Start here if you're new to the project:

| Document | Description | Time |
|----------|-------------|------|
| [Quick Start](onboarding/00-QUICK_START.md) | Get running in 15 minutes | 15 min |
| [Project Overview](onboarding/01-PROJECT_OVERVIEW.md) | What we're building and why | 20 min |
| [Development Setup](onboarding/02-DEVELOPMENT_SETUP.md) | Detailed environment setup | 30 min |
| [Codebase Guide](onboarding/03-CODEBASE_GUIDE.md) | Code structure and patterns | 30 min |
| [Medplum Integration](onboarding/04-MEDPLUM_INTEGRATION.md) | Medplum-specific guidance | 20 min |

**Recommended Reading Order:**
1. Quick Start (get running)
2. Project Overview (understand context)
3. `CLAUDE.md` in project root (mandatory)
4. Codebase Guide (deep dive)
5. FHIR Guide (learn healthcare data)

---

### Architecture & Design

| Document | Description |
|----------|-------------|
| [Architecture](ARCHITECTURE.md) | System architecture diagrams |
| [FHIR Guide](FHIR_GUIDE.md) | FHIR concepts and examples |
| [Implementation Roadmap](IMPLEMENTATION_ROADMAP.md) | Phased development plan |

---

### Migration & Operations

| Document | Description |
|----------|-------------|
| [Cloud to Self-Hosted Migration](migration/MEDPLUM_CLOUD_TO_SELFHOSTED.md) | Complete migration plan to AWS |

---

### Implementation Plans

| Document | Description |
|----------|-------------|
| [NL2Cypher AI Feature](plans/001-2025-12-27-nl2cypher-ai-feature.md) | Natural language to Cypher queries |

---

## Quick Links

### External Resources

- [Medplum Documentation](https://docs.medplum.com)
- [FHIR R4 Specification](https://hl7.org/fhir/R4)
- [US Core Implementation Guide](https://hl7.org/fhir/us/core)
- [HEDIS Measures](https://www.ncqa.org/hedis)

### Project Files

- [`CLAUDE.md`](../CLAUDE.md) - Master context for AI development
- [`package.json`](../package.json) - Dependencies and scripts
- [`docker-compose.yml`](../docker-compose.yml) - Neo4j services

---

## Contributing to Documentation

1. Use Markdown format
2. Include code examples where helpful
3. Keep diagrams up to date
4. Date your documents
5. Add to this index when creating new docs

---

*Last updated: December 27, 2025*
