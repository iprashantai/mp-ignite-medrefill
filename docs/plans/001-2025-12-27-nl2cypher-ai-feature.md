# Implementation Plan: AI-Powered Natural Language to Cypher Query Feature

**Document ID**: 001
**Date**: 2025-12-27
**Status**: Draft
**Author**: Claude Code (AI-assisted planning)

---

## Executive Summary

This document outlines a comprehensive plan for implementing an AI-powered natural language to Cypher query feature for the Ignite Health Neo4j database. The feature will allow clinical staff and analysts to query the healthcare graph database using plain English instead of writing Cypher queries manually.

**Recommended Approach**: Build a custom Next.js page with AWS Bedrock (Claude) integration, following the existing project architecture patterns. This approach leverages existing infrastructure (AWS Bedrock credentials already configured), maintains consistency with the project's deterministic vs AI separation principles, and provides the best control over security and HIPAA compliance.

---

## Research Findings

### Current State of NL2Cypher Technology (December 2025)

Based on research from Neo4j's documentation and community resources:

1. **Neo4j Labs Text2Cypher (2024) Model**: Neo4j released a fine-tuned model specifically for Cypher generation that outperforms general-purpose LLMs on this task.

2. **LangChain GraphCypherQAChain**: Mature integration that translates natural language to Cypher, executes queries, and generates natural language responses.

3. **Neo4j MCP Servers**: Official MCP servers from Neo4j Labs launched December 2024, supporting natural language to Cypher via Model Context Protocol.

4. **NeoDash Text2Cypher Extension**: Built-in extension in NeoDash (already in our Docker setup) that supports OpenAI, Azure OpenAI, and other providers.

5. **neo4j-graphrag-python Package**: Official Neo4j package with Text2CypherRetriever supporting multiple LLM providers including Anthropic Claude.

### Key Technical Insights

- **Schema awareness is critical**: LLMs need the complete graph schema to generate valid queries
- **Few-shot examples dramatically improve accuracy**: Domain-specific examples boost performance by 30-50%
- **Query validation is essential**: LLMs can generate syntactically incorrect or semantically wrong queries
- **Hallucination prevention**: Models must be explicitly instructed to refuse when they cannot generate a valid query

---

## Architecture Options Evaluated

### Option 1: NeoDash Text2Cypher Extension (Existing Tool)
**Complexity**: Low | **Time**: 1-2 days

Already running in Docker at localhost:5005. Configure with OpenAI API key.

| Pros | Cons |
|------|------|
| Zero development | Requires OpenAI (not AWS Bedrock) |
| Immediate availability | Limited customization |
| | No audit logging |
| | Outside main app |

### Option 2: Neo4j MCP Server Integration
**Complexity**: Medium | **Time**: 1 week

Use `mcp-neo4j-cypher` MCP server with Claude Desktop or custom MCP client.

| Pros | Cons |
|------|------|
| Standard protocol | External dependency |
| Claude-native | Limited UI control |
| Good developer experience | Python-based |

### Option 3: Custom Next.js Page with AWS Bedrock (RECOMMENDED)
**Complexity**: Medium-High | **Time**: 2-3 weeks

Build a dedicated `/dev/graph-query` page with natural language input, Claude-powered Cypher generation, and results visualization.

| Pros | Cons |
|------|------|
| Full control | More development effort |
| HIPAA-compliant audit logging | |
| Uses existing AWS Bedrock config | |
| Consistent UX | |

### Option 4: LangChain.js GraphCypherQAChain
**Complexity**: Medium | **Time**: 1-2 weeks

Use LangChain.js Neo4j integration with AWS Bedrock.

| Pros | Cons |
|------|------|
| Battle-tested | Additional dependency |
| Good documentation | Abstraction may limit customization |
| TypeScript support | |

### Option 5: API Proxy Approach
**Complexity**: High | **Time**: 3-4 weeks

Create a proxy that intercepts queries sent to Neo4j Browser and injects AI translation.

| Pros | Cons |
|------|------|
| Works with existing Neo4j Browser | Complex |
| | Fragile |
| | Poor UX |

---

## Recommended Approach: Custom Next.js Implementation

### Justification

1. **Alignment with Project Architecture**: Follows the hybrid deterministic/AI pattern in CLAUDE.md
2. **AWS Bedrock Integration**: Uses existing configured AWS Bedrock credentials
3. **HIPAA Compliance**: Full control over audit logging and PHI handling
4. **Consistent UX**: Matches the existing Mantine-based UI design
5. **Schema Awareness**: Can dynamically fetch and cache the Neo4j schema
6. **Security**: Server-side query validation before execution
7. **Extensibility**: Easy to add features like query history, favorites, explanations

### Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                    Next.js Frontend                          │
│  /dev/graph-query page                                       │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Natural Language Input                                │  │
│  │  [Ask a question about the graph...]                   │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Generated Cypher (editable)                           │  │
│  │  MATCH (p:Patient)-[:HAS_MEDICATION_DISPENSE]->...     │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Results Visualization                                 │  │
│  │  [Table] [Graph] [JSON]                                │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────┬───────────────────────────────────┘
                           │
               POST /api/graph/nl2cypher
                           │
┌──────────────────────────┴───────────────────────────────────┐
│                    Next.js API Route                         │
│  /api/graph/nl2cypher/route.ts                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 1. Fetch Neo4j Schema                                  │  │
│  │ 2. Build Prompt with Schema + Few-shot Examples        │  │
│  │ 3. Call AWS Bedrock (Claude)                           │  │
│  │ 4. Validate Generated Cypher (read-only check)         │  │
│  │ 5. Execute Query against Neo4j                         │  │
│  │ 6. Create Audit Log                                    │  │
│  │ 7. Return Results                                      │  │
│  └────────────────────────────────────────────────────────┘  │
└───────────┬─────────────────────────────────┬────────────────┘
            │                                 │
     AWS Bedrock                           Neo4j
     (Claude 3.5)                     (localhost:7687)
```

---

## Implementation Steps

### Phase 1: Core Infrastructure (Week 1)

#### Step 1.1: Create Schema Extraction Utility

**Location**: `src/lib/neo4j/schema.ts`

**Key Functions**:
- `getGraphSchema()`: Extract node labels, relationship types, properties
- Cache schema for 1 hour to reduce load
- Format schema as LLM-friendly text

```typescript
// Example structure
interface GraphSchema {
  nodeLabels: { label: string; properties: string[]; count: number }[];
  relationships: { type: string; fromLabel: string; toLabel: string }[];
  indexes: string[];
}
```

#### Step 1.2: Create Bedrock Client Wrapper

**Location**: `src/lib/ai/bedrock.ts`

**Key Functions**:
- `invokeModel(prompt, options)`: Call Claude via Bedrock
- Handle streaming responses
- Error handling and retry logic

#### Step 1.3: Create NL2Cypher Service

**Location**: `src/lib/neo4j/nl2cypher.ts`

**Key Functions**:
- `translateToCypher(naturalLanguage, schema)`: Generate Cypher from NL
- `validateCypher(cypher)`: Syntax validation
- `isReadOnlyQuery(cypher)`: Security check
- `generateExplanation(cypher)`: Human-readable explanation

### Phase 2: API and Frontend (Week 2)

#### Step 2.1: Create API Route

**Location**: `src/app/api/graph/nl2cypher/route.ts`

**Endpoints**:
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/graph/nl2cypher` | POST | Translate NL to Cypher |
| `/api/graph/execute` | POST | Execute validated Cypher |
| `/api/graph/schema` | GET | Get schema for client-side display |

#### Step 2.2: Create Frontend Page

**Location**: `src/app/(dashboard)/dev/graph-query/page.tsx`

**Features**:
- Natural language input with suggestions
- Generated Cypher display (editable)
- Execute button with loading state
- Results in table/graph/JSON view
- Query history sidebar
- Example queries drawer

#### Step 2.3: Create Results Visualization Components

**Location**: `src/components/graph/`

| Component | Purpose |
|-----------|---------|
| `CypherEditor.tsx` | Syntax-highlighted Cypher editor |
| `GraphResults.tsx` | Interactive graph visualization |
| `TableResults.tsx` | Tabular data display |
| `QueryHistory.tsx` | Previous queries list |

### Phase 3: Security and Polish (Week 3)

#### Step 3.1: Implement Security Layer

**Key Security Measures**:
- Read-only query enforcement (block MERGE, CREATE, DELETE, SET, REMOVE)
- Query timeout limits (30 seconds max)
- Result count limits (1000 rows max)
- Parameterized queries where possible
- Input sanitization

#### Step 3.2: Add Audit Logging

**Location**: `src/lib/compliance/audit.ts`

**Logged Events**:
- User ID
- Natural language query
- Generated Cypher
- Execution time
- Result count
- Errors

#### Step 3.3: Add Example Queries and Few-Shot Examples

**Location**: `src/lib/neo4j/nl2cypher-examples.ts`

**Example Categories**:
- Patient queries
- Medication adherence queries (MAD/MAC/MAH)
- Condition/allergy queries
- Analytics queries

---

## Prompt Engineering Strategy

### System Prompt Template

```
You are a Cypher query generator for a healthcare knowledge graph.

GRAPH SCHEMA:
Node Labels:
- Patient (id, firstName, lastName, birthDate, gender, race, ethnicity, age, ...)
- Medication (code, description, adherenceClass [MAD|MAC|MAH|null])
- MedicationDispense (id, startDate, stopDate, daysSupply, totalCost, ...)
- Condition (code, description)
- Allergy (code, description, type, category)
- Provider (id, name, gender, speciality)
- Organization (id, name, address, city, state)
- Encounter (id, startDateTime, encounterClass, description)
- Payer (id, name, ownership)

Relationships:
- (Patient)-[:HAS_MEDICATION_DISPENSE]->(MedicationDispense)
- (MedicationDispense)-[:OF_MEDICATION]->(Medication)
- (Patient)-[:HAS_CONDITION {startDate, stopDate, isActive}]->(Condition)
- (Patient)-[:HAS_ALLERGY {severity1, reaction1}]->(Allergy)
- (Patient)-[:HAS_ENCOUNTER]->(Encounter)
- (Encounter)-[:WITH_PROVIDER]->(Provider)
- (Provider)-[:WORKS_AT]->(Organization)
- (MedicationDispense)-[:FOLLOWED_BY {gapDays, isGap}]->(MedicationDispense)

ADHERENCE CLASSES:
- MAD = Diabetes medications (metformin, insulin, glipizide, glyburide)
- MAC = Cholesterol/Statin medications (atorvastatin, simvastatin, rosuvastatin)
- MAH = Hypertension medications (lisinopril, losartan, amlodipine, hydrochlorothiazide)

RULES:
1. Generate ONLY read-only Cypher queries (MATCH, RETURN, WITH, WHERE, ORDER BY, LIMIT)
2. NEVER use MERGE, CREATE, DELETE, SET, REMOVE, or DETACH
3. Always include LIMIT unless aggregating
4. Use case-insensitive matching for text searches (toLower)
5. If you cannot generate a valid query, respond with error JSON

OUTPUT FORMAT:
{
  "cypher": "MATCH ...",
  "explanation": "This query finds...",
  "confidence": 0.95
}
```

### Few-Shot Examples

```
User: "show me all diabetic patients on metformin"
Output: {
  "cypher": "MATCH (p:Patient)-[:HAS_CONDITION]->(c:Condition)
             WHERE toLower(c.description) CONTAINS 'diabetes'
             WITH p
             MATCH (p)-[:HAS_MEDICATION_DISPENSE]->(md)-[:OF_MEDICATION]->(m)
             WHERE toLower(m.description) CONTAINS 'metformin'
             RETURN DISTINCT p.firstName, p.lastName, m.description
             LIMIT 100",
  "explanation": "Finds patients with a diabetes condition who have been dispensed metformin",
  "confidence": 0.92
}

User: "how many patients are on statin medications"
Output: {
  "cypher": "MATCH (p:Patient)-[:HAS_MEDICATION_DISPENSE]->(md)-[:OF_MEDICATION]->(m)
             WHERE m.adherenceClass = 'MAC'
             RETURN count(DISTINCT p) AS statinPatients",
  "explanation": "Counts unique patients who have medication dispenses for MAC (cholesterol/statin) class drugs",
  "confidence": 0.95
}

User: "find patients with hypertension who haven't refilled in 30 days"
Output: {
  "cypher": "MATCH (p:Patient)-[:HAS_CONDITION]->(c:Condition)
             WHERE toLower(c.description) CONTAINS 'hypertension'
             WITH p
             MATCH (p)-[:HAS_MEDICATION_DISPENSE]->(md)-[:OF_MEDICATION]->(m)
             WHERE m.adherenceClass = 'MAH'
             WITH p, md ORDER BY md.startDate DESC
             WITH p, collect(md)[0] AS lastDispense
             WHERE lastDispense.startDate < date() - duration({days: 30})
             RETURN p.firstName, p.lastName, lastDispense.startDate AS lastRefill
             LIMIT 100",
  "explanation": "Finds hypertension patients whose last MAH medication dispense was over 30 days ago",
  "confidence": 0.85
}
```

---

## Required Dependencies

Add to `package.json`:

```json
{
  "dependencies": {
    "@aws-sdk/client-bedrock-runtime": "^3.x",
    "neo4j-driver": "^5.x",
    "@uiw/react-codemirror": "^4.x",
    "cypher-codemirror": "^1.x"
  }
}
```

---

## Environment Variables

Add to `.env.local`:

```env
# Already configured
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0

# New for NL2Cypher
NL2CYPHER_ENABLED=true
NL2CYPHER_MAX_RESULTS=1000
NL2CYPHER_QUERY_TIMEOUT_MS=30000
NL2CYPHER_CACHE_SCHEMA_MINUTES=60
```

---

## Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| LLM generates invalid Cypher | Medium | Medium | Syntax validation before execution |
| LLM generates destructive queries | High | Low | Read-only enforcement, keyword blocklist |
| Cypher injection attack | High | Low | Query parsing, parameterization |
| Slow query execution | Medium | Medium | Query timeout, result limits |
| PHI exposure in logs | High | Low | Sanitize logs, no PHI in prompts |
| Hallucinated relationships | Medium | Medium | Confidence scoring, user verification |
| AWS Bedrock rate limits | Low | Low | Retry with exponential backoff |
| Schema changes break queries | Low | Low | Dynamic schema extraction |

---

## Alternative Approaches Considered

### Alternative 1: Use NeoDash Built-in Text2Cypher
Already running at localhost:5005. Simply configure with OpenAI API key.

**Why Not Chosen**: Requires OpenAI (project uses AWS Bedrock), limited customization, no audit logging, separate from main application.

### Alternative 2: Deploy Neo4j MCP Server
Use the official `mcp-neo4j-cypher` server.

**Why Not Chosen**: Python-based (project is TypeScript), limited UI integration, requires MCP client implementation.

### Alternative 3: LangChain.js with Bedrock
Use LangChain.js GraphCypherQAChain with AWS Bedrock.

**Why Not Chosen**: Adds significant dependency, abstractions may limit control for security requirements.

### Alternative 4: Fine-tuned Model
Use Neo4j's Text2Cypher 2024 fine-tuned model.

**Why Not Chosen**: Requires separate model hosting, added infrastructure complexity.

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Query Success Rate | >85% of NL queries successfully translated |
| Response Time | <5 seconds from query to results |
| User Adoption | >50% of graph queries via NL within 1 month |
| Security | Zero destructive queries executed |

---

## Timeline Summary

| Week | Deliverables |
|------|-------------|
| Week 1 | Schema extraction, Bedrock client, NL2Cypher service |
| Week 2 | API routes, Frontend page, Results visualization |
| Week 3 | Security layer, Audit logging, Example queries, Testing |

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/lib/neo4j/schema.ts` | Schema extraction and caching |
| `src/lib/ai/bedrock.ts` | AWS Bedrock client wrapper |
| `src/lib/neo4j/nl2cypher.ts` | NL to Cypher translation service |
| `src/lib/neo4j/nl2cypher-examples.ts` | Few-shot examples |
| `src/app/api/graph/nl2cypher/route.ts` | API endpoint |
| `src/app/api/graph/schema/route.ts` | Schema API endpoint |
| `src/app/(dashboard)/dev/graph-query/page.tsx` | Frontend page |
| `src/components/graph/CypherEditor.tsx` | Code editor component |
| `src/components/graph/GraphResults.tsx` | Graph visualization |
| `src/components/graph/TableResults.tsx` | Table results |
| `src/components/graph/QueryHistory.tsx` | Query history |

---

## Next Steps

1. Review and approve this plan
2. Set up AWS Bedrock credentials if not already done
3. Begin Phase 1 implementation
4. Schedule weekly progress reviews

---

*This plan was generated with AI assistance based on research of current best practices and analysis of the existing codebase.*
