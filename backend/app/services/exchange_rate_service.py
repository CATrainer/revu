"""
Exchange Rate Service

Fetches and caches exchange rates from external API.
All rates are relative to USD as the base currency.
Rates are refreshed hourly and cached in Redis.
"""

import logging
import json
from datetime import datetime, timedelta
from typing import Dict, Optional, List
from decimal import Decimal, ROUND_HALF_UP

import httpx
from redis import Redis

from app.core.config import settings

logger = logging.getLogger(__name__)

# Supported currencies with metadata
SUPPORTED_CURRENCIES = {
    "USD": {"name": "US Dollar", "symbol": "$", "locale": "en-US"},
    "EUR": {"name": "Euro", "symbol": "€", "locale": "de-DE"},
    "GBP": {"name": "British Pound", "symbol": "£", "locale": "en-GB"},
    "CAD": {"name": "Canadian Dollar", "symbol": "CA$", "locale": "en-CA"},
    "AUD": {"name": "Australian Dollar", "symbol": "A$", "locale": "en-AU"},
    "JPY": {"name": "Japanese Yen", "symbol": "¥", "locale": "ja-JP"},
    "CHF": {"name": "Swiss Franc", "symbol": "CHF", "locale": "de-CH"},
    "CNY": {"name": "Chinese Yuan", "symbol": "¥", "locale": "zh-CN"},
    "INR": {"name": "Indian Rupee", "symbol": "₹", "locale": "en-IN"},
    "MXN": {"name": "Mexican Peso", "symbol": "MX$", "locale": "es-MX"},
    "BRL": {"name": "Brazilian Real", "symbol": "R$", "locale": "pt-BR"},
    "KRW": {"name": "South Korean Won", "symbol": "₩", "locale": "ko-KR"},
    "SGD": {"name": "Singapore Dollar", "symbol": "S$", "locale": "en-SG"},
    "HKD": {"name": "Hong Kong Dollar", "symbol": "HK$", "locale": "zh-HK"},
    "NOK": {"name": "Norwegian Krone", "symbol": "kr", "locale": "nb-NO"},
    "SEK": {"name": "Swedish Krona", "symbol": "kr", "locale": "sv-SE"},
    "DKK": {"name": "Danish Krone", "symbol": "kr", "locale": "da-DK"},
    "NZD": {"name": "New Zealand Dollar", "symbol": "NZ$", "locale": "en-NZ"},
    "ZAR": {"name": "South African Rand", "symbol": "R", "locale": "en-ZA"},
    "AED": {"name": "UAE Dirham", "symbol": "د.إ", "locale": "ar-AE"},
}

# Cache settings
CACHE_KEY = "exchange_rates"
CACHE_TTL_SECONDS = 3600  # 1 hour
FALLBACK_RATES_KEY = "exchange_rates_fallback"


class ExchangeRateService:
    """Service for fetching and caching exchange rates."""
    
    def __init__(self, redis_client: Optional[Redis] = None):
        self.redis = redis_client
        self._fallback_rates = self._get_fallback_rates()
    
    def _get_fallback_rates(self) -> Dict[str, float]:
        """Fallback rates if API is unavailable (approximate rates as of Dec 2024)."""
        return {
            "USD": 1.0,
            "EUR": 0.92,
            "GBP": 0.79,
            "CAD": 1.36,
            "AUD": 1.53,
            "JPY": 149.50,
            "CHF": 0.88,
            "CNY": 7.24,
            "INR": 83.50,
            "MXN": 17.15,
            "BRL": 4.97,
            "KRW": 1320.00,
            "SGD": 1.34,
            "HKD": 7.82,
            "NOK": 10.85,
            "SEK": 10.45,
            "DKK": 6.88,
            "NZD": 1.64,
            "ZAR": 18.65,
            "AED": 3.67,
        }
    
    async def get_rates(self) -> Dict[str, any]:
        """
        Get current exchange rates (from cache or fetch fresh).
        
        Returns:
            Dict with 'rates', 'base', 'last_updated', 'cached' keys
        """
        # Try cache first
        cached = await self._get_cached_rates()
        if cached:
            return cached
        
        # Fetch fresh rates
        rates = await self._fetch_rates()
        if rates:
            await self._cache_rates(rates)
            return {
                "rates": rates,
                "base": "USD",
                "last_updated": datetime.utcnow().isoformat(),
                "cached": False,
            }
        
        # Use fallback
        logger.warning("Using fallback exchange rates")
        return {
            "rates": self._fallback_rates,
            "base": "USD",
            "last_updated": None,
            "cached": False,
            "fallback": True,
        }
    
    async def _get_cached_rates(self) -> Optional[Dict]:
        """Get rates from Redis cache."""
        if not self.redis:
            return None
        
        try:
            cached = self.redis.get(CACHE_KEY)
            if cached:
                data = json.loads(cached)
                data["cached"] = True
                return data
        except Exception as e:
            logger.error(f"Error reading cached rates: {e}")
        
        return None
    
    async def _cache_rates(self, rates: Dict[str, float]) -> None:
        """Cache rates in Redis."""
        if not self.redis:
            return
        
        try:
            data = {
                "rates": rates,
                "base": "USD",
                "last_updated": datetime.utcnow().isoformat(),
            }
            self.redis.setex(CACHE_KEY, CACHE_TTL_SECONDS, json.dumps(data))
            # Also save as fallback in case of future API failures
            self.redis.set(FALLBACK_RATES_KEY, json.dumps(data))
            logger.info("Exchange rates cached successfully")
        except Exception as e:
            logger.error(f"Error caching rates: {e}")
    
    async def _fetch_rates(self) -> Optional[Dict[str, float]]:
        """
        Fetch rates from external API.
        
        Uses exchangerate-api.com free tier or similar service.
        Falls back to Open Exchange Rates if primary fails.
        """
        # Primary: exchangerate-api.com (free tier, no key needed for basic)
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                # Try free API first
                response = await client.get(
                    "https://api.exchangerate-api.com/v4/latest/USD"
                )
                if response.status_code == 200:
                    data = response.json()
                    rates = data.get("rates", {})
                    # Filter to supported currencies
                    filtered_rates = {
                        code: rates.get(code, self._fallback_rates.get(code, 1.0))
                        for code in SUPPORTED_CURRENCIES.keys()
                    }
                    logger.info("Fetched exchange rates from exchangerate-api.com")
                    return filtered_rates
        except Exception as e:
            logger.warning(f"Primary exchange rate API failed: {e}")
        
        # Secondary: Try another free API
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    "https://open.er-api.com/v6/latest/USD"
                )
                if response.status_code == 200:
                    data = response.json()
                    rates = data.get("rates", {})
                    filtered_rates = {
                        code: rates.get(code, self._fallback_rates.get(code, 1.0))
                        for code in SUPPORTED_CURRENCIES.keys()
                    }
                    logger.info("Fetched exchange rates from open.er-api.com")
                    return filtered_rates
        except Exception as e:
            logger.warning(f"Secondary exchange rate API failed: {e}")
        
        return None
    
    def convert(
        self,
        amount: float,
        from_currency: str,
        to_currency: str,
        rates: Dict[str, float]
    ) -> float:
        """
        Convert amount from one currency to another.
        
        Conversion logic:
        1. Convert from source currency to USD
        2. Convert from USD to target currency
        
        Args:
            amount: Amount to convert
            from_currency: Source currency code (ISO 4217)
            to_currency: Target currency code (ISO 4217)
            rates: Current exchange rates (relative to USD)
        
        Returns:
            Converted amount
        """
        if from_currency == to_currency:
            return amount
        
        from_currency = from_currency.upper()
        to_currency = to_currency.upper()
        
        # Get rates (default to 1 for USD or unknown)
        from_rate = rates.get(from_currency, 1.0)
        to_rate = rates.get(to_currency, 1.0)
        
        # Convert to USD first, then to target
        # If from_currency rate is 0.92 (EUR), then 1 EUR = 1/0.92 USD
        # If to_currency rate is 0.79 (GBP), then 1 USD = 0.79 GBP
        
        # Amount in USD
        if from_currency == "USD":
            usd_amount = amount
        else:
            usd_amount = amount / from_rate
        
        # Amount in target currency
        if to_currency == "USD":
            return usd_amount
        else:
            return usd_amount * to_rate
    
    def format_currency(
        self,
        amount: float,
        currency: str,
        show_code: bool = False,
        decimal_places: int = 2
    ) -> str:
        """
        Format amount with proper currency symbol.
        
        Args:
            amount: Amount to format
            currency: Currency code (ISO 4217)
            show_code: Whether to append currency code
            decimal_places: Number of decimal places
        
        Returns:
            Formatted currency string
        """
        currency = currency.upper()
        currency_info = SUPPORTED_CURRENCIES.get(currency, {"symbol": currency, "locale": "en-US"})
        symbol = currency_info["symbol"]
        
        # Round to specified decimal places
        rounded = round(amount, decimal_places)
        
        # Format with thousands separator
        if decimal_places == 0:
            formatted = f"{int(rounded):,}"
        else:
            formatted = f"{rounded:,.{decimal_places}f}"
        
        # Currencies that put symbol after (none in our list, but support it)
        result = f"{symbol}{formatted}"
        
        if show_code:
            result = f"{result} {currency}"
        
        return result
    
    @staticmethod
    def get_supported_currencies() -> List[Dict]:
        """Get list of supported currencies with metadata."""
        return [
            {"code": code, **info}
            for code, info in SUPPORTED_CURRENCIES.items()
        ]
    
    @staticmethod
    def is_supported(currency: str) -> bool:
        """Check if currency is supported."""
        return currency.upper() in SUPPORTED_CURRENCIES


# Singleton instance
_exchange_rate_service: Optional[ExchangeRateService] = None


def get_exchange_rate_service(redis_client: Optional[Redis] = None) -> ExchangeRateService:
    """Get or create exchange rate service singleton."""
    global _exchange_rate_service
    
    if _exchange_rate_service is None:
        _exchange_rate_service = ExchangeRateService(redis_client)
    
    return _exchange_rate_service
