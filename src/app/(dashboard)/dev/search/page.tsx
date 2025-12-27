'use client';

import { useState } from 'react';
import { useMedplum, SearchControl } from '@medplum/react';
import type { ResourceType, Resource } from '@medplum/fhirtypes';
import type { SearchRequest } from '@medplum/core';
import { Alert, Text, Code, Stack, Paper, Title, Select, Anchor } from '@mantine/core';
import { IconInfoCircle, IconExternalLink } from '@tabler/icons-react';

// Common resource types
const RESOURCE_TYPES: { value: ResourceType; label: string }[] = [
  { value: 'Patient', label: 'Patient' },
  { value: 'Practitioner', label: 'Practitioner' },
  { value: 'MedicationRequest', label: 'MedicationRequest' },
  { value: 'MedicationDispense', label: 'MedicationDispense' },
  { value: 'Task', label: 'Task' },
  { value: 'Observation', label: 'Observation' },
  { value: 'Condition', label: 'Condition' },
  { value: 'AllergyIntolerance', label: 'AllergyIntolerance' },
  { value: 'Encounter', label: 'Encounter' },
  { value: 'Organization', label: 'Organization' },
  { value: 'Coverage', label: 'Coverage' },
  { value: 'Flag', label: 'Flag' },
];

export default function SearchPlaygroundPage() {
  const medplum = useMedplum();
  const [resourceType, setResourceType] = useState<ResourceType>('Patient');
  const [search, setSearch] = useState<SearchRequest>({ resourceType: 'Patient', count: 10 });
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);

  // Build current search URL for display
  const searchUrl = medplum
    .fhirSearchUrl(search.resourceType, {
      ...Object.fromEntries(search.filters?.map((f) => [f.code, f.value]) || []),
      _count: String(search.count || 20),
      _sort:
        search.sortRules?.map((s) => (s.descending ? '-' : '') + s.code).join(',') || undefined,
    })
    .toString();

  return (
    <Stack gap="lg">
      {/* Header */}
      <div>
        <Title order={2}>Search Playground</Title>
        <Text c="dimmed">
          Learn FHIR search using Medplum&apos;s native SearchControl component
        </Text>
      </div>

      {/* Info Alert */}
      <Alert color="blue" variant="light" icon={<IconInfoCircle size={16} />}>
        <Text size="sm">
          <strong>Interactive Learning:</strong> Use the filters below to build FHIR queries. The
          SearchControl component handles all the complexity - filtering, sorting, pagination. Watch
          the generated URL to understand FHIR search syntax.
        </Text>
      </Alert>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px' }}>
        {/* Main Search Area */}
        <Stack gap="lg">
          {/* Resource Type Selector */}
          <Paper p="md" withBorder>
            <Stack gap="sm">
              <Title order={5}>Resource Type</Title>
              <Select
                data={RESOURCE_TYPES}
                value={resourceType}
                onChange={(value) => {
                  if (value) {
                    const newType = value as ResourceType;
                    setResourceType(newType);
                    setSearch({ resourceType: newType, count: 10 });
                    setSelectedResource(null);
                  }
                }}
                style={{ maxWidth: '300px' }}
              />
            </Stack>
          </Paper>

          {/* Generated URL Display */}
          <Paper p="md" withBorder>
            <Stack gap="sm">
              <div>
                <Title order={5}>Generated API URL</Title>
                <Text size="sm" c="dimmed">
                  This is the REST API call being made to Medplum
                </Text>
              </div>
              <Code block style={{ fontSize: '12px', wordBreak: 'break-all' }}>
                GET {searchUrl}
              </Code>
            </Stack>
          </Paper>

          {/* Medplum SearchControl */}
          <Paper p="md" withBorder>
            <Stack gap="md">
              <div>
                <Title order={5}>Search Results</Title>
                <Text size="sm" c="dimmed">
                  Use the toolbar to add filters, change columns, and sort results
                </Text>
              </div>
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

          {/* Selected Resource JSON */}
          {selectedResource && (
            <Paper p="md" withBorder>
              <Stack gap="sm">
                <div>
                  <Title order={5}>Selected Resource</Title>
                  <Text size="sm" c="dimmed">
                    {selectedResource.resourceType}/{selectedResource.id}
                  </Text>
                </div>
                <Code block style={{ maxHeight: '400px', overflow: 'auto' }}>
                  {JSON.stringify(selectedResource, null, 2)}
                </Code>
              </Stack>
            </Paper>
          )}
        </Stack>

        {/* Help Panel */}
        <Stack gap="lg">
          <Paper p="md" withBorder>
            <Stack gap="sm">
              <Title order={5}>Search Tips</Title>
              <Paper p="sm" withBorder bg="gray.0">
                <Text size="sm" fw={600}>
                  Add Filters
                </Text>
                <Text size="xs" c="dimmed">
                  Click the filter icon in the toolbar to add search conditions
                </Text>
              </Paper>
              <Paper p="sm" withBorder bg="gray.0">
                <Text size="sm" fw={600}>
                  Sort Results
                </Text>
                <Text size="xs" c="dimmed">
                  Click column headers to sort. Click again to reverse.
                </Text>
              </Paper>
              <Paper p="sm" withBorder bg="gray.0">
                <Text size="sm" fw={600}>
                  Change Columns
                </Text>
                <Text size="xs" c="dimmed">
                  Click the columns icon to show/hide fields
                </Text>
              </Paper>
              <Paper p="sm" withBorder bg="gray.0">
                <Text size="sm" fw={600}>
                  Pagination
                </Text>
                <Text size="xs" c="dimmed">
                  Use the arrows at the bottom to navigate pages
                </Text>
              </Paper>
            </Stack>
          </Paper>

          <Paper p="md" withBorder>
            <Stack gap="sm">
              <Title order={5}>Common Modifiers</Title>
              <Paper p="sm" withBorder bg="gray.0">
                <Code>:contains</Code>
                <Text size="xs" c="dimmed">
                  Partial text match
                </Text>
              </Paper>
              <Paper p="sm" withBorder bg="gray.0">
                <Code>:exact</Code>
                <Text size="xs" c="dimmed">
                  Exact text match
                </Text>
              </Paper>
              <Paper p="sm" withBorder bg="gray.0">
                <Code>ge, le, gt, lt</Code>
                <Text size="xs" c="dimmed">
                  Date/number comparisons
                </Text>
              </Paper>
              <Paper p="sm" withBorder bg="gray.0">
                <Code>:missing=true</Code>
                <Text size="xs" c="dimmed">
                  Field is not set
                </Text>
              </Paper>
            </Stack>
          </Paper>

          <Paper p="md" withBorder>
            <Stack gap="xs">
              <Title order={5}>Resources</Title>
              <Anchor href="https://hl7.org/fhir/R4/search.html" target="_blank" size="sm">
                <IconExternalLink size={14} style={{ marginRight: 4 }} />
                FHIR Search Spec
              </Anchor>
              <Anchor href="https://docs.medplum.com/docs/search" target="_blank" size="sm">
                <IconExternalLink size={14} style={{ marginRight: 4 }} />
                Medplum Search Guide
              </Anchor>
              <Anchor
                href={`https://hl7.org/fhir/R4/${resourceType.toLowerCase()}.html#search`}
                target="_blank"
                size="sm"
              >
                <IconExternalLink size={14} style={{ marginRight: 4 }} />
                {resourceType} Search Params
              </Anchor>
            </Stack>
          </Paper>
        </Stack>
      </div>
    </Stack>
  );
}
