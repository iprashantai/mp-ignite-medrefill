# Medplum MCP Server

This MCP server provides Claude Code with direct access to Medplum FHIR operations, enabling intelligent autocomplete, validation, and context-aware assistance.

## Overview

The Medplum MCP Server gives Claude Code the ability to:
- Query your Medplum project for real schema information
- Validate FHIR resources before creation
- Search for existing resources
- Understand your specific extensions and profiles

## Installation

### Step 1: Create the MCP Server

```bash
mkdir -p mcp-servers/medplum
cd mcp-servers/medplum
npm init -y
npm install @modelcontextprotocol/sdk @medplum/core @medplum/fhirtypes zod
npm install -D typescript @types/node
```

### Step 2: Create the Server

Create `mcp-servers/medplum/src/index.ts`:

```typescript
#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
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
const tools = [
  {
    name: 'search_fhir_resources',
    description: 'Search for FHIR resources in Medplum. Use this to find patients, medications, tasks, etc.',
    inputSchema: {
      type: 'object',
      properties: {
        resourceType: {
          type: 'string',
          description: 'FHIR resource type (e.g., Patient, MedicationRequest, Task)',
        },
        searchParams: {
          type: 'object',
          description: 'Search parameters as key-value pairs',
          additionalProperties: { type: 'string' },
        },
        count: {
          type: 'number',
          description: 'Maximum number of results (default: 10)',
        },
      },
      required: ['resourceType'],
    },
  },
  {
    name: 'read_fhir_resource',
    description: 'Read a specific FHIR resource by ID',
    inputSchema: {
      type: 'object',
      properties: {
        resourceType: {
          type: 'string',
          description: 'FHIR resource type',
        },
        id: {
          type: 'string',
          description: 'Resource ID',
        },
      },
      required: ['resourceType', 'id'],
    },
  },
  {
    name: 'validate_fhir_resource',
    description: 'Validate a FHIR resource against the schema',
    inputSchema: {
      type: 'object',
      properties: {
        resource: {
          type: 'object',
          description: 'The FHIR resource to validate',
        },
      },
      required: ['resource'],
    },
  },
  {
    name: 'get_resource_schema',
    description: 'Get the schema/structure for a FHIR resource type',
    inputSchema: {
      type: 'object',
      properties: {
        resourceType: {
          type: 'string',
          description: 'FHIR resource type',
        },
      },
      required: ['resourceType'],
    },
  },
  {
    name: 'list_custom_extensions',
    description: 'List custom extensions defined in the project',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'execute_graphql',
    description: 'Execute a GraphQL query against Medplum',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'GraphQL query string',
        },
        variables: {
          type: 'object',
          description: 'GraphQL variables',
        },
      },
      required: ['query'],
    },
  },
];

// Create server
const server = new Server(
  {
    name: 'medplum-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// Handle tool list request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // Ensure authenticated
    await ensureAuthenticated();

    switch (name) {
      case 'search_fhir_resources': {
        const { resourceType, searchParams = {}, count = 10 } = args as any;
        const results = await medplum.searchResources(resourceType, {
          ...searchParams,
          _count: String(count),
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      }

      case 'read_fhir_resource': {
        const { resourceType, id } = args as any;
        const resource = await medplum.readResource(resourceType, id);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(resource, null, 2),
            },
          ],
        };
      }

      case 'validate_fhir_resource': {
        const { resource } = args as any;
        try {
          const result = await medplum.validateResource(resource);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ valid: true, result }, null, 2),
              },
            ],
          };
        } catch (error: any) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  valid: false,
                  errors: error.outcome?.issue || [{ message: error.message }],
                }, null, 2),
              },
            ],
          };
        }
      }

      case 'get_resource_schema': {
        const { resourceType } = args as any;
        const schema = await medplum.readResource('StructureDefinition', resourceType);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(schema, null, 2),
            },
          ],
        };
      }

      case 'list_custom_extensions': {
        const extensions = await medplum.searchResources('StructureDefinition', {
          type: 'Extension',
          url: 'https://ignitehealth.com',
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(extensions, null, 2),
            },
          ],
        };
      }

      case 'execute_graphql': {
        const { query, variables } = args as any;
        const result = await medplum.graphql(query, undefined, variables);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Resource handlers for context
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'medplum://schema/Patient',
        name: 'Patient Schema',
        description: 'FHIR Patient resource structure',
        mimeType: 'application/json',
      },
      {
        uri: 'medplum://schema/MedicationRequest',
        name: 'MedicationRequest Schema',
        description: 'FHIR MedicationRequest resource structure',
        mimeType: 'application/json',
      },
      {
        uri: 'medplum://schema/Task',
        name: 'Task Schema',
        description: 'FHIR Task resource structure',
        mimeType: 'application/json',
      },
      {
        uri: 'medplum://extensions',
        name: 'Ignite Health Extensions',
        description: 'Custom FHIR extensions for Ignite Health',
        mimeType: 'application/json',
      },
    ],
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  if (uri === 'medplum://extensions') {
    const extensions = {
      pdcScore: 'https://ignitehealth.com/fhir/extensions/pdc-score',
      riskLevel: 'https://ignitehealth.com/fhir/extensions/risk-level',
      aiRecommendation: 'https://ignitehealth.com/fhir/extensions/ai-recommendation',
      aiConfidence: 'https://ignitehealth.com/fhir/extensions/ai-confidence',
      aiReasoning: 'https://ignitehealth.com/fhir/extensions/ai-reasoning',
      medicationClass: 'https://ignitehealth.com/fhir/extensions/medication-class',
      daysUntilGap: 'https://ignitehealth.com/fhir/extensions/days-until-gap',
    };
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(extensions, null, 2),
        },
      ],
    };
  }

  // Handle schema requests
  const schemaMatch = uri.match(/^medplum:\/\/schema\/(.+)$/);
  if (schemaMatch) {
    const resourceType = schemaMatch[1];
    await ensureAuthenticated();
    const schema = await medplum.readResource('StructureDefinition', resourceType);
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(schema, null, 2),
        },
      ],
    };
  }

  throw new Error(`Unknown resource: ${uri}`);
});

// Authentication helper
let authenticated = false;
async function ensureAuthenticated() {
  if (!authenticated) {
    await medplum.startClientLogin(
      process.env.MEDPLUM_CLIENT_ID!,
      process.env.MEDPLUM_CLIENT_SECRET!
    );
    authenticated = true;
  }
}

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Medplum MCP Server running');
}

main().catch(console.error);
```

### Step 3: Configure package.json

```json
{
  "name": "medplum-mcp-server",
  "version": "1.0.0",
  "type": "module",
  "bin": {
    "medplum-mcp": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

### Step 4: Configure tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true
  },
  "include": ["src/**/*"]
}
```

### Step 5: Build the Server

```bash
npm run build
```

### Step 6: Configure Claude Code

Add to your Claude Code MCP configuration (`~/.config/claude/mcp.json` or equivalent):

```json
{
  "mcpServers": {
    "medplum": {
      "command": "node",
      "args": ["/path/to/ignite-health/mcp-servers/medplum/dist/index.js"],
      "env": {
        "MEDPLUM_BASE_URL": "https://api.medplum.com/",
        "MEDPLUM_CLIENT_ID": "your-client-id",
        "MEDPLUM_CLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
```

## Usage in Claude Code

Once configured, Claude Code can:

### Search for Resources
```
"Search for all patients with active diabetes medications"
→ Claude uses search_fhir_resources to query MedicationRequest
```

### Validate Resources
```
"Validate this Task resource I'm creating"
→ Claude uses validate_fhir_resource before you save
```

### Get Schema Information
```
"What fields are required for a MedicationDispense?"
→ Claude uses get_resource_schema
```

### Execute GraphQL
```
"Get patient with their medications and conditions"
→ Claude uses execute_graphql with a joined query
```

## Security Notes

- Client credentials should be for a limited-scope service account
- Never use admin credentials
- Audit all MCP operations in production
- Consider adding rate limiting
