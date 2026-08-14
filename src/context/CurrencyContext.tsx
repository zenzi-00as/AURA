"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'BRL';

export interface Currency {
  code: CurrencyCode;
  symbol: string;
  name: string;
  flag: string;
  rate: number; // Simplified relative to INR base (199 INR = ~2.49 USD)
}

export const CURRENCIES: Currency[] = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', flag: '🇮🇳', rate: 1 },
  { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸', rate: 0.012 },
  { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺', rate: 0.011 },
  { code: 'GBP', symbol: '£', name: 'British Pound', flag: '🇬🇧', rate: 0.0095 },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', flag: '🇧🇷', rate: 0.062 },
];

type CurrencyContextType = {
  currency: Currency;
  setCurrency: (code: CurrencyCode) => void;
  formatPrice: (amountInINR: number) => string;
};

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currencyCode, setCurrencyCode] = useState<CurrencyCode>('INR');

  useEffect(() => {
    const saved = localStorage.getItem('aura_currency') as CurrencyCode;
    if (saved && CURRENCIES.find(c => c.code === saved)) {
      setCurrencyCode(saved);
    }
  }, []);

  const currency = CURRENCIES.find(c => c.code === currencyCode) || CURRENCIES[0];

  const setCurrency = (code: CurrencyCode) => {
    setCurrencyCode(code);
    localStorage.setItem('aura_currency', code);
  };

  const formatPrice = (amountInINR: number) => {
    // We use fixed price points for a premium feel rather than pure math conversions
    if (amountInINR === 1) { // Onboarding test
       const prices = { INR: '₹1', USD: '$0.01', EUR: '€0.01', GBP: '£0.01', BRL: 'R$0.05' };
       return prices[currency.code];
    }
    if (amountInINR === 199) { // Elite
       const prices = { INR: '₹199', USD: '$2.49', EUR: '€2.29', GBP: '£1.99', BRL: 'R$12.99' };
       return prices[currency.code];
    }
    if (amountInINR === 30) { // Spotlight
       const prices = { INR: '₹30', USD: '$0.39', EUR: '€0.35', GBP: '£0.29', BRL: 'R$1.99' };
       return prices[currency.code];
    }
    if (amountInINR === 3) { // Super Like
       const prices = { INR: '₹3', USD: '$0.05', EUR: '€0.04', GBP: '£0.04', BRL: 'R$0.25' };
       return prices[currency.code];
    }

    const converted = amountInINR * currency.rate;
    return `${currency.symbol}${converted.toFixed(2)}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatPrice }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
