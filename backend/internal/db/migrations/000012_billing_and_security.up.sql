-- Migration 0012: Billing and Enterprise Security
-- Up

-- 1. Billing
CREATE TABLE IF NOT EXISTS workspace_billing (
    workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    plan_id VARCHAR(50) NOT NULL DEFAULT 'free', -- free, pro, enterprise
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, past_due, canceled
    seats INT NOT NULL DEFAULT 1,
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS usage_meters (
    id UUID PRIMARY KEY,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    billing_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    billing_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    ai_credits_used INT NOT NULL DEFAULT 0,
    transcription_minutes_used INT NOT NULL DEFAULT 0,
    UNIQUE (workspace_id, billing_period_start)
);

-- 2. Enterprise Security: Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL, -- User who performed the action
    action VARCHAR(100) NOT NULL, -- e.g., 'meeting.deleted', 'user.invited'
    resource_type VARCHAR(50) NOT NULL, -- e.g., 'meeting', 'workspace_member'
    resource_id TEXT,
    metadata JSONB,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_workspace_id ON audit_logs(workspace_id, created_at DESC);

-- 3. Enterprise Security: SSO / SAML / SCIM
CREATE TABLE IF NOT EXISTS sso_connections (
    id UUID PRIMARY KEY,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- 'workos', 'okta', 'google_saml'
    external_org_id TEXT NOT NULL, -- e.g., WorkOS Organization ID
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (workspace_id, provider)
);

CREATE TABLE IF NOT EXISTS sso_users (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    sso_connection_id UUID REFERENCES sso_connections(id) ON DELETE CASCADE,
    external_user_id TEXT NOT NULL, -- e.g., SCIM user ID
    UNIQUE (sso_connection_id, external_user_id)
);
