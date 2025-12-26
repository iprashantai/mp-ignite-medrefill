'use client';

import { MedplumClient } from '@medplum/core';
import { MedplumProvider as BaseMedplumProvider } from '@medplum/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useMemo, useState } from 'react';

interface MedplumProviderProps {
  children: ReactNode;
}

/**
 * Medplum Provider wrapper for the application
 * Initializes the MedplumClient and provides it to all child components
 * Also includes QueryClientProvider for react-query
 */
export function MedplumProvider({ children }: MedplumProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            retry: 1,
          },
        },
      })
  );

  const medplum = useMemo(() => {
    return new MedplumClient({
      baseUrl: process.env.NEXT_PUBLIC_MEDPLUM_BASE_URL || 'https://api.medplum.com/',
      clientId: process.env.NEXT_PUBLIC_MEDPLUM_CLIENT_ID,
      onUnauthenticated: () => {
        // Redirect to login on auth failure
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      },
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BaseMedplumProvider medplum={medplum}>
        {children}
      </BaseMedplumProvider>
    </QueryClientProvider>
  );
}
