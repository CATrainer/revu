from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.core.database import get_async_session
from app.core.security import get_current_active_user
from app.models.user import User

router = APIRouter()


@router.get("/rules")
async def list_rules(
    *, db: AsyncSession = Depends(get_async_session), current_user: User = Depends(get_current_active_user)
) -> List[Dict[str, Any]]:
    res = await db.execute(
        text(
            """
            SELECT id, name, enabled, priority
            FROM automation_rules
            ORDER BY priority DESC, name ASC
            """
        )
    )
    rows = res.fetchall()
    out: List[Dict[str, Any]] = []
    for r in rows:
        out.append({
            "id": str(r[0]),
            "name": r[1],
            "enabled": bool(r[2]),
            "priority": int(r[3]) if r[3] is not None else 0,
        })
    return out


@router.post("/rules")
async def create_rule(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    payload: Dict[str, Any],
):
    """Create a new automation rule.

    Expected payload:
    {
      name: str,
      channel_id?: str,
      classification?: str,           # trigger condition
      action: 'generate'|'delete'|'flag',
      require_approval?: bool,
      response_limit_per_run?: int,
      priority?: int
    }
    """
    name = (payload.get("name") or "").strip()
    if not name:
        return {"error": "name is required"}

    # Determine channel_id
    channel_id: Optional[str] = payload.get("channel_id")
    if not channel_id:
        # fallback to most recent polling_config row
        res = await db.execute(
            text(
                """
                SELECT channel_id FROM polling_config ORDER BY updated_at DESC NULLS LAST LIMIT 1
                """
            )
        )
        row = res.first()
        if row and row[0]:
            channel_id = str(row[0])

    if not channel_id:
        return {"error": "channel_id is required"}

    classification = payload.get("classification")
    action_raw = (payload.get("action") or "generate").lower()
    action_map = {
        "generate": "generate_response",
        "delete": "delete_comment",
        "flag": "flag_for_review",
    }
    action_type = action_map.get(action_raw, "generate_response")
    require_approval = bool(payload.get("require_approval", False))
    response_limit_per_run = payload.get("response_limit_per_run")
    try:
        response_limit_per_run = int(response_limit_per_run) if response_limit_per_run is not None else None
    except Exception:
        response_limit_per_run = None
    priority = payload.get("priority")
    try:
        priority = int(priority) if priority is not None else 0
    except Exception:
        priority = 0

    trigger_conditions = {"classification": classification} if classification else {}
    actions = [{"type": action_type}]

    res = await db.execute(
        text(
            """
            INSERT INTO automation_rules (
              channel_id, name, enabled, trigger_conditions, actions, response_limit_per_run, require_approval, priority
            )
            VALUES (:cid, :name, TRUE, :conds, :acts, :limit, :require, :prio)
            RETURNING id, name, enabled, priority
            """
        ),
        {
            "cid": str(channel_id),
            "name": name,
            "conds": trigger_conditions,
            "acts": actions,
            "limit": response_limit_per_run,
            "require": require_approval,
            "prio": priority,
        },
    )
    row = res.first()
    await db.commit()
    return {
        "id": str(row[0]),
        "name": row[1],
        "enabled": bool(row[2]),
        "priority": int(row[3]) if row[3] is not None else 0,
    }


@router.patch("/rules/{rule_id}/enabled")
async def set_rule_enabled(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    rule_id: str,
    payload: Dict[str, Any],
):
    enabled = payload.get("enabled")
    if enabled is None:
        return {"error": "enabled is required"}
    res = await db.execute(
        text(
            """
            UPDATE automation_rules
            SET enabled = :en
            WHERE id = :rid
            RETURNING id, name, enabled, priority
            """
        ),
        {"en": bool(enabled), "rid": rule_id},
    )
    row = res.first()
    if not row:
        raise HTTPException(status_code=404, detail="Rule not found")
    await db.commit()
    return {
        "id": str(row[0]),
        "name": row[1],
        "enabled": bool(row[2]),
        "priority": int(row[3]) if row[3] is not None else 0,
    }
