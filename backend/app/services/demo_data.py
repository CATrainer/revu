"""Demo data generation service for personas and fake activity."""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession


class DemoDataService:
    """Generate and manage demo data for different personas."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ---- Public API ----
    async def initialize_persona(self, user_email: str, persona_type: str):
        """Demo functionality disabled - models don't exist."""
        raise NotImplementedError("Demo data service disabled for social media focus")

    async def simulate_new_activity(self, account, count: int = 8):
        """Demo functionality disabled - models don't exist."""
        raise NotImplementedError("Demo data service disabled for social media focus")

    async def reset_account(self, user_email: str) -> bool:
        """Demo functionality disabled - models don't exist."""
        raise NotImplementedError("Demo data service disabled for social media focus")
