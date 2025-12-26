'use client';

import { useEffect, useState, Suspense } from 'react';
import { useMedplum } from '@medplum/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

function CallbackContent() {
  const medplum = useMedplum();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');

        if (!code) {
          const errorParam = searchParams.get('error');
          const errorDescription = searchParams.get('error_description');
          throw new Error(errorDescription || errorParam || 'No authorization code received');
        }

        // Get the stored code verifier
        const codeVerifier = sessionStorage.getItem('medplum_code_verifier');
        if (!codeVerifier) {
          throw new Error('Code verifier not found. Please try logging in again.');
        }

        const baseUrl = process.env.NEXT_PUBLIC_MEDPLUM_BASE_URL || 'https://api.medplum.com/';
        const clientId = process.env.NEXT_PUBLIC_MEDPLUM_CLIENT_ID;
        const redirectUri = `${window.location.origin}/api/auth/callback`;

        // Exchange code for tokens
        const tokenResponse = await fetch(`${baseUrl}oauth2/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
            client_id: clientId || '',
            code_verifier: codeVerifier,
          }),
        });

        if (!tokenResponse.ok) {
          const errorData = await tokenResponse.json().catch(() => ({}));
          throw new Error(errorData.error_description || errorData.error || 'Token exchange failed');
        }

        const tokens = await tokenResponse.json();

        // Set the access token on the Medplum client
        medplum.setAccessToken(tokens.access_token);

        // Clean up
        sessionStorage.removeItem('medplum_code_verifier');

        // Redirect to dashboard on success
        router.push('/');
      } catch (err) {
        console.error('Callback error:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
      }
    };

    handleCallback();
  }, [medplum, router, searchParams]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-destructive">Authentication Failed</CardTitle>
            <CardDescription>Unable to complete sign in</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <a
              href="/login"
              className="block text-center text-sm text-primary hover:underline"
            >
              Return to login
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Signing you in...</CardTitle>
          <CardDescription>Please wait while we complete authentication</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}
