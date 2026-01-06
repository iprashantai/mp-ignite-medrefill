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
 * Create a storage adapter that works in both SSR and client
 * MedplumClient requires: getItem, setItem, removeItem, getObject, setObject, clear
 */
function createStorage() {
  // Server-side: use in-memory storage
  if (typeof window === 'undefined') {
    const memoryStorage = new Map<string, string>();
    return {
      getItem: (key: string) => memoryStorage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memoryStorage.set(key, value);
      },
      removeItem: (key: string) => {
        memoryStorage.delete(key);
      },
      clear: () => {
        memoryStorage.clear();
      },
      getObject: <T,>(key: string): T | undefined => {
        const value = memoryStorage.get(key);
        if (!value || value === 'undefined' || value === 'null') {
          return undefined;
        }
        try {
          return JSON.parse(value);
        } catch (e) {
          console.warn(`Failed to parse storage key "${key}":`, e);
          return undefined;
        }
      },
      setObject: <T,>(key: string, value: T) => {
        memoryStorage.set(key, JSON.stringify(value));
      },
      getString: (key: string) => memoryStorage.get(key) ?? undefined,
      setString: (key: string, value: string) => {
        memoryStorage.set(key, value);
      },
      makeKey: (key: string) => key,
    };
  }

  // Client-side: extend localStorage with object methods
  return {
    getItem: (key: string) => window.localStorage.getItem(key),
    setItem: (key: string, value: string) => {
      window.localStorage.setItem(key, value);
    },
    removeItem: (key: string) => {
      window.localStorage.removeItem(key);
    },
    clear: () => {
      window.localStorage.clear();
    },
    getObject: <T,>(key: string): T | undefined => {
      const value = window.localStorage.getItem(key);
      if (!value || value === 'undefined' || value === 'null') {
        return undefined;
      }
      try {
        return JSON.parse(value);
      } catch (e) {
        console.warn(`Failed to parse localStorage key "${key}":`, e);
        return undefined;
      }
    },
    setObject: <T,>(key: string, value: T) => {
      window.localStorage.setItem(key, JSON.stringify(value));
    },
    getString: (key: string) => window.localStorage.getItem(key) ?? undefined,
    setString: (key: string, value: string) => {
      window.localStorage.setItem(key, value);
    },
    makeKey: (key: string) => key,
  };
}

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
      storage: createStorage(),
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
      <BaseMedplumProvider medplum={medplum}>{children}</BaseMedplumProvider>
    </MantineProvider>
  );
}
