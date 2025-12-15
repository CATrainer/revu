'use client';

import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';

interface CurrencyAmountProps {
  /** Amount in the source currency */
  amount: number;
  /** Source currency code (ISO 4217). If not provided, assumes USD */
  sourceCurrency?: string;
  /** Whether to show the currency code after the amount */
  showCode?: boolean;
  /** Number of decimal places (default: 2) */
  decimals?: number;
  /** Use compact notation for large numbers (e.g., $1.5M) */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Show original amount in tooltip */
  showOriginalInTooltip?: boolean;
}

/**
 * CurrencyAmount - Displays monetary values in the user's preferred currency
 * 
 * Automatically converts from source currency to user's preferred currency
 * using current exchange rates.
 * 
 * @example
 * // Display $1000 USD in user's currency
 * <CurrencyAmount amount={1000} sourceCurrency="USD" />
 * 
 * @example
 * // Display €500 EUR in user's currency with compact notation
 * <CurrencyAmount amount={500} sourceCurrency="EUR" compact />
 * 
 * @example
 * // Display with currency code
 * <CurrencyAmount amount={1000} sourceCurrency="GBP" showCode />
 */
export function CurrencyAmount({
  amount,
  sourceCurrency = 'USD',
  showCode = false,
  decimals = 2,
  compact = false,
  className,
  showOriginalInTooltip = false,
}: CurrencyAmountProps) {
  const { convertAndFormat, formatAmount, currency } = useCurrency();
  
  // Format the converted amount
  const displayValue = convertAndFormat(amount, sourceCurrency, {
    showCode,
    decimals,
    compact,
  });
  
  // Format original for tooltip
  const originalValue = showOriginalInTooltip && sourceCurrency !== currency
    ? formatAmount(amount, sourceCurrency, { showCode: true, decimals })
    : null;
  
  if (originalValue) {
    return (
      <span 
        className={cn('tabular-nums', className)}
        title={`Original: ${originalValue}`}
      >
        {displayValue}
      </span>
    );
  }
  
  return (
    <span className={cn('tabular-nums', className)}>
      {displayValue}
    </span>
  );
}

/**
 * Hook for formatting currency amounts without the component
 * Useful for charts, tables, or other non-component contexts
 */
export function useFormattedCurrency() {
  const { convert, formatAmount, convertAndFormat, currency, rates } = useCurrency();
  
  return {
    /**
     * Convert and format an amount
     * @param amount - Amount to convert
     * @param sourceCurrency - Source currency code
     * @param options - Formatting options
     */
    format: (
      amount: number,
      sourceCurrency: string = 'USD',
      options?: { showCode?: boolean; decimals?: number; compact?: boolean }
    ) => convertAndFormat(amount, sourceCurrency, options),
    
    /**
     * Just convert without formatting
     */
    convert: (amount: number, sourceCurrency: string) => convert(amount, sourceCurrency),
    
    /**
     * Format without conversion (for amounts already in user's currency)
     */
    formatLocal: (
      amount: number,
      options?: { showCode?: boolean; decimals?: number; compact?: boolean }
    ) => formatAmount(amount, currency, options),
    
    /** Current user currency */
    currency,
    
    /** Current exchange rates */
    rates,
  };
}
