"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

/**
 * @fileOverview Aura Global Privacy & Protection Context.
 * Manages the "Active" state of the application to hide sensitive content during backgrounding.
 */

interface PrivacyContextType {
  isPageActive: boolean;
  screenshotProtectionEnabled: boolean;
  isNativeWrapper: boolean;
}

const PrivacyContext = createContext<PrivacyContextType | undefined>(undefined);

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const [isPageActive, setIsPageActive] = useState(true);
  const [isNativeWrapper, setIsNativeWrapper] = useState(false);

  useEffect(() => {
    // Detect if we are running in a native webview wrapper (e.g. Capacitor/Cordova)
    // This allows triggering platform-specific FLAG_SECURE hooks
    const isNative = typeof window !== 'undefined' && 
      (window as any).Capacitor || (window as any).AuraNativeBridge;
    setIsNativeWrapper(!!isNative);

    const handleVisibilityChange = () => {
      setIsPageActive(document.visibilityState === 'visible');
    };

    const handleBlur = () => setIsPageActive(false);
    const handleFocus = () => setIsPageActive(true);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    // Initial check
    setIsPageActive(document.visibilityState === 'visible');

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  return (
    <PrivacyContext.Provider value={{ 
      isPageActive, 
      screenshotProtectionEnabled: true,
      isNativeWrapper
    }}>
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  const context = useContext(PrivacyContext);
  if (context === undefined) {
    throw new Error('usePrivacy must be used within a PrivacyProvider');
  }
  return context;
}
