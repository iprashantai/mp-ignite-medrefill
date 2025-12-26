import { MedplumClient } from '@medplum/core';

/**
 * Medplum client singleton for FHIR operations.
 * Uses environment variables for configuration.
 */

let medplumClient: MedplumClient | null = null;

/**
 * Get or create the Medplum client singleton.
 * This ensures we only have one client instance throughout the app.
 */
export function getMedplumClient(): MedplumClient {
  if (!medplumClient) {
    const baseUrl = process.env.NEXT_PUBLIC_MEDPLUM_BASE_URL;
    const clientId = process.env.NEXT_PUBLIC_MEDPLUM_CLIENT_ID;

    if (!baseUrl) {
      throw new Error('NEXT_PUBLIC_MEDPLUM_BASE_URL is not configured');
    }

    medplumClient = new MedplumClient({
      baseUrl,
      clientId,
      // Use PKCE for OAuth flow (more secure for SPAs)
      // The redirect URI will be set during login
    });
  }

  return medplumClient;
}

/**
 * Clear the Medplum client (useful for logout).
 */
export function clearMedplumClient(): void {
  if (medplumClient) {
    medplumClient.clear();
    medplumClient = null;
  }
}

/**
 * Check if the client has an active session.
 */
export function isAuthenticated(): boolean {
  const client = getMedplumClient();
  return client.getActiveLogin() !== undefined;
}
