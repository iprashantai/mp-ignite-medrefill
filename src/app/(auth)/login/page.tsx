'use client';

import { useEffect, useState } from 'react';
import { SignInForm, useMedplum, useMedplumProfile } from '@medplum/react';
import { useRouter } from 'next/navigation';
import { Container, Paper, Title, Text, Center, Stack, Button, Divider } from '@mantine/core';

export default function LoginPage() {
  const medplum = useMedplum();
  const profile = useMedplumProfile();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (profile) {
      router.push('/');
    }
  }, [profile, router]);

  const handleSuccess = () => {
    router.push('/');
  };

  // Redirect to Medplum's OAuth login page (supports Google, email, etc.)
  const handleMedplumLogin = async () => {
    setIsRedirecting(true);
    try {
      const clientId = process.env.NEXT_PUBLIC_MEDPLUM_CLIENT_ID;
      const baseUrl = process.env.NEXT_PUBLIC_MEDPLUM_BASE_URL || 'https://api.medplum.com/';
      const redirectUri = `${window.location.origin}/api/auth/callback`;

      // Start PKCE flow
      const pkce = await medplum.startPkce();

      // Build OAuth URL
      const authUrl = new URL('oauth2/authorize', baseUrl);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('client_id', clientId || '');
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('scope', 'openid profile');
      authUrl.searchParams.set('code_challenge', pkce.codeChallenge);
      authUrl.searchParams.set('code_challenge_method', pkce.codeChallengeMethod);

      window.location.href = authUrl.toString();
    } catch (err) {
      console.error('Login error:', err);
      setIsRedirecting(false);
    }
  };

  return (
    <Center mih="100vh" bg="gray.0">
      <Container size="xs" w="100%">
        <Paper shadow="md" p="xl" radius="md" withBorder>
          <Stack gap="lg">
            <div style={{ textAlign: 'center' }}>
              <Title order={2} mb="xs">Ignite Health</Title>
              <Text size="sm" c="dimmed">
                Medication Adherence Management Platform
              </Text>
            </div>

            {/* Primary: Sign in with Medplum (supports Google) */}
            <Button
              size="lg"
              fullWidth
              onClick={handleMedplumLogin}
              loading={isRedirecting}
            >
              Sign in with Medplum
            </Button>

            <Text size="xs" c="dimmed" ta="center">
              Use your Medplum account (Google, email, or SSO)
            </Text>

            <Divider label="Or sign in with email" labelPosition="center" />

            {/* Alternative: Direct email/password */}
            <SignInForm
              onSuccess={handleSuccess}
              projectId={process.env.NEXT_PUBLIC_MEDPLUM_PROJECT_ID}
              disableGoogleAuth={true}
            />
          </Stack>
        </Paper>
      </Container>
    </Center>
  );
}
