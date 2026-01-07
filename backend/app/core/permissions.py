"""
Agency permission enforcement system.

Provides decorators and utilities for checking user permissions
within an agency context.
"""

from enum import Enum
from functools import wraps
from typing import Callable, List, Optional, Union
from uuid import UUID

from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.core.database import get_async_session
from app.core.security import get_current_user
from app.models.user import User
from app.models.agency import Agency, AgencyMember


class AgencyRole(str, Enum):
    """Agency member roles with hierarchical permissions."""
    OWNER = "owner"
    ADMIN = "admin"
    MEMBER = "member"


class Permission(str, Enum):
    """Available permissions in the agency system."""
    # Agency management
    VIEW_AGENCY = "view_agency"
    EDIT_AGENCY = "edit_agency"
    DELETE_AGENCY = "delete_agency"
    
    # Billing
    VIEW_BILLING = "view_billing"
    MANAGE_BILLING = "manage_billing"
    
    # Team management
    VIEW_TEAM = "view_team"
    INVITE_MEMBERS = "invite_members"
    MANAGE_ROLES = "manage_roles"
    REMOVE_MEMBERS = "remove_members"
    
    # Creator management
    VIEW_CREATORS = "view_creators"
    INVITE_CREATORS = "invite_creators"
    REMOVE_CREATORS = "remove_creators"
    MANAGE_CREATOR_ASSIGNMENTS = "manage_creator_assignments"
    
    # Campaigns
    VIEW_CAMPAIGNS = "view_campaigns"
    CREATE_CAMPAIGNS = "create_campaigns"
    EDIT_CAMPAIGNS = "edit_campaigns"
    DELETE_CAMPAIGNS = "delete_campaigns"
    
    # Opportunities
    VIEW_OPPORTUNITIES = "view_opportunities"
    CREATE_OPPORTUNITIES = "create_opportunities"
    EDIT_OPPORTUNITIES = "edit_opportunities"
    DELETE_OPPORTUNITIES = "delete_opportunities"
    
    # Reports
    VIEW_REPORTS = "view_reports"
    EXPORT_REPORTS = "export_reports"
    
    # Settings
    VIEW_SETTINGS = "view_settings"
    EDIT_SETTINGS = "edit_settings"


# Permission mapping for each role
ROLE_PERMISSIONS = {
    AgencyRole.OWNER: [
        # Owner has ALL permissions
        Permission.VIEW_AGENCY, Permission.EDIT_AGENCY, Permission.DELETE_AGENCY,
        Permission.VIEW_BILLING, Permission.MANAGE_BILLING,
        Permission.VIEW_TEAM, Permission.INVITE_MEMBERS, Permission.MANAGE_ROLES, Permission.REMOVE_MEMBERS,
        Permission.VIEW_CREATORS, Permission.INVITE_CREATORS, Permission.REMOVE_CREATORS, Permission.MANAGE_CREATOR_ASSIGNMENTS,
        Permission.VIEW_CAMPAIGNS, Permission.CREATE_CAMPAIGNS, Permission.EDIT_CAMPAIGNS, Permission.DELETE_CAMPAIGNS,
        Permission.VIEW_OPPORTUNITIES, Permission.CREATE_OPPORTUNITIES, Permission.EDIT_OPPORTUNITIES, Permission.DELETE_OPPORTUNITIES,
        Permission.VIEW_REPORTS, Permission.EXPORT_REPORTS,
        Permission.VIEW_SETTINGS, Permission.EDIT_SETTINGS,
    ],
    AgencyRole.ADMIN: [
        # Admin has full access EXCEPT billing and agency deletion
        Permission.VIEW_AGENCY, Permission.EDIT_AGENCY,
        Permission.VIEW_BILLING,  # Can view but not manage
        Permission.VIEW_TEAM, Permission.INVITE_MEMBERS, Permission.MANAGE_ROLES, Permission.REMOVE_MEMBERS,
        Permission.VIEW_CREATORS, Permission.INVITE_CREATORS, Permission.REMOVE_CREATORS, Permission.MANAGE_CREATOR_ASSIGNMENTS,
        Permission.VIEW_CAMPAIGNS, Permission.CREATE_CAMPAIGNS, Permission.EDIT_CAMPAIGNS, Permission.DELETE_CAMPAIGNS,
        Permission.VIEW_OPPORTUNITIES, Permission.CREATE_OPPORTUNITIES, Permission.EDIT_OPPORTUNITIES, Permission.DELETE_OPPORTUNITIES,
        Permission.VIEW_REPORTS, Permission.EXPORT_REPORTS,
        Permission.VIEW_SETTINGS, Permission.EDIT_SETTINGS,
    ],
    AgencyRole.MEMBER: [
        # Member has limited access - view and edit assigned items only
        Permission.VIEW_AGENCY,
        Permission.VIEW_TEAM,
        Permission.VIEW_CREATORS,
        Permission.VIEW_CAMPAIGNS,
        Permission.VIEW_OPPORTUNITIES,
        Permission.VIEW_REPORTS,
        Permission.VIEW_SETTINGS,
    ],
}


def has_permission(role: AgencyRole, permission: Permission) -> bool:
    """Check if a role has a specific permission."""
    return permission in ROLE_PERMISSIONS.get(role, [])


def get_role_permissions(role: AgencyRole) -> List[Permission]:
    """Get all permissions for a role."""
    return ROLE_PERMISSIONS.get(role, [])


class AgencyPermissionChecker:
    """
    Dependency class for checking agency permissions.
    
    Usage:
        @router.get("/endpoint")
        async def endpoint(
            perm: AgencyPermissionChecker = Depends(AgencyPermissionChecker(Permission.VIEW_CAMPAIGNS))
        ):
            # Access perm.user, perm.agency, perm.membership
            pass
    """
    
    def __init__(
        self,
        required_permissions: Union[Permission, List[Permission]],
        allow_any: bool = False,
    ):
        """
        Initialize the permission checker.
        
        Args:
            required_permissions: Single permission or list of permissions required
            allow_any: If True, user needs ANY of the permissions. If False, needs ALL.
        """
        if isinstance(required_permissions, Permission):
            self.required_permissions = [required_permissions]
        else:
            self.required_permissions = required_permissions
        self.allow_any = allow_any
        
        # These will be set during dependency resolution
        self.user: Optional[User] = None
        self.agency: Optional[Agency] = None
        self.membership: Optional[AgencyMember] = None
        self.agency_id: Optional[UUID] = None
    
    async def __call__(
        self,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_async_session),
    ) -> "AgencyPermissionChecker":
        """Dependency injection call."""
        self.user = current_user
        
        # Check user is an agency user
        if current_user.account_type != "agency":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Agency account required",
            )
        
        # Get user's agency membership
        result = await db.execute(
            select(AgencyMember)
            .where(
                and_(
                    AgencyMember.user_id == current_user.id,
                    AgencyMember.status == "active"
                )
            )
        )
        membership = result.scalar_one_or_none()
        
        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not a member of any agency",
            )
        
        self.membership = membership
        self.agency_id = membership.agency_id
        
        # Get agency
        self.agency = await db.get(Agency, membership.agency_id)
        
        # Check permissions
        role = AgencyRole(membership.role)
        user_permissions = get_role_permissions(role)
        
        if self.allow_any:
            # User needs at least one of the required permissions
            has_any = any(p in user_permissions for p in self.required_permissions)
            if not has_any:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Insufficient permissions",
                )
        else:
            # User needs all required permissions
            missing = [p for p in self.required_permissions if p not in user_permissions]
            if missing:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Missing required permissions: {[p.value for p in missing]}",
                )
        
        return self


# Convenience dependency factories
def require_permission(permission: Permission):
    """Create a dependency that requires a specific permission."""
    return Depends(AgencyPermissionChecker(permission))


def require_any_permission(*permissions: Permission):
    """Create a dependency that requires any of the specified permissions."""
    return Depends(AgencyPermissionChecker(list(permissions), allow_any=True))


def require_all_permissions(*permissions: Permission):
    """Create a dependency that requires all of the specified permissions."""
    return Depends(AgencyPermissionChecker(list(permissions), allow_any=False))


# Role-based convenience dependencies
async def require_agency_owner(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
) -> tuple[User, UUID]:
    """Require the current user to be an agency owner."""
    if current_user.account_type != "agency":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Agency account required",
        )
    
    result = await db.execute(
        select(AgencyMember)
        .where(
            and_(
                AgencyMember.user_id == current_user.id,
                AgencyMember.status == "active",
                AgencyMember.role == "owner"
            )
        )
    )
    membership = result.scalar_one_or_none()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Agency owner privileges required",
        )
    
    return current_user, membership.agency_id


async def require_agency_admin_or_owner(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
) -> tuple[User, UUID, str]:
    """Require the current user to be an agency admin or owner."""
    if current_user.account_type != "agency":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Agency account required",
        )
    
    result = await db.execute(
        select(AgencyMember)
        .where(
            and_(
                AgencyMember.user_id == current_user.id,
                AgencyMember.status == "active",
                AgencyMember.role.in_(["owner", "admin"])
            )
        )
    )
    membership = result.scalar_one_or_none()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )
    
    return current_user, membership.agency_id, membership.role


async def require_agency_member(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
) -> tuple[User, UUID, str]:
    """Require the current user to be any agency member."""
    if current_user.account_type != "agency":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Agency account required",
        )
    
    result = await db.execute(
        select(AgencyMember)
        .where(
            and_(
                AgencyMember.user_id == current_user.id,
                AgencyMember.status == "active"
            )
        )
    )
    membership = result.scalar_one_or_none()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Agency membership required",
        )
    
    return current_user, membership.agency_id, membership.role
