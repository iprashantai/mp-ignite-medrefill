'use client';

/* eslint-disable @typescript-eslint/no-explicit-any, no-console, max-lines-per-function */

/**
 * Legacy App Context (Medplum Bridge)
 *
 * Provides the same API as legacy Firebase AppContext but delegates to Medplum.
 * This allows legacy UI components to work without modification.
 *
 * ORIGINAL: legacy/src/context/AppContext.jsx
 * ADAPTED: Uses Medplum auth instead of Firebase, stubs protocol loading
 */

import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import { useMedplum, useMedplumProfile } from '@medplum/react';
import { ProgressToast, SimpleToast } from '@/components/legacy-ui/ProgressToast';

interface ProgressToastState {
  isOpen: boolean;
  isMinimized: boolean;
  title: string;
  message: string;
  current: number;
  total: number;
  progressPercent: number;
  metadata: Record<string, any> | null;
}

interface AppContextType {
  globalProtocols: any[];
  showTimedToast: (message: string, type?: string, duration?: number) => void;
  showProgressToast: (config: Partial<ProgressToastState>) => void;
  updateProgressToast: (updates: Partial<ProgressToastState>) => void;
  closeProgressToast: () => void;
  minimizeProgressToast: () => void;
  userId: string | null;
  isAuthReady: boolean;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  // Medplum client and profile (replaces Firebase auth)
  const medplum = useMedplum();
  const profile = useMedplumProfile();

  // Global state
  const [globalProtocols, setGlobalProtocols] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Toast state (simple notifications)
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  // Progress toast state (for batch processing with progress bar)
  const [progressToast, setProgressToast] = useState<ProgressToastState>({
    isOpen: false,
    isMinimized: false,
    title: 'Processing',
    message: 'Processing...',
    current: 0,
    total: 0,
    progressPercent: 0,
    metadata: null,
  });

  // Toast functions
  const showTimedToast = useCallback((message: string, type = 'success', duration = 3000) => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), duration);
  }, []);

  const showProgressToast = useCallback((config: Partial<ProgressToastState>) => {
    console.log('📢 showProgressToast called with:', config);
    setProgressToast((prev) => {
      const newState = {
        ...prev,
        isOpen: true,
        ...config,
      };
      console.log('📢 New progress toast state:', newState);
      return newState;
    });
  }, []);

  const updateProgressToast = useCallback((updates: Partial<ProgressToastState>) => {
    console.log('📢 updateProgressToast called with:', updates);
    setProgressToast((prev) => ({
      ...prev,
      ...updates,
    }));
  }, []);

  const closeProgressToast = useCallback(() => {
    setProgressToast((prev) => ({
      ...prev,
      isOpen: false,
    }));
  }, []);

  const minimizeProgressToast = useCallback(() => {
    setProgressToast((prev) => ({
      ...prev,
      isMinimized: !prev.isMinimized,
    }));
  }, []);

  // --- Medplum Auth Setup (replaces Firebase) ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        console.log('AppContext: Starting Medplum authentication check');

        // Check if Medplum client is authenticated
        if (medplum && profile) {
          const profileId = profile.id || null;
          setUserId(profileId);
          console.log('AppContext: Authenticated Medplum user ID:', profileId);
          console.log('AppContext: User profile:', profile);
        } else {
          setUserId(null);
          console.log('AppContext: No user authenticated (Medplum).');
        }

        setIsAuthReady(true);
      } catch (error) {
        console.error('AppContext: Error during Medplum auth check:', error);
        setIsAuthReady(true); // Still set to ready to prevent hanging
        showTimedToast('Authentication check failed', 'error');
      }
    };

    initAuth();
  }, [medplum, profile, showTimedToast]);

  // --- Fetch Protocols (Stub) ---
  // TODO: Load protocols from FHIR resources (e.g., PlanDefinition, ActivityDefinition)
  // For now, using empty array to allow UI to render
  useEffect(() => {
    if (isAuthReady) {
      console.log('AppContext: Protocol loading - using stub (empty array)');
      console.log('AppContext: TODO: Load protocols from Medplum FHIR resources');

      // Stub: Set empty protocols for now
      // In production, would load from:
      // - PlanDefinition resources
      // - ActivityDefinition resources
      // - Or custom protocol resources
      setGlobalProtocols([]);

      // TODO: Implement protocol loading
      // const protocols = await medplum.searchResources('PlanDefinition', {
      //   status: 'active'
      // });
      // setGlobalProtocols(protocols);
    }
  }, [isAuthReady, medplum]);

  const contextValue: AppContextType = {
    globalProtocols,
    showTimedToast,
    showProgressToast,
    updateProgressToast,
    closeProgressToast,
    minimizeProgressToast,
    userId,
    isAuthReady,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}

      {/* Simple Toast for quick notifications */}
      <SimpleToast
        isOpen={showToast}
        message={toastMessage}
        type={toastType}
        onClose={() => setShowToast(false)}
      />

      {/* Progress Toast for batch processing with progress tracking */}
      <ProgressToast
        isOpen={progressToast.isOpen}
        isMinimized={progressToast.isMinimized}
        title={progressToast.title}
        message={progressToast.message}
        current={progressToast.current}
        total={progressToast.total}
        progressPercent={progressToast.progressPercent}
        metadata={progressToast.metadata}
        onClose={closeProgressToast}
        onMinimize={minimizeProgressToast}
      />
    </AppContext.Provider>
  );
};

/**
 * Hook to use AppContext
 */
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};
