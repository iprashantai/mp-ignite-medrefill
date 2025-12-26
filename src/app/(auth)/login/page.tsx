'use client';

import { useEffect, useState } from 'react';
import { useMedplum } from '@medplum/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function LoginPage() {
  const medplum = useMedplum();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if already logged in
  useEffect(() => {
    if (medplum.getActiveLogin()) {
      router.push('/');
    }
  }, [medplum, router]);

  const handleLogin = () => {
    setIsLoading(true);
    setError(null);

    try {
      const clientId = process.env.NEXT_PUBLIC_MEDPLUM_CLIENT_ID;
      const redirectUri = `${window.location.origin}/api/auth/callback`;
      const baseUrl = process.env.NEXT_PUBLIC_MEDPLUM_BASE_URL || 'https://api.medplum.com/';

      if (!clientId) {
        throw new Error('Client ID is not configured');
      }

      // Build OAuth authorization URL manually
      const authUrl = new URL('oauth2/authorize', baseUrl);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('client_id', clientId);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('scope', 'openid profile');
      authUrl.searchParams.set('state', crypto.randomUUID());

      // Store state for CSRF protection
      sessionStorage.setItem('oauth_state', authUrl.searchParams.get('state') || '');

      // Redirect to Medplum authorization page
      window.location.href = authUrl.toString();
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'Failed to start login');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Ignite Health</CardTitle>
          <CardDescription>
            Medication Adherence Management Platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? 'Redirecting...' : 'Sign in with Medplum'}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Secure authentication via Medplum FHIR Platform
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
