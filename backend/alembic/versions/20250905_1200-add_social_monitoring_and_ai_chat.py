"""add social monitoring & ai chat tables

Revision ID: 20250905_1200
Revises: 20250829_1510
Create Date: 2025-09-05

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "20250905_1200"
down_revision = "20250829_1510"
branch_labels = None
depends_on = None

# Reusable helpers
UUID = postgresql.UUID(as_uuid=True)
TZDateTime = sa.DateTime(timezone=True)

platform_enum_values = [
    'youtube','tiktok','instagram','twitter','facebook','linkedin','reddit','discord','web','other'
]
status_social_profile = ['active','error','disconnected','disabled']
source_type_values = ['comment','post','reply','mention','dm','review','message']
mention_status_values = ['active','hidden','deleted','flagged']
thread_status_values = ['open','archived','ignored']
competitor_status_values = ['active','archived']
monitor_generated_by_values = ['system','user','schedule']
content_doc_type_values = ['mention','thread','competitor','profile','note','chat','other']
chat_mode_values = ['general','analytics','social','automation','support']
chat_session_status_values = ['active','archived']
chat_role_values = ['user','assistant','system','tool']
scrape_task_type_values = ['profile','thread','mention','competitor','site','other']
scrape_status_values = ['pending','running','succeeded','failed','cancelled']


def upgrade() -> None:
    # pgvector extension (safe if exists)
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # 1. social_profiles
    op.create_table(
        'social_profiles',
        sa.Column('id', UUID, server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', UUID, nullable=False),
        sa.Column('platform', sa.String(), nullable=False),
        sa.Column('handle', sa.String(), nullable=False),
        sa.Column('display_name', sa.String(), nullable=True),
        sa.Column('external_id', sa.String(), nullable=True),
        sa.Column('profile_url', sa.Text(), nullable=True),
        sa.Column('avatar_url', sa.Text(), nullable=True),
        sa.Column('status', sa.String(), nullable=False, server_default='active'),
        sa.Column('last_synced_at', TZDateTime, nullable=True),
        sa.Column('sync_error', sa.Text(), nullable=True),
        sa.Column('created_at', TZDateTime, server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', TZDateTime, server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('user_id','platform','handle', name='uq_social_profiles_user_platform_handle')
    )
    op.create_index('idx_social_profiles_user', 'social_profiles', ['user_id'])
    op.create_index('idx_social_profiles_platform', 'social_profiles', ['platform'])
    op.create_index('idx_social_profiles_status', 'social_profiles', ['status'])

    # 2. social_mentions
    op.create_table(
        'social_mentions',
        sa.Column('id', UUID, server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', UUID, nullable=False),
        sa.Column('social_profile_id', UUID, nullable=True),
        sa.Column('platform', sa.String(), nullable=False),
        sa.Column('source_type', sa.String(), nullable=False),
        sa.Column('external_id', sa.String(), nullable=True),
        sa.Column('author_handle', sa.String(), nullable=True),
        sa.Column('author_display_name', sa.String(), nullable=True),
        sa.Column('author_external_id', sa.String(), nullable=True),
        sa.Column('text', sa.Text(), nullable=False),
        sa.Column('language', sa.String(), nullable=True),
        sa.Column('sentiment', sa.Numeric(5,2), nullable=True),
        sa.Column('toxicity_score', sa.Numeric(5,2), nullable=True),
        sa.Column('spam_score', sa.Numeric(5,2), nullable=True),
        sa.Column('published_at', TZDateTime, nullable=True),
        sa.Column('collected_at', TZDateTime, server_default=sa.text('now()'), nullable=False),
        sa.Column('parent_id', UUID, nullable=True),
        sa.Column('thread_root_id', UUID, nullable=True),
        sa.Column('thread_id', UUID, nullable=True),
        sa.Column('url', sa.Text(), nullable=True),
        sa.Column('status', sa.String(), nullable=False, server_default='active'),
        sa.Column('tags', postgresql.ARRAY(sa.String()), server_default='{}', nullable=False),
        sa.Column('embedding', sa.dialects.postgresql.VECTOR(1536), nullable=True),
        sa.Column('created_at', TZDateTime, server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', TZDateTime, server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['social_profile_id'], ['social_profiles.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['parent_id'], ['social_mentions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['thread_root_id'], ['social_mentions.id'], ondelete='CASCADE')
    )
    op.create_index('idx_social_mentions_user', 'social_mentions', ['user_id'])
    op.create_index('idx_social_mentions_profile', 'social_mentions', ['social_profile_id'])
    op.create_index('idx_social_mentions_platform', 'social_mentions', ['platform'])
    op.create_index('idx_social_mentions_published_at', 'social_mentions', ['published_at'])
    op.create_index('idx_social_mentions_status', 'social_mentions', ['status'])
    op.create_index('idx_social_mentions_thread_root', 'social_mentions', ['thread_root_id'])
    op.create_index('idx_social_mentions_parent', 'social_mentions', ['parent_id'])
    op.execute("CREATE INDEX idx_social_mentions_embedding ON social_mentions USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)")

    # 3. narrative_threads
    op.create_table(
        'narrative_threads',
        sa.Column('id', UUID, server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', UUID, nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('summary', sa.Text(), nullable=True),
        sa.Column('sentiment', sa.Numeric(5,2), nullable=True),
        sa.Column('relevance_score', sa.Numeric(6,3), nullable=True),
        sa.Column('status', sa.String(), nullable=False, server_default='open'),
        sa.Column('category', sa.String(), nullable=True),
        sa.Column('auto_generated', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('first_seen_at', TZDateTime, nullable=True),
        sa.Column('last_seen_at', TZDateTime, nullable=True),
        sa.Column('mention_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('embedding', sa.dialects.postgresql.VECTOR(1536), nullable=True),
        sa.Column('created_at', TZDateTime, server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', TZDateTime, server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE')
    )
    op.create_index('idx_narrative_threads_user', 'narrative_threads', ['user_id'])
    op.create_index('idx_narrative_threads_status', 'narrative_threads', ['status'])
    op.create_index('idx_narrative_threads_last_seen', 'narrative_threads', ['last_seen_at'])
    op.execute("CREATE INDEX idx_narrative_threads_embedding ON narrative_threads USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50)")

    # 4. competitor_profiles
    op.create_table(
        'competitor_profiles',
        sa.Column('id', UUID, server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', UUID, nullable=False),
        sa.Column('platform', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('handle', sa.String(), nullable=True),
        sa.Column('external_id', sa.String(), nullable=True),
        sa.Column('profile_url', sa.Text(), nullable=True),
        sa.Column('avatar_url', sa.Text(), nullable=True),
        sa.Column('tags', postgresql.ARRAY(sa.String()), server_default='{}', nullable=False),
        sa.Column('status', sa.String(), nullable=False, server_default='active'),
        sa.Column('last_synced_at', TZDateTime, nullable=True),
        sa.Column('metrics', postgresql.JSONB, nullable=True),
        sa.Column('created_at', TZDateTime, server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', TZDateTime, server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('user_id','platform','name', name='uq_competitor_profiles_user_platform_name')
    )
    op.create_index('idx_competitor_profiles_user', 'competitor_profiles', ['user_id'])
    op.create_index('idx_competitor_profiles_platform', 'competitor_profiles', ['platform'])
    op.create_index('idx_competitor_profiles_status', 'competitor_profiles', ['status'])

    # 5. monitoring_snapshots
    op.create_table(
        'monitoring_snapshots',
        sa.Column('id', UUID, server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', UUID, nullable=False),
        sa.Column('period_start', TZDateTime, nullable=False),
        sa.Column('period_end', TZDateTime, nullable=False),
        sa.Column('metrics', postgresql.JSONB, nullable=False),
        sa.Column('highlights', postgresql.JSONB, nullable=True),
        sa.Column('threads', postgresql.JSONB, nullable=True),
        sa.Column('generated_by', sa.String(), nullable=False, server_default='system'),
        sa.Column('created_at', TZDateTime, server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE')
    )
    op.create_index('idx_monitoring_snapshots_user', 'monitoring_snapshots', ['user_id'])
    op.create_index('idx_monitoring_snapshots_period', 'monitoring_snapshots', ['period_start','period_end'])

    # 6. content_embeddings
    op.create_table(
        'content_embeddings',
        sa.Column('id', UUID, server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', UUID, nullable=False),
        sa.Column('source_table', sa.String(), nullable=False),
        sa.Column('source_id', UUID, nullable=True),
        sa.Column('doc_type', sa.String(), nullable=False),
        sa.Column('platform', sa.String(), nullable=True),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('metadata', postgresql.JSONB, nullable=True),
        sa.Column('embedding', sa.dialects.postgresql.VECTOR(1536), nullable=False),
        sa.Column('created_at', TZDateTime, server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE')
    )
    op.create_index('idx_content_embeddings_user', 'content_embeddings', ['user_id'])
    op.create_index('idx_content_embeddings_doc_type', 'content_embeddings', ['doc_type'])
    op.create_index('idx_content_embeddings_platform', 'content_embeddings', ['platform'])
    op.execute("CREATE INDEX idx_content_embeddings_embedding ON content_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)")

    # 7. dashboard_configs
    op.create_table(
        'dashboard_configs',
        sa.Column('id', UUID, server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', UUID, nullable=False),
        sa.Column('key', sa.String(), nullable=False),
        sa.Column('layout', postgresql.JSONB, nullable=False),
        sa.Column('version', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', TZDateTime, server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', TZDateTime, server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('user_id','key','version', name='uq_dashboard_configs_user_key_version')
    )
    op.create_index('idx_dashboard_configs_user', 'dashboard_configs', ['user_id'])
    op.create_index('idx_dashboard_configs_key', 'dashboard_configs', ['key'])

    # 8. ai_chat_sessions
    op.create_table(
        'ai_chat_sessions',
        sa.Column('id', UUID, server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', UUID, nullable=False),
        sa.Column('title', sa.String(), nullable=True),
        sa.Column('context_tags', postgresql.ARRAY(sa.String()), server_default='{}', nullable=False),
        sa.Column('system_prompt', sa.Text(), nullable=True),
        sa.Column('mode', sa.String(), nullable=False, server_default='general'),
        sa.Column('status', sa.String(), nullable=False, server_default='active'),
        sa.Column('last_message_at', TZDateTime, nullable=True),
        sa.Column('created_at', TZDateTime, server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', TZDateTime, server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE')
    )
    op.create_index('idx_ai_chat_sessions_user', 'ai_chat_sessions', ['user_id'])
    op.create_index('idx_ai_chat_sessions_status', 'ai_chat_sessions', ['status'])
    op.create_index('idx_ai_chat_sessions_last_message', 'ai_chat_sessions', ['last_message_at'])

    # 9. ai_chat_messages
    op.create_table(
        'ai_chat_messages',
        sa.Column('id', UUID, server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('session_id', UUID, nullable=False),
        sa.Column('user_id', UUID, nullable=False),
        sa.Column('role', sa.String(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('tokens', sa.Integer(), nullable=True),
        sa.Column('model', sa.String(), nullable=True),
        sa.Column('tool_name', sa.String(), nullable=True),
        sa.Column('tool_args', postgresql.JSONB, nullable=True),
        sa.Column('latency_ms', sa.Integer(), nullable=True),
        sa.Column('error', sa.Text(), nullable=True),
        sa.Column('embedding', sa.dialects.postgresql.VECTOR(1536), nullable=True),
        sa.Column('created_at', TZDateTime, server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['session_id'], ['ai_chat_sessions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE')
    )
    op.create_index('idx_ai_chat_messages_session', 'ai_chat_messages', ['session_id'])
    op.create_index('idx_ai_chat_messages_user', 'ai_chat_messages', ['user_id'])
    op.create_index('idx_ai_chat_messages_role', 'ai_chat_messages', ['role'])
    op.execute("CREATE INDEX idx_ai_chat_messages_embedding ON ai_chat_messages USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50)")

    # 10. scraping_queue
    op.create_table(
        'scraping_queue',
        sa.Column('id', UUID, server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', UUID, nullable=True),
        sa.Column('task_type', sa.String(), nullable=False),
        sa.Column('target_url', sa.Text(), nullable=True),
        sa.Column('platform', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=False, server_default='pending'),
        sa.Column('attempts', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('max_attempts', sa.Integer(), nullable=False, server_default='3'),
        sa.Column('priority', sa.Integer(), nullable=False, server_default='100'),
        sa.Column('scheduled_at', TZDateTime, server_default=sa.text('now()'), nullable=True),
        sa.Column('started_at', TZDateTime, nullable=True),
        sa.Column('finished_at', TZDateTime, nullable=True),
        sa.Column('error', sa.Text(), nullable=True),
        sa.Column('metadata', postgresql.JSONB, nullable=True),
        sa.Column('created_at', TZDateTime, server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', TZDateTime, server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL')
    )
    op.create_index('idx_scraping_queue_status', 'scraping_queue', ['status'])
    op.create_index('idx_scraping_queue_scheduled', 'scraping_queue', ['scheduled_at'])
    op.create_index('idx_scraping_queue_priority', 'scraping_queue', ['priority'])
    op.create_index('idx_scraping_queue_user', 'scraping_queue', ['user_id'])

    # Constraints (CHECK) emulation via triggers or application; simple CHECKs below
    # Add explicit CHECK constraints using ALTER for clarity & to avoid SQLAlchemy reflection complexity
    for table, col, allowed in [
        ('social_profiles','platform', platform_enum_values),
        ('social_profiles','status', status_social_profile),
        ('social_mentions','platform', platform_enum_values),
        ('social_mentions','source_type', source_type_values),
        ('social_mentions','status', mention_status_values),
        ('narrative_threads','status', thread_status_values),
        ('competitor_profiles','platform', platform_enum_values),
        ('competitor_profiles','status', competitor_status_values),
        ('monitoring_snapshots','generated_by', monitor_generated_by_values),
        ('content_embeddings','doc_type', content_doc_type_values),
        ('content_embeddings','platform', platform_enum_values),
        ('ai_chat_sessions','mode', chat_mode_values),
        ('ai_chat_sessions','status', chat_session_status_values),
        ('ai_chat_messages','role', chat_role_values),
        ('scraping_queue','task_type', scrape_task_type_values),
        ('scraping_queue','status', scrape_status_values),
    ]:
        op.execute(
            sa.text(
                f"ALTER TABLE {table} ADD CONSTRAINT ck_{table}_{col} CHECK ({col} IN :vals)"
            ).bindparams(vals=tuple(allowed))
        )

    # updated_at trigger function if not present (simple approach)
    op.execute(
        """
        CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
        BEGIN
          NEW.updated_at = now();
          RETURN NEW;
        END;$$ LANGUAGE plpgsql;
        """
    )

    for table in [
        'social_profiles','social_mentions','narrative_threads','competitor_profiles',
        'content_embeddings','dashboard_configs','ai_chat_sessions','ai_chat_messages','scraping_queue'
    ]:
        op.execute(
            f"CREATE TRIGGER trg_{table}_updated_at BEFORE UPDATE ON {table} FOR EACH ROW EXECUTE FUNCTION set_updated_at();"
        )


def downgrade() -> None:
    # Drop triggers first
    for table in [
        'social_profiles','social_mentions','narrative_threads','competitor_profiles',
        'content_embeddings','dashboard_configs','ai_chat_sessions','ai_chat_messages','scraping_queue'
    ]:
        op.execute(f"DROP TRIGGER IF EXISTS trg_{table}_updated_at ON {table}")

    # Drop tables in reverse dependency order
    op.drop_table('scraping_queue')
    op.drop_table('ai_chat_messages')
    op.drop_table('ai_chat_sessions')
    op.drop_table('dashboard_configs')
    op.drop_table('content_embeddings')
    op.drop_table('monitoring_snapshots')
    op.drop_table('competitor_profiles')
    op.drop_table('narrative_threads')
    op.drop_table('social_mentions')
    op.drop_table('social_profiles')
