'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from '@/lib/auth';

// Types
export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  locale: string;
}

export interface ExchangeRates {
  rates: Record<string, number>;
  base: string;
  last_updated: string | null;
  cached: boolean;
  fallback?: boolean;
}

interface CurrencyContextType {
  // Current user's currency preference
  currency: string;
  currencyInfo: CurrencyInfo | null;
  
  // Exchange rates
  rates: Record<string, number>;
  ratesLoading: boolean;
  ratesError: string | null;
  lastUpdated: string | null;
  
  // Supported currencies
  supportedCurrencies: CurrencyInfo[];
  
  // Actions
  setCurrency: (currency: string) => Promise<void>;
  refreshRates: () => Promise<void>;
  
  // Conversion functions
  convert: (amount: number, fromCurrency: string, toCurrency?: string) => number;
  formatAmount: (amount: number, currency?: string, options?: FormatOptions) => string;
  convertAndFormat: (amount: number, fromCurrency: string, options?: FormatOptions) => string;
}

interface FormatOptions {
  showCode?: boolean;
  decimals?: number;
  compact?: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

// Supported currencies (matches backend)
const SUPPORTED_CURRENCIES: CurrencyInfo[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$', locale: 'en-US' },
  { code: 'EUR', name: 'Euro', symbol: '€', locale: 'de-DE' },
  { code: 'GBP', name: 'British Pound', symbol: '£', locale: 'en-GB' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$', locale: 'en-CA' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', locale: 'en-AU' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', locale: 'ja-JP' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', locale: 'de-CH' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', locale: 'zh-CN' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', locale: 'en-IN' },
  { code: 'MXN', name: 'Mexican Peso', symbol: 'MX$', locale: 'es-MX' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', locale: 'pt-BR' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', locale: 'ko-KR' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', locale: 'en-SG' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', locale: 'zh-HK' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', locale: 'nb-NO' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', locale: 'sv-SE' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr', locale: 'da-DK' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', locale: 'en-NZ' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', locale: 'en-ZA' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', locale: 'ar-AE' },
];

// Fallback rates (approximate, Dec 2024)
const FALLBACK_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  CAD: 1.36,
  AUD: 1.53,
  JPY: 149.50,
  CHF: 0.88,
  CNY: 7.24,
  INR: 83.50,
  MXN: 17.15,
  BRL: 4.97,
  KRW: 1320.00,
  SGD: 1.34,
  HKD: 7.82,
  NOK: 10.85,
  SEK: 10.45,
  DKK: 6.88,
  NZD: 1.64,
  ZAR: 18.65,
  AED: 3.67,
};

interface CurrencyProviderProps {
  children: ReactNode;
}

export function CurrencyProvider({ children }: CurrencyProviderProps) {
  const { user, isAuthenticated } = useAuth();
  
  // State
  const [currency, setCurrencyState] = useState<string>('USD');
  const [rates, setRates] = useState<Record<string, number>>(FALLBACK_RATES);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  
  // Get currency info for current currency
  const currencyInfo = SUPPORTED_CURRENCIES.find(c => c.code === currency) || null;
  
  // Fetch exchange rates
  const refreshRates = useCallback(async () => {
    setRatesLoading(true);
    setRatesError(null);
    
    try {
      const response = await fetch('/api/currency/rates');
      if (response.ok) {
        const data: ExchangeRates = await response.json();
        setRates(data.rates);
        setLastUpdated(data.last_updated);
      } else {
        throw new Error('Failed to fetch rates');
      }
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
      setRatesError('Failed to fetch exchange rates');
      // Keep using fallback rates
    } finally {
      setRatesLoading(false);
    }
  }, []);
  
  // Fetch user's currency preference
  const fetchUserPreference = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const response = await fetch('/api/currency/preference');
      if (response.ok) {
        const data = await response.json();
        setCurrencyState(data.currency || 'USD');
      }
    } catch (error) {
      console.error('Error fetching currency preference:', error);
    }
  }, [isAuthenticated]);
  
  // Update user's currency preference
  const setCurrency = useCallback(async (newCurrency: string) => {
    const upperCurrency = newCurrency.toUpperCase();
    
    // Optimistically update local state
    setCurrencyState(upperCurrency);
    
    if (!isAuthenticated) return;
    
    try {
      const response = await fetch('/api/currency/preference', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currency: upperCurrency }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update preference');
      }
    } catch (error) {
      console.error('Error updating currency preference:', error);
      // Revert on error
      setCurrencyState(currency);
    }
  }, [isAuthenticated, currency]);
  
  // Convert amount from one currency to another
  // Logic: source -> USD -> target
  const convert = useCallback((
    amount: number,
    fromCurrency: string,
    toCurrency?: string
  ): number => {
    const from = fromCurrency.toUpperCase();
    const to = (toCurrency || currency).toUpperCase();
    
    if (from === to) return amount;
    
    const fromRate = rates[from] || 1;
    const toRate = rates[to] || 1;
    
    // Convert to USD first
    const usdAmount = from === 'USD' ? amount : amount / fromRate;
    
    // Convert from USD to target
    return to === 'USD' ? usdAmount : usdAmount * toRate;
  }, [rates, currency]);
  
  // Format amount with currency symbol
  const formatAmount = useCallback((
    amount: number,
    currencyCode?: string,
    options: FormatOptions = {}
  ): string => {
    const code = (currencyCode || currency).toUpperCase();
    const info = SUPPORTED_CURRENCIES.find(c => c.code === code);
    const symbol = info?.symbol || code;
    const decimals = options.decimals ?? 2;
    
    // Handle compact notation for large numbers
    if (options.compact && Math.abs(amount) >= 1000) {
      const formatter = new Intl.NumberFormat('en-US', {
        notation: 'compact',
        maximumFractionDigits: 1,
      });
      const formatted = formatter.format(amount);
      return options.showCode ? `${symbol}${formatted} ${code}` : `${symbol}${formatted}`;
    }
    
    // Standard formatting
    const formatted = amount.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    
    return options.showCode ? `${symbol}${formatted} ${code}` : `${symbol}${formatted}`;
  }, [currency]);
  
  // Convert and format in one call
  const convertAndFormat = useCallback((
    amount: number,
    fromCurrency: string,
    options: FormatOptions = {}
  ): string => {
    const converted = convert(amount, fromCurrency);
    return formatAmount(converted, currency, options);
  }, [convert, formatAmount, currency]);
  
  // Initialize on mount and when auth changes
  useEffect(() => {
    refreshRates();
    
    // Refresh rates every hour
    const interval = setInterval(refreshRates, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refreshRates]);
  
  useEffect(() => {
    if (isAuthenticated) {
      fetchUserPreference();
    }
  }, [isAuthenticated, fetchUserPreference]);
  
  const value: CurrencyContextType = {
    currency,
    currencyInfo,
    rates,
    ratesLoading,
    ratesError,
    lastUpdated,
    supportedCurrencies: SUPPORTED_CURRENCIES,
    setCurrency,
    refreshRates,
    convert,
    formatAmount,
    convertAndFormat,
  };
  
  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

// Hook for using currency context
export function useCurrency() {
  const context = useContext(CurrencyContext);
  
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  
  return context;
}

// Utility hook for just formatting (doesn't require context)
export function useCurrencyFormatter() {
  const { formatAmount, convertAndFormat, currency } = useCurrency();
  
  return {
    format: formatAmount,
    convertAndFormat,
    currentCurrency: currency,
  };
}
