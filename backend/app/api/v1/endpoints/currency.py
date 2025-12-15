"""
Currency API Endpoints

Provides exchange rates and currency conversion functionality.
"""

import logging
from typing import List, Optional
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.core.auth import get_current_user
from app.models.user import User
from app.services.exchange_rate_service import (
    get_exchange_rate_service,
    SUPPORTED_CURRENCIES,
    ExchangeRateService,
)

logger = logging.getLogger(__name__)

router = APIRouter()


# ============================================================================
# Schemas
# ============================================================================

class CurrencyInfo(BaseModel):
    """Currency information."""
    code: str
    name: str
    symbol: str
    locale: str


class ExchangeRatesResponse(BaseModel):
    """Exchange rates response."""
    rates: dict[str, float]
    base: str = "USD"
    last_updated: Optional[str] = None
    cached: bool = False
    fallback: bool = False


class ConversionRequest(BaseModel):
    """Currency conversion request."""
    amount: float = Field(..., gt=0, description="Amount to convert")
    from_currency: str = Field(..., min_length=3, max_length=3, description="Source currency code")
    to_currency: str = Field(..., min_length=3, max_length=3, description="Target currency code")


class ConversionResponse(BaseModel):
    """Currency conversion response."""
    original_amount: float
    converted_amount: float
    from_currency: str
    to_currency: str
    rate: float
    formatted: str


class UserCurrencyPreference(BaseModel):
    """User currency preference."""
    currency: str = Field(..., min_length=3, max_length=3, description="Currency code (ISO 4217)")


class UserCurrencyResponse(BaseModel):
    """User currency preference response."""
    currency: str
    name: str
    symbol: str
    locale: str


# ============================================================================
# Endpoints
# ============================================================================

@router.get("/supported", response_model=List[CurrencyInfo])
async def get_supported_currencies():
    """
    Get list of supported currencies.
    
    Returns all currencies that can be used for display preferences.
    """
    return [
        CurrencyInfo(code=code, **info)
        for code, info in SUPPORTED_CURRENCIES.items()
    ]


@router.get("/rates", response_model=ExchangeRatesResponse)
async def get_exchange_rates():
    """
    Get current exchange rates.
    
    All rates are relative to USD as the base currency.
    Rates are cached for 1 hour.
    """
    service = get_exchange_rate_service()
    rates_data = await service.get_rates()
    
    return ExchangeRatesResponse(
        rates=rates_data["rates"],
        base=rates_data["base"],
        last_updated=rates_data.get("last_updated"),
        cached=rates_data.get("cached", False),
        fallback=rates_data.get("fallback", False),
    )


@router.post("/convert", response_model=ConversionResponse)
async def convert_currency(
    request: ConversionRequest,
):
    """
    Convert an amount from one currency to another.
    
    Conversion logic:
    1. Convert from source currency to USD
    2. Convert from USD to target currency
    """
    from_currency = request.from_currency.upper()
    to_currency = request.to_currency.upper()
    
    # Validate currencies
    if from_currency not in SUPPORTED_CURRENCIES:
        raise HTTPException(400, f"Unsupported source currency: {from_currency}")
    if to_currency not in SUPPORTED_CURRENCIES:
        raise HTTPException(400, f"Unsupported target currency: {to_currency}")
    
    service = get_exchange_rate_service()
    rates_data = await service.get_rates()
    rates = rates_data["rates"]
    
    # Perform conversion
    converted = service.convert(
        request.amount,
        from_currency,
        to_currency,
        rates
    )
    
    # Calculate effective rate
    if from_currency == to_currency:
        rate = 1.0
    else:
        rate = converted / request.amount if request.amount > 0 else 0
    
    # Format the result
    formatted = service.format_currency(converted, to_currency)
    
    return ConversionResponse(
        original_amount=request.amount,
        converted_amount=round(converted, 2),
        from_currency=from_currency,
        to_currency=to_currency,
        rate=round(rate, 6),
        formatted=formatted,
    )


@router.get("/preference", response_model=UserCurrencyResponse)
async def get_user_currency_preference(
    current_user: User = Depends(get_current_user),
):
    """
    Get current user's currency preference.
    """
    currency = current_user.currency_preference or "USD"
    currency_info = SUPPORTED_CURRENCIES.get(currency, SUPPORTED_CURRENCIES["USD"])
    
    return UserCurrencyResponse(
        currency=currency,
        name=currency_info["name"],
        symbol=currency_info["symbol"],
        locale=currency_info["locale"],
    )


@router.put("/preference", response_model=UserCurrencyResponse)
async def update_user_currency_preference(
    request: UserCurrencyPreference,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Update current user's currency preference.
    
    This affects how monetary values are displayed across the dashboard.
    """
    currency = request.currency.upper()
    
    if currency not in SUPPORTED_CURRENCIES:
        raise HTTPException(400, f"Unsupported currency: {currency}")
    
    # Update user preference
    current_user.currency_preference = currency
    session.add(current_user)
    await session.commit()
    await session.refresh(current_user)
    
    currency_info = SUPPORTED_CURRENCIES[currency]
    
    logger.info(f"User {current_user.id} updated currency preference to {currency}")
    
    return UserCurrencyResponse(
        currency=currency,
        name=currency_info["name"],
        symbol=currency_info["symbol"],
        locale=currency_info["locale"],
    )


@router.get("/format")
async def format_currency_amount(
    amount: float = Query(..., description="Amount to format"),
    currency: str = Query("USD", description="Currency code"),
    show_code: bool = Query(False, description="Show currency code after amount"),
    decimals: int = Query(2, ge=0, le=4, description="Decimal places"),
):
    """
    Format an amount with proper currency symbol.
    
    Utility endpoint for formatting currency values.
    """
    currency = currency.upper()
    
    if currency not in SUPPORTED_CURRENCIES:
        raise HTTPException(400, f"Unsupported currency: {currency}")
    
    service = get_exchange_rate_service()
    formatted = service.format_currency(amount, currency, show_code, decimals)
    
    return {
        "amount": amount,
        "currency": currency,
        "formatted": formatted,
    }
