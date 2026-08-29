"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'BRL';

export interface Currency {
  code: CurrencyCode;
  symbol: string;
  name: string;
  flag: string;
  rate: number; // Simplified relative to INR base
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
  formatPrice: (amountInINR: number, includeGst?: boolean) => string;
  getGstAmount: (amountInINR: number) => number;
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

  const getGstAmount = (amountInINR: number) => {
    return amountInINR * 0.18;
  };

  const formatPrice = (amountInINR: number, includeGst: boolean = false) => {
    const baseAmount = includeGst ? amountInINR + getGstAmount(amountInINR) : amountInINR;
    
    // Premium price point rounding for specific tiers
    if (amountInINR === 1) { 
       const prices = { INR: '₹1', USD: '$0.01', EUR: '€0.01', GBP: '£0.01', BRL: 'R$0.05' };
       return prices[currency.code];
    }
    if (amountInINR === 199) { 
       const prices = includeGst 
        ? { INR: '₹234.82', USD: '$2.94', EUR: '€2.70', GBP: '£2.35', BRL: 'R$15.33' }
        : { INR: '₹199', USD: '$2.49', EUR: '€2.29', GBP: '£1.99', BRL: 'R$12.99' };
       return prices[currency.code];
    }
    if (amountInINR === 99) { 
       const prices = includeGst 
        ? { INR: '₹116.82', USD: '$1.46', EUR: '€1.35', GBP: '£1.17', BRL: 'R$7.72' }
        : { INR: '₹99', USD: '$1.24', EUR: '€1.14', GBP: '£0.99', BRL: 'R$6.49' };
       return prices[currency.code];
    }
    if (amountInINR === 30) { 
       const prices = includeGst 
        ? { INR: '₹35.40', USD: '$0.46', EUR: '€0.41', GBP: '£0.34', BRL: 'R$2.35' }
        : { INR: '₹30', USD: '$0.39', EUR: '€0.35', GBP: '£0.29', BRL: 'R$1.99' };
       return prices[currency.code];
    }
    if (amountInINR === 3) { 
       const prices = includeGst 
        ? { INR: '₹3.54', USD: '$0.06', EUR: '€0.05', GBP: '£0.05', BRL: 'R$0.30' }
        : { INR: '₹3', USD: '$0.05', EUR: '€0.04', GBP: '£0.04', BRL: 'R$0.25' };
       return prices[currency.code];
    }

    const converted = baseAmount * currency.rate;
    return `${currency.symbol}${converted.toFixed(2)}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatPrice, getGstAmount }}>
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
