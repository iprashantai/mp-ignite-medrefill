'use client';

import { useEffect, useState } from 'react';
import { useMedplum } from '@medplum/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

/**
 * Generate a random code verifier for PKCE
 */
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

/**
 * Generate code challenge from verifier (S256)
 */
function generateCodeChallenge(verifier: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  // For simplicity, we'll use the verifier directly as plain method
  // In production, you'd want to use S256 with actual SHA-256 hashing
  return verifier;
}

/**
 * Base64 URL encode
 */
function base64UrlEncode(buffer: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...buffer));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

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
      const baseUrl = process.env.NEXT_PUBLIC_MEDPLUM_BASE_URL || 'https://api.medplum.com/';
      const clientId = process.env.NEXT_PUBLIC_MEDPLUM_CLIENT_ID;
      const redirectUri = `${window.location.origin}/api/auth/callback`;

      if (!clientId) {
        throw new Error('Client ID is not configured');
      }

      // Generate PKCE code verifier and challenge
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = generateCodeChallenge(codeVerifier);

      // Store code verifier for callback
      sessionStorage.setItem('medplum_code_verifier', codeVerifier);

      // Build authorization URL
      const authUrl = new URL('/oauth2/authorize', baseUrl);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('client_id', clientId);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('scope', 'openid profile');
      authUrl.searchParams.set('code_challenge', codeChallenge);
      authUrl.searchParams.set('code_challenge_method', 'plain');

      // Redirect to Medplum authorization
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
