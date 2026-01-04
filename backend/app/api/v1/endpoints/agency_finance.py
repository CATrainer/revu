"""
Agency finance management endpoints.

Handles invoices, creator payouts, and financial statistics.
"""

from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any, List, Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from loguru import logger
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_async_session
from app.core.security import get_current_user
from app.models.user import User
from app.models.agency_finance import AgencyInvoice, CreatorPayout
from app.models.agency_notification import AgencyActivity
from app.schemas.agency_dashboard import (
    InvoiceCreate,
    InvoiceUpdate,
    InvoiceResponse,
    InvoiceStatus,
    InvoiceSendRequest,
    InvoiceMarkPaidRequest,
    PayoutCreate,
    PayoutResponse,
    PayoutStatus,
    PayoutMarkPaidRequest,
    FinancialStats,
)

router = APIRouter()


# ============================================
# Helper Functions
# ============================================

async def get_user_agency_id(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
) -> UUID:
    """Get the agency ID for the current agency user."""
    if current_user.account_type != "agency":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Agency account required",
        )

    from app.models.agency import AgencyMember
    result = await db.execute(
        select(AgencyMember.agency_id).where(
            AgencyMember.user_id == current_user.id,
            AgencyMember.status == "active"
        )
    )
    agency_id = result.scalar_one_or_none()

    if not agency_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No agency found for user",
        )
    return agency_id


async def generate_invoice_number(db: AsyncSession, agency_id: UUID) -> str:
    """Generate next invoice number for agency."""
    year = datetime.utcnow().year
    result = await db.execute(
        select(func.count(AgencyInvoice.id)).where(
            AgencyInvoice.agency_id == agency_id,
            func.extract('year', AgencyInvoice.created_at) == year,
        )
    )
    count = result.scalar() or 0
    return f"{year}-{str(count + 1).zfill(4)}"


async def log_activity(
    db: AsyncSession,
    agency_id: UUID,
    actor_id: UUID,
    actor_name: str,
    action: str,
    entity_type: str,
    entity_id: UUID,
    entity_name: str,
    description: str,
):
    """Log activity to the activity feed."""
    activity = AgencyActivity(
        id=uuid4(),
        agency_id=agency_id,
        actor_id=actor_id,
        actor_name=actor_name,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        entity_name=entity_name,
        description=description,
    )
    db.add(activity)


# ============================================
# Financial Stats
# ============================================

@router.get("/stats", response_model=FinancialStats)
async def get_financial_stats(
    agency_id: UUID = Depends(get_user_agency_id),
    db: AsyncSession = Depends(get_async_session),
) -> Any:
    """Get financial overview statistics."""
    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    last_month_start = (month_start - timedelta(days=1)).replace(day=1)

    # Outstanding receivables (sent, not paid)
    result = await db.execute(
        select(
            func.coalesce(func.sum(AgencyInvoice.total_amount), 0),
            func.count(AgencyInvoice.id),
        ).where(
            AgencyInvoice.agency_id == agency_id,
            AgencyInvoice.status.in_(['sent', 'viewed']),
        )
    )
    row = result.one()
    outstanding = row[0] or Decimal("0")
    outstanding_count = row[1] or 0

    # Overdue receivables
    result = await db.execute(
        select(
            func.coalesce(func.sum(AgencyInvoice.total_amount), 0),
            func.count(AgencyInvoice.id),
        ).where(
            AgencyInvoice.agency_id == agency_id,
            AgencyInvoice.status == 'overdue',
        )
    )
    row = result.one()
    overdue_amount = row[0] or Decimal("0")
    overdue_count = row[1] or 0

    # Oldest overdue
    result = await db.execute(
        select(func.min(AgencyInvoice.due_date)).where(
            AgencyInvoice.agency_id == agency_id,
            AgencyInvoice.status == 'overdue',
        )
    )
    oldest_overdue_date = result.scalar()
    oldest_overdue_days = None
    if oldest_overdue_date:
        oldest_overdue_days = (now - oldest_overdue_date).days

    # Creator payouts due
    result = await db.execute(
        select(
            func.coalesce(func.sum(CreatorPayout.amount), 0),
            func.count(CreatorPayout.id),
        ).where(
            CreatorPayout.agency_id == agency_id,
            CreatorPayout.status.in_(['pending', 'approved']),
        )
    )
    row = result.one()
    payouts_due = row[0] or Decimal("0")
    payouts_count = row[1] or 0

    # Revenue this month (paid invoices)
    result = await db.execute(
        select(func.coalesce(func.sum(AgencyInvoice.paid_amount), 0)).where(
            AgencyInvoice.agency_id == agency_id,
            AgencyInvoice.status == 'paid',
            AgencyInvoice.paid_at >= month_start,
        )
    )
    revenue_this_month = result.scalar() or Decimal("0")

    # Revenue last month
    result = await db.execute(
        select(func.coalesce(func.sum(AgencyInvoice.paid_amount), 0)).where(
            AgencyInvoice.agency_id == agency_id,
            AgencyInvoice.status == 'paid',
            AgencyInvoice.paid_at >= last_month_start,
            AgencyInvoice.paid_at < month_start,
        )
    )
    revenue_last_month = result.scalar() or Decimal("0")

    # Calculate trend
    trend_percent = 0.0
    if revenue_last_month > 0:
        trend_percent = float((revenue_this_month - revenue_last_month) / revenue_last_month * 100)

    return FinancialStats(
        outstanding_receivables=outstanding,
        outstanding_count=outstanding_count,
        overdue_receivables=overdue_amount,
        overdue_count=overdue_count,
        oldest_overdue_days=oldest_overdue_days,
        creator_payouts_due=payouts_due,
        creator_payouts_count=payouts_count,
        revenue_this_month=revenue_this_month,
        revenue_last_month=revenue_last_month,
        revenue_trend_percent=round(trend_percent, 1),
    )


# ============================================
# Invoice Endpoints
# ============================================

@router.get("/invoices", response_model=List[InvoiceResponse])
async def list_invoices(
    status: Optional[InvoiceStatus] = None,
    brand_name: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    agency_id: UUID = Depends(get_user_agency_id),
    db: AsyncSession = Depends(get_async_session),
) -> Any:
    """List all invoices for the agency."""
    query = select(AgencyInvoice).where(AgencyInvoice.agency_id == agency_id)

    if status:
        query = query.where(AgencyInvoice.status == status.value)

    if brand_name:
        query = query.where(AgencyInvoice.brand_name.ilike(f"%{brand_name}%"))

    if start_date:
        query = query.where(AgencyInvoice.created_at >= start_date)

    if end_date:
        query = query.where(AgencyInvoice.created_at <= end_date)

    query = query.order_by(AgencyInvoice.created_at.desc())

    result = await db.execute(query)
    invoices = result.scalars().all()

    return [
        InvoiceResponse(
            id=inv.id,
            agency_id=inv.agency_id,
            invoice_number=inv.invoice_number,
            deal_id=inv.deal_id,
            campaign_id=inv.campaign_id,
            brand_name=inv.brand_name,
            brand_contact_name=inv.brand_contact_name,
            brand_contact_email=inv.brand_contact_email,
            billing_address=inv.billing_address,
            subtotal=inv.subtotal,
            tax_rate=inv.tax_rate,
            tax_amount=inv.tax_amount,
            discount_amount=inv.discount_amount,
            total_amount=inv.total_amount,
            currency=inv.currency,
            status=inv.status,
            due_date=inv.due_date,
            sent_at=inv.sent_at,
            viewed_at=inv.viewed_at,
            paid_at=inv.paid_at,
            paid_amount=inv.paid_amount,
            payment_method=inv.payment_method,
            line_items=inv.line_items or [],
            notes=inv.notes,
            terms=inv.terms,
            pdf_url=inv.pdf_url,
            created_at=inv.created_at,
        )
        for inv in invoices
    ]


@router.get("/invoices/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: UUID,
    agency_id: UUID = Depends(get_user_agency_id),
    db: AsyncSession = Depends(get_async_session),
) -> Any:
    """Get a single invoice."""
    result = await db.execute(
        select(AgencyInvoice).where(
            AgencyInvoice.id == invoice_id,
            AgencyInvoice.agency_id == agency_id,
        )
    )
    inv = result.scalar_one_or_none()

    if not inv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )

    return InvoiceResponse(
        id=inv.id,
        agency_id=inv.agency_id,
        invoice_number=inv.invoice_number,
        deal_id=inv.deal_id,
        campaign_id=inv.campaign_id,
        brand_name=inv.brand_name,
        brand_contact_name=inv.brand_contact_name,
        brand_contact_email=inv.brand_contact_email,
        billing_address=inv.billing_address,
        subtotal=inv.subtotal,
        tax_rate=inv.tax_rate,
        tax_amount=inv.tax_amount,
        discount_amount=inv.discount_amount,
        total_amount=inv.total_amount,
        currency=inv.currency,
        status=inv.status,
        due_date=inv.due_date,
        sent_at=inv.sent_at,
        viewed_at=inv.viewed_at,
        paid_at=inv.paid_at,
        paid_amount=inv.paid_amount,
        payment_method=inv.payment_method,
        line_items=inv.line_items or [],
        notes=inv.notes,
        terms=inv.terms,
        pdf_url=inv.pdf_url,
        created_at=inv.created_at,
    )


@router.post("/invoices", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
async def create_invoice(
    data: InvoiceCreate,
    current_user: User = Depends(get_current_user),
    agency_id: UUID = Depends(get_user_agency_id),
    db: AsyncSession = Depends(get_async_session),
) -> Any:
    """Create a new invoice."""
    invoice_number = await generate_invoice_number(db, agency_id)

    # Convert line items to dict
    line_items = [item.model_dump() for item in data.line_items] if data.line_items else []

    invoice = AgencyInvoice(
        id=uuid4(),
        agency_id=agency_id,
        invoice_number=invoice_number,
        deal_id=data.deal_id,
        campaign_id=data.campaign_id,
        brand_name=data.brand_name,
        brand_contact_name=data.brand_contact_name,
        brand_contact_email=data.brand_contact_email,
        billing_address=data.billing_address,
        subtotal=data.subtotal,
        tax_rate=data.tax_rate,
        tax_amount=data.tax_amount,
        discount_amount=data.discount_amount,
        total_amount=data.total_amount,
        currency=data.currency,
        status='draft',
        due_date=data.due_date,
        line_items=line_items,
        notes=data.notes,
        terms=data.terms,
    )
    db.add(invoice)

    await log_activity(
        db, agency_id, current_user.id, current_user.full_name or "User",
        "created", "invoice", invoice.id, invoice_number,
        f"Created invoice #{invoice_number} for {data.brand_name}"
    )

    await db.commit()
    await db.refresh(invoice)

    return InvoiceResponse(
        id=invoice.id,
        agency_id=invoice.agency_id,
        invoice_number=invoice.invoice_number,
        deal_id=invoice.deal_id,
        campaign_id=invoice.campaign_id,
        brand_name=invoice.brand_name,
        brand_contact_name=invoice.brand_contact_name,
        brand_contact_email=invoice.brand_contact_email,
        billing_address=invoice.billing_address,
        subtotal=invoice.subtotal,
        tax_rate=invoice.tax_rate,
        tax_amount=invoice.tax_amount,
        discount_amount=invoice.discount_amount,
        total_amount=invoice.total_amount,
        currency=invoice.currency,
        status=invoice.status,
        due_date=invoice.due_date,
        sent_at=invoice.sent_at,
        viewed_at=invoice.viewed_at,
        paid_at=invoice.paid_at,
        paid_amount=invoice.paid_amount,
        payment_method=invoice.payment_method,
        line_items=invoice.line_items or [],
        notes=invoice.notes,
        terms=invoice.terms,
        pdf_url=invoice.pdf_url,
        created_at=invoice.created_at,
    )


@router.patch("/invoices/{invoice_id}", response_model=InvoiceResponse)
async def update_invoice(
    invoice_id: UUID,
    data: InvoiceUpdate,
    agency_id: UUID = Depends(get_user_agency_id),
    db: AsyncSession = Depends(get_async_session),
) -> Any:
    """Update an invoice."""
    result = await db.execute(
        select(AgencyInvoice).where(
            AgencyInvoice.id == invoice_id,
            AgencyInvoice.agency_id == agency_id,
        )
    )
    invoice = result.scalar_one_or_none()

    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )

    # Can't update paid invoices
    if invoice.status == 'paid':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot update paid invoice",
        )

    update_data = data.model_dump(exclude_unset=True)

    if 'status' in update_data and update_data['status']:
        update_data['status'] = update_data['status'].value

    if 'line_items' in update_data and update_data['line_items']:
        update_data['line_items'] = [item.model_dump() for item in update_data['line_items']]

    for field, value in update_data.items():
        setattr(invoice, field, value)

    await db.commit()
    await db.refresh(invoice)

    return InvoiceResponse(
        id=invoice.id,
        agency_id=invoice.agency_id,
        invoice_number=invoice.invoice_number,
        deal_id=invoice.deal_id,
        campaign_id=invoice.campaign_id,
        brand_name=invoice.brand_name,
        brand_contact_name=invoice.brand_contact_name,
        brand_contact_email=invoice.brand_contact_email,
        billing_address=invoice.billing_address,
        subtotal=invoice.subtotal,
        tax_rate=invoice.tax_rate,
        tax_amount=invoice.tax_amount,
        discount_amount=invoice.discount_amount,
        total_amount=invoice.total_amount,
        currency=invoice.currency,
        status=invoice.status,
        due_date=invoice.due_date,
        sent_at=invoice.sent_at,
        viewed_at=invoice.viewed_at,
        paid_at=invoice.paid_at,
        paid_amount=invoice.paid_amount,
        payment_method=invoice.payment_method,
        line_items=invoice.line_items or [],
        notes=invoice.notes,
        terms=invoice.terms,
        pdf_url=invoice.pdf_url,
        created_at=invoice.created_at,
    )


@router.post("/invoices/{invoice_id}/send", response_model=InvoiceResponse)
async def send_invoice(
    invoice_id: UUID,
    data: InvoiceSendRequest,
    current_user: User = Depends(get_current_user),
    agency_id: UUID = Depends(get_user_agency_id),
    db: AsyncSession = Depends(get_async_session),
) -> Any:
    """Send an invoice to the client."""
    result = await db.execute(
        select(AgencyInvoice).where(
            AgencyInvoice.id == invoice_id,
            AgencyInvoice.agency_id == agency_id,
        )
    )
    invoice = result.scalar_one_or_none()

    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )

    invoice.status = 'sent'
    invoice.sent_at = datetime.utcnow()
    invoice.brand_contact_email = data.email

    # TODO: Actually send the invoice email
    # For now, just update the status

    await log_activity(
        db, agency_id, current_user.id, current_user.full_name or "User",
        "sent", "invoice", invoice.id, invoice.invoice_number,
        f"Sent invoice #{invoice.invoice_number} to {data.email}"
    )

    await db.commit()
    await db.refresh(invoice)

    return InvoiceResponse(
        id=invoice.id,
        agency_id=invoice.agency_id,
        invoice_number=invoice.invoice_number,
        deal_id=invoice.deal_id,
        campaign_id=invoice.campaign_id,
        brand_name=invoice.brand_name,
        brand_contact_name=invoice.brand_contact_name,
        brand_contact_email=invoice.brand_contact_email,
        billing_address=invoice.billing_address,
        subtotal=invoice.subtotal,
        tax_rate=invoice.tax_rate,
        tax_amount=invoice.tax_amount,
        discount_amount=invoice.discount_amount,
        total_amount=invoice.total_amount,
        currency=invoice.currency,
        status=invoice.status,
        due_date=invoice.due_date,
        sent_at=invoice.sent_at,
        viewed_at=invoice.viewed_at,
        paid_at=invoice.paid_at,
        paid_amount=invoice.paid_amount,
        payment_method=invoice.payment_method,
        line_items=invoice.line_items or [],
        notes=invoice.notes,
        terms=invoice.terms,
        pdf_url=invoice.pdf_url,
        created_at=invoice.created_at,
    )


@router.post("/invoices/{invoice_id}/mark-paid", response_model=InvoiceResponse)
async def mark_invoice_paid(
    invoice_id: UUID,
    data: InvoiceMarkPaidRequest,
    current_user: User = Depends(get_current_user),
    agency_id: UUID = Depends(get_user_agency_id),
    db: AsyncSession = Depends(get_async_session),
) -> Any:
    """Mark an invoice as paid."""
    result = await db.execute(
        select(AgencyInvoice).where(
            AgencyInvoice.id == invoice_id,
            AgencyInvoice.agency_id == agency_id,
        )
    )
    invoice = result.scalar_one_or_none()

    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )

    if invoice.status == 'paid':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invoice already paid",
        )

    invoice.status = 'paid'
    invoice.paid_at = data.paid_date
    invoice.paid_amount = data.paid_amount
    invoice.payment_method = data.payment_method
    invoice.payment_reference = data.reference

    await log_activity(
        db, agency_id, current_user.id, current_user.full_name or "User",
        "paid", "invoice", invoice.id, invoice.invoice_number,
        f"Marked invoice #{invoice.invoice_number} as paid ({invoice.currency} {data.paid_amount})"
    )

    await db.commit()
    await db.refresh(invoice)

    return InvoiceResponse(
        id=invoice.id,
        agency_id=invoice.agency_id,
        invoice_number=invoice.invoice_number,
        deal_id=invoice.deal_id,
        campaign_id=invoice.campaign_id,
        brand_name=invoice.brand_name,
        brand_contact_name=invoice.brand_contact_name,
        brand_contact_email=invoice.brand_contact_email,
        billing_address=invoice.billing_address,
        subtotal=invoice.subtotal,
        tax_rate=invoice.tax_rate,
        tax_amount=invoice.tax_amount,
        discount_amount=invoice.discount_amount,
        total_amount=invoice.total_amount,
        currency=invoice.currency,
        status=invoice.status,
        due_date=invoice.due_date,
        sent_at=invoice.sent_at,
        viewed_at=invoice.viewed_at,
        paid_at=invoice.paid_at,
        paid_amount=invoice.paid_amount,
        payment_method=invoice.payment_method,
        line_items=invoice.line_items or [],
        notes=invoice.notes,
        terms=invoice.terms,
        pdf_url=invoice.pdf_url,
        created_at=invoice.created_at,
    )


@router.delete("/invoices/{invoice_id}")
async def delete_invoice(
    invoice_id: UUID,
    agency_id: UUID = Depends(get_user_agency_id),
    db: AsyncSession = Depends(get_async_session),
) -> Any:
    """Delete an invoice (only drafts)."""
    result = await db.execute(
        select(AgencyInvoice).where(
            AgencyInvoice.id == invoice_id,
            AgencyInvoice.agency_id == agency_id,
        )
    )
    invoice = result.scalar_one_or_none()

    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )

    if invoice.status != 'draft':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only delete draft invoices",
        )

    await db.delete(invoice)
    await db.commit()

    return {"message": "Invoice deleted"}


# ============================================
# Payout Endpoints
# ============================================

@router.get("/payouts", response_model=List[PayoutResponse])
async def list_payouts(
    status: Optional[PayoutStatus] = None,
    creator_id: Optional[UUID] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    agency_id: UUID = Depends(get_user_agency_id),
    db: AsyncSession = Depends(get_async_session),
) -> Any:
    """List all creator payouts."""
    query = (
        select(CreatorPayout)
        .options(selectinload(CreatorPayout.creator))
        .where(CreatorPayout.agency_id == agency_id)
    )

    if status:
        query = query.where(CreatorPayout.status == status.value)

    if creator_id:
        query = query.where(CreatorPayout.creator_id == creator_id)

    if start_date:
        query = query.where(CreatorPayout.created_at >= start_date)

    if end_date:
        query = query.where(CreatorPayout.created_at <= end_date)

    query = query.order_by(CreatorPayout.due_date.asc())

    result = await db.execute(query)
    payouts = result.scalars().all()

    return [
        PayoutResponse(
            id=p.id,
            agency_id=p.agency_id,
            creator_id=p.creator_id,
            creator_name=p.creator.full_name if p.creator else "Unknown",
            campaign_id=p.campaign_id,
            campaign_name=p.campaign_name,
            brand_name=p.brand_name,
            invoice_id=p.invoice_id,
            amount=p.amount,
            currency=p.currency,
            agency_fee=p.agency_fee,
            status=p.status,
            due_date=p.due_date,
            approved_at=p.approved_at,
            paid_at=p.paid_at,
            payment_method=p.payment_method,
            transaction_reference=p.transaction_reference,
            notes=p.notes,
            created_at=p.created_at,
        )
        for p in payouts
    ]


@router.post("/payouts/{payout_id}/mark-paid", response_model=PayoutResponse)
async def mark_payout_paid(
    payout_id: UUID,
    data: PayoutMarkPaidRequest,
    current_user: User = Depends(get_current_user),
    agency_id: UUID = Depends(get_user_agency_id),
    db: AsyncSession = Depends(get_async_session),
) -> Any:
    """Mark a payout as paid."""
    result = await db.execute(
        select(CreatorPayout)
        .options(selectinload(CreatorPayout.creator))
        .where(
            CreatorPayout.id == payout_id,
            CreatorPayout.agency_id == agency_id,
        )
    )
    payout = result.scalar_one_or_none()

    if not payout:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payout not found",
        )

    if payout.status == 'paid':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payout already marked as paid",
        )

    payout.status = 'paid'
    payout.paid_at = data.paid_date
    payout.payment_method = data.payment_method
    payout.transaction_reference = data.transaction_reference

    creator_name = payout.creator.full_name if payout.creator else "Creator"

    await log_activity(
        db, agency_id, current_user.id, current_user.full_name or "User",
        "paid", "payout", payout.id, creator_name,
        f"Paid {payout.currency} {payout.amount} to {creator_name}"
    )

    await db.commit()
    await db.refresh(payout)

    return PayoutResponse(
        id=payout.id,
        agency_id=payout.agency_id,
        creator_id=payout.creator_id,
        creator_name=payout.creator.full_name if payout.creator else "Unknown",
        campaign_id=payout.campaign_id,
        campaign_name=payout.campaign_name,
        brand_name=payout.brand_name,
        invoice_id=payout.invoice_id,
        amount=payout.amount,
        currency=payout.currency,
        agency_fee=payout.agency_fee,
        status=payout.status,
        due_date=payout.due_date,
        approved_at=payout.approved_at,
        paid_at=payout.paid_at,
        payment_method=payout.payment_method,
        transaction_reference=payout.transaction_reference,
        notes=payout.notes,
        created_at=payout.created_at,
    )
