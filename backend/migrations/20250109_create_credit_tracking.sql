-- Credit tracking system migration
-- Creates tables and initial configuration for credit usage tracking
-- 1 credit = $0.10 of actual cost

-- Create credit usage events table
CREATE TABLE IF NOT EXISTS credit_usage_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    action_type VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    
    credits_charged FLOAT NOT NULL,
    base_cost FLOAT DEFAULT 0.0,
    api_cost FLOAT DEFAULT 0.0,
    compute_cost FLOAT DEFAULT 0.0,
    
    input_tokens INTEGER,
    output_tokens INTEGER,
    model_used VARCHAR(100),
    
    resource_id VARCHAR(255),
    resource_type VARCHAR(100),
    metadata JSONB,
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_credit_events_user_id ON credit_usage_events(user_id);
CREATE INDEX idx_credit_events_created_at ON credit_usage_events(created_at);
CREATE INDEX idx_credit_events_action_type ON credit_usage_events(action_type);
CREATE INDEX idx_credit_events_user_date ON credit_usage_events(user_id, created_at);
CREATE INDEX idx_credit_events_action_date ON credit_usage_events(action_type, created_at);

-- Create user credit balances table
CREATE TABLE IF NOT EXISTS user_credit_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    
    current_balance FLOAT NOT NULL DEFAULT 100.0,
    total_earned FLOAT NOT NULL DEFAULT 100.0,
    total_consumed FLOAT NOT NULL DEFAULT 0.0,
    
    monthly_allowance FLOAT NOT NULL DEFAULT 100.0,
    month_start_balance FLOAT NOT NULL DEFAULT 100.0,
    current_month_consumed FLOAT NOT NULL DEFAULT 0.0,
    
    last_reset_at TIMESTAMP NOT NULL DEFAULT NOW(),
    next_reset_at TIMESTAMP NOT NULL,
    
    is_unlimited BOOLEAN DEFAULT FALSE,
    low_balance_notified BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index for user lookups
CREATE INDEX idx_credit_balances_user_id ON user_credit_balances(user_id);

-- Create credit action costs configuration table
CREATE TABLE IF NOT EXISTS credit_action_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_type VARCHAR(100) NOT NULL UNIQUE,
    
    base_cost_dollars FLOAT NOT NULL DEFAULT 0.0,
    compute_cost_dollars FLOAT NOT NULL DEFAULT 0.0,
    
    description VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index for action type lookups
CREATE INDEX idx_credit_action_costs_type ON credit_action_costs(action_type);

-- Insert initial action cost configurations
-- These are base/compute costs in dollars; AI costs are calculated dynamically from tokens
-- Remember: 1 credit = $0.10, so $0.001 = 0.01 credits

INSERT INTO credit_action_costs (action_type, base_cost_dollars, compute_cost_dollars, description, is_active) VALUES
    -- AI Operations (token costs calculated separately)
    ('ai_chat_message', 0.0, 0.0, 'AI chat message - cost from tokens', true),
    ('ai_comment_response', 0.0, 0.0005, 'AI comment response - cost from tokens + compute', true),
    ('ai_sentiment_analysis', 0.0, 0.0001, 'AI sentiment analysis - cost from tokens + compute', true),
    ('ai_content_suggestion', 0.0, 0.0003, 'AI content suggestion - cost from tokens + compute', true),
    
    -- Automation (mostly compute)
    ('workflow_execution', 0.0, 0.0001, 'Workflow execution compute cost', true),
    ('scheduled_task', 0.0, 0.00005, 'Scheduled task execution', true),
    ('bulk_operation', 0.0, 0.001, 'Bulk operation processing', true),
    
    -- Platform Features (API calls + compute)
    ('youtube_sync', 0.0001, 0.0004, 'YouTube data sync - API + compute', true),
    ('comment_fetch', 0.00005, 0.0001, 'Comment fetch operation', true),
    ('video_analysis', 0.0001, 0.0002, 'Video analysis processing', true),
    ('analytics_generation', 0.0, 0.0002, 'Analytics generation compute', true),
    
    -- External API Calls
    ('external_api_call', 0.0001, 0.00005, 'External API call base cost', true)
ON CONFLICT (action_type) DO NOTHING;

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_user_credit_balances_updated_at BEFORE UPDATE ON user_credit_balances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_credit_action_costs_updated_at BEFORE UPDATE ON credit_action_costs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Initialize credit balances for existing users
INSERT INTO user_credit_balances (user_id, next_reset_at)
SELECT 
    id,
    created_at + INTERVAL '30 days' as next_reset_at
FROM users
WHERE id NOT IN (SELECT user_id FROM user_credit_balances)
ON CONFLICT (user_id) DO NOTHING;
