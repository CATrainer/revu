"""Add subscription and billing tables

Revision ID: 20250115_1400_subscriptions
Revises: 20250115_1300_notification_prefs
Create Date: 2025-01-15 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20250115_1400_subscriptions'
down_revision = '20250115_1300_notification_prefs'
branch_labels = None
depends_on = None


def upgrade():
    # Create subscription_plans table
    op.create_table(
        'subscription_plans',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('plan_type', sa.String(50), nullable=False, server_default='free'),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('price_monthly', sa.Numeric(10, 2), nullable=False, server_default='0'),
        sa.Column('price_yearly', sa.Numeric(10, 2), nullable=True),
        sa.Column('currency', sa.String(3), nullable=False, server_default='GBP'),
        sa.Column('stripe_product_id', sa.String(255), nullable=True, unique=True),
        sa.Column('stripe_price_id_monthly', sa.String(255), nullable=True),
        sa.Column('stripe_price_id_yearly', sa.String(255), nullable=True),
        sa.Column('features', postgresql.JSONB, nullable=False, server_default='[]'),
        sa.Column('max_creators', sa.Integer, nullable=True),
        sa.Column('max_campaigns', sa.Integer, nullable=True),
        sa.Column('max_ai_messages_monthly', sa.Integer, nullable=True),
        sa.Column('max_integrations', sa.Integer, nullable=True),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('is_popular', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('sort_order', sa.Integer, nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), onupdate=sa.text('now()'), nullable=False),
    )
    
    # Create user_subscriptions table
    op.create_table(
        'user_subscriptions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('plan_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('subscription_plans.id'), nullable=True),
        sa.Column('stripe_customer_id', sa.String(255), nullable=True, index=True),
        sa.Column('stripe_subscription_id', sa.String(255), nullable=True, unique=True, index=True),
        sa.Column('stripe_price_id', sa.String(255), nullable=True),
        sa.Column('status', sa.String(50), nullable=False, server_default='trial'),
        sa.Column('billing_interval', sa.String(20), nullable=True),
        sa.Column('trial_start', sa.DateTime(timezone=True), nullable=True),
        sa.Column('trial_end', sa.DateTime(timezone=True), nullable=True),
        sa.Column('current_period_start', sa.DateTime(timezone=True), nullable=True),
        sa.Column('current_period_end', sa.DateTime(timezone=True), nullable=True),
        sa.Column('canceled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('cancel_at_period_end', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('last_payment_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_payment_amount', sa.Numeric(10, 2), nullable=True),
        sa.Column('last_payment_currency', sa.String(3), nullable=True),
        sa.Column('metadata', postgresql.JSONB, nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), onupdate=sa.text('now()'), nullable=False),
    )
    
    # Create subscription_invoices table
    op.create_table(
        'subscription_invoices',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('subscription_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('user_subscriptions.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('stripe_invoice_id', sa.String(255), nullable=False, unique=True, index=True),
        sa.Column('stripe_charge_id', sa.String(255), nullable=True),
        sa.Column('invoice_number', sa.String(100), nullable=True),
        sa.Column('status', sa.String(50), nullable=False),
        sa.Column('amount_due', sa.Numeric(10, 2), nullable=False),
        sa.Column('amount_paid', sa.Numeric(10, 2), nullable=False, server_default='0'),
        sa.Column('currency', sa.String(3), nullable=False, server_default='GBP'),
        sa.Column('invoice_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('due_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('paid_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('period_start', sa.DateTime(timezone=True), nullable=True),
        sa.Column('period_end', sa.DateTime(timezone=True), nullable=True),
        sa.Column('invoice_pdf_url', sa.String(500), nullable=True),
        sa.Column('hosted_invoice_url', sa.String(500), nullable=True),
        sa.Column('metadata', postgresql.JSONB, nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), onupdate=sa.text('now()'), nullable=False),
    )
    
    # Create payment_methods table
    op.create_table(
        'payment_methods',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('stripe_payment_method_id', sa.String(255), nullable=False, unique=True, index=True),
        sa.Column('type', sa.String(50), nullable=False),
        sa.Column('brand', sa.String(50), nullable=True),
        sa.Column('last4', sa.String(4), nullable=True),
        sa.Column('exp_month', sa.Integer, nullable=True),
        sa.Column('exp_year', sa.Integer, nullable=True),
        sa.Column('is_default', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('metadata', postgresql.JSONB, nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), onupdate=sa.text('now()'), nullable=False),
    )
    
    # Insert default subscription plans
    op.execute("""
        INSERT INTO subscription_plans (name, plan_type, description, price_monthly, price_yearly, currency, features, max_creators, max_campaigns, max_ai_messages_monthly, is_popular, sort_order)
        VALUES 
        ('Free', 'free', 'Get started with basic features', 0, NULL, 'GBP', 
         '["1 creator profile", "Basic analytics", "5 AI responses/month", "Community support"]'::jsonb, 
         1, 1, 5, false, 0),
        ('Creator', 'creator', 'Perfect for individual creators', 19, 190, 'GBP', 
         '["1 creator profile", "Advanced analytics", "100 AI responses/month", "Email support", "Content calendar", "Brand deal tracking"]'::jsonb, 
         1, 5, 100, false, 1),
        ('Agency', 'agency', 'For agencies managing multiple creators', 49, 490, 'GBP', 
         '["Unlimited creators", "Unlimited campaigns", "500 AI responses/month", "Priority support", "API access", "Team collaboration", "Custom branding", "Advanced reporting"]'::jsonb, 
         NULL, NULL, 500, true, 2),
        ('Enterprise', 'enterprise', 'Custom solutions for large organizations', 199, 1990, 'GBP', 
         '["Everything in Agency", "Dedicated account manager", "Unlimited AI responses", "Custom integrations", "SLA guarantee", "On-boarding training", "White-label options"]'::jsonb, 
         NULL, NULL, NULL, false, 3);
    """)


def downgrade():
    op.drop_table('payment_methods')
    op.drop_table('subscription_invoices')
    op.drop_table('user_subscriptions')
    op.drop_table('subscription_plans')
