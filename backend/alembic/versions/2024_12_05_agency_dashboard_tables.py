"""Add agency dashboard tables for campaigns, finance, and notifications

Revision ID: agency_dashboard_001
Revises:
Create Date: 2024-12-05

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'agency_dashboard_001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create enums first
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE campaign_status_enum AS ENUM (
                'draft', 'scheduled', 'in_progress', 'posted',
                'completed', 'archived', 'cancelled'
            );
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
    """)

    op.execute("""
        DO $$ BEGIN
            CREATE TYPE deliverable_type_enum AS ENUM (
                'brief_sent', 'product_shipped', 'script_draft', 'script_approved',
                'brand_approval', 'content_draft', 'content_revision', 'final_content',
                'content_posted', 'performance_report', 'custom'
            );
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
    """)

    op.execute("""
        DO $$ BEGIN
            CREATE TYPE deliverable_status_enum AS ENUM (
                'pending', 'in_progress', 'submitted', 'revision_requested',
                'approved', 'completed', 'overdue', 'cancelled'
            );
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
    """)

    op.execute("""
        DO $$ BEGIN
            CREATE TYPE deliverable_owner_type_enum AS ENUM ('agency', 'creator', 'brand');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
    """)

    op.execute("""
        DO $$ BEGIN
            CREATE TYPE deal_stage_enum AS ENUM (
                'prospecting', 'pitch_sent', 'negotiating', 'booked',
                'in_progress', 'completed', 'lost'
            );
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
    """)

    op.execute("""
        DO $$ BEGIN
            CREATE TYPE deal_status_enum AS ENUM ('on_track', 'action_needed', 'blocked', 'overdue');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
    """)

    op.execute("""
        DO $$ BEGIN
            CREATE TYPE deal_priority_enum AS ENUM ('high', 'medium', 'low', 'none');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
    """)

    op.execute("""
        DO $$ BEGIN
            CREATE TYPE invoice_status_enum AS ENUM (
                'draft', 'sent', 'viewed', 'paid', 'partially_paid',
                'overdue', 'cancelled', 'refunded'
            );
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
    """)

    op.execute("""
        DO $$ BEGIN
            CREATE TYPE payout_status_enum AS ENUM (
                'pending', 'approved', 'processing', 'paid',
                'overdue', 'cancelled', 'failed'
            );
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
    """)

    op.execute("""
        DO $$ BEGIN
            CREATE TYPE creator_relationship_enum AS ENUM ('active', 'past', 'potential');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
    """)

    op.execute("""
        DO $$ BEGIN
            CREATE TYPE creator_availability_enum AS ENUM ('available', 'limited', 'busy', 'unavailable');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
    """)

    op.execute("""
        DO $$ BEGIN
            CREATE TYPE availability_day_enum AS ENUM ('available', 'booked', 'tentative', 'unavailable');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
    """)

    op.execute("""
        DO $$ BEGIN
            CREATE TYPE notification_type_enum AS ENUM (
                'deliverable_uploaded', 'deliverable_due', 'deliverable_overdue',
                'invoice_paid', 'invoice_overdue', 'invoice_sent',
                'deal_moved', 'deal_stagnant', 'deal_won', 'deal_lost',
                'campaign_started', 'campaign_completed',
                'creator_added', 'creator_removed',
                'payment_received', 'payout_due', 'payout_completed',
                'mention', 'comment', 'approval_needed', 'approval_granted',
                'performance_milestone', 'system'
            );
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
    """)

    op.execute("""
        DO $$ BEGIN
            CREATE TYPE notification_priority_enum AS ENUM ('low', 'normal', 'high', 'urgent');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
    """)

    op.execute("""
        DO $$ BEGIN
            CREATE TYPE report_status_enum AS ENUM (
                'draft', 'generated', 'sent', 'viewed', 'downloaded', 'archived'
            );
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
    """)

    op.execute("""
        DO $$ BEGIN
            CREATE TYPE task_status_enum AS ENUM ('todo', 'in_progress', 'blocked', 'completed', 'cancelled');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
    """)

    op.execute("""
        DO $$ BEGIN
            CREATE TYPE task_priority_enum AS ENUM ('low', 'normal', 'high', 'urgent');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
    """)

    # Create agency_deals table
    op.create_table(
        'agency_deals',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('agency_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('brand_name', sa.String(255), nullable=False),
        sa.Column('brand_logo_url', sa.String(500), nullable=True),
        sa.Column('brand_contact_name', sa.String(255), nullable=True),
        sa.Column('brand_contact_email', sa.String(255), nullable=True),
        sa.Column('title', sa.String(255), nullable=True),
        sa.Column('value', sa.Numeric(12, 2), nullable=False, server_default='0'),
        sa.Column('currency', sa.String(3), nullable=False, server_default='USD'),
        sa.Column('stage', postgresql.ENUM('prospecting', 'pitch_sent', 'negotiating', 'booked', 'in_progress', 'completed', 'lost', name='deal_stage_enum', create_type=False), nullable=False, server_default='prospecting'),
        sa.Column('status', postgresql.ENUM('on_track', 'action_needed', 'blocked', 'overdue', name='deal_status_enum', create_type=False), nullable=False, server_default='on_track'),
        sa.Column('priority', postgresql.ENUM('high', 'medium', 'low', 'none', name='deal_priority_enum', create_type=False), nullable=False, server_default='medium'),
        sa.Column('target_posting_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('expected_close_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('stage_changed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('lost_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('lost_reason', sa.String(255), nullable=True),
        sa.Column('owner_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('campaign_type', sa.String(100), nullable=True),
        sa.Column('tags', postgresql.ARRAY(sa.String), nullable=False, server_default='{}'),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('next_action', sa.Text, nullable=True),
        sa.Column('next_action_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['agency_id'], ['agencies.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ondelete='SET NULL'),
    )
    op.create_index('idx_agency_deals_agency_stage', 'agency_deals', ['agency_id', 'stage'])
    op.create_index('idx_agency_deals_stage', 'agency_deals', ['stage'])

    # Create deal_creators table
    op.create_table(
        'deal_creators',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('deal_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('creator_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('proposed_rate', sa.Numeric(12, 2), nullable=True),
        sa.Column('platform', sa.String(50), nullable=True),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['deal_id'], ['agency_deals.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['creator_id'], ['users.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('deal_id', 'creator_id', name='uq_deal_creator'),
    )

    # Create agency_campaigns table
    op.create_table(
        'agency_campaigns',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('agency_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('deal_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('brand_name', sa.String(255), nullable=False),
        sa.Column('brand_logo_url', sa.String(500), nullable=True),
        sa.Column('brand_contact_name', sa.String(255), nullable=True),
        sa.Column('brand_contact_email', sa.String(255), nullable=True),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('campaign_type', sa.String(100), nullable=True),
        sa.Column('value', sa.Numeric(12, 2), nullable=False, server_default='0'),
        sa.Column('currency', sa.String(3), nullable=False, server_default='USD'),
        sa.Column('status', postgresql.ENUM('draft', 'scheduled', 'in_progress', 'posted', 'completed', 'archived', 'cancelled', name='campaign_status_enum', create_type=False), nullable=False, server_default='draft'),
        sa.Column('posting_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('start_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('end_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('owner_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('tags', postgresql.ARRAY(sa.String), nullable=False, server_default='{}'),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('settings', postgresql.JSONB, nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['agency_id'], ['agencies.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['deal_id'], ['agency_deals.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ondelete='SET NULL'),
    )
    op.create_index('idx_agency_campaigns_agency_status', 'agency_campaigns', ['agency_id', 'status'])
    op.create_index('idx_agency_campaigns_posting_date', 'agency_campaigns', ['posting_date'])

    # Create campaign_creators table
    op.create_table(
        'campaign_creators',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('campaign_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('creator_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('rate', sa.Numeric(12, 2), nullable=True),
        sa.Column('currency', sa.String(3), nullable=False, server_default='USD'),
        sa.Column('platform', sa.String(50), nullable=True),
        sa.Column('deliverable_types', postgresql.ARRAY(sa.String), nullable=False, server_default='{}'),
        sa.Column('status', sa.String(50), nullable=False, server_default='assigned'),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['campaign_id'], ['agency_campaigns.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['creator_id'], ['users.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('campaign_id', 'creator_id', name='uq_campaign_creator'),
    )
    op.create_index('idx_campaign_creators_campaign_id', 'campaign_creators', ['campaign_id'])
    op.create_index('idx_campaign_creators_creator_id', 'campaign_creators', ['creator_id'])

    # Create campaign_deliverables table
    op.create_table(
        'campaign_deliverables',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('campaign_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('type', postgresql.ENUM('brief_sent', 'product_shipped', 'script_draft', 'script_approved', 'brand_approval', 'content_draft', 'content_revision', 'final_content', 'content_posted', 'performance_report', 'custom', name='deliverable_type_enum', create_type=False), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('owner_type', postgresql.ENUM('agency', 'creator', 'brand', name='deliverable_owner_type_enum', create_type=False), nullable=False, server_default='agency'),
        sa.Column('owner_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('creator_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('status', postgresql.ENUM('pending', 'in_progress', 'submitted', 'revision_requested', 'approved', 'completed', 'overdue', 'cancelled', name='deliverable_status_enum', create_type=False), nullable=False, server_default='pending'),
        sa.Column('due_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('files', postgresql.JSONB, nullable=False, server_default='[]'),
        sa.Column('feedback', sa.Text, nullable=True),
        sa.Column('revision_count', sa.Integer, nullable=False, server_default='0'),
        sa.Column('order', sa.Integer, nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['campaign_id'], ['agency_campaigns.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['creator_id'], ['users.id'], ondelete='SET NULL'),
    )
    op.create_index('idx_campaign_deliverables_campaign_id', 'campaign_deliverables', ['campaign_id'])
    op.create_index('idx_campaign_deliverables_status', 'campaign_deliverables', ['status'])
    op.create_index('idx_campaign_deliverables_due_date', 'campaign_deliverables', ['due_date'])

    # Create agency_invoices table
    op.create_table(
        'agency_invoices',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('agency_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('invoice_number', sa.String(50), nullable=False),
        sa.Column('reference', sa.String(100), nullable=True),
        sa.Column('deal_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('campaign_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('brand_name', sa.String(255), nullable=False),
        sa.Column('brand_contact_name', sa.String(255), nullable=True),
        sa.Column('brand_contact_email', sa.String(255), nullable=True),
        sa.Column('billing_address', sa.Text, nullable=True),
        sa.Column('subtotal', sa.Numeric(12, 2), nullable=False, server_default='0'),
        sa.Column('tax_rate', sa.Numeric(5, 2), nullable=True),
        sa.Column('tax_amount', sa.Numeric(12, 2), nullable=True, server_default='0'),
        sa.Column('discount_amount', sa.Numeric(12, 2), nullable=True, server_default='0'),
        sa.Column('total_amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('currency', sa.String(3), nullable=False, server_default='USD'),
        sa.Column('status', postgresql.ENUM('draft', 'sent', 'viewed', 'paid', 'partially_paid', 'overdue', 'cancelled', 'refunded', name='invoice_status_enum', create_type=False), nullable=False, server_default='draft'),
        sa.Column('due_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('sent_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('viewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('paid_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('paid_amount', sa.Numeric(12, 2), nullable=True, server_default='0'),
        sa.Column('payment_method', sa.String(100), nullable=True),
        sa.Column('payment_reference', sa.String(255), nullable=True),
        sa.Column('line_items', postgresql.JSONB, nullable=False, server_default='[]'),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('terms', sa.Text, nullable=True),
        sa.Column('footer', sa.Text, nullable=True),
        sa.Column('pdf_url', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['agency_id'], ['agencies.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['deal_id'], ['agency_deals.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['campaign_id'], ['agency_campaigns.id'], ondelete='SET NULL'),
        sa.UniqueConstraint('agency_id', 'invoice_number', name='uq_agency_invoice_number'),
    )
    op.create_index('idx_agency_invoices_agency_status', 'agency_invoices', ['agency_id', 'status'])
    op.create_index('idx_agency_invoices_due_date', 'agency_invoices', ['due_date'])

    # Create creator_payouts table
    op.create_table(
        'creator_payouts',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('agency_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('creator_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('campaign_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('invoice_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('campaign_name', sa.String(255), nullable=True),
        sa.Column('brand_name', sa.String(255), nullable=True),
        sa.Column('amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('currency', sa.String(3), nullable=False, server_default='USD'),
        sa.Column('agency_fee', sa.Numeric(12, 2), nullable=True),
        sa.Column('agency_fee_percent', sa.Numeric(5, 2), nullable=True),
        sa.Column('status', postgresql.ENUM('pending', 'approved', 'processing', 'paid', 'overdue', 'cancelled', 'failed', name='payout_status_enum', create_type=False), nullable=False, server_default='pending'),
        sa.Column('due_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('approved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('approved_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('paid_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('payment_method', sa.String(100), nullable=True),
        sa.Column('transaction_reference', sa.String(255), nullable=True),
        sa.Column('failure_reason', sa.Text, nullable=True),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['agency_id'], ['agencies.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['creator_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['campaign_id'], ['agency_campaigns.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['invoice_id'], ['agency_invoices.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['approved_by'], ['users.id'], ondelete='SET NULL'),
    )
    op.create_index('idx_creator_payouts_agency_status', 'creator_payouts', ['agency_id', 'status'])
    op.create_index('idx_creator_payouts_creator_id', 'creator_payouts', ['creator_id'])
    op.create_index('idx_creator_payouts_due_date', 'creator_payouts', ['due_date'])

    # Create agency_creator_profiles table
    op.create_table(
        'agency_creator_profiles',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('agency_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('creator_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('display_name', sa.String(255), nullable=True),
        sa.Column('contact_email', sa.String(255), nullable=True),
        sa.Column('contact_phone', sa.String(50), nullable=True),
        sa.Column('platforms', postgresql.JSONB, nullable=False, server_default='[]'),
        sa.Column('niches', postgresql.JSONB, nullable=False, server_default='[]'),
        sa.Column('standard_rate', sa.Numeric(12, 2), nullable=True),
        sa.Column('rate_currency', sa.String(3), nullable=False, server_default='USD'),
        sa.Column('rate_card', postgresql.JSONB, nullable=False, server_default='{}'),
        sa.Column('relationship_status', postgresql.ENUM('active', 'past', 'potential', name='creator_relationship_enum', create_type=False), nullable=False, server_default='active'),
        sa.Column('first_campaign_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_campaign_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('total_campaigns', sa.Integer, nullable=False, server_default='0'),
        sa.Column('total_revenue', sa.Numeric(12, 2), nullable=False, server_default='0'),
        sa.Column('on_time_delivery_rate', sa.Numeric(5, 2), nullable=True),
        sa.Column('avg_engagement_rate', sa.Numeric(5, 2), nullable=True),
        sa.Column('brand_rating', sa.Numeric(3, 2), nullable=True),
        sa.Column('internal_notes', sa.Text, nullable=True),
        sa.Column('tags', postgresql.JSONB, nullable=False, server_default='[]'),
        sa.Column('availability_status', postgresql.ENUM('available', 'limited', 'busy', 'unavailable', name='creator_availability_enum', create_type=False), nullable=False, server_default='available'),
        sa.Column('max_concurrent_campaigns', sa.Integer, nullable=True, server_default='3'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['agency_id'], ['agencies.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['creator_id'], ['users.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('agency_id', 'creator_id', name='uq_agency_creator_profile'),
    )
    op.create_index('idx_agency_creator_profiles_status', 'agency_creator_profiles', ['relationship_status'])

    # Create creator_groups table
    op.create_table(
        'creator_groups',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('agency_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('color', sa.String(20), nullable=False, server_default='#6366f1'),
        sa.Column('icon', sa.String(50), nullable=True),
        sa.Column('is_smart', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('smart_criteria', postgresql.JSONB, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['agency_id'], ['agencies.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('agency_id', 'name', name='uq_agency_group_name'),
    )

    # Create creator_group_members table
    op.create_table(
        'creator_group_members',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('group_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('creator_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['group_id'], ['creator_groups.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['creator_id'], ['users.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('group_id', 'creator_id', name='uq_group_member'),
    )

    # Create creator_availability table
    op.create_table(
        'creator_availability',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('agency_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('creator_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('status', postgresql.ENUM('available', 'booked', 'tentative', 'unavailable', name='availability_day_enum', create_type=False), nullable=False, server_default='available'),
        sa.Column('campaign_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('campaign_name', sa.String(255), nullable=True),
        sa.Column('brand_name', sa.String(255), nullable=True),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['agency_id'], ['agencies.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['creator_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['campaign_id'], ['agency_campaigns.id'], ondelete='SET NULL'),
        sa.UniqueConstraint('creator_id', 'date', name='uq_creator_date_availability'),
    )
    op.create_index('idx_creator_availability_date', 'creator_availability', ['date'])

    # Create agency_notifications table
    op.create_table(
        'agency_notifications',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('agency_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('type', postgresql.ENUM('deliverable_uploaded', 'deliverable_due', 'deliverable_overdue', 'invoice_paid', 'invoice_overdue', 'invoice_sent', 'deal_moved', 'deal_stagnant', 'deal_won', 'deal_lost', 'campaign_started', 'campaign_completed', 'creator_added', 'creator_removed', 'payment_received', 'payout_due', 'payout_completed', 'mention', 'comment', 'approval_needed', 'approval_granted', 'performance_milestone', 'system', name='notification_type_enum', create_type=False), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('icon', sa.String(50), nullable=True),
        sa.Column('link_url', sa.String(500), nullable=True),
        sa.Column('entity_type', sa.String(50), nullable=True),
        sa.Column('entity_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('is_read', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('read_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_actioned', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('actioned_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('priority', postgresql.ENUM('low', 'normal', 'high', 'urgent', name='notification_priority_enum', create_type=False), nullable=False, server_default='normal'),
        sa.Column('metadata', postgresql.JSONB, nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['agency_id'], ['agencies.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    )
    op.create_index('idx_agency_notifications_user_read', 'agency_notifications', ['user_id', 'is_read'])
    op.create_index('idx_agency_notifications_created', 'agency_notifications', ['created_at'])

    # Create agency_activities table
    op.create_table(
        'agency_activities',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('agency_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('actor_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('actor_name', sa.String(255), nullable=True),
        sa.Column('actor_type', sa.String(50), nullable=False, server_default='user'),
        sa.Column('action', sa.String(100), nullable=False),
        sa.Column('entity_type', sa.String(50), nullable=False),
        sa.Column('entity_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('entity_name', sa.String(255), nullable=True),
        sa.Column('description', sa.Text, nullable=False),
        sa.Column('changes', postgresql.JSONB, nullable=True),
        sa.Column('previous_state', postgresql.JSONB, nullable=True),
        sa.Column('new_state', postgresql.JSONB, nullable=True),
        sa.Column('metadata', postgresql.JSONB, nullable=False, server_default='{}'),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['agency_id'], ['agencies.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['actor_id'], ['users.id'], ondelete='SET NULL'),
    )
    op.create_index('idx_agency_activities_created', 'agency_activities', ['created_at'])
    op.create_index('idx_agency_activities_entity', 'agency_activities', ['entity_type', 'entity_id'])

    # Create agency_reports table
    op.create_table(
        'agency_reports',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('agency_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('campaign_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('brand_name', sa.String(255), nullable=True),
        sa.Column('creator_names', postgresql.JSONB, nullable=False, server_default='[]'),
        sa.Column('campaign_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', postgresql.ENUM('draft', 'generated', 'sent', 'viewed', 'downloaded', 'archived', name='report_status_enum', create_type=False), nullable=False, server_default='draft'),
        sa.Column('generated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('generated_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('template', sa.String(100), nullable=True),
        sa.Column('sent_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('sent_to', postgresql.JSONB, nullable=False, server_default='[]'),
        sa.Column('viewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('downloaded_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('pdf_url', sa.String(500), nullable=True),
        sa.Column('data_url', sa.String(500), nullable=True),
        sa.Column('metrics', postgresql.JSONB, nullable=False, server_default='{}'),
        sa.Column('custom_sections', postgresql.JSONB, nullable=False, server_default='[]'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['agency_id'], ['agencies.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['campaign_id'], ['agency_campaigns.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['generated_by'], ['users.id'], ondelete='SET NULL'),
    )
    op.create_index('idx_agency_reports_status', 'agency_reports', ['status'])

    # Create agency_tasks table
    op.create_table(
        'agency_tasks',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('agency_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('priority', postgresql.ENUM('low', 'normal', 'high', 'urgent', name='task_priority_enum', create_type=False), nullable=False, server_default='normal'),
        sa.Column('status', postgresql.ENUM('todo', 'in_progress', 'blocked', 'completed', 'cancelled', name='task_status_enum', create_type=False), nullable=False, server_default='todo'),
        sa.Column('assignee_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('due_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('related_type', sa.String(50), nullable=True),
        sa.Column('related_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('is_auto_generated', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('source', sa.String(100), nullable=True),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['agency_id'], ['agencies.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['assignee_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
    )
    op.create_index('idx_agency_tasks_status', 'agency_tasks', ['status'])
    op.create_index('idx_agency_tasks_assignee', 'agency_tasks', ['assignee_id'])
    op.create_index('idx_agency_tasks_due_date', 'agency_tasks', ['due_date'])


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_table('agency_tasks')
    op.drop_table('agency_reports')
    op.drop_table('agency_activities')
    op.drop_table('agency_notifications')
    op.drop_table('creator_availability')
    op.drop_table('creator_group_members')
    op.drop_table('creator_groups')
    op.drop_table('agency_creator_profiles')
    op.drop_table('creator_payouts')
    op.drop_table('agency_invoices')
    op.drop_table('campaign_deliverables')
    op.drop_table('campaign_creators')
    op.drop_table('agency_campaigns')
    op.drop_table('deal_creators')
    op.drop_table('agency_deals')

    # Drop enums
    op.execute('DROP TYPE IF EXISTS task_priority_enum')
    op.execute('DROP TYPE IF EXISTS task_status_enum')
    op.execute('DROP TYPE IF EXISTS report_status_enum')
    op.execute('DROP TYPE IF EXISTS notification_priority_enum')
    op.execute('DROP TYPE IF EXISTS notification_type_enum')
    op.execute('DROP TYPE IF EXISTS availability_day_enum')
    op.execute('DROP TYPE IF EXISTS creator_availability_enum')
    op.execute('DROP TYPE IF EXISTS creator_relationship_enum')
    op.execute('DROP TYPE IF EXISTS payout_status_enum')
    op.execute('DROP TYPE IF EXISTS invoice_status_enum')
    op.execute('DROP TYPE IF EXISTS deal_priority_enum')
    op.execute('DROP TYPE IF EXISTS deal_status_enum')
    op.execute('DROP TYPE IF EXISTS deal_stage_enum')
    op.execute('DROP TYPE IF EXISTS deliverable_owner_type_enum')
    op.execute('DROP TYPE IF EXISTS deliverable_status_enum')
    op.execute('DROP TYPE IF EXISTS deliverable_type_enum')
    op.execute('DROP TYPE IF EXISTS campaign_status_enum')
