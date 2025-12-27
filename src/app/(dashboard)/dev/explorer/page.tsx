'use client';

import { useState } from 'react';
import { useMedplum, SearchControl, ResourceTable } from '@medplum/react';
import type { ResourceType, Resource } from '@medplum/fhirtypes';
import type { SearchRequest } from '@medplum/core';
import {
  Alert,
  Text,
  Code,
  Stack,
  Group,
  Paper,
  Title,
  Tabs,
  Badge,
  Table,
  Anchor
} from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';

// Common FHIR resource types used in healthcare applications
const RESOURCE_TYPES: { value: ResourceType; label: string; description: string }[] = [
  { value: 'Patient', label: 'Patient', description: 'Demographics and administrative information about a patient' },
  { value: 'Practitioner', label: 'Practitioner', description: 'Healthcare providers and clinical staff' },
  { value: 'MedicationRequest', label: 'MedicationRequest', description: 'Prescription orders for medications' },
  { value: 'MedicationDispense', label: 'MedicationDispense', description: 'Pharmacy dispense records (used for PDC)' },
  { value: 'Task', label: 'Task', description: 'Workflow tasks like refill reviews' },
  { value: 'Observation', label: 'Observation', description: 'Clinical observations, lab results, PDC scores' },
  { value: 'Condition', label: 'Condition', description: 'Diagnoses and health conditions' },
  { value: 'AllergyIntolerance', label: 'AllergyIntolerance', description: 'Patient allergies and intolerances' },
  { value: 'Encounter', label: 'Encounter', description: 'Patient visits and interactions' },
  { value: 'Organization', label: 'Organization', description: 'Healthcare organizations, pharmacies' },
  { value: 'Coverage', label: 'Coverage', description: 'Insurance coverage information' },
  { value: 'Flag', label: 'Flag', description: 'Alerts and warnings for patients' },
];

export default function FhirExplorerPage() {
  const medplum = useMedplum();
  const [selectedType, setSelectedType] = useState<ResourceType>('Patient');
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [search, setSearch] = useState<SearchRequest>({
    resourceType: 'Patient',
    fields: ['id', 'name', '_lastUpdated'],
    count: 10, // Limit initial fetch for faster load
  });

  const selectedTypeInfo = RESOURCE_TYPES.find(t => t.value === selectedType);

  const handleTypeChange = (type: ResourceType) => {
    setSelectedType(type);
    setSelectedResource(null);
    setSearch({
      resourceType: type,
      fields: getFieldsForType(type),
      count: 10, // Limit fetch for faster load
    });
  };

  return (
    <Stack gap="lg">
      {/* Header */}
      <div>
        <Title order={2}>FHIR Explorer</Title>
        <Text c="dimmed">Browse and understand FHIR resources using Medplum's native SearchControl</Text>
      </div>

      {/* Info Alert */}
      <Alert color="blue" variant="light" icon={<IconInfoCircle size={16} />}>
        <Text size="sm">
          <strong>For Developers:</strong> This page uses Medplum's native <Code>SearchControl</Code> component
          which handles searching, filtering, sorting, and pagination automatically.
        </Text>
      </Alert>

      {/* Resource Type Selector */}
      <Paper p="md" withBorder>
        <Stack gap="md">
          <div>
            <Title order={4}>Select Resource Type</Title>
            <Text size="sm" c="dimmed">Choose a FHIR resource type to explore its data</Text>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
            {RESOURCE_TYPES.map((type) => (
              <Paper
                key={type.value}
                p="sm"
                withBorder
                style={{
                  cursor: 'pointer',
                  borderColor: selectedType === type.value ? 'var(--mantine-color-blue-6)' : undefined,
                  backgroundColor: selectedType === type.value ? 'var(--mantine-color-blue-0)' : undefined,
                }}
                onClick={() => handleTypeChange(type.value)}
              >
                <Group justify="space-between" mb={4}>
                  <Text fw={600} size="sm">{type.label}</Text>
                  {selectedType === type.value && (
                    <Badge size="xs" color="blue">Selected</Badge>
                  )}
                </Group>
                <Text size="xs" c="dimmed" lineClamp={2}>{type.description}</Text>
              </Paper>
            ))}
          </div>
        </Stack>
      </Paper>

      {/* Tabs */}
      <Tabs defaultValue="search">
        <Tabs.List>
          <Tabs.Tab value="search">Search & Browse</Tabs.Tab>
          <Tabs.Tab value="detail">Resource Detail</Tabs.Tab>
          <Tabs.Tab value="schema">Schema Info</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="search" pt="md">
          <Paper p="md" withBorder>
            <Stack gap="md">
              <Group justify="space-between">
                <div>
                  <Title order={4}>{selectedType} Resources</Title>
                  <Text size="sm" c="dimmed">Using Medplum's native SearchControl with built-in filtering and pagination</Text>
                </div>
                {selectedTypeInfo && (
                  <Badge variant="light">{selectedTypeInfo.description}</Badge>
                )}
              </Group>
              <SearchControl
                search={search}
                onChange={(e) => setSearch(e.definition)}
                onClick={(e) => setSelectedResource(e.resource)}
                checkboxesEnabled={false}
                hideFilters={false}
                hideToolbar={false}
              />
            </Stack>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="detail" pt="md">
          <Paper p="md" withBorder>
            <Stack gap="md">
              <div>
                <Title order={4}>Resource Detail</Title>
                <Text size="sm" c="dimmed">
                  {selectedResource
                    ? `Viewing ${selectedResource.resourceType}/${selectedResource.id}`
                    : 'Click a resource in the Search tab to view details'}
                </Text>
              </div>
              {selectedResource ? (
                <Stack gap="md">
                  <ResourceTable value={selectedResource} />
                  <div>
                    <Text size="sm" fw={600} mb="xs">Raw JSON</Text>
                    <Code block style={{ maxHeight: '400px', overflow: 'auto' }}>
                      {JSON.stringify(selectedResource, null, 2)}
                    </Code>
                  </div>
                </Stack>
              ) : (
                <Text c="dimmed" ta="center" py="xl">
                  Select a resource from the Search tab to view its details
                </Text>
              )}
            </Stack>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="schema" pt="md">
          <Paper p="md" withBorder>
            <Stack gap="md">
              <div>
                <Title order={4}>{selectedType} Schema</Title>
                <Text size="sm" c="dimmed">Key fields and their meanings for this resource type</Text>
              </div>
              <SchemaInfo resourceType={selectedType} />
            </Stack>
          </Paper>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}

function getFieldsForType(resourceType: ResourceType): string[] {
  const fieldMap: Record<string, string[]> = {
    Patient: ['id', 'name', 'birthDate', 'gender', '_lastUpdated'],
    Practitioner: ['id', 'name', 'qualification', '_lastUpdated'],
    MedicationRequest: ['id', 'status', 'medication[x]', 'subject', 'authoredOn'],
    MedicationDispense: ['id', 'status', 'medication[x]', 'subject', 'whenHandedOver'],
    Task: ['id', 'status', 'priority', 'code', 'for', 'authoredOn'],
    Observation: ['id', 'status', 'code', 'subject', 'effectiveDateTime'],
    Condition: ['id', 'clinicalStatus', 'code', 'subject', 'onsetDateTime'],
    AllergyIntolerance: ['id', 'clinicalStatus', 'code', 'patient', 'recordedDate'],
    Encounter: ['id', 'status', 'class', 'subject', 'period'],
    Organization: ['id', 'name', 'type', 'active'],
    Coverage: ['id', 'status', 'beneficiary', 'payor'],
    Flag: ['id', 'status', 'code', 'subject'],
  };
  return fieldMap[resourceType] || ['id', '_lastUpdated'];
}

function SchemaInfo({ resourceType }: { resourceType: ResourceType }) {
  const schemas: Record<string, { field: string; type: string; description: string }[]> = {
    Patient: [
      { field: 'id', type: 'string', description: 'Unique identifier for this patient' },
      { field: 'name', type: 'HumanName[]', description: 'Names associated with the patient' },
      { field: 'birthDate', type: 'date', description: 'Date of birth' },
      { field: 'gender', type: 'code', description: 'male | female | other | unknown' },
      { field: 'identifier', type: 'Identifier[]', description: 'MRN, SSN, etc.' },
      { field: 'address', type: 'Address[]', description: 'Addresses for the patient' },
      { field: 'telecom', type: 'ContactPoint[]', description: 'Phone, email, etc.' },
      { field: 'active', type: 'boolean', description: 'Whether record is active' },
    ],
    MedicationRequest: [
      { field: 'id', type: 'string', description: 'Unique prescription identifier' },
      { field: 'status', type: 'code', description: 'active | completed | cancelled | etc.' },
      { field: 'intent', type: 'code', description: 'proposal | order | plan' },
      { field: 'medicationCodeableConcept', type: 'CodeableConcept', description: 'Medication being requested (RxNorm)' },
      { field: 'subject', type: 'Reference<Patient>', description: 'Patient this is for' },
      { field: 'authoredOn', type: 'dateTime', description: 'When request was initially authored' },
      { field: 'requester', type: 'Reference<Practitioner>', description: 'Prescriber' },
      { field: 'dosageInstruction', type: 'Dosage[]', description: 'How medication should be taken' },
      { field: 'dispenseRequest', type: 'object', description: 'Quantity, refills, days supply' },
    ],
    MedicationDispense: [
      { field: 'id', type: 'string', description: 'Unique dispense identifier' },
      { field: 'status', type: 'code', description: 'completed | in-progress | etc.' },
      { field: 'medicationCodeableConcept', type: 'CodeableConcept', description: 'Medication dispensed' },
      { field: 'subject', type: 'Reference<Patient>', description: 'Patient receiving medication' },
      { field: 'quantity', type: 'Quantity', description: 'Amount dispensed' },
      { field: 'daysSupply', type: 'Quantity', description: 'Days supply (critical for PDC)' },
      { field: 'whenHandedOver', type: 'dateTime', description: 'When given to patient (PDC date)' },
      { field: 'authorizingPrescription', type: 'Reference<MedicationRequest>', description: 'Original prescription' },
    ],
    Task: [
      { field: 'id', type: 'string', description: 'Unique task identifier' },
      { field: 'status', type: 'code', description: 'requested | in-progress | completed | etc.' },
      { field: 'priority', type: 'code', description: 'routine | urgent | stat' },
      { field: 'code', type: 'CodeableConcept', description: 'Task type (e.g., refill-review)' },
      { field: 'for', type: 'Reference<Patient>', description: 'Patient this task is about' },
      { field: 'owner', type: 'Reference<Practitioner>', description: 'Assigned staff member' },
      { field: 'authoredOn', type: 'dateTime', description: 'When task was created' },
      { field: 'input', type: 'object[]', description: 'Input data for the task' },
      { field: 'output', type: 'object[]', description: 'Output/results from task' },
    ],
    Observation: [
      { field: 'id', type: 'string', description: 'Unique observation identifier' },
      { field: 'status', type: 'code', description: 'final | preliminary | amended' },
      { field: 'code', type: 'CodeableConcept', description: 'What was observed (LOINC)' },
      { field: 'subject', type: 'Reference<Patient>', description: 'Patient observed' },
      { field: 'valueQuantity', type: 'Quantity', description: 'Numeric result (e.g., PDC 0.85)' },
      { field: 'effectiveDateTime', type: 'dateTime', description: 'When observation was made' },
      { field: 'interpretation', type: 'CodeableConcept[]', description: 'High, Low, Normal, etc.' },
    ],
  };

  const fields = schemas[resourceType] || [
    { field: 'id', type: 'string', description: 'Unique resource identifier' },
    { field: 'meta', type: 'Meta', description: 'Metadata about the resource' },
    { field: '...', type: 'varies', description: 'See FHIR R4 specification for full schema' },
  ];

  return (
    <Stack gap="md">
      <Alert color="blue" variant="light">
        <Text size="sm">
          For complete schema, see:{' '}
          <Anchor
            href={`https://hl7.org/fhir/R4/${resourceType.toLowerCase()}.html`}
            target="_blank"
          >
            FHIR R4 {resourceType} Specification
          </Anchor>
        </Text>
      </Alert>

      <Table striped highlightOnHover withTableBorder withColumnBorders>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Field</Table.Th>
            <Table.Th>Type</Table.Th>
            <Table.Th>Description</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {fields.map((field) => (
            <Table.Tr key={field.field}>
              <Table.Td><Code>{field.field}</Code></Table.Td>
              <Table.Td><Text size="sm" c="dimmed">{field.type}</Text></Table.Td>
              <Table.Td><Text size="sm">{field.description}</Text></Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Stack>
  );
}
