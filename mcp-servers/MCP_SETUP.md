# MCP Server Configuration for Ignite Health

## Overview

Model Context Protocol (MCP) servers enable AI agents to interact with external systems in a standardized way. For Ignite Health, we'll configure MCP servers for:

1. **Medplum/FHIR** - Patient data access
2. **Drug Database** - Drug interaction checking
3. **Clinical Guidelines** - RAG for clinical protocols

---

## MCP Server: Medplum FHIR

This MCP server provides Claude/AI access to FHIR resources via Medplum.

### Installation

```bash
# Create MCP servers directory
mkdir -p mcp-servers/medplum-fhir
cd mcp-servers/medplum-fhir

# Initialize
npm init -y
npm install @modelcontextprotocol/sdk @medplum/core zod
npm install -D typescript @types/node
```

### Server Implementation

Create `mcp-servers/medplum-fhir/src/index.ts`:

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { MedplumClient } from '@medplum/core';
import { z } from 'zod';

// Initialize Medplum client
const medplum = new MedplumClient({
  baseUrl: process.env.MEDPLUM_BASE_URL || 'https://api.medplum.com/',
  clientId: process.env.MEDPLUM_CLIENT_ID,
  clientSecret: process.env.MEDPLUM_CLIENT_SECRET,
});

// Tool definitions
const TOOLS = [
  {
    name: 'get_patient',
    description: 'Retrieve patient demographics by ID',
    inputSchema: {
      type: 'object',
      properties: {
        patientId: { type: 'string', description: 'Patient ID (UUID)' },
      },
      required: ['patientId'],
    },
  },
  {
    name: 'get_medications',
    description: 'Get active medications for a patient',
    inputSchema: {
      type: 'object',
      properties: {
        patientId: { type: 'string', description: 'Patient ID' },
        status: { 
          type: 'string', 
          enum: ['active', 'completed', 'cancelled'],
          default: 'active',
        },
      },
      required: ['patientId'],
    },
  },
  {
    name: 'get_dispenses',
    description: 'Get medication dispense history for PDC calculation',
    inputSchema: {
      type: 'object',
      properties: {
        patientId: { type: 'string' },
        startDate: { type: 'string', description: 'ISO date' },
        endDate: { type: 'string', description: 'ISO date' },
      },
      required: ['patientId'],
    },
  },
  {
    name: 'get_conditions',
    description: 'Get patient conditions/diagnoses',
    inputSchema: {
      type: 'object',
      properties: {
        patientId: { type: 'string' },
      },
      required: ['patientId'],
    },
  },
  {
    name: 'get_allergies',
    description: 'Get patient allergies',
    inputSchema: {
      type: 'object',
      properties: {
        patientId: { type: 'string' },
      },
      required: ['patientId'],
    },
  },
  {
    name: 'get_pdc_history',
    description: 'Get PDC score history for a patient',
    inputSchema: {
      type: 'object',
      properties: {
        patientId: { type: 'string' },
        medicationClass: { 
          type: 'string',
          enum: ['MAD', 'MAC', 'MAH'],
        },
      },
      required: ['patientId'],
    },
  },
  {
    name: 'get_pending_tasks',
    description: 'Get pending refill review tasks',
    inputSchema: {
      type: 'object',
      properties: {
        patientId: { type: 'string', description: 'Optional filter by patient' },
        priority: { 
          type: 'string',
          enum: ['routine', 'urgent', 'asap', 'stat'],
        },
        limit: { type: 'number', default: 20 },
      },
    },
  },
  {
    name: 'search_patients',
    description: 'Search patients by name or identifier',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        identifier: { type: 'string' },
        limit: { type: 'number', default: 10 },
      },
    },
  },
];

// Tool handlers
async function handleGetPatient(patientId: string) {
  const patient = await medplum.readResource('Patient', patientId);
  
  // Return de-identified summary for AI (not full PHI)
  return {
    id: patient.id,
    age: calculateAge(patient.birthDate),
    gender: patient.gender,
    // Do NOT include name, SSN, address, etc.
  };
}

async function handleGetMedications(patientId: string, status = 'active') {
  const meds = await medplum.searchResources('MedicationRequest', {
    patient: `Patient/${patientId}`,
    status,
  });
  
  return meds.map(med => ({
    id: med.id,
    medication: med.medicationCodeableConcept?.coding?.[0]?.display,
    rxnormCode: med.medicationCodeableConcept?.coding?.[0]?.code,
    status: med.status,
    authoredOn: med.authoredOn,
    dosage: med.dosageInstruction?.[0]?.text,
  }));
}

async function handleGetDispenses(patientId: string, startDate?: string, endDate?: string) {
  const params: Record<string, string> = {
    patient: `Patient/${patientId}`,
    _sort: 'whenhandedover',
  };
  
  if (startDate) {
    params.whenhandedover = `ge${startDate}`;
  }
  
  const dispenses = await medplum.searchResources('MedicationDispense', params);
  
  return dispenses.map(d => ({
    id: d.id,
    medication: d.medicationCodeableConcept?.coding?.[0]?.display,
    rxnormCode: d.medicationCodeableConcept?.coding?.[0]?.code,
    whenHandedOver: d.whenHandedOver,
    daysSupply: d.daysSupply?.value,
    quantity: d.quantity?.value,
  }));
}

async function handleGetConditions(patientId: string) {
  const conditions = await medplum.searchResources('Condition', {
    patient: `Patient/${patientId}`,
    'clinical-status': 'active',
  });
  
  return conditions.map(c => ({
    id: c.id,
    code: c.code?.coding?.[0]?.code,
    display: c.code?.coding?.[0]?.display,
    onsetDate: c.onsetDateTime,
  }));
}

async function handleGetAllergies(patientId: string) {
  const allergies = await medplum.searchResources('AllergyIntolerance', {
    patient: `Patient/${patientId}`,
  });
  
  return allergies.map(a => ({
    id: a.id,
    substance: a.code?.coding?.[0]?.display,
    criticality: a.criticality,
    reaction: a.reaction?.[0]?.manifestation?.[0]?.coding?.[0]?.display,
  }));
}

async function handleGetPDCHistory(patientId: string, medicationClass?: string) {
  const params: Record<string, string> = {
    patient: `Patient/${patientId}`,
    _sort: '-date',
    _count: '10',
  };
  
  if (medicationClass) {
    params.code = `pdc-${medicationClass.toLowerCase()}`;
  }
  
  const observations = await medplum.searchResources('Observation', params);
  
  return observations.map(o => ({
    date: o.effectiveDateTime,
    medicationClass: o.code?.coding?.[0]?.code?.replace('pdc-', '').toUpperCase(),
    score: o.valueQuantity?.value,
    isAdherent: (o.valueQuantity?.value || 0) >= 80,
  }));
}

async function handleGetPendingTasks(patientId?: string, priority?: string, limit = 20) {
  const params: Record<string, string> = {
    status: 'requested',
    code: 'refill-review',
    _count: String(limit),
    _sort: '-priority,authored',
  };
  
  if (patientId) {
    params.patient = `Patient/${patientId}`;
  }
  if (priority) {
    params.priority = priority;
  }
  
  const tasks = await medplum.searchResources('Task', params);
  
  return tasks.map(t => ({
    id: t.id,
    patientId: t.for?.reference?.replace('Patient/', ''),
    priority: t.priority,
    description: t.description,
    createdAt: t.authoredOn,
  }));
}

async function handleSearchPatients(name?: string, identifier?: string, limit = 10) {
  const params: Record<string, string> = {
    _count: String(limit),
  };
  
  if (name) params.name = name;
  if (identifier) params.identifier = identifier;
  
  const patients = await medplum.searchResources('Patient', params);
  
  return patients.map(p => ({
    id: p.id,
    // Only return minimal info for search results
    age: calculateAge(p.birthDate),
    gender: p.gender,
  }));
}

function calculateAge(birthDate?: string): number | null {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

// Create and run server
const server = new Server(
  { name: 'medplum-fhir', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    let result;
    
    switch (name) {
      case 'get_patient':
        result = await handleGetPatient(args.patientId);
        break;
      case 'get_medications':
        result = await handleGetMedications(args.patientId, args.status);
        break;
      case 'get_dispenses':
        result = await handleGetDispenses(args.patientId, args.startDate, args.endDate);
        break;
      case 'get_conditions':
        result = await handleGetConditions(args.patientId);
        break;
      case 'get_allergies':
        result = await handleGetAllergies(args.patientId);
        break;
      case 'get_pdc_history':
        result = await handleGetPDCHistory(args.patientId, args.medicationClass);
        break;
      case 'get_pending_tasks':
        result = await handleGetPendingTasks(args.patientId, args.priority, args.limit);
        break;
      case 'search_patients':
        result = await handleSearchPatients(args.name, args.identifier, args.limit);
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
    
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});

// Start server
async function main() {
  await medplum.startClientLogin(
    process.env.MEDPLUM_CLIENT_ID!,
    process.env.MEDPLUM_CLIENT_SECRET!
  );
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error('Medplum FHIR MCP Server running');
}

main().catch(console.error);
```

### Configuration

Add to your Claude Desktop config (`~/.config/claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "medplum-fhir": {
      "command": "node",
      "args": ["path/to/mcp-servers/medplum-fhir/dist/index.js"],
      "env": {
        "MEDPLUM_BASE_URL": "https://api.medplum.com/",
        "MEDPLUM_CLIENT_ID": "your-client-id",
        "MEDPLUM_CLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
```

---

## MCP Server: Drug Interaction Checker

For production, integrate with First Databank or DrugBank. Here's a template:

Create `mcp-servers/drug-checker/src/index.ts`:

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const TOOLS = [
  {
    name: 'check_drug_interactions',
    description: 'Check for drug-drug interactions between medications',
    inputSchema: {
      type: 'object',
      properties: {
        rxnormCodes: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of RxNorm codes to check',
        },
      },
      required: ['rxnormCodes'],
    },
  },
  {
    name: 'get_drug_info',
    description: 'Get detailed information about a drug',
    inputSchema: {
      type: 'object',
      properties: {
        rxnormCode: { type: 'string' },
      },
      required: ['rxnormCode'],
    },
  },
  {
    name: 'check_contraindications',
    description: 'Check if drug is contraindicated for given conditions',
    inputSchema: {
      type: 'object',
      properties: {
        rxnormCode: { type: 'string' },
        icdCodes: {
          type: 'array',
          items: { type: 'string' },
        },
      },
      required: ['rxnormCode', 'icdCodes'],
    },
  },
];

// Placeholder implementations - replace with actual drug database API
async function checkDrugInteractions(rxnormCodes: string[]) {
  // In production: Call First Databank, DrugBank, or OpenFDA API
  // This is a placeholder
  return {
    interactions: [],
    checkedAt: new Date().toISOString(),
    source: 'placeholder',
  };
}

async function getDrugInfo(rxnormCode: string) {
  // Call drug database API
  return {
    rxnormCode,
    name: 'Unknown',
    class: 'Unknown',
    warnings: [],
  };
}

async function checkContraindications(rxnormCode: string, icdCodes: string[]) {
  // Call drug database API
  return {
    contraindicated: false,
    warnings: [],
  };
}

// Server setup (similar to above)
const server = new Server(
  { name: 'drug-checker', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// ... register handlers and start server
```

---

## MCP Server: Clinical Guidelines RAG

For RAG-based clinical guideline retrieval:

```typescript
const TOOLS = [
  {
    name: 'search_guidelines',
    description: 'Search clinical guidelines for medication management',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        condition: { type: 'string', description: 'e.g., diabetes, hypertension' },
        limit: { type: 'number', default: 5 },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_protocol',
    description: 'Get specific clinical protocol',
    inputSchema: {
      type: 'object',
      properties: {
        protocolId: { type: 'string' },
      },
      required: ['protocolId'],
    },
  },
];

// Implementation would use vector database (Pinecone, Weaviate, etc.)
// with embeddings from clinical guidelines
```

---

## Security Considerations

### PHI Protection in MCP

1. **Never return full PHI** - Only return de-identified or necessary data
2. **Audit all access** - Log every tool call with user context
3. **Rate limiting** - Prevent bulk data extraction
4. **Access control** - Verify user permissions before returning data

### Example: PHI Filtering

```typescript
function filterPatientForAI(patient: Patient): SafePatientSummary {
  return {
    id: patient.id,
    age: calculateAge(patient.birthDate),
    gender: patient.gender,
    // Explicitly EXCLUDE:
    // - name
    // - SSN
    // - address
    // - phone
    // - email
    // - exact birth date (use age instead)
  };
}
```

---

## Testing MCP Servers

```bash
# Install MCP Inspector
npm install -g @modelcontextprotocol/inspector

# Test your server
mcp-inspector node mcp-servers/medplum-fhir/dist/index.js

# This opens a web UI to test tool calls
```

---

## Integration with Claude Code

When using Claude Code with these MCP servers:

1. Start the MCP servers
2. Reference them in prompts: "Use the medplum-fhir MCP to get patient medications"
3. Claude will automatically use the tools

Example prompt:
```
Using the medplum-fhir MCP server, get the medication history for patient ID "abc-123" 
and calculate their PDC score for diabetes medications.
```
