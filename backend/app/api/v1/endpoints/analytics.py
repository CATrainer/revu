# For each endpoint file (users.py, organizations.py, etc.), use this template:

"""
[Module name] endpoints.

TODO: Implement endpoints for [module].
"""

from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def placeholder():
    """Placeholder endpoint."""
    return {"message": "TODO: Implement [module] endpoints"}
