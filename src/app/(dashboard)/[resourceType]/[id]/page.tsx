'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMedplum, ResourceTable } from '@medplum/react';
import type { Resource, ResourceType } from '@medplum/fhirtypes';
import {
  Alert,
  Text,
  Code,
  Stack,
  Loader,
  Center,
  Tabs,
  Paper,
  Group,
  Button,
  Title,
  CopyButton,
  ActionIcon,
  Tooltip
} from '@mantine/core';
import { IconArrowLeft, IconExternalLink, IconAlertCircle, IconCopy, IconCheck } from '@tabler/icons-react';

export default function ResourceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const medplum = useMedplum();

  const resourceType = params.resourceType as ResourceType;
  const resourceId = params.id as string;

  const [resource, setResource] = useState<Resource | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchResource() {
      try {
        setLoading(true);
        setError(null);
        const result = await medplum.readResource(resourceType, resourceId);
        setResource(result);
      } catch (err) {
        console.error('Error fetching resource:', err);
        setError(err instanceof Error ? err.message : 'Failed to load resource');
      } finally {
        setLoading(false);
      }
    }

    if (resourceType && resourceId) {
      fetchResource();
    }
  }, [medplum, resourceType, resourceId]);

  if (loading) {
    return (
      <Center h={400}>
        <Stack align="center" gap="md">
          <Loader size="lg" />
          <Text c="dimmed">Loading {resourceType}...</Text>
        </Stack>
      </Center>
    );
  }

  if (error) {
    return (
      <Stack gap="md">
        <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={() => router.back()}>
          Go Back
        </Button>
        <Alert color="red" icon={<IconAlertCircle size={16} />} title="Error loading resource">
          {error}
        </Alert>
      </Stack>
    );
  }

  if (!resource) {
    return (
      <Stack gap="md">
        <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={() => router.back()}>
          Go Back
        </Button>
        <Alert color="yellow" icon={<IconAlertCircle size={16} />}>
          Resource not found
        </Alert>
      </Stack>
    );
  }

  return (
    <Stack gap="lg">
      {/* Header */}
      <Group justify="space-between">
        <Group>
          <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={() => router.back()}>
            Back
          </Button>
          <div>
            <Title order={3}>{resourceType}/{resourceId.slice(0, 8)}...</Title>
            <Text size="sm" c="dimmed">FHIR Resource Detail View</Text>
          </div>
        </Group>
        <Button
          component="a"
          href={`https://hl7.org/fhir/R4/${resourceType.toLowerCase()}.html`}
          target="_blank"
          variant="subtle"
          rightSection={<IconExternalLink size={14} />}
        >
          View Spec
        </Button>
      </Group>

      {/* Content Tabs */}
      <Tabs defaultValue="structured">
        <Tabs.List>
          <Tabs.Tab value="structured">Structured View</Tabs.Tab>
          <Tabs.Tab value="json">Raw JSON</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="structured" pt="md">
          <Paper p="md" withBorder>
            <Stack gap="md">
              <div>
                <Title order={5}>Resource Details</Title>
                <Text size="sm" c="dimmed">Medplum ResourceTable component</Text>
              </div>
              {/* Medplum's Native ResourceTable */}
              <ResourceTable value={resource} />
            </Stack>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="json" pt="md">
          <Paper p="md" withBorder>
            <Stack gap="md">
              <Group justify="space-between">
                <div>
                  <Title order={5}>Raw FHIR JSON</Title>
                  <Text size="sm" c="dimmed">Complete resource representation</Text>
                </div>
                <CopyButton value={JSON.stringify(resource, null, 2)}>
                  {({ copied, copy }) => (
                    <Tooltip label={copied ? 'Copied' : 'Copy'}>
                      <ActionIcon color={copied ? 'teal' : 'gray'} variant="subtle" onClick={copy}>
                        {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                      </ActionIcon>
                    </Tooltip>
                  )}
                </CopyButton>
              </Group>
              <Code block style={{ maxHeight: '600px', overflow: 'auto' }}>
                {JSON.stringify(resource, null, 2)}
              </Code>
            </Stack>
          </Paper>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
