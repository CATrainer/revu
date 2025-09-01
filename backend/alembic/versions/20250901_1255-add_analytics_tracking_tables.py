"""add analytics tracking tables: api_usage_log and response_metrics

Revision ID: 20250901_1255
Revises: 20250901_1240
Create Date: 2025-09-01

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "20250901_1255"
down_revision = "20250901_1240"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    table_names = set(inspector.get_table_names())

    # 1) api_usage_log: track Claude and YouTube API calls
    if "api_usage_log" not in table_names:
        op.create_table(
            "api_usage_log",
            sa.Column(
                "id",
                postgresql.UUID(as_uuid=True),
                server_default=sa.text("gen_random_uuid()"),
                nullable=False,
            ),
            sa.Column("service_name", sa.String(length=100), nullable=False),  # e.g., "claude", "youtube"
            sa.Column("endpoint", sa.String(length=255), nullable=True),
            sa.Column("model", sa.String(length=100), nullable=True),  # for Claude/OpenAI usage
            sa.Column("tokens_input", sa.Integer(), nullable=True),
            sa.Column("tokens_output", sa.Integer(), nullable=True),
            sa.Column("tokens_total", sa.Integer(), nullable=True),
            sa.Column("estimated_cost_usd", sa.Numeric(10, 4), nullable=True),
            sa.Column("latency_ms", sa.Integer(), nullable=True),
            sa.Column("status_code", sa.Integer(), nullable=True),
            sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
            sa.PrimaryKeyConstraint("id"),
        )
    else:
        # Ensure commonly used columns exist (best-effort idempotence)
        existing = {c["name"] for c in inspector.get_columns("api_usage_log")}
        add_cols = []
        if "service_name" not in existing:
            add_cols.append(sa.Column("service_name", sa.String(length=100), nullable=True))
        if "endpoint" not in existing:
            add_cols.append(sa.Column("endpoint", sa.String(length=255), nullable=True))
        if "model" not in existing:
            add_cols.append(sa.Column("model", sa.String(length=100), nullable=True))
        if "tokens_input" not in existing:
            add_cols.append(sa.Column("tokens_input", sa.Integer(), nullable=True))
        if "tokens_output" not in existing:
            add_cols.append(sa.Column("tokens_output", sa.Integer(), nullable=True))
        if "tokens_total" not in existing:
            add_cols.append(sa.Column("tokens_total", sa.Integer(), nullable=True))
        if "estimated_cost_usd" not in existing:
            add_cols.append(sa.Column("estimated_cost_usd", sa.Numeric(10, 4), nullable=True))
        if "latency_ms" not in existing:
            add_cols.append(sa.Column("latency_ms", sa.Integer(), nullable=True))
        if "status_code" not in existing:
            add_cols.append(sa.Column("status_code", sa.Integer(), nullable=True))
        if "metadata" not in existing:
            add_cols.append(sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
        if "created_at" not in existing:
            add_cols.append(sa.Column("created_at", sa.DateTime(timezone=True), nullable=True, server_default=sa.text("now()")))
        for col in add_cols:
            op.add_column("api_usage_log", col)

    # Indexes for api_usage_log (date-based queries and lookups)
    idx_names = {idx["name"] for idx in inspector.get_indexes("api_usage_log")} if "api_usage_log" in table_names else set()
    cols_now = {c["name"] for c in inspector.get_columns("api_usage_log")} if "api_usage_log" in table_names else set()
    if "created_at" in cols_now and "idx_api_usage_created_at" not in idx_names:
        op.create_index("idx_api_usage_created_at", "api_usage_log", ["created_at"])  # btree
    if {"service_name", "created_at"}.issubset(cols_now) and "idx_api_usage_service_date" not in idx_names:
        op.create_index("idx_api_usage_service_date", "api_usage_log", ["service_name", "created_at"])  # btree
    if {"endpoint", "created_at"}.issubset(cols_now) and "idx_api_usage_endpoint_date" not in idx_names:
        op.create_index("idx_api_usage_endpoint_date", "api_usage_log", ["endpoint", "created_at"])  # btree
    # Optional BRIN index for large tables (Postgres-specific)
    try:
        op.execute("CREATE INDEX IF NOT EXISTS idx_api_usage_created_at_brin ON api_usage_log USING BRIN (created_at)")
    except Exception:
        # ignore if not supported
        pass

    # 2) response_metrics: daily stats per channel
    if "response_metrics" not in table_names:
        op.create_table(
            "response_metrics",
            sa.Column(
                "id",
                postgresql.UUID(as_uuid=True),
                server_default=sa.text("gen_random_uuid()"),
                nullable=False,
            ),
            sa.Column("channel_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("stats_date", sa.Date(), nullable=False),
            sa.Column("total_comments", sa.Integer(), nullable=False, server_default=sa.text("0")),
            sa.Column("responses_generated", sa.Integer(), nullable=False, server_default=sa.text("0")),
            sa.Column("responses_posted", sa.Integer(), nullable=False, server_default=sa.text("0")),
            sa.Column("cache_hits", sa.Integer(), nullable=False, server_default=sa.text("0")),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
            sa.ForeignKeyConstraint(["channel_id"], ["youtube_connections.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("channel_id", "stats_date", name="uq_response_metrics_channel_date"),
        )
    else:
        existing = {c["name"] for c in inspector.get_columns("response_metrics")}
        add_cols = []
        if "channel_id" not in existing:
            add_cols.append(sa.Column("channel_id", postgresql.UUID(as_uuid=True), nullable=True))
        if "stats_date" not in existing:
            add_cols.append(sa.Column("stats_date", sa.Date(), nullable=True))
        if "total_comments" not in existing:
            add_cols.append(sa.Column("total_comments", sa.Integer(), nullable=True))
        if "responses_generated" not in existing:
            add_cols.append(sa.Column("responses_generated", sa.Integer(), nullable=True))
        if "responses_posted" not in existing:
            add_cols.append(sa.Column("responses_posted", sa.Integer(), nullable=True))
        if "cache_hits" not in existing:
            add_cols.append(sa.Column("cache_hits", sa.Integer(), nullable=True))
        if "created_at" not in existing:
            add_cols.append(sa.Column("created_at", sa.DateTime(timezone=True), nullable=True, server_default=sa.text("now()")))
        if "updated_at" not in existing:
            add_cols.append(sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True, server_default=sa.text("now()")))
        for col in add_cols:
            op.add_column("response_metrics", col)

        # Ensure unique constraint exists
        uniqs = {uc.get("name") for uc in inspector.get_unique_constraints("response_metrics")}
        if "uq_response_metrics_channel_date" not in (uniqs or set()):
            try:
                op.create_unique_constraint(
                    "uq_response_metrics_channel_date",
                    "response_metrics",
                    ["channel_id", "stats_date"],
                )
            except Exception:
                pass

        # Ensure FK exists
        fks = inspector.get_foreign_keys("response_metrics")
        has_fk = any(
            ("channel_id" in fk.get("constrained_columns", [])) and fk.get("referred_table") == "youtube_connections"
            for fk in fks
        )
        if ("channel_id" in existing) and not has_fk:
            op.create_foreign_key(
                "fk_response_metrics_channel_id_youtube_connections",
                "response_metrics",
                "youtube_connections",
                ["channel_id"],
                ["id"],
                ondelete="CASCADE",
            )

    # Indexes for response_metrics
    if "response_metrics" in table_names or True:
        idx_names_rm = {idx["name"] for idx in inspector.get_indexes("response_metrics")} if "response_metrics" in table_names else set()
        cols_rm = {c["name"] for c in inspector.get_columns("response_metrics")} if "response_metrics" in table_names else set()
        if "stats_date" in cols_rm and "idx_response_metrics_date" not in idx_names_rm:
            op.create_index("idx_response_metrics_date", "response_metrics", ["stats_date"])  # btree
        if {"channel_id", "stats_date"}.issubset(cols_rm) and "idx_response_metrics_channel_date" not in idx_names_rm:
            op.create_index("idx_response_metrics_channel_date", "response_metrics", ["channel_id", "stats_date"])  # btree


def downgrade() -> None:
    # Drop indexes first
    try:
        op.execute("DROP INDEX IF EXISTS idx_api_usage_created_at_brin")
    except Exception:
        pass
    op.execute("DROP INDEX IF EXISTS idx_api_usage_endpoint_date")
    op.execute("DROP INDEX IF EXISTS idx_api_usage_service_date")
    op.execute("DROP INDEX IF EXISTS idx_api_usage_created_at")

    op.execute("DROP INDEX IF EXISTS idx_response_metrics_channel_date")
    op.execute("DROP INDEX IF EXISTS idx_response_metrics_date")

    # Drop tables
    op.execute("DROP TABLE IF EXISTS response_metrics")
    op.execute("DROP TABLE IF EXISTS api_usage_log")
