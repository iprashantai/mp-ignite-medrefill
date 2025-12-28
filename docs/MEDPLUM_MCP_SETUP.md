# Medplum MCP Setup Guide

This guide explains how to configure Claude Code to interact with Medplum FHIR resources using the Model Context Protocol (MCP).

---

## What is MCP?

Model Context Protocol (MCP) allows Claude Code to directly interact with external services. With Medplum MCP, Claude can:

- Search FHIR resources (Patient, MedicationRequest, Task, etc.)
- Create and update resources
- Read patient data for context during development
- Validate FHIR operations before code generation

---

## Option A: Official Medplum MCP (Recommended)

The official Medplum MCP integration is built into Medplum's platform.

### Setup Steps

1. **Navigate to Organization Settings**
   - Go to your Medplum project: https://app.medplum.com
   - Settings → Organization Integrations

2. **Add MCP Integration**
   - Click "Add Integration"
   - Select "Model Context Protocol"
   - MCP URL: `https://api.medplum.com/mcp/stream`

3. **Configure Claude Code**

   Add to your Claude Code settings (`.claude/settings.json` or global config):

   ```json
   {
     "mcpServers": {
       "medplum": {
         "url": "https://api.medplum.com/mcp/stream",
         "headers": {
           "Authorization": "Bearer ${MEDPLUM_ACCESS_TOKEN}"
         }
       }
     }
   }
   ```

4. **Authentication**
   - OAuth 2.0 via Medplum
   - Token is automatically refreshed

### Available Tool: `fhir-request`

The official MCP provides a single powerful tool:

| Parameter | Type   | Description                              |
| --------- | ------ | ---------------------------------------- |
| `method`  | string | HTTP verb: GET, POST, PUT, PATCH, DELETE |
| `url`     | string | FHIR API path (e.g., `/fhir/R4/Patient`) |
| `body`    | object | JSON resource body (for POST/PUT/PATCH)  |

**Example Usage in Claude Code:**

```
Search for patients named "Smith":
→ fhir-request(method: "GET", url: "/fhir/R4/Patient?name=Smith")

Create a new Task:
→ fhir-request(method: "POST", url: "/fhir/R4/Task", body: {...})
```

---

## Option B: Community MCP Server (Development Only)

The community server provides 33 granular tools for specific FHIR operations.

**Repository**: [rkirkendall/medplum-mcp](https://github.com/rkirkendall/medplum-mcp)

### Setup Steps

1. **Install the Server**

   ```bash
   npm install -g medplum-mcp
   ```

2. **Configure Environment Variables**

   Create `.env.local` (DO NOT commit):

   ```env
   MEDPLUM_BASE_URL=https://api.medplum.com
   MEDPLUM_CLIENT_ID=your-client-id
   MEDPLUM_CLIENT_SECRET=your-client-secret
   ```

3. **Configure Claude Code**

   Add to `claude_code_config.json`:

   ```json
   {
     "mcpServers": {
       "medplum": {
         "command": "npx",
         "args": ["medplum-mcp"],
         "env": {
           "MEDPLUM_BASE_URL": "${MEDPLUM_BASE_URL}",
           "MEDPLUM_CLIENT_ID": "${MEDPLUM_CLIENT_ID}",
           "MEDPLUM_CLIENT_SECRET": "${MEDPLUM_CLIENT_SECRET}"
         }
       }
     }
   }
   ```

### Available Tools (33 Total)

| Category               | Tools                                                                        |
| ---------------------- | ---------------------------------------------------------------------------- |
| **Patient**            | `createPatient`, `searchPatient`, `getPatient`, `updatePatient`              |
| **MedicationRequest**  | `createMedicationRequest`, `searchMedicationRequest`, `getMedicationRequest` |
| **MedicationDispense** | `createMedicationDispense`, `searchMedicationDispense`                       |
| **Task**               | `createTask`, `searchTask`, `getTask`, `updateTask`                          |
| **Observation**        | `createObservation`, `searchObservation`, `getObservation`                   |
| **Condition**          | `createCondition`, `searchCondition`                                         |
| **AllergyIntolerance** | `createAllergyIntolerance`, `searchAllergyIntolerance`                       |
| **Practitioner**       | `createPractitioner`, `searchPractitioner`, `getPractitioner`                |
| **Organization**       | `createOrganization`, `searchOrganization`                                   |
| **Communication**      | `createCommunication`, `searchCommunication`                                 |

---

## Security Considerations

### CRITICAL: PHI Protection

1. **Development Only**: Use synthetic/test data, NEVER real PHI
2. **No Logging**: MCP responses may contain PHI - don't log them
3. **Token Security**: Never commit access tokens
4. **HIPAA**: Production use requires BAA with Medplum

### Recommended Practices

```typescript
// ✅ GOOD: Use patient IDs in prompts
'Look up the medications for patient ID abc-123';

// ❌ BAD: Never include PHI in prompts
'Look up medications for John Smith born 1955-03-15';
```

### Environment Separation

| Environment | MCP Server              | Data                       |
| ----------- | ----------------------- | -------------------------- |
| Development | Community MCP           | Synthea synthetic data     |
| Staging     | Official MCP            | De-identified test data    |
| Production  | Official MCP (with BAA) | Real PHI (authorized only) |

---

## Troubleshooting

### Connection Issues

```bash
# Test Medplum connection
curl -H "Authorization: Bearer $MEDPLUM_ACCESS_TOKEN" \
  https://api.medplum.com/fhir/R4/Patient?_count=1
```

### Token Refresh

If using client credentials:

```bash
# Get new access token
curl -X POST https://api.medplum.com/oauth2/token \
  -d "grant_type=client_credentials" \
  -d "client_id=$MEDPLUM_CLIENT_ID" \
  -d "client_secret=$MEDPLUM_CLIENT_SECRET"
```

### MCP Not Responding

1. Check Claude Code logs for MCP errors
2. Verify environment variables are set
3. Ensure Medplum project has MCP integration enabled

---

## Alternative FHIR MCP Servers

For specialized use cases:

| Server                 | Use Case            | Repository                                                            |
| ---------------------- | ------------------- | --------------------------------------------------------------------- |
| **Flexpa MCP-FHIR**    | Generic FHIR server | [flexpa/mcp-fhir](https://github.com/flexpa/mcp-fhir)                 |
| **AWS HealthLake MCP** | AWS HealthLake      | [awslabs/mcp](https://awslabs.github.io/mcp/)                         |
| **AgentCare MCP**      | Epic/Cerner EMR     | [Kartha-AI/agentcare-mcp](https://github.com/Kartha-AI/agentcare-mcp) |
| **WSO2 FHIR MCP**      | Enterprise FHIR     | [wso2/fhir-mcp-server](https://github.com/wso2/fhir-mcp-server)       |

---

## References

- [Medplum MCP Documentation](https://www.medplum.com/docs/ai/mcp)
- [MCP Specification](https://modelcontextprotocol.io/)
- [Medplum SDK Docs](https://docs.medplum.com/sdk)
- [FHIR R4 Specification](https://hl7.org/fhir/R4)
