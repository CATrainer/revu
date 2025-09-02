from typing import Any, Dict, List, Optional, Tuple
import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.core.database import get_async_session
from app.core.security import get_current_active_user
from app.models.user import User
from app.services.nl_rule_parser import NaturalLanguageRuleParser, COMMON_PATTERNS
from app.services.approval_queue import ApprovalQueueService
from app.services.template_engine import TemplateEngine
from app.services.ab_testing import ABTestingService
from app.services.rule_scheduler import RuleScheduler

router = APIRouter()

template_engine = TemplateEngine()
ab_service = ABTestingService()
rule_scheduler = RuleScheduler()


def _validate_rule_payload(payload: Dict[str, Any], *, for_update: bool = False) -> Dict[str, Any]:
    name = (payload.get("name") or "").strip()
    if not for_update and not name:
        raise HTTPException(status_code=400, detail="name is required")

    # JSON fields
    trigger_conditions = payload.get("trigger_conditions")
    if trigger_conditions is not None and not isinstance(trigger_conditions, dict):
        raise HTTPException(status_code=400, detail="trigger_conditions must be an object")
    actions = payload.get("actions")
    if actions is not None and not isinstance(actions, (list, dict)):
        raise HTTPException(status_code=400, detail="actions must be a list or object")

    require_approval = payload.get("require_approval")
    if require_approval is not None and not isinstance(require_approval, bool):
        raise HTTPException(status_code=400, detail="require_approval must be boolean")

    response_limit_per_run = payload.get("response_limit_per_run")
    if response_limit_per_run is not None:
        try:
            response_limit_per_run = int(response_limit_per_run)
            if response_limit_per_run < 0:
                raise ValueError()
        except Exception:
            raise HTTPException(status_code=400, detail="response_limit_per_run must be a non-negative integer")

    priority = payload.get("priority")
    if priority is not None:
        try:
            priority = int(priority)
        except Exception:
            raise HTTPException(status_code=400, detail="priority must be an integer")

    return {
        "name": name if name else None,
        "trigger_conditions": trigger_conditions,
        "actions": actions,
        "require_approval": require_approval,
        "response_limit_per_run": response_limit_per_run,
        "priority": priority,
    }


@router.get("/rules")
async def list_rules(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    channel_id: Optional[str] = None,
    enabled: Optional[bool] = None,
    q: Optional[str] = None,
    include_deleted: bool = False,
    limit: int = 100,
    offset: int = 0,
) -> List[Dict[str, Any]]:
    """List rules with optional filtering by channel, enabled, and name/condition query.

    Soft-deleted rules (trigger_conditions._deleted=true) are excluded by default.
    """
    clauses = ["1=1"]
    params: Dict[str, Any] = {"limit": max(1, min(500, int(limit))), "offset": max(0, int(offset))}
    if channel_id:
        clauses.append("channel_id::text = :cid")
        params["cid"] = str(channel_id)
    if enabled is not None:
        clauses.append("enabled = :en")
        params["en"] = bool(enabled)
    if not include_deleted:
        # Exclude rows where trigger_conditions contains {"_deleted": "true"|true}
        clauses.append("NOT (trigger_conditions ? '_deleted' AND trigger_conditions->>'_deleted' = 'true')")
    if q:
        clauses.append("(LOWER(name) LIKE :q OR LOWER(COALESCE(trigger_conditions::text,'')) LIKE :q)")
        params["q"] = f"%{q.lower()}%"

    sql = f"""
        SELECT id, name, enabled, priority, channel_id
        FROM automation_rules
        WHERE {' AND '.join(clauses)}
        ORDER BY priority DESC, updated_at DESC NULLS LAST, name ASC
        LIMIT :limit OFFSET :offset
    """
    res = await db.execute(text(sql), params)
    rows = res.fetchall() or []
    out: List[Dict[str, Any]] = []
    for r in rows:
        m = r._mapping if hasattr(r, "_mapping") else None
        out.append(
            {
                "id": str((m["id"] if m else r[0])),
                "name": (m["name"] if m else r[1]),
                "enabled": bool(m["enabled"] if m else r[2]),
                "priority": int(m["priority"] if m else (r[3] if r[3] is not None else 0)),
                "channel_id": str(m["channel_id"] if m else r[4]) if (m and m.get("channel_id")) or (not m and r[4]) else None,
            }
        )
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
    # Validation
    v = _validate_rule_payload(payload)
    name = v["name"]  # not None here

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

    # Prepare fields (support both old fields and new JSON inputs)
    trigger_conditions = v["trigger_conditions"]
    if trigger_conditions is None:
        classification = payload.get("classification")
        trigger_conditions = {"classification": classification} if classification else {}
    actions = v["actions"]
    if actions is None:
        action_raw = (payload.get("action") or "generate").lower()
        action_map = {"generate": "generate_response", "delete": "delete_comment", "flag": "flag_for_review"}
        actions = [{"type": action_map.get(action_raw, "generate_response")}]
    # Derive canonical single action dict to populate new 'action' column
    if isinstance(actions, list):
        action_obj = actions[0] if actions and isinstance(actions[0], dict) else {}
    elif isinstance(actions, dict):
        action_obj = actions
    else:
        action_obj = {}
    require_approval = bool(v["require_approval"]) if v["require_approval"] is not None else bool(payload.get("require_approval", False))
    response_limit_per_run = v["response_limit_per_run"]
    priority = v["priority"] if v["priority"] is not None else 0

    res = await db.execute(
        text(
            """
                        INSERT INTO automation_rules (
                            channel_id, name, enabled, trigger_conditions, actions, conditions, action, response_limit_per_run, require_approval, priority
                        )
                        VALUES (:cid, :name, TRUE, :conds, :acts, :conds, :act, :limit, :require, :prio)
            RETURNING id, name, enabled, priority
            """
        ),
        {
            "cid": str(channel_id),
            "name": name,
            "conds": trigger_conditions,
            "acts": actions,
                        "act": action_obj,
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


@router.put("/rules/{rule_id}")
async def update_rule(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    rule_id: str,
    payload: Dict[str, Any],
):
    v = _validate_rule_payload(payload, for_update=True)
    # Build dynamic SET clause
    sets: List[str] = ["updated_at = now()"]
    params: Dict[str, Any] = {"rid": rule_id}
    if v["name"] is not None:
        sets.append("name = :name")
        params["name"] = v["name"]
    if v["trigger_conditions"] is not None:
        sets.append("trigger_conditions = :conds::jsonb")
        sets.append("conditions = :conds::jsonb")
        params["conds"] = v["trigger_conditions"]
    if v["actions"] is not None:
        sets.append("actions = :acts::jsonb")
        # derive single action obj
        acts_val = v["actions"]
        if isinstance(acts_val, list):
            action_obj = acts_val[0] if acts_val and isinstance(acts_val[0], dict) else {}
        elif isinstance(acts_val, dict):
            action_obj = acts_val
        else:
            action_obj = {}
        sets.append("action = :act::jsonb")
        params["acts"] = acts_val
        params["act"] = action_obj
    if v["require_approval"] is not None:
        sets.append("require_approval = :req")
        params["req"] = bool(v["require_approval"])
    if v["response_limit_per_run"] is not None:
        sets.append("response_limit_per_run = :rlim")
        params["rlim"] = int(v["response_limit_per_run"])
    if v["priority"] is not None:
        sets.append("priority = :prio")
        params["prio"] = int(v["priority"])

    if len(sets) == 1:
        raise HTTPException(status_code=400, detail="No updatable fields provided")

    res = await db.execute(
        text(
            f"""
            UPDATE automation_rules
            SET {', '.join(sets)}
            WHERE id = :rid
            RETURNING id, name, enabled, priority
            """
        ),
        params,
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


@router.delete("/rules/{rule_id}")
async def soft_delete_rule(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    rule_id: str,
):
    """Soft delete a rule by flagging trigger_conditions._deleted=true and disabling it."""
    res = await db.execute(
        text(
            """
            UPDATE automation_rules
            SET
              enabled = FALSE,
              trigger_conditions = jsonb_set(COALESCE(trigger_conditions, '{}'::jsonb), '{_deleted}', 'true'::jsonb, true),
              conditions = jsonb_set(COALESCE(conditions, '{}'::jsonb), '{_deleted}', 'true'::jsonb, true),
              updated_at = now()
            WHERE id = :rid
            RETURNING id
            """
        ),
        {"rid": rule_id},
    )
    row = res.first()
    if not row:
        raise HTTPException(status_code=404, detail="Rule not found")
    await db.commit()
    return {"status": "ok", "id": str(row[0])}


@router.post("/rules/{rule_id}/toggle")
async def toggle_rule(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    rule_id: str,
    payload: Optional[Dict[str, Any]] = None,
):
    """Enable/disable a rule. If payload.enabled provided, set to that; else toggle."""
    enabled = None if not payload else payload.get("enabled")
    if enabled is None:
        res = await db.execute(text("SELECT enabled FROM automation_rules WHERE id = :rid"), {"rid": rule_id})
        row = res.first()
        if not row:
            raise HTTPException(status_code=404, detail="Rule not found")
        new_val = not bool(row[0])
    else:
        new_val = bool(enabled)

    res = await db.execute(
        text(
            """
            UPDATE automation_rules SET enabled = :en, updated_at = now() WHERE id = :rid
            RETURNING id, name, enabled, priority
            """
        ),
        {"en": new_val, "rid": rule_id},
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


@router.post("/rules/{rule_id}/duplicate")
async def duplicate_rule(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    rule_id: str,
):
    # Fetch source
    res = await db.execute(
        text(
            """
            SELECT channel_id, name, trigger_conditions, actions, conditions, action, response_limit_per_run, require_approval, priority
            FROM automation_rules
            WHERE id = :rid
            """
        ),
        {"rid": rule_id},
    )
    row = res.first()
    if not row:
        raise HTTPException(status_code=404, detail="Rule not found")

    m = row._mapping if hasattr(row, "_mapping") else None
    channel_id = str(m["channel_id"] if m else row[0])
    name = (m["name"] if m else row[1]) or "Untitled"
    conds = (m["conditions"] if m and m.get("conditions") is not None else (m["trigger_conditions"] if m else row[2])) or {}
    # Remove soft-delete flag if present
    if isinstance(conds, dict) and conds.get("_deleted"):
        conds = {k: v for k, v in conds.items() if k != "_deleted"}
    # Prefer single action dict if present
    act = (m["action"] if m and m.get("action") is not None else (m["actions"] if m else row[3])) or {}
    # If "act" is a list, take first dict
    if isinstance(act, list):
        act_obj = act[0] if act and isinstance(act[0], dict) else {}
        acts = act
    elif isinstance(act, dict):
        act_obj = act
        acts = [act_obj]
    else:
        act_obj = {}
        acts = []
    resp_lim = m["response_limit_per_run"] if m else row[6]
    require = bool(m["require_approval"] if m else row[7])
    prio = int(m["priority"] if m else (row[8] if row[8] is not None else 0))

    # Insert clone (disabled by default)
    res2 = await db.execute(
        text(
            """
            INSERT INTO automation_rules (channel_id, name, enabled, trigger_conditions, actions, conditions, action, response_limit_per_run, require_approval, priority)
            VALUES (:cid, :name, FALSE, :conds::jsonb, :acts::jsonb, :conds::jsonb, :act::jsonb, :rlim, :req, :prio)
            RETURNING id, name, enabled, priority
            """
        ),
        {
            "cid": channel_id,
            "name": f"{name} (copy)",
            "conds": conds,
            "acts": acts,
            "act": act_obj,
            "rlim": resp_lim,
            "req": require,
            "prio": prio,
        },
    )
    new_row = res2.first()
    await db.commit()
    return {
        "id": str(new_row[0]),
        "name": new_row[1],
        "enabled": bool(new_row[2]),
        "priority": int(new_row[3]) if new_row[3] is not None else 0,
    }


@router.post("/rules/parse-natural")
async def parse_natural_rule(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    payload: Dict[str, Any],
):
    """Parse a natural-language rule into structured config, suggest improvements and similar rules, and optionally save.

    Request body:
    - text or description: str (required)
    - channel_id: str (optional, inferred if missing)
    - confirm: bool (optional, default false)
    - name: str (required if confirm=true)
    - overrides/modifications: object to tweak parsed rule before save; keys: conditions, action, limits, timing, scope,
      require_approval, response_limit_per_run, priority, enabled.
    """
    text_input = (payload.get("text") or payload.get("description") or "").strip()
    if not text_input:
        raise HTTPException(status_code=400, detail="text is required")

    # Determine channel_id (for logging and similar rule suggestions)
    channel_id: Optional[str] = payload.get("channel_id")
    if not channel_id:
        res = await db.execute(
            text("SELECT channel_id FROM polling_config ORDER BY updated_at DESC NULLS LAST LIMIT 1")
        )
        row = res.first()
        if row and row[0]:
            channel_id = str(row[0])

    parser = NaturalLanguageRuleParser()
    # Use a safe fallback for channel_id in parser logging
    parser_channel_id = channel_id or "00000000-0000-0000-0000-000000000000"
    parse_res = await parser.parse_user_input(db, channel_id=parser_channel_id, text_input=text_input)
    rule = parse_res.rule or {}
    improvements = await parser.suggest_improvements(db, channel_id=parser_channel_id, rule=rule) if rule else []

    # Apply user overrides if provided
    overrides = payload.get("overrides") or payload.get("modifications") or {}
    def merge_dict(base: Dict[str, Any], upd: Any) -> Dict[str, Any]:
        if isinstance(upd, dict):
            out = dict(base)
            out.update(upd)
            return out
        return base

    preview = {
        "conditions": merge_dict(rule.get("conditions", {}), overrides.get("conditions")),
        "action": merge_dict(rule.get("action", {}), overrides.get("action")),
        "limits": merge_dict(rule.get("limits", {}), overrides.get("limits")),
        "timing": merge_dict(rule.get("timing", {}), overrides.get("timing")),
        "scope": merge_dict(rule.get("scope", {}), overrides.get("scope")),
        "require_approval": bool(overrides.get("require_approval", rule.get("require_approval", False))),
    }
    response_limit_per_run = overrides.get("response_limit_per_run")
    try:
        response_limit_per_run = int(response_limit_per_run) if response_limit_per_run is not None else None
    except Exception:
        raise HTTPException(status_code=400, detail="response_limit_per_run must be integer if provided")
    priority = overrides.get("priority")
    try:
        priority = int(priority) if priority is not None else 0
    except Exception:
        raise HTTPException(status_code=400, detail="priority must be integer if provided")
    enable_on_save = bool(overrides.get("enabled", False))

    # Suggest similar rules (avoid duplicates) only if we have channel_id
    similar_rules: List[Dict[str, Any]] = []
    if channel_id:
        res = await db.execute(
            text(
                """
                SELECT id, name, enabled, priority, conditions, action
                FROM automation_rules
                WHERE channel_id = :cid
                """
            ),
            {"cid": str(channel_id)},
        )
        rows = res.fetchall() or []
        p_cls = (preview.get("conditions", {}) or {}).get("classification")
        p_kws = set((preview.get("conditions", {}) or {}).get("keywords") or [])
        p_act = (preview.get("action", {}) or {}).get("type")
        scored: List[Tuple[int, Dict[str, Any]]] = []
        for r in rows:
            m = r._mapping if hasattr(r, "_mapping") else None
            conds = (m["conditions"] if m else r[4]) or {}
            act = (m["action"] if m else r[5]) or {}
            score = 0
            if p_cls and conds.get("classification") == p_cls:
                score += 2
            kws = set(conds.get("keywords") or [])
            score += min(3, len(p_kws.intersection(kws)))
            if p_act and (act.get("type") == p_act):
                score += 2
            if score >= 2:
                scored.append(
                    (
                        score,
                        {
                            "id": str(m["id"] if m else r[0]),
                            "name": (m["name"] if m else r[1]),
                            "enabled": bool(m["enabled"] if m else r[2]),
                            "priority": int(m["priority"] if m else (r[3] or 0)),
                            "similarity": score,
                        },
                    )
                )
        similar_rules = [x[1] for x in sorted(scored, key=lambda t: t[0], reverse=True)[:3]]

    # If confirm requested, save the rule now (disabled by default unless explicitly enabled)
    if bool(payload.get("confirm")):
        if not channel_id:
            raise HTTPException(status_code=400, detail="channel_id is required to save a rule")
        name = (payload.get("name") or payload.get("rule_name") or "").strip()
        if not name:
            raise HTTPException(status_code=400, detail="name is required when confirm=true")
        # Prepare legacy and new columns
        # Legacy trigger_conditions/actions
        trigger_conditions = preview["conditions"]
        acts_list: List[Dict[str, Any]]
        if isinstance(preview.get("action"), dict) and preview["action"]:
            acts_list = [preview["action"]]
        elif isinstance(overrides.get("actions"), list):
            acts_list = [a for a in overrides.get("actions") if isinstance(a, dict)]
        else:
            acts_list = []

        res = await db.execute(
            text(
                """
                INSERT INTO automation_rules (
                  channel_id, name, enabled, trigger_conditions, actions, conditions, action, response_limit_per_run, require_approval, priority
                )
                VALUES (:cid, :name, :enabled, :conds, :acts, :conds, :act, :limit, :require, :prio)
                RETURNING id, name, enabled, priority
                """
            ),
            {
                "cid": str(channel_id),
                "name": name,
                "enabled": bool(enable_on_save),
                "conds": trigger_conditions,
                "acts": acts_list,
                "act": (preview.get("action") or {}),
                "limit": response_limit_per_run,
                "require": bool(preview.get("require_approval", False)),
                "prio": int(priority or 0),
            },
        )
        row = res.first()
        await db.commit()
        return {
            "saved": True,
            "record": {
                "id": str(row[0]),
                "name": row[1],
                "enabled": bool(row[2]),
                "priority": int(row[3] or 0),
            },
            "parsed_rule": preview,
            "improvements": improvements,
            "similar_rules": similar_rules,
        }

    # Not saving: return preview for review
    response: Dict[str, Any] = {
        "saved": False,
        "parsed_rule": preview,
        "improvements": improvements,
        "similar_rules": similar_rules,
        "message": "Review parsed_rule. Call again with confirm=true and name to save, optionally with overrides.",
    }
    if not rule:
        response["examples"] = [{"name": ex["name"], "nl": ex["nl"], "rule": ex["rule"]} for ex in COMMON_PATTERNS]
        response["note"] = "Parsing was inconclusive; examples included to guide your phrasing."
    return response


@router.post("/rules/schedule/preview")
async def preview_rule_schedule(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    payload: Dict[str, Any],
):
    """Given a partial rule config (timing, limits, scope), compute whether it's active now
    and the next eligible trigger time. Returns timestamps in UTC and a human string in local tz.

    Expected payload example:
    {"timing": {"timezone": "UTC", "days_of_week": [1,2], "hours": [{"start":9, "end":17}],
      "delay_seconds": {"min": 5, "max": 30}, "blackouts": [{"start":"2025-12-24T00:00:00Z","end":"2025-12-26T23:59:59Z"}]},
     "limits": {"per_minute": 10},
     "scope": {"video_age_hours": {"min":0, "max":48}}}
    """
    rule = {
        "timing": payload.get("timing") or {},
        "limits": payload.get("limits") or {},
        "scope": payload.get("scope") or {},
    }
    now_utc = None  # let scheduler use current time
    active = rule_scheduler.is_schedule_active(rule, now_utc=now_utc)
    next_time = rule_scheduler.next_eligible_time(rule, now_utc=now_utc)
    tz_name = (rule.get("timing") or {}).get("timezone") or "UTC"
    try:
        from zoneinfo import ZoneInfo
        local_tz = ZoneInfo(tz_name)
    except Exception:
        from datetime import timezone as _tz
        local_tz = _tz.utc
    local_str = next_time.astimezone(local_tz).strftime("%Y-%m-%d %H:%M:%S %Z")
    return {
        "active_now": bool(active.active),
        "reason": active.reason,
        "next_trigger_utc": next_time.isoformat(),
        "next_trigger_local": local_str,
        "timezone": tz_name,
    }


@router.post("/rules/{rule_id}/test")
async def test_rule(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    rule_id: str,
    payload: Optional[Dict[str, Any]] = None,
):
    """Run a rule against recent comments (no side-effects) and return a dry-run report.

    Body (optional):
    - sample_size: int (default 50, max 200)
    - status: 'any'|'pending'|'processing'|'completed'|'failed'|'ignored' (default 'any')
    """
    body = payload or {}
    sample_size = body.get("sample_size")
    try:
        sample_size = int(sample_size) if sample_size is not None else 50
    except Exception:
        raise HTTPException(status_code=400, detail="sample_size must be an integer")
    sample_size = max(1, min(200, sample_size))
    status = (body.get("status") or "any").lower()

    # Fetch rule
    res = await db.execute(
        text(
            """
            SELECT id, channel_id, name, enabled, conditions, action, trigger_conditions, actions,
                   require_approval, response_limit_per_run, priority
            FROM automation_rules
            WHERE id = :rid
            """
        ),
        {"rid": rule_id},
    )
    row = res.first()
    if not row:
        raise HTTPException(status_code=404, detail="Rule not found")
    m = row._mapping if hasattr(row, "_mapping") else None
    channel_id = str(m["channel_id"] if m else row[1])
    name = (m["name"] if m else row[2])
    enabled = bool(m["enabled"] if m else row[3])
    conds = (m["conditions"] if m and m.get("conditions") is not None else (m["trigger_conditions"] if m else row[6])) or {}
    act = (m["action"] if m and m.get("action") is not None else (m["actions"] if m else row[7])) or {}
    if isinstance(act, list):
        act = act[0] if act and isinstance(act[0], dict) else {}
    action_type = (act or {}).get("type") or "generate_response"
    require_approval = bool(m["require_approval"] if m else row[8])
    resp_limit = m["response_limit_per_run"] if m else row[9]
    priority = int(m["priority"] if m else (row[10] or 0))

    # Fetch recent comments for this channel
    where = ["channel_id = :cid"]
    params = {"cid": channel_id, "lim": sample_size}
    if status != "any":
        where.append("status = :st")
        params["st"] = status
    comments_sql = f"""
        SELECT id, comment_id, video_id, content, classification, author_channel_id, author_name, created_at
        FROM comments_queue
        WHERE {' AND '.join(where)}
        ORDER BY created_at DESC
        LIMIT :lim
    """
    cres = await db.execute(text(comments_sql), params)
    rows = cres.fetchall() or []

    def match_keywords(text_val: str, keywords: List[str]) -> List[str]:
        t = (text_val or "").lower()
        found: List[str] = []
        for kw in keywords or []:
            if kw and kw.lower() in t:
                found.append(kw)
        return found

    def author_status_matches(author_channel_id: Optional[str], expected: str) -> Tuple[bool, Optional[str]]:
        if not expected or expected == "any":
            return True, None
        if expected == "owner":
            return (str(author_channel_id or "") == str(channel_id)), None
        # subscriber/new aren't supported with current data
        if expected in {"subscriber", "new"}:
            return False, "unsupported condition with current data"
        return False, None

    results: List[Dict[str, Any]] = []
    actions_breakdown: Dict[str, int] = {"generate_response": 0, "delete_comment": 0, "flag_for_review": 0}
    for r in rows:
        cm = r._mapping if hasattr(r, "_mapping") else None
        content = (cm["content"] if cm else r[3]) or ""
        classification = (cm["classification"] if cm else r[4])
        a_ch = (cm["author_channel_id"] if cm else r[5])

        # Evaluate condition-by-condition
        c = conds or {}
        cls_expected = c.get("classification")
        cls_match = (str(classification or "").lower() == str(cls_expected or "").lower()) if cls_expected else True
        kws_expected = c.get("keywords") or []
        kws_matched = match_keywords(content, kws_expected) if kws_expected else []
        kws_match = True if not kws_expected else bool(kws_matched)
        astatus_expected = str(c.get("author_status") or "")
        astatus_ok, astatus_reason = author_status_matches(a_ch, astatus_expected)

        matched = bool(cls_match and kws_match and astatus_ok)
        would_action = action_type if matched else None
        if matched and would_action in actions_breakdown:
            actions_breakdown[would_action] += 1

        results.append(
            {
                "comment_id": str(cm["comment_id"] if cm else r[1]),
                "preview": (content[:140] + ("…" if len(content) > 140 else "")),
                "classification": classification,
                "matched": matched,
                "would_action": would_action,
                "matched_conditions": {
                    "classification": {"expected": cls_expected, "match": cls_match},
                    "keywords": {"expected": kws_expected, "matched": kws_matched},
                    "author_status": {"expected": astatus_expected or None, "match": astatus_ok, "note": astatus_reason},
                },
                "created_at": cm["created_at"] if cm else r[7],
            }
        )

    # Estimate API costs if active
    est_cost = 0.0
    total_actions = sum(actions_breakdown.values())
    if action_type == "generate_response" and total_actions:
        avg_cost = 0.0
        try:
            avg_res = await db.execute(
                text(
                    """
                    SELECT COALESCE(AVG(estimated_cost_usd), 0)
                    FROM api_usage_log
                    WHERE service_name = 'claude' AND endpoint = 'messages.create' AND estimated_cost_usd > 0
                          AND created_at >= now() - interval '7 days'
                    """
                )
            )
            avg_cost = float(avg_res.scalar() or 0.0)
        except Exception:
            avg_cost = 0.0
        if avg_cost <= 0:
            avg_cost = 0.004  # fallback nominal per-generation estimate
        est_cost = round(avg_cost * total_actions, 6)

    # Identify potential issues/conflicts
    issues: List[str] = []
    if not (conds or {}).get("classification") and not (conds or {}).get("keywords"):
        issues.append("Rule has no classification or keywords; it's very broad and may match too many comments.")
    if action_type == "delete_comment" and not require_approval:
        issues.append("Delete action without approval: ensure safety checks are sufficient or enable require_approval.")
    if isinstance(resp_limit, int) and resp_limit >= 0 and total_actions > resp_limit:
        issues.append("Predicted matches exceed response_limit_per_run; consider tightening conditions or raising the limit.")

    # Conflicts with other enabled rules (same channel)
    conf_res = await db.execute(
        text(
            """
            SELECT id, name, conditions, action, priority
            FROM automation_rules
            WHERE channel_id = :cid AND enabled = true AND id <> :rid
            """
        ),
        {"cid": channel_id, "rid": rule_id},
    )
    conflicts: List[Dict[str, Any]] = []
    p_cls = (conds or {}).get("classification")
    p_kws = set((conds or {}).get("keywords") or [])
    for r in conf_res.fetchall() or []:
        mm = r._mapping if hasattr(r, "_mapping") else None
        c2 = (mm["conditions"] if mm else r[2]) or {}
        a2 = (mm["action"] if mm else r[3]) or {}
        score = 0
        if p_cls and c2.get("classification") == p_cls:
            score += 2
        kws2 = set(c2.get("keywords") or [])
        overlap = p_kws.intersection(kws2)
        score += min(3, len(overlap))
        if score >= 2 and (a2.get("type") != action_type or priority == int(mm["priority"] if mm else (r[4] or 0))):
            conflicts.append(
                {
                    "id": str(mm["id"] if mm else r[0]),
                    "name": (mm["name"] if mm else r[1]),
                    "priority": int(mm["priority"] if mm else (r[4] or 0)),
                    "action_type": a2.get("type"),
                    "overlap_keywords": sorted(list(overlap)),
                }
            )

    # Suggestions
    suggestions: List[str] = []
    if total_actions > (resp_limit or 0) and (resp_limit or 0) > 0:
        suggestions.append("Consider raising response_limit_per_run or narrowing keywords/classification to reduce volume.")
    if action_type == "generate_response" and not ((act or {}).get("config") or {}).get("template"):
        suggestions.append("Add a response template for consistent tone and brevity.")
    if not (conds or {}).get("author_status"):
        suggestions.append("If relevant, set author_status (owner/subscriber/new/any) to refine targeting.")
    if not (conds or {}).get("keywords") and (conds or {}).get("classification"):
        suggestions.append("Add a few keywords to focus the rule on specific topics.")
    if action_type == "delete_comment" and not require_approval:
        suggestions.append("Enable require_approval for delete action, or ensure strong safety validation thresholds.")

    return {
        "rule_summary": {
            "id": str(m["id"] if m else row[0]),
            "name": name,
            "enabled": enabled,
            "action_type": action_type,
            "priority": priority,
            "require_approval": require_approval,
            "response_limit_per_run": resp_limit,
        },
        "tested_count": len(rows),
        "predicted_matches": total_actions,
        "actions_breakdown": actions_breakdown,
        "estimated_api_cost_usd": est_cost,
        "results": results,
        "issues": issues,
        "conflicts": conflicts,
        "suggestions": suggestions,
    }


@router.get("/rules/metrics")
async def rules_metrics(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    rule_ids: Optional[str] = None,
):
    """Return per-rule metrics for today: triggers, success proxy, issues, status.

    Query param:
    - rule_ids: comma-separated ids; if omitted, metrics for all rules.
    """
    # Build rule selection
    where = ["1=1"]
    params: Dict[str, Any] = {}
    if rule_ids:
        ids = [s.strip() for s in str(rule_ids).split(",") if s.strip()]
        if not ids:
            return []
        where.append("id = ANY(:ids)")
        params["ids"] = ids

    res = await db.execute(
        text(
            f"""
            SELECT id, name, enabled, priority, conditions, action, require_approval
            FROM automation_rules
            WHERE {' AND '.join(where)}
            """
        ),
        params,
    )
    rules = res.fetchall() or []
    if not rules:
        return []

    out: List[Dict[str, Any]] = []
    # Precompute today's boundary
    # triggers per rule
    for r in rules:
        m = r._mapping if hasattr(r, "_mapping") else None
        rid = str(m["id"] if m else r[0])
        name = (m["name"] if m else r[1])
        enabled = bool(m["enabled"] if m else r[2])
        prio = int(m["priority"] if m else (r[3] or 0))
        conds = (m["conditions"] if m else r[4]) or {}
        act = (m["action"] if m else r[5]) or {}
        if isinstance(act, list):
            act = act[0] if act and isinstance(act[0], dict) else {}
        atype = (act or {}).get("type") or "generate_response"
        require_approval = bool(m["require_approval"] if m else (r[6] or False))

        trig_row = await db.execute(
            text(
                """
                SELECT COUNT(1)
                FROM rule_executions
                WHERE rule_id = :rid AND triggered_at >= date_trunc('day', now())
                """
            ),
            {"rid": rid},
        )
        triggers_today = int(trig_row.scalar() or 0)

        # Success proxy
        successes = 0
        if triggers_today > 0:
            if atype == "generate_response":
                # Consider approved or posted replies for matching comments today
                srow = await db.execute(
                    text(
                        """
                        WITH targets AS (
                          SELECT DISTINCT comment_id
                          FROM rule_executions
                          WHERE rule_id = :rid AND triggered_at >= date_trunc('day', now())
                        )
                        SELECT COUNT(1)
                        FROM ai_responses ar
                        JOIN comments_queue cq ON cq.id = ar.queue_id
                        JOIN targets t ON t.comment_id = cq.comment_id
                        WHERE COALESCE(ar.posted_at, ar.approved_at, ar.created_at) >= date_trunc('day', now())
                        """
                    ),
                    {"rid": rid},
                )
                successes = int(srow.scalar() or 0)
            elif atype == "flag_for_review":
                srow = await db.execute(
                    text(
                        """
                        WITH targets AS (
                          SELECT DISTINCT comment_id
                          FROM rule_executions
                          WHERE rule_id = :rid AND triggered_at >= date_trunc('day', now())
                        )
                        SELECT COUNT(1)
                        FROM comments_queue cq
                        JOIN targets t ON t.comment_id = cq.comment_id
                        WHERE cq.status = 'needs_review' AND cq.updated_at >= date_trunc('day', now())
                        """
                    ),
                    {"rid": rid},
                )
                successes = int(srow.scalar() or 0)
            else:
                # delete_comment: assume attempted equals success (no easy confirm yet)
                successes = triggers_today

        success_rate = float(successes) / float(triggers_today) if triggers_today else 0.0

        # Issues
        issues = 0
        if not ((conds or {}).get("classification") or (conds or {}).get("keywords")):
            issues += 1
        if atype == "delete_comment" and not require_approval:
            issues += 1
        if isinstance(conds, dict) and conds.get("_deleted"):
            issues += 1

        status = "active" if enabled and issues == 0 else ("paused" if not enabled else "error")

        out.append(
            {
                "id": rid,
                "name": name,
                "enabled": enabled,
                "priority": prio,
                "action_type": atype,
                "triggers_today": triggers_today,
                "success_rate": round(success_rate, 4),
                "issues_count": issues,
                "status": status,
            }
        )

    return out


@router.get("/today-stats")
async def get_today_stats(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    channel_id: Optional[str] = None,
):
    """Return today's automation stats: responses generated/posted, deletes, flags, approvals."""
    # Determine channel filter when provided
    cid_clause = ""
    params: Dict[str, Any] = {}
    if channel_id:
        cid_clause = " AND cq.channel_id = :cid"
        params["cid"] = str(channel_id)

    # Start of today (UTC)
    # Using date_trunc('day', now()) for consistency in DB timezone
    params["start"] = None  # placeholder not used as we embed date_trunc in SQL

    # ai_responses joined to comments_queue for channel filter
    q_gen = await db.execute(
        text(
            f"""
            SELECT COUNT(1)
            FROM ai_responses ar
            JOIN comments_queue cq ON cq.id = ar.queue_id
            WHERE ar.created_at >= date_trunc('day', now()){cid_clause}
            """
        ),
        params,
    )
    responses_generated = int(q_gen.scalar() or 0)

    q_post = await db.execute(
        text(
            f"""
            SELECT COUNT(1)
            FROM ai_responses ar
            JOIN comments_queue cq ON cq.id = ar.queue_id
            WHERE ar.posted_at IS NOT NULL AND ar.posted_at >= date_trunc('day', now()){cid_clause}
            """
        ),
        params,
    )
    responses_posted = int(q_post.scalar() or 0)

    # rule_executions for actions today
    q_del = await db.execute(
        text(
            f"""
            SELECT COUNT(1)
            FROM rule_executions re
            WHERE re.triggered_at >= date_trunc('day', now())
              AND (re.action->>'type') = 'delete_comment'
            """
        )
    )
    deletes_attempted = int(q_del.scalar() or 0)

    q_flag = await db.execute(
        text(
            f"""
            SELECT COUNT(1)
            FROM rule_executions re
            WHERE re.triggered_at >= date_trunc('day', now())
              AND (re.action->>'type') = 'flag_for_review'
            """
        )
    )
    flags_set = int(q_flag.scalar() or 0)

    # approvals
    # Ensure approval_queue exists
    await ApprovalQueueService()._ensure_table(db)
    q_pending = await db.execute(text("SELECT COUNT(1) FROM approval_queue WHERE status = 'pending'"))
    approvals_pending = int(q_pending.scalar() or 0)
    q_proc = await db.execute(
        text(
            """
            SELECT COUNT(1)
            FROM approval_queue
            WHERE approved_at IS NOT NULL AND approved_at >= date_trunc('day', now())
                  AND status IN ('approved','auto_approved','rejected')
            """
        )
    )
    approvals_processed = int(q_proc.scalar() or 0)

    return {
        "responses_generated": responses_generated,
        "responses_posted": responses_posted,
        "deletes_attempted": deletes_attempted,
        "flags_set": flags_set,
        "approvals_pending": approvals_pending,
        "approvals_processed": approvals_processed,
    }


# --------------------
# Approval Management
# --------------------

def _normalize_sort(sort: Optional[str]) -> str:
    # Allow known columns only; default priority desc, created_at asc
    if not sort:
        return "priority:desc,created_at:asc"
    parts: List[str] = []
    for seg in str(sort).split(","):
        seg = seg.strip()
        if not seg:
            continue
        if ":" in seg:
            col, direction = seg.split(":", 1)
        else:
            col, direction = seg, "asc"
        col = col.strip()
        direction = direction.strip().lower()
        if col not in {"priority", "created_at", "updated_at"}:
            continue
        if direction not in {"asc", "desc"}:
            direction = "asc"
        parts.append(f"{col} {direction.upper()}")
    return ", ".join(parts) or "priority DESC, created_at ASC"


@router.get("/approvals")
async def list_approvals(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    channel_id: Optional[str] = None,
    status: Optional[str] = "pending",
    min_priority: Optional[int] = None,
    q: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    sort: Optional[str] = None,
) -> Dict[str, Any]:
    """Get approval items with filtering, pagination, and sorting.

    - Filters: channel_id, status (pending/approved/rejected/auto_approved/any), min_priority, text search in payload
    - Pagination: limit/offset
    - Sorting: sort="priority:desc,created_at:asc" (allowed cols: priority, created_at, updated_at)
    """
    svc = ApprovalQueueService()
    # Ensure table exists (idempotent)
    await svc._ensure_table(db)  # private but safe and contained

    limit = max(1, min(200, int(limit)))
    offset = max(0, int(offset))
    order_by = _normalize_sort(sort)

    where = ["1=1"]
    params: Dict[str, Any] = {"limit": limit, "offset": offset}
    if channel_id:
        where.append("channel_id = :cid")
        params["cid"] = str(channel_id)
    st = (status or "").lower() if status else None
    if st and st != "any":
        where.append("status = :st")
        params["st"] = st
    if isinstance(min_priority, int):
        where.append("priority >= :minp")
        params["minp"] = int(min_priority)
    if q:
        where.append("payload::text ILIKE :q")
        params["q"] = f"%{q}%"

    sql = f"""
        SELECT id, channel_id, response_id, payload, priority, status, created_at, updated_at, auto_approve_after, approved_at, approved_by, reason, urgency
        FROM approval_queue
        WHERE {' AND '.join(where)}
        ORDER BY {order_by}
        LIMIT :limit OFFSET :offset
    """
    rows = (await db.execute(text(sql), params)).fetchall() or []

    # total count
    count_sql = f"SELECT COUNT(1) FROM approval_queue WHERE {' AND '.join(where)}"
    total = int((await db.execute(text(count_sql), params)).scalar() or 0)

    out: List[Dict[str, Any]] = []
    for r in rows:
        m = r._mapping if hasattr(r, "_mapping") else None
        out.append(
            {
                "id": str(m["id"] if m else r[0]),
                "channel_id": (m.get("channel_id") if m else r[1]) or None,
                "response_id": (m.get("response_id") if m else r[2]) or None,
                "payload": (m.get("payload") if m else r[3]) or {},
                "priority": int(m.get("priority") if m else r[4] or 0),
                "status": (m.get("status") if m else r[5]) or "pending",
                "created_at": m.get("created_at") if m else r[6],
                "updated_at": m.get("updated_at") if m else r[7],
                "auto_approve_after": m.get("auto_approve_after") if m else r[8],
                "approved_at": m.get("approved_at") if m else r[9],
                "approved_by": m.get("approved_by") if m else r[10],
                "reason": m.get("reason") if m else r[11],
                "urgency": bool(m.get("urgency") if m else r[12] or False),
            }
        )

    return {"items": out, "total": total, "limit": limit, "offset": offset}


@router.post("/approvals/bulk-approve")
async def approvals_bulk_approve(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    payload: Dict[str, Any],
):
    ids = payload.get("ids") or payload.get("approval_ids") or []
    if not isinstance(ids, list) or not ids:
        raise HTTPException(status_code=400, detail="ids array is required")
    approved_by = (payload.get("approved_by") or getattr(current_user, "email", None) or getattr(current_user, "id", None))
    reason = payload.get("reason")
    svc = ApprovalQueueService()
    count = await svc.bulk_approve(db, response_ids=[str(x) for x in ids], approved_by=str(approved_by) if approved_by else None, approval_reason=reason)
    return {"approved": count}


@router.post("/approvals/bulk-reject")
async def approvals_bulk_reject(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    payload: Dict[str, Any],
):
    ids = payload.get("ids") or payload.get("approval_ids") or []
    if not isinstance(ids, list) or not ids:
        raise HTTPException(status_code=400, detail="ids array is required")
    reason = payload.get("reason") or "rejected"

    # Ensure table exists
    await ApprovalQueueService()._ensure_table(db)

    res = await db.execute(
        text(
            """
            UPDATE approval_queue
            SET status = 'rejected', approved_at = now(), approved_by = COALESCE(:by, approved_by), reason = :reason, updated_at = now()
            WHERE id = ANY(:ids)
            RETURNING id
            """
        ),
        {
            "ids": [str(x) for x in ids],
            "by": getattr(current_user, "email", None) or getattr(current_user, "id", None),
            "reason": reason,
        },
    )
    count = len(res.fetchall() or [])
    await db.commit()
    return {"rejected": count}


@router.put("/approvals/{approval_id}")
async def update_approval(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    approval_id: str,
    payload: Dict[str, Any],
):
    """Edit approval item before approval. Allows updating payload (response), priority, auto_approve_after, and reason.
    Does not change status here.
    """
    await ApprovalQueueService()._ensure_table(db)

    sets: List[str] = ["updated_at = now()"]
    params: Dict[str, Any] = {"id": approval_id}
    if "payload" in payload:
        if not isinstance(payload.get("payload"), (dict, list, str)):
            raise HTTPException(status_code=400, detail="payload must be object, list or string")
        sets.append("payload = :p::jsonb")
        pval = payload.get("payload")
        if isinstance(pval, str):
            pval = {"response_text": pval}
        params["p"] = pval
    if "priority" in payload:
        try:
            params["prio"] = int(payload.get("priority"))
        except Exception:
            raise HTTPException(status_code=400, detail="priority must be integer")
        sets.append("priority = :prio")
    if "auto_approve_after" in payload:
        # expect ISO timestamp string; let DB cast
        params["auto"] = payload.get("auto_approve_after")
        sets.append("auto_approve_after = :auto")
    if "reason" in payload:
        params["reason"] = payload.get("reason")
        sets.append("reason = :reason")

    if len(sets) == 1:
        raise HTTPException(status_code=400, detail="No updatable fields provided")

    res = await db.execute(
        text(
            f"""
            UPDATE approval_queue
            SET {', '.join(sets)}
            WHERE id = :id
            RETURNING id
            """
        ),
        params,
    )
    row = res.first()
    if not row:
        raise HTTPException(status_code=404, detail="Approval not found")
    await db.commit()
    return {"status": "ok", "id": str(row[0])}


@router.get("/approvals/stats")
async def approval_stats(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    channel_id: Optional[str] = None,
    days: int = 30,
):
    """Return approval rate statistics for the recent period (default 30 days)."""
    await ApprovalQueueService()._ensure_table(db)
    try:
        days = max(1, min(365, int(days)))
    except Exception:
        days = 30

    where = ["created_at >= now() - (:days || ' days')::interval"]
    params: Dict[str, Any] = {"days": days}
    if channel_id:
        where.append("channel_id = :cid")
        params["cid"] = str(channel_id)

    # totals by status
    sql = f"""
        SELECT status, COUNT(1) as cnt
        FROM approval_queue
        WHERE {' AND '.join(where)}
        GROUP BY status
    """
    rows = (await db.execute(text(sql), params)).fetchall() or []
    by_status: Dict[str, int] = {str(r[0]): int(r[1]) for r in rows}
    total = sum(by_status.values())
    approved = by_status.get("approved", 0) + by_status.get("auto_approved", 0)
    rejected = by_status.get("rejected", 0)
    pending = by_status.get("pending", 0)
    rate = (approved / total) if total else 0.0

    # Avg approval time for approved/auto_approved
    t_sql = f"""
        SELECT EXTRACT(EPOCH FROM AVG(approved_at - created_at))
        FROM approval_queue
        WHERE {' AND '.join(where)} AND status IN ('approved','auto_approved') AND approved_at IS NOT NULL
    """
    avg_seconds = float((await db.execute(text(t_sql), params)).scalar() or 0.0)

    return {
        "window_days": days,
        "total": total,
        "approved": approved,
        "rejected": rejected,
        "pending": pending,
        "approval_rate": round(rate, 4),
        "avg_approval_time_seconds": int(avg_seconds),
        "by_status": by_status,
    }


@router.get("/approvals/analytics")
async def approval_analytics(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    channel_id: Optional[str] = None,
    hours: int = 24,
):
    """Comprehensive analytics for approvals and edits.

    Returns:
    - totals: approved/rejected/pending/approval_rate/avg_approval_time_seconds
    - time_series: [{ts, created, processed}] buckets per hour
    - top_rules: rules generating most approvals
    - most_edited: most frequently edited responses (if data available)
    - edits_by_category: counts by edit_type (if data available)
    """
    await ApprovalQueueService()._ensure_table(db)
    try:
        hours = max(1, min(24 * 30, int(hours)))
    except Exception:
        hours = 24

    where: List[str] = ["created_at >= now() - (:hours || ' hours')::interval"]
    params: Dict[str, Any] = {"hours": hours}
    if channel_id:
        where.append("channel_id = :cid")
        params["cid"] = str(channel_id)

    # Totals and averages
    rows = (await db.execute(text(f"""
        SELECT status, COUNT(1) as cnt
        FROM approval_queue
        WHERE {' AND '.join(where)}
        GROUP BY status
    """), params)).fetchall() or []
    by_status: Dict[str, int] = {str(r[0]): int(r[1]) for r in rows}
    total = sum(by_status.values())
    approved = by_status.get("approved", 0) + by_status.get("auto_approved", 0)
    rejected = by_status.get("rejected", 0)
    pending = by_status.get("pending", 0)
    rate = (approved / total) if total else 0.0

    avg_seconds = float((await db.execute(text(f"""
        SELECT EXTRACT(EPOCH FROM AVG(approved_at - created_at))
        FROM approval_queue
        WHERE {' AND '.join(where)} AND status IN ('approved','auto_approved') AND approved_at IS NOT NULL
    """), params)).scalar() or 0.0)

    # Time series per hour for created and processed
    ts_created = (await db.execute(text(f"""
        SELECT date_trunc('hour', created_at) AS ts, COUNT(1)
        FROM approval_queue
        WHERE {' AND '.join(where)}
        GROUP BY 1
        ORDER BY 1
    """), params)).fetchall() or []

    where_proc = [w.replace("created_at", "approved_at") for w in where]
    ts_processed = (await db.execute(text(f"""
        SELECT date_trunc('hour', approved_at) AS ts, COUNT(1)
        FROM approval_queue
        WHERE {' AND '.join(where_proc)} AND status IN ('approved','auto_approved','rejected') AND approved_at IS NOT NULL
        GROUP BY 1
        ORDER BY 1
    """), params)).fetchall() or []

    def _merge_series(a_rows, b_rows):
        amap: Dict[str, int] = {r[0].isoformat(): int(r[1]) for r in a_rows}
        bmap: Dict[str, int] = {r[0].isoformat(): int(r[1]) for r in b_rows}
        keys = sorted(set(amap.keys()) | set(bmap.keys()))
        return [{"ts": k, "created": amap.get(k, 0), "processed": bmap.get(k, 0)} for k in keys]

    time_series = _merge_series(ts_created, ts_processed)

    # Top rules by approvals (use payload fields if present)
    top_rules_rows = (await db.execute(text(f"""
        SELECT COALESCE(payload->>'rule_id','') as rule_id,
               COALESCE(payload->>'rule_name','') as rule_name,
               COUNT(1) as approvals
        FROM approval_queue
        WHERE {' AND '.join(where_proc)} AND status IN ('approved','auto_approved') AND approved_at IS NOT NULL
        GROUP BY 1,2
        ORDER BY approvals DESC
        LIMIT 10
    """), params)).fetchall() or []
    top_rules = [
        {
            "rule_id": str(r[0]) if r[0] else None,
            "rule_name": str(r[1]) if r[1] else None,
            "approvals": int(r[2]),
        }
        for r in top_rules_rows
    ]

    # Edits analytics (best-effort; table/columns may not exist)
    edits_available = False
    edits_type_available = False
    try:
        cols = (await db.execute(text(
            """
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'automation_learning' AND column_name IN ('original_response','edited_response','edit_type','created_at')
            """
        ))).fetchall() or []
        colset = {str(r[0]) for r in cols}
        edits_available = {'original_response','edited_response','created_at'}.issubset(colset)
        edits_type_available = 'edit_type' in colset
    except Exception:
        edits_available = False
        edits_type_available = False

    most_edited: List[Dict[str, Any]] = []
    edits_by_category: List[Dict[str, Any]] = []
    if edits_available:
        try:
            merows = (await db.execute(text(
                """
                SELECT md5(original_response) as orig_hash,
                       COUNT(1) as edits,
                       MIN(original_response) as sample_orig,
                       MIN(edited_response) as sample_edit
                FROM automation_learning
                WHERE original_response IS NOT NULL AND edited_response IS NOT NULL
                  AND created_at >= now() - (:hours || ' hours')::interval
                GROUP BY 1
                ORDER BY edits DESC
                LIMIT 10
                """
            ), {"hours": hours})).fetchall() or []
            most_edited = [
                {
                    "orig_hash": str(r[0]),
                    "count": int(r[1]),
                    "sample_orig": r[2],
                    "sample_edit": r[3],
                }
                for r in merows
            ]
        except Exception:
            most_edited = []

    if edits_type_available:
        try:
            etrows = (await db.execute(text(
                """
                SELECT COALESCE(NULLIF(TRIM(edit_type), ''), 'unknown') as category, COUNT(1)
                FROM automation_learning
                WHERE edited_response IS NOT NULL AND created_at >= now() - (:hours || ' hours')::interval
                GROUP BY 1
                ORDER BY 2 DESC
                LIMIT 20
                """
            ), {"hours": hours})).fetchall() or []
            edits_by_category = [{"category": str(r[0]), "count": int(r[1])} for r in etrows]
        except Exception:
            edits_by_category = []

    return {
        "window_hours": hours,
        "totals": {
            "total": total,
            "approved": approved,
            "rejected": rejected,
            "pending": pending,
            "approval_rate": round(rate, 4),
            "avg_approval_time_seconds": int(avg_seconds),
        },
        "time_series": time_series,
        "top_rules": top_rules,
        "most_edited": most_edited,
        "edits_by_category": edits_by_category,
    }


# ---------------- Templates API ----------------

@router.get("/templates")
async def list_templates(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    try:
        q = text(
            """
            SELECT id, COALESCE(name, 'Template') AS name, COALESCE(category, '') AS category,
                   template_text,
                   COALESCE(tags, '{}') AS tags,
                   COALESCE(usage_count, 0) AS usage_count,
                   created_at
            FROM response_templates
            ORDER BY usage_count DESC, created_at DESC NULLS LAST
            """
        )
        rows = (await db.execute(q)).mappings().all()
        has_tags = True
    except Exception:
        q = text(
            """
            SELECT id, COALESCE(name, 'Template') AS name, COALESCE(category, '') AS category,
                   template_text,
                   COALESCE(usage_count, 0) AS usage_count,
                   created_at
            FROM response_templates
            ORDER BY usage_count DESC, created_at DESC NULLS LAST
            """
        )
        rows = (await db.execute(q)).mappings().all()
        has_tags = False
    return [
        {
            "id": str(r.get("id")),
            "name": r.get("name"),
            "category": r.get("category"),
            "template_text": r.get("template_text"),
            "variables": None,
            "tags": (r.get("tags") if has_tags else None),
            "performance_score": None,
            "usage_count": int(r.get("usage_count") or 0),
            "created_at": r.get("created_at").isoformat() if r.get("created_at") else None,
        }
        for r in rows
    ]


@router.post("/templates")
async def create_template(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    payload: Dict[str, Any],
):
    name = str(payload.get("name") or "Template")
    category = payload.get("category")
    text_tpl = str(payload.get("template_text") or "")
    ok, invalid = template_engine.validate_template(text_tpl)
    if not ok:
        from fastapi.responses import JSONResponse  # scoped import to avoid top-level import
        return JSONResponse({"error": "invalid_variables", "invalid": invalid}, status_code=400)
    try:
        await db.execute(
            text(
                """
                INSERT INTO response_templates (name, category, template_text, tags, usage_count, created_at)
                VALUES (:n, :c, :t, :tags, 0, now())
                """
            ),
            {"n": name, "c": category, "t": text_tpl, "tags": payload.get("tags") or []},
        )
    except Exception:
        await db.execute(
            text(
                """
                INSERT INTO response_templates (name, category, template_text, usage_count, created_at)
                VALUES (:n, :c, :t, 0, now())
                """
            ),
            {"n": name, "c": category, "t": text_tpl},
        )
    await db.commit()
    return {"saved": True}


@router.put("/templates/{template_id}")
async def update_template(
    *,
    template_id: str,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    payload: Dict[str, Any],
):
    text_tpl = str(payload.get("template_text") or "")
    ok, invalid = template_engine.validate_template(text_tpl)
    if not ok:
        from fastapi.responses import JSONResponse
        return JSONResponse({"error": "invalid_variables", "invalid": invalid}, status_code=400)
    try:
        await db.execute(
            text(
                """
                UPDATE response_templates
                SET name = COALESCE(:n, name), category = :c, template_text = :t, tags = COALESCE(:tags, tags), updated_at = now()
                WHERE id = :id
                """
            ),
            {"id": template_id, "n": payload.get("name"), "c": payload.get("category"), "t": text_tpl, "tags": payload.get("tags")},
        )
    except Exception:
        await db.execute(
            text(
                """
                UPDATE response_templates
                SET name = COALESCE(:n, name), category = :c, template_text = :t, updated_at = now()
                WHERE id = :id
                """
            ),
            {"id": template_id, "n": payload.get("name"), "c": payload.get("category"), "t": text_tpl},
        )
    await db.commit()
    return {"updated": True}


@router.delete("/templates/{template_id}")
async def delete_template(
    *,
    template_id: str,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    await db.execute(text("DELETE FROM response_templates WHERE id = :id"), {"id": template_id})
    await db.commit()
    return {"deleted": True}


@router.post("/templates/preview")
async def preview_template(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    payload: Dict[str, Any],
):
    from fastapi.responses import JSONResponse
    tpl = str(payload.get("template_text") or "")
    data = payload.get("data") or {}
    ok, invalid = template_engine.validate_template(tpl)
    if not ok:
        return JSONResponse({"error": "invalid_variables", "invalid": invalid}, status_code=400)
    res = template_engine.parse_template(tpl, data)
    return {"text": res.text, "variables_used": res.variables_used}


@router.get("/templates/metrics")
async def template_metrics(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    rows = (await db.execute(
        text(
            """
            SELECT rt.id,
                   COALESCE(rt.usage_count, 0) AS usage_count,
                   COALESCE(stats.avg_engagement, 0.0) AS avg_engagement,
                   COALESCE(stats.ctr, 0.0) AS ctr,
                   COALESCE(stats.conversions, 0) AS conversions,
                   COALESCE(stats.impressions, 0) AS impressions
            FROM response_templates rt
            LEFT JOIN (
              SELECT
                CASE WHEN position('::' in variant_id) > 0 THEN split_part(variant_id, '::', 2) ELSE variant_id END as variant,
                SUM(COALESCE((engagement_metrics->>'conversions')::int,0)) AS conversions,
                SUM(COALESCE((engagement_metrics->>'impressions')::int,0)) AS impressions,
                AVG(COALESCE((engagement_metrics->>'engagement')::float, 0.0)) AS avg_engagement,
                CASE WHEN SUM(COALESCE((engagement_metrics->>'impressions')::int,0)) > 0
                     THEN SUM(COALESCE((engagement_metrics->>'conversions')::int,0))::float / NULLIF(SUM(COALESCE((engagement_metrics->>'impressions')::int,0)),0)
                     ELSE 0.0 END AS ctr
              FROM ab_test_results
              GROUP BY 1
            ) stats ON stats.variant = rt.id::text
            """
        )
    )).mappings().all()
    return [
        {
            "id": str(r.get("id")),
            "usage_count": int(r.get("usage_count") or 0),
            "avg_engagement": float(r.get("avg_engagement") or 0.0),
            "ctr": float(r.get("ctr") or 0.0),
            "conversions": int(r.get("conversions") or 0),
            "impressions": int(r.get("impressions") or 0),
        }
        for r in rows
    ]


@router.post("/templates/import")
async def import_templates(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    payload: Dict[str, Any],
):
    items = (payload or {}).get("templates") or []
    for it in items:
        try:
            name = str(it.get("name") or "Template")
            category = it.get("category")
            text_tpl = str(it.get("template_text") or "")
            ok, invalid = template_engine.validate_template(text_tpl)
            if not ok:
                continue
            await db.execute(
                text(
                    """
                    INSERT INTO response_templates (name, category, template_text, usage_count, created_at)
                    VALUES (:n, :c, :t, :u, now())
                    """
                ),
                {"n": name, "c": category, "t": text_tpl, "u": int(it.get("usage_count") or 0)},
            )
        except Exception:
            continue
    try:
        await db.commit()
    except Exception:
        try:
            await db.rollback()
        except Exception:
            pass
    return {"imported": True}


@router.get("/templates/export")
async def export_templates(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    try:
        rows = (await db.execute(text("SELECT id, name, category, template_text, tags, usage_count, created_at FROM response_templates"))).mappings().all()
        with_tags = True
    except Exception:
        rows = (await db.execute(text("SELECT id, name, category, template_text, usage_count, created_at FROM response_templates"))).mappings().all()
        with_tags = False
    return {"templates": [
        {
            "id": str(r.get("id")),
            "name": r.get("name"),
            "category": r.get("category"),
            "template_text": r.get("template_text"),
            "tags": (r.get("tags") if with_tags else None),
            "usage_count": int(r.get("usage_count") or 0),
            "created_at": r.get("created_at").isoformat() if r.get("created_at") else None,
        }
        for r in rows
    ]}


@router.post("/templates/ab-tests")
async def set_ab_tests_for_rules(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    payload: Dict[str, Any],
):
    body = payload or {}
    rid = str(body.get("rule_id") or "")
    test_id = str(body.get("test_id") or "default")
    arr = body.get("variants") or []
    if not isinstance(arr, list):
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="variants must be a list")
    if not rid:
        row = (await db.execute(text("SELECT id FROM automation_rules ORDER BY priority DESC NULLS LAST LIMIT 1"))).first()
        if not row:
            from fastapi.responses import JSONResponse
            return JSONResponse({"error": "no_rules"}, status_code=400)
        rid = str(row[0])
    row = (await db.execute(text("SELECT action FROM automation_rules WHERE id = :rid"), {"rid": rid})).first()
    action: Dict[str, Any] = {}
    if row and row[0] is not None:
        try:
            action = row[0] if isinstance(row[0], dict) else json.loads(row[0])
        except Exception:
            action = {}
    tests = action.get("ab_tests") or {}
    tests[test_id] = [
        {"variant_id": str(v.get("variant_id") or "A"), "weight": float(v.get("weight") or 0.0), "template_id": v.get("template_id")}
        for v in arr
    ]
    action["ab_tests"] = tests
    await db.execute(text("UPDATE automation_rules SET action = :a::jsonb, updated_at = now() WHERE id = :rid"), {"a": json.dumps(action), "rid": rid})
    await db.commit()
    return {"saved": True, "rule_id": rid, "ab_tests": tests}


# ---------------- A/B Tests Dashboard API ----------------

@router.get("/ab-tests/active")
async def list_active_ab_tests(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """List rules that have A/B tests configured, including variants and auto-opt flag."""
    rows = (await db.execute(text("SELECT id, name, action FROM automation_rules ORDER BY updated_at DESC NULLS LAST"))).mappings().all()
    items = []
    for r in rows:
        rid = str(r.get("id"))
        name = r.get("name")
        action = r.get("action")
        try:
            action = action if isinstance(action, dict) else (json.loads(action) if action else {})
        except Exception:
            action = {}
        tests = (action or {}).get("ab_tests") or {}
        if tests:
            items.append({
                "rule_id": rid,
                "name": name,
                "tests": tests,
                "auto_optimize": bool((action or {}).get("ab_tests_auto_optimize")),
            })
    return {"items": items}


@router.get("/ab-tests/{rule_id}/summary")
async def ab_test_summary(
    *,
    rule_id: str,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    test_id: Optional[str] = None,
    window_hours: Optional[int] = None,
):
    """Return per-variant performance stats and winner with significance for a rule/test.
    Optional window_hours restricts to recent results.
    """
    # Optional time window filter
    if window_hours and window_hours > 0:
        rows = (await db.execute(
            text(
                """
                SELECT variant_id, engagement_metrics
                FROM ab_test_results
                WHERE rule_id = :rid AND created_at >= now() - (:w || ' hours')::interval
                """
            ),
            {"rid": rule_id, "w": int(window_hours)},
        )).mappings().all()
        # Temporarily stash rows in-memory and feed into calculator-like aggregator
        def split_vid(v: str) -> Tuple[str, str]:
            if "::" in v:
                a, b = v.split("::", 1)
                return a, b
            return "default", v
        grouped: Dict[str, Dict[str, List[Dict[str, Any]]]] = {}
        for r in rows:
            vid = r.get("variant_id") or "A"
            t, v = split_vid(vid)
            if test_id and t != test_id:
                continue
            grouped.setdefault(t, {}).setdefault(v, []).append(r.get("engagement_metrics") or {})
        # Build stats
        def to_stats(variants: Dict[str, List[Dict[str, Any]]]) -> Dict[str, Dict[str, float | int]]:
            stats: Dict[str, Dict[str, float | int]] = {}
            for v, ms in variants.items():
                n = len(ms)
                conv = sum(int((m or {}).get("conversions", 0)) for m in ms)
                impr = sum(int((m or {}).get("impressions", 0)) for m in ms)
                eng_vals = [float((m or {}).get("engagement", 0.0)) for m in ms if isinstance((m or {}).get("engagement"), (int, float))]
                avg_eng = (sum(eng_vals) / len(eng_vals)) if eng_vals else 0.0
                ctr = (conv / impr) if impr > 0 else 0.0
                stats[v] = {"n": n, "conversions": conv, "impressions": impr, "ctr": ctr, "avg_engagement": avg_eng}
            return stats
        out: Dict[str, Any] = {}
        for tid, variants in grouped.items():
            stats = to_stats(variants)
            # Determine winner using ABTestingService on full set (no window param available), but mimic logic here
            # Prefer CTR else engagement
            elig = {v: s for v, s in stats.items() if int(s.get("n", 0)) >= 20}
            if not elig:
                out[tid] = {"winner": None, "reason": "insufficient_data", "stats": stats}
                continue
            use_ctr = any(s.get("impressions", 0) for s in elig.values())
            metric_key = "ctr" if use_ctr else "avg_engagement"
            best_v = max(elig.items(), key=lambda kv: kv[1][metric_key])[0]
            # compute p-value against next best using ABTestingService helpers
            if use_ctr:
                # find next best by ctr
                next_v = max([(v, s) for v, s in elig.items() if v != best_v], key=lambda kv: kv[1][metric_key])[0] if len(elig) > 1 else None
                if next_v:
                    from app.services.ab_testing import ABTestingService as _ABS
                    pval = _ABS._two_proportion_p_value(  # type: ignore
                        int(elig[best_v]["conversions"]), int(elig[best_v]["impressions"]),
                        int(elig[next_v]["conversions"]), int(elig[next_v]["impressions"]),
                    )
                else:
                    pval = 0.0
            else:
                next_v = max([(v, s) for v, s in elig.items() if v != best_v], key=lambda kv: kv[1][metric_key])[0] if len(elig) > 1 else None
                if next_v:
                    # build arrays
                    a = [float((m or {}).get("engagement", 0.0)) for m in grouped.get(tid, {}).get(best_v, [])]
                    b = [float((m or {}).get("engagement", 0.0)) for m in grouped.get(tid, {}).get(next_v, [])]
                    from app.services.ab_testing import ABTestingService as _ABS
                    pval = _ABS._mean_diff_p_value(a, b)  # type: ignore
                else:
                    pval = 0.0
            out[tid] = {"winner": best_v, "runner_up": next_v, "p_value": pval, "confidence": (1 - pval), "metric": metric_key, "stats": stats}
        return out if (test_id is None) else (out.get(test_id) or {})
    else:
        # Use standard calculator on full dataset
        res = await ab_service.calculate_winner(db, rule_id=rule_id, test_id=test_id)
        # Attach confidence
        for tid, obj in list(res.items()):
            if isinstance(obj, dict) and obj.get("p_value") is not None:
                obj["confidence"] = 1 - float(obj.get("p_value") or 0.0)
        return res if (test_id is None) else (res.get(test_id) or {})


@router.get("/ab-tests/{rule_id}/history")
async def ab_test_history(
    *,
    rule_id: str,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    test_id: Optional[str] = None,
    limit: int = 200,
):
    q = "SELECT variant_id, comment_id, engagement_metrics, created_at FROM ab_test_results WHERE rule_id = :rid"
    params: Dict[str, Any] = {"rid": rule_id}
    if test_id:
        q += " AND variant_id LIKE :prefix"
        params["prefix"] = f"{test_id}::%"
    q += " ORDER BY created_at DESC LIMIT :lim"
    params["lim"] = int(max(1, min(limit, 1000)))
    rows = (await db.execute(text(q), params)).mappings().all()
    return {"items": [
        {
            "variant_id": r.get("variant_id"),
            "comment_id": r.get("comment_id"),
            "metrics": r.get("engagement_metrics") or {},
            "created_at": (r.get("created_at").isoformat() if r.get("created_at") else None),
        }
        for r in rows
    ]}


@router.get("/ab-tests/{rule_id}/export.csv")
async def ab_test_export_csv(
    *,
    rule_id: str,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    test_id: Optional[str] = None,
    since_hours: Optional[int] = None,
):
    q = "SELECT variant_id, comment_id, engagement_metrics, created_at FROM ab_test_results WHERE rule_id = :rid"
    params: Dict[str, Any] = {"rid": rule_id}
    if test_id:
        q += " AND variant_id LIKE :prefix"
        params["prefix"] = f"{test_id}::%"
    if since_hours and since_hours > 0:
        q += " AND created_at >= now() - (:w || ' hours')::interval"
        params["w"] = int(since_hours)
    q += " ORDER BY created_at DESC"
    rows = (await db.execute(text(q), params)).all()
    # build CSV
    import io, csv
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["variant_id", "comment_id", "conversions", "impressions", "engagement", "created_at"])
    for vid, cid, metrics, created_at in rows:
        m = metrics or {}
        writer.writerow([
            vid,
            cid,
            int((m or {}).get("conversions", 0)),
            int((m or {}).get("impressions", 0)),
            float((m or {}).get("engagement", 0.0)),
            created_at.isoformat() if created_at else "",
        ])
    from fastapi import Response
    return Response(content=buf.getvalue(), media_type="text/csv", headers={
        "Content-Disposition": f"attachment; filename=ab_test_{rule_id}.csv"
    })


@router.post("/ab-tests/{rule_id}/auto-optimize")
async def ab_test_auto_optimize(
    *,
    rule_id: str,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    min_samples_per_variant: int = 50,
    significance_threshold: float = 0.05,
):
    res = await ab_service.auto_optimize(
        db,
        rule_id=rule_id,
        min_samples_per_variant=min_samples_per_variant,
        significance_threshold=significance_threshold,
    )
    return res


@router.post("/ab-tests/{rule_id}/auto-optimize/toggle")
async def ab_test_toggle_auto_optimize(
    *,
    rule_id: str,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    payload: Dict[str, Any],
):
    enabled = bool((payload or {}).get("enabled"))
    row = (await db.execute(text("SELECT action FROM automation_rules WHERE id = :rid"), {"rid": rule_id})).first()
    if not row:
        raise HTTPException(status_code=404, detail="rule_not_found")
    try:
        action = row[0] if isinstance(row[0], dict) else json.loads(row[0])
    except Exception:
        action = {}
    action["ab_tests_auto_optimize"] = enabled
    await db.execute(text("UPDATE automation_rules SET action = :act::jsonb, updated_at = now() WHERE id = :rid"), {"act": json.dumps(action), "rid": rule_id})
    await db.commit()
    return {"enabled": enabled}
