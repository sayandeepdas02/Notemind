-- Migration 0011: Enterprise Multi-Tenant Architecture & RBAC
-- Up

-- 1. Create Workspaces
CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    domain TEXT, -- for auto-join
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create Workspace Members (RBAC)
CREATE TABLE IF NOT EXISTS workspace_members (
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member', -- owner, admin, manager, member, viewer
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (workspace_id, user_id)
);

-- 3. Data Migration Function: Create a "Personal Workspace" for all existing users
DO $$
DECLARE
    user_rec RECORD;
    new_workspace_id UUID;
BEGIN
    FOR user_rec IN SELECT id, name, email FROM users LOOP
        new_workspace_id := gen_random_uuid();
        
        -- Create personal workspace
        INSERT INTO workspaces (id, name, created_at)
        VALUES (new_workspace_id, COALESCE(user_rec.name, split_part(user_rec.email, '@', 1)) || '''s Workspace', NOW());
        
        -- Make user the owner
        INSERT INTO workspace_members (workspace_id, user_id, role, created_at)
        VALUES (new_workspace_id, user_rec.id, 'owner', NOW());
    END LOOP;
END $$;

-- 4. Alter existing tables to belong to workspaces

-- Meetings
ALTER TABLE meetings ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

-- Backfill meetings workspace_id based on user_id
UPDATE meetings m 
SET workspace_id = (SELECT workspace_id FROM workspace_members WHERE user_id = m.user_id LIMIT 1);

-- Make workspace_id required and drop user_id
ALTER TABLE meetings ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE meetings DROP COLUMN user_id;

-- Folders
ALTER TABLE folders ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
UPDATE folders f SET workspace_id = (SELECT workspace_id FROM workspace_members WHERE user_id = f.user_id LIMIT 1);
ALTER TABLE folders ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE folders DROP COLUMN user_id;

-- Tags
ALTER TABLE tags ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
UPDATE tags t SET workspace_id = (SELECT workspace_id FROM workspace_members WHERE user_id = t.user_id LIMIT 1);
ALTER TABLE tags ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE tags DROP COLUMN user_id;

-- Automation Rules
ALTER TABLE automation_rules ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
UPDATE automation_rules a SET workspace_id = (SELECT workspace_id FROM workspace_members WHERE user_id = a.user_id LIMIT 1);
ALTER TABLE automation_rules ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE automation_rules DROP COLUMN user_id;

-- AI Chat Messages
ALTER TABLE ai_chat_messages ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
UPDATE ai_chat_messages a SET workspace_id = (SELECT workspace_id FROM workspace_members WHERE user_id = a.user_id LIMIT 1);
ALTER TABLE ai_chat_messages ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE ai_chat_messages DROP COLUMN user_id;

-- Cross Meeting Topics
ALTER TABLE cross_meeting_topics ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
UPDATE cross_meeting_topics c SET workspace_id = (SELECT workspace_id FROM workspace_members WHERE user_id = c.user_id LIMIT 1);
ALTER TABLE cross_meeting_topics ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE cross_meeting_topics DROP CONSTRAINT IF EXISTS cross_meeting_topics_user_id_topic_key;
ALTER TABLE cross_meeting_topics ADD CONSTRAINT cross_meeting_topics_workspace_id_topic_key UNIQUE (workspace_id, topic);
ALTER TABLE cross_meeting_topics DROP COLUMN user_id;

-- Action Item Tracking
ALTER TABLE action_item_tracking ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
UPDATE action_item_tracking a SET workspace_id = (SELECT workspace_id FROM workspace_members WHERE user_id = a.user_id LIMIT 1);
ALTER TABLE action_item_tracking ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE action_item_tracking DROP COLUMN user_id;
