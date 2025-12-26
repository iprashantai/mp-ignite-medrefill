# Validation Agent MCP Server

This MCP server provides Claude Code with validation agents that check code quality, security, compliance, and clinical correctness in real-time.

## Overview

The Validation Agent MCP gives Claude Code access to specialized validators:
- **Security Scanner**: Detects vulnerabilities, PHI exposure
- **HIPAA Validator**: Checks compliance requirements
- **Clinical Logic Validator**: Ensures clinical correctness
- **FHIR Validator**: Validates FHIR resource structure
- **Type Safety Checker**: Catches TypeScript issues
- **Test Coverage Analyzer**: Ensures adequate testing

## Installation

### Step 1: Create the MCP Server

```bash
mkdir -p mcp-servers/validation-agent
cd mcp-servers/validation-agent
npm init -y
npm install @modelcontextprotocol/sdk zod typescript-eslint semgrep-cli
npm install -D typescript @types/node
```

### Step 2: Create the Server

Create `mcp-servers/validation-agent/src/index.ts`:

```typescript
#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

// Validation rules
const SECURITY_PATTERNS = {
  hardcodedSecrets: /(?:password|secret|key|token)\s*[:=]\s*['"][^'"]+['"]/gi,
  sqlInjection: /\$\{.*\}.*(?:SELECT|INSERT|UPDATE|DELETE)/gi,
  evalUsage: /eval\s*\(/g,
  dangerousHtml: /dangerouslySetInnerHTML/g,
  consoleLog: /console\.log\(/g,
};

const PHI_PATTERNS = {
  ssn: /\b\d{3}-?\d{2}-?\d{4}\b/g,
  phoneNumber: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  dateOfBirth: /\b(0[1-9]|1[0-2])[\/\-](0[1-9]|[12]\d|3[01])[\/\-](19|20)\d{2}\b/g,
  patientName: /patient\s*[:\s]+[A-Z][a-z]+\s+[A-Z][a-z]+/gi,
  mrn: /\bMRN[:\s]?\d+\b/gi,
};

const CLINICAL_RULES = {
  pdcMustBeDeterministic: {
    pattern: /calculatePDC.*(?:Math\.random|AI|predict|model)/gi,
    message: 'PDC calculation must be 100% deterministic - no AI or random values',
    severity: 'error',
  },
  drugInteractionMustUseDatabase: {
    pattern: /checkDrugInteraction.*(?:LLM|Claude|GPT|AI)/gi,
    message: 'Drug interaction checking must use database lookup, not AI',
    severity: 'error',
  },
  aiOutputMustBeValidated: {
    pattern: /generateRecommendation(?!.*validate)/gi,
    message: 'AI outputs must be validated with Zod schema',
    severity: 'warning',
  },
  lowConfidenceMustEscalate: {
    pattern: /confidence\s*<\s*0\.7.*(?:approve|accept)/gi,
    message: 'Low confidence (<0.70) recommendations must escalate to human',
    severity: 'error',
  },
};

// Tool definitions
const tools = [
  {
    name: 'scan_security',
    description: 'Scan code for security vulnerabilities',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Code to scan' },
        filePath: { type: 'string', description: 'Path to file (for context)' },
      },
      required: ['code'],
    },
  },
  {
    name: 'check_phi_exposure',
    description: 'Check code for potential PHI exposure in logs, comments, or strings',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Code to check' },
      },
      required: ['code'],
    },
  },
  {
    name: 'validate_hipaa_compliance',
    description: 'Check code for HIPAA compliance issues',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Code to validate' },
        context: { type: 'string', description: 'Component type (api, ui, bot, etc.)' },
      },
      required: ['code'],
    },
  },
  {
    name: 'validate_clinical_logic',
    description: 'Validate clinical logic for correctness and safety',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Code to validate' },
        component: { type: 'string', description: 'Component name (pdc, safety, ai, etc.)' },
      },
      required: ['code'],
    },
  },
  {
    name: 'validate_fhir_resource',
    description: 'Validate FHIR resource structure and required fields',
    inputSchema: {
      type: 'object',
      properties: {
        resource: { type: 'object', description: 'FHIR resource to validate' },
      },
      required: ['resource'],
    },
  },
  {
    name: 'check_type_safety',
    description: 'Check TypeScript code for type safety issues',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'TypeScript code to check' },
      },
      required: ['code'],
    },
  },
  {
    name: 'analyze_test_coverage',
    description: 'Analyze test coverage for a function or module',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Code to analyze' },
        tests: { type: 'string', description: 'Existing test code' },
      },
      required: ['code'],
    },
  },
  {
    name: 'full_validation',
    description: 'Run all validators on code',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Code to validate' },
        filePath: { type: 'string', description: 'File path for context' },
      },
      required: ['code'],
    },
  },
];

// Validator implementations
function scanSecurity(code: string): ValidationResult {
  const issues: Issue[] = [];

  for (const [name, pattern] of Object.entries(SECURITY_PATTERNS)) {
    const matches = code.match(pattern);
    if (matches) {
      issues.push({
        type: 'security',
        severity: name === 'evalUsage' ? 'error' : 'warning',
        rule: name,
        message: `Potential security issue: ${name}`,
        matches: matches.slice(0, 3),
      });
    }
  }

  return {
    valid: issues.filter(i => i.severity === 'error').length === 0,
    issues,
  };
}

function checkPHIExposure(code: string): ValidationResult {
  const issues: Issue[] = [];

  for (const [name, pattern] of Object.entries(PHI_PATTERNS)) {
    const matches = code.match(pattern);
    if (matches) {
      issues.push({
        type: 'phi',
        severity: 'error',
        rule: name,
        message: `Potential PHI exposure: ${name}`,
        matches: matches.slice(0, 3).map(m => m.substring(0, 20) + '...'),
      });
    }
  }

  // Check for logging of patient data
  const logPatterns = /console\.(log|info|debug)\(.*(?:patient|medication|condition)/gi;
  const logMatches = code.match(logPatterns);
  if (logMatches) {
    issues.push({
      type: 'phi',
      severity: 'warning',
      rule: 'patientDataLogging',
      message: 'Logging statements may contain patient data',
      matches: logMatches.slice(0, 3),
    });
  }

  return {
    valid: issues.filter(i => i.severity === 'error').length === 0,
    issues,
  };
}

function validateHIPAA(code: string, context: string): ValidationResult {
  const issues: Issue[] = [];

  // Check for audit logging
  if (context === 'api' && !code.includes('AuditEvent') && !code.includes('auditLog')) {
    issues.push({
      type: 'hipaa',
      severity: 'warning',
      rule: '164.312(b)',
      message: 'API endpoints should include audit logging',
    });
  }

  // Check for authentication
  if (context === 'api' && !code.includes('auth') && !code.includes('session')) {
    issues.push({
      type: 'hipaa',
      severity: 'error',
      rule: '164.312(d)',
      message: 'API endpoints must include authentication',
    });
  }

  // Check for encryption references
  if (code.includes('password') && !code.includes('hash') && !code.includes('bcrypt')) {
    issues.push({
      type: 'hipaa',
      severity: 'error',
      rule: '164.312(a)(2)(iv)',
      message: 'Passwords must be hashed, not stored in plain text',
    });
  }

  return {
    valid: issues.filter(i => i.severity === 'error').length === 0,
    issues,
  };
}

function validateClinicalLogic(code: string, component: string): ValidationResult {
  const issues: Issue[] = [];

  for (const [name, rule] of Object.entries(CLINICAL_RULES)) {
    const matches = code.match(rule.pattern);
    if (matches) {
      issues.push({
        type: 'clinical',
        severity: rule.severity as 'error' | 'warning',
        rule: name,
        message: rule.message,
        matches: matches.slice(0, 3),
      });
    }
  }

  // Component-specific checks
  if (component === 'pdc') {
    // PDC must use deterministic date math
    if (code.includes('Date.now()') && !code.includes('// test')) {
      issues.push({
        type: 'clinical',
        severity: 'warning',
        rule: 'pdcDateHandling',
        message: 'PDC calculation should use explicit dates, not Date.now()',
      });
    }

    // PDC must handle edge cases
    const requiredChecks = ['daysSupply', 'overlap', 'hospitalization'];
    for (const check of requiredChecks) {
      if (!code.toLowerCase().includes(check)) {
        issues.push({
          type: 'clinical',
          severity: 'warning',
          rule: 'pdcEdgeCases',
          message: `PDC calculation should handle ${check}`,
        });
      }
    }
  }

  if (component === 'ai') {
    // AI must have confidence scoring
    if (!code.includes('confidence')) {
      issues.push({
        type: 'clinical',
        severity: 'error',
        rule: 'aiConfidence',
        message: 'AI recommendations must include confidence scoring',
      });
    }

    // AI must have validation
    if (!code.includes('zod') && !code.includes('validate')) {
      issues.push({
        type: 'clinical',
        severity: 'error',
        rule: 'aiValidation',
        message: 'AI outputs must be validated with Zod schema',
      });
    }
  }

  return {
    valid: issues.filter(i => i.severity === 'error').length === 0,
    issues,
  };
}

function validateFHIRResource(resource: any): ValidationResult {
  const issues: Issue[] = [];

  // Check resourceType
  if (!resource.resourceType) {
    issues.push({
      type: 'fhir',
      severity: 'error',
      rule: 'resourceType',
      message: 'FHIR resource must have resourceType',
    });
    return { valid: false, issues };
  }

  // Resource-specific validation
  const requiredFields: Record<string, string[]> = {
    Patient: ['name'],
    MedicationRequest: ['status', 'intent', 'subject', 'medicationCodeableConcept'],
    MedicationDispense: ['status', 'subject', 'medicationCodeableConcept'],
    Task: ['status', 'intent'],
    Observation: ['status', 'code', 'subject'],
  };

  const required = requiredFields[resource.resourceType] || [];
  for (const field of required) {
    if (!resource[field]) {
      issues.push({
        type: 'fhir',
        severity: 'error',
        rule: 'requiredField',
        message: `${resource.resourceType} requires field: ${field}`,
      });
    }
  }

  // Check references are properly formatted
  const checkReference = (obj: any, path: string) => {
    if (obj && typeof obj === 'object') {
      if (obj.reference && typeof obj.reference === 'string') {
        if (!obj.reference.match(/^[A-Za-z]+\/[a-zA-Z0-9-]+$/)) {
          issues.push({
            type: 'fhir',
            severity: 'warning',
            rule: 'referenceFormat',
            message: `Invalid reference format at ${path}: ${obj.reference}`,
          });
        }
      }
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object') {
          checkReference(value, `${path}.${key}`);
        }
      }
    }
  };
  checkReference(resource, 'root');

  return {
    valid: issues.filter(i => i.severity === 'error').length === 0,
    issues,
  };
}

function checkTypeSafety(code: string): ValidationResult {
  const issues: Issue[] = [];

  // Check for 'any' usage
  const anyMatches = code.match(/:\s*any\b/g);
  if (anyMatches) {
    issues.push({
      type: 'typescript',
      severity: 'error',
      rule: 'noAny',
      message: `Found ${anyMatches.length} uses of 'any' type`,
    });
  }

  // Check for non-null assertions
  const nonNullMatches = code.match(/!\./g);
  if (nonNullMatches && nonNullMatches.length > 3) {
    issues.push({
      type: 'typescript',
      severity: 'warning',
      rule: 'nonNullAssertion',
      message: `Found ${nonNullMatches.length} non-null assertions - consider proper null checking`,
    });
  }

  // Check for type assertions
  const typeAssertions = code.match(/as\s+[A-Z][a-zA-Z]+/g);
  if (typeAssertions && typeAssertions.length > 5) {
    issues.push({
      type: 'typescript',
      severity: 'warning',
      rule: 'typeAssertion',
      message: `Found ${typeAssertions.length} type assertions - consider type guards instead`,
    });
  }

  return {
    valid: issues.filter(i => i.severity === 'error').length === 0,
    issues,
  };
}

function analyzeTestCoverage(code: string, tests: string): ValidationResult {
  const issues: Issue[] = [];

  // Extract function names from code
  const functionNames = code.match(/(?:function|const|let|var)\s+(\w+)\s*(?:=\s*(?:async\s*)?\(|<|\()/g) || [];
  const exportedFunctions = code.match(/export\s+(?:async\s+)?function\s+(\w+)/g) || [];

  // Extract test descriptions
  const testDescriptions = tests.match(/(?:test|it|describe)\s*\(\s*['"]([^'"]+)['"]/g) || [];

  // Check coverage
  const testedFunctions = new Set<string>();
  for (const testDesc of testDescriptions) {
    for (const funcMatch of [...functionNames, ...exportedFunctions]) {
      const funcName = funcMatch.match(/(\w+)\s*(?:=\s*(?:async\s*)?\(|<|\()/)?.[1];
      if (funcName && testDesc.toLowerCase().includes(funcName.toLowerCase())) {
        testedFunctions.add(funcName);
      }
    }
  }

  const allFunctions = [...functionNames, ...exportedFunctions]
    .map(f => f.match(/(\w+)\s*(?:=\s*(?:async\s*)?\(|<|\()/)?.[1])
    .filter(Boolean) as string[];

  const untestedFunctions = allFunctions.filter(f => !testedFunctions.has(f));

  if (untestedFunctions.length > 0) {
    issues.push({
      type: 'testing',
      severity: 'warning',
      rule: 'testCoverage',
      message: `Functions without apparent tests: ${untestedFunctions.join(', ')}`,
    });
  }

  // Check for edge case tests
  const edgeCaseKeywords = ['error', 'fail', 'invalid', 'empty', 'null', 'undefined', 'edge'];
  const hasEdgeCaseTests = edgeCaseKeywords.some(kw => tests.toLowerCase().includes(kw));
  if (!hasEdgeCaseTests) {
    issues.push({
      type: 'testing',
      severity: 'warning',
      rule: 'edgeCases',
      message: 'Tests should include edge cases (error, invalid, empty, null)',
    });
  }

  return {
    valid: issues.filter(i => i.severity === 'error').length === 0,
    issues,
  };
}

// Types
interface Issue {
  type: string;
  severity: 'error' | 'warning';
  rule: string;
  message: string;
  matches?: string[];
}

interface ValidationResult {
  valid: boolean;
  issues: Issue[];
}

// Create server
const server = new Server(
  {
    name: 'validation-agent-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: ValidationResult;

    switch (name) {
      case 'scan_security':
        result = scanSecurity((args as any).code);
        break;

      case 'check_phi_exposure':
        result = checkPHIExposure((args as any).code);
        break;

      case 'validate_hipaa_compliance':
        result = validateHIPAA((args as any).code, (args as any).context || 'general');
        break;

      case 'validate_clinical_logic':
        result = validateClinicalLogic((args as any).code, (args as any).component || 'general');
        break;

      case 'validate_fhir_resource':
        result = validateFHIRResource((args as any).resource);
        break;

      case 'check_type_safety':
        result = checkTypeSafety((args as any).code);
        break;

      case 'analyze_test_coverage':
        result = analyzeTestCoverage((args as any).code, (args as any).tests || '');
        break;

      case 'full_validation': {
        const code = (args as any).code;
        const filePath = (args as any).filePath || '';
        
        const results = {
          security: scanSecurity(code),
          phi: checkPHIExposure(code),
          hipaa: validateHIPAA(code, filePath.includes('api') ? 'api' : 'general'),
          clinical: validateClinicalLogic(
            code, 
            filePath.includes('pdc') ? 'pdc' : filePath.includes('ai') ? 'ai' : 'general'
          ),
          typescript: checkTypeSafety(code),
        };

        const allIssues = Object.values(results).flatMap(r => r.issues);
        result = {
          valid: allIssues.filter(i => i.severity === 'error').length === 0,
          issues: allIssues,
        };
        break;
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Validation error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Validation Agent MCP Server running');
}

main().catch(console.error);
```

### Step 3: Configure Claude Code

Add to your Claude Code MCP configuration:

```json
{
  "mcpServers": {
    "validation-agent": {
      "command": "node",
      "args": ["/path/to/ignite-health/mcp-servers/validation-agent/dist/index.js"]
    }
  }
}
```

## Usage

Claude Code will automatically use these validators when:
- Writing new code
- Reviewing changes
- Creating FHIR resources
- Implementing clinical logic

You can also explicitly ask:
- "Validate this code for security issues"
- "Check this for HIPAA compliance"
- "Validate this FHIR resource"
- "Run full validation on this file"
