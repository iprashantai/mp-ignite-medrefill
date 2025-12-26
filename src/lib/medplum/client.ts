import { MedplumClient } from '@medplum/core';

/**
 * Medplum client configuration
 * Used for server-side operations and as base config for client-side
 */
export const medplumClientConfig = {
  baseUrl: process.env.NEXT_PUBLIC_MEDPLUM_BASE_URL || 'https://api.medplum.com/',
  clientId: process.env.NEXT_PUBLIC_MEDPLUM_CLIENT_ID,
  projectId: process.env.NEXT_PUBLIC_MEDPLUM_PROJECT_ID,
};

/**
 * Create a new MedplumClient instance
 * For client-side use, prefer useMedplum() hook from @medplum/react
 */
export function createMedplumClient(): MedplumClient {
  return new MedplumClient({
    baseUrl: medplumClientConfig.baseUrl,
    clientId: medplumClientConfig.clientId,
  });
}

/**
 * Singleton client for server-side operations
 * Note: For client components, use MedplumProvider and useMedplum() hook
 */
let serverClient: MedplumClient | null = null;

export function getServerMedplumClient(): MedplumClient {
  if (!serverClient) {
    serverClient = createMedplumClient();
  }
  return serverClient;
}
