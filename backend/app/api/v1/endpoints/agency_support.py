"""
Support ticket endpoints for the internal ticket system.

Handles ticket creation, viewing, and responding.
"""

from datetime import datetime
from typing import Any, List, Optional
from uuid import UUID
import random
import string

from fastapi import APIRouter, Depends, HTTPException, status
from loguru import logger
from pydantic import BaseModel, Field
from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_async_session
from app.core.security import get_current_user
from app.models.user import User
from app.models.support_ticket import SupportTicket, SupportTicketResponse
from app.api.v1.endpoints.agency import get_user_agency_id

router = APIRouter()


# ============================================
# Schemas
# ============================================

class TicketCreate(BaseModel):
    """Schema for creating a new support ticket."""
    category: str = Field(..., min_length=1, max_length=50)
    subject: str = Field(..., min_length=1, max_length=255)
    message: str = Field(..., min_length=10)


class TicketReply(BaseModel):
    """Schema for replying to a ticket."""
    message: str = Field(..., min_length=1)


class TicketResponseSchema(BaseModel):
    """Schema for a ticket response."""
    id: str
    message: str
    is_staff: bool
    created_at: datetime
    author_name: str

    class Config:
        from_attributes = True


class TicketSchema(BaseModel):
    """Schema for a support ticket."""
    id: str
    ticket_number: str
    category: str
    subject: str
    message: str
    status: str
    priority: str
    created_at: datetime
    updated_at: datetime
    responses: List[TicketResponseSchema] = []

    class Config:
        from_attributes = True


class TicketListResponse(BaseModel):
    """Response containing list of tickets."""
    tickets: List[TicketSchema]


# ============================================
# Helper Functions
# ============================================

def generate_ticket_number() -> str:
    """Generate a unique ticket number."""
    timestamp = datetime.utcnow().strftime("%y%m%d")
    random_part = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"TKT-{timestamp}-{random_part}"


def ticket_to_schema(ticket: SupportTicket) -> TicketSchema:
    """Convert a ticket model to schema."""
    return TicketSchema(
        id=str(ticket.id),
        ticket_number=ticket.ticket_number,
        category=ticket.category,
        subject=ticket.subject,
        message=ticket.message,
        status=ticket.status,
        priority=ticket.priority,
        created_at=ticket.created_at,
        updated_at=ticket.updated_at,
        responses=[
            TicketResponseSchema(
                id=str(r.id),
                message=r.message,
                is_staff=r.is_staff,
                created_at=r.created_at,
                author_name=r.author_name
            )
            for r in (ticket.responses or [])
        ]
    )


# ============================================
# Endpoints
# ============================================

@router.get("/tickets", response_model=TicketListResponse)
async def list_tickets(
    current_user: User = Depends(get_current_user),
    agency_id: UUID = Depends(get_user_agency_id),
    db: AsyncSession = Depends(get_async_session),
):
    """List all tickets for the current agency."""
    try:
        result = await db.execute(
            select(SupportTicket)
            .where(SupportTicket.agency_id == agency_id)
            .options(selectinload(SupportTicket.responses))
            .order_by(SupportTicket.updated_at.desc())
        )
        tickets = result.scalars().all()
        
        return TicketListResponse(
            tickets=[ticket_to_schema(t) for t in tickets]
        )
    except Exception as e:
        logger.error(f"Error listing tickets: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve tickets"
        )


@router.post("/tickets", response_model=TicketSchema)
async def create_ticket(
    ticket_data: TicketCreate,
    current_user: User = Depends(get_current_user),
    agency_id: UUID = Depends(get_user_agency_id),
    db: AsyncSession = Depends(get_async_session),
):
    """Create a new support ticket."""
    try:
        # Generate unique ticket number
        ticket_number = generate_ticket_number()
        
        # Create ticket
        ticket = SupportTicket(
            ticket_number=ticket_number,
            agency_id=agency_id,
            user_id=current_user.id,
            category=ticket_data.category,
            subject=ticket_data.subject,
            message=ticket_data.message,
            status="open",
            priority="medium",
        )
        
        db.add(ticket)
        await db.commit()
        await db.refresh(ticket)
        
        # Load responses relationship
        result = await db.execute(
            select(SupportTicket)
            .where(SupportTicket.id == ticket.id)
            .options(selectinload(SupportTicket.responses))
        )
        ticket = result.scalar_one()
        
        logger.info(f"Created support ticket {ticket_number} for agency {agency_id}")
        
        return ticket_to_schema(ticket)
        
    except Exception as e:
        logger.error(f"Error creating ticket: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create ticket"
        )


@router.get("/tickets/{ticket_id}", response_model=TicketSchema)
async def get_ticket(
    ticket_id: UUID,
    current_user: User = Depends(get_current_user),
    agency_id: UUID = Depends(get_user_agency_id),
    db: AsyncSession = Depends(get_async_session),
):
    """Get a specific ticket by ID."""
    try:
        result = await db.execute(
            select(SupportTicket)
            .where(
                and_(
                    SupportTicket.id == ticket_id,
                    SupportTicket.agency_id == agency_id
                )
            )
            .options(selectinload(SupportTicket.responses))
        )
        ticket = result.scalar_one_or_none()
        
        if not ticket:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ticket not found"
            )
        
        return ticket_to_schema(ticket)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting ticket: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve ticket"
        )


@router.post("/tickets/{ticket_id}/reply", response_model=TicketResponseSchema)
async def reply_to_ticket(
    ticket_id: UUID,
    reply_data: TicketReply,
    current_user: User = Depends(get_current_user),
    agency_id: UUID = Depends(get_user_agency_id),
    db: AsyncSession = Depends(get_async_session),
):
    """Add a reply to a ticket."""
    try:
        # Get the ticket
        result = await db.execute(
            select(SupportTicket)
            .where(
                and_(
                    SupportTicket.id == ticket_id,
                    SupportTicket.agency_id == agency_id
                )
            )
        )
        ticket = result.scalar_one_or_none()
        
        if not ticket:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ticket not found"
            )
        
        # Check if ticket is still open
        if ticket.status in ["resolved", "closed"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot reply to a closed ticket"
            )
        
        # Create the response
        response = SupportTicketResponse(
            ticket_id=ticket_id,
            author_id=current_user.id,
            is_staff=False,  # Customer response
            author_name=current_user.full_name or current_user.email,
            message=reply_data.message,
        )
        
        db.add(response)
        
        # Update ticket status to open (from waiting_response if applicable)
        if ticket.status == "waiting_response":
            ticket.status = "open"
        ticket.updated_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(response)
        
        logger.info(f"Added reply to ticket {ticket.ticket_number}")
        
        return TicketResponseSchema(
            id=str(response.id),
            message=response.message,
            is_staff=response.is_staff,
            created_at=response.created_at,
            author_name=response.author_name
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error replying to ticket: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add reply"
        )
