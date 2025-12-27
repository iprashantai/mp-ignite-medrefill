'use client';

import { MedplumClient } from '@medplum/core';
import { MedplumProvider as BaseMedplumProvider } from '@medplum/react';
import { MantineProvider, createTheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { ReactNode, useMemo } from 'react';

// Import Mantine styles (required for Medplum React components)
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

// Import Medplum React styles
import '@medplum/react/styles.css';

interface MedplumProviderProps {
  children: ReactNode;
}

// Mantine theme customization to align with our design
const theme = createTheme({
  primaryColor: 'blue',
  fontFamily: 'inherit',
  defaultRadius: 'md',
});

/**
 * Medplum Provider wrapper for the application
 * Includes MantineProvider for Medplum React components
 * Inherits all Medplum security best practices and HIPAA compliance
 */
export function MedplumProvider({ children }: MedplumProviderProps) {
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
    <MantineProvider theme={theme}>
      <Notifications position="top-right" />
      <BaseMedplumProvider medplum={medplum}>
        {children}
      </BaseMedplumProvider>
    </MantineProvider>
  );
}
