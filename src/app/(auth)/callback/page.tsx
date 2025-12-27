'use client';

import { Suspense, useEffect, useState } from 'react';
import { useMedplum } from '@medplum/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Center, Paper, Title, Text, Loader, Alert, Anchor, Stack } from '@mantine/core';

/**
 * OAuth Callback Content
 * Handles the authorization code exchange with Medplum
 */
function CallbackContent() {
  const medplum = useMedplum();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (errorParam) {
      setError(errorDescription || errorParam);
      return;
    }

    if (!code) {
      setError('No authorization code received');
      return;
    }

    // Exchange code for tokens using Medplum's built-in handling
    const handleCallback = async () => {
      try {
        // processCode handles PKCE validation and token exchange
        await medplum.processCode(code);
        router.push('/');
      } catch (err) {
        console.error('Authentication failed:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed. Please try again.');
      }
    };

    handleCallback();
  }, [medplum, router, searchParams]);

  if (error) {
    return (
      <Center mih="100vh" bg="gray.0">
        <Paper shadow="md" p="xl" radius="md" withBorder maw={400} w="100%">
          <Stack gap="md">
            <Title order={3} c="red">Authentication Error</Title>
            <Alert color="red" variant="light">
              {error}
            </Alert>
            <Anchor href="/login" ta="center">
              Return to login
            </Anchor>
          </Stack>
        </Paper>
      </Center>
    );
  }

  return (
    <Center mih="100vh" bg="gray.0">
      <Paper shadow="md" p="xl" radius="md" withBorder maw={400} w="100%">
        <Stack align="center" gap="md">
          <Loader size="lg" />
          <Title order={4}>Signing you in...</Title>
          <Text size="sm" c="dimmed">Please wait while we complete authentication</Text>
        </Stack>
      </Paper>
    </Center>
  );
}

/**
 * OAuth Callback Page
 * Wrapped in Suspense for useSearchParams (Next.js requirement)
 */
export default function CallbackPage() {
  return (
    <Suspense
      fallback={
        <Center mih="100vh" bg="gray.0">
          <Paper shadow="md" p="xl" radius="md" withBorder maw={400} w="100%">
            <Stack align="center" gap="md">
              <Loader size="lg" />
              <Title order={4}>Loading...</Title>
            </Stack>
          </Paper>
        </Center>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
