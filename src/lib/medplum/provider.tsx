'use client';

import { ReactNode, useEffect, useState } from 'react';
import { MedplumClient } from '@medplum/core';
import { MedplumProvider as BaseMedplumProvider } from '@medplum/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a stable QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

interface MedplumProviderProps {
  children: ReactNode;
}

/**
 * Application-wide Medplum provider that wraps the app with:
 * - MedplumClient context
 * - React Query for caching
 * - Authentication state management
 */
export function MedplumProvider({ children }: MedplumProviderProps) {
  const [medplum, setMedplum] = useState<MedplumClient | null>(null);

  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_MEDPLUM_BASE_URL;
    const clientId = process.env.NEXT_PUBLIC_MEDPLUM_CLIENT_ID;

    if (!baseUrl) {
      console.error('NEXT_PUBLIC_MEDPLUM_BASE_URL is not configured');
      return;
    }

    const client = new MedplumClient({
      baseUrl,
      clientId,
      onUnauthenticated: () => {
        // Redirect to login on auth failure
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
      },
    });

    setMedplum(client);
  }, []);

  if (!medplum) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BaseMedplumProvider medplum={medplum}>
        {children}
      </BaseMedplumProvider>
    </QueryClientProvider>
  );
}

export { queryClient };
