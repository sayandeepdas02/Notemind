-- Migration 0011: Enterprise Multi-Tenant Architecture & RBAC
-- Down

-- This is a destructive rollback. We assume that there's a 1:1 mapping from 
-- personal workspaces back to users for the rollback to work cleanly.

-- Action Item Tracking
ALTER TABLE action_item_tracking ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
UPDATE action_item_tracking a SET user_id = (SELECT user_id FROM workspace_members WHERE workspace_id = a.workspace_id LIMIT 1);
ALTER TABLE action_item_tracking DROP COLUMN workspace_id;

-- Cross Meeting Topics
ALTER TABLE cross_meeting_topics ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
UPDATE cross_meeting_topics c SET user_id = (SELECT user_id FROM workspace_members WHERE workspace_id = c.workspace_id LIMIT 1);
ALTER TABLE cross_meeting_topics DROP CONSTRAINT IF EXISTS cross_meeting_topics_workspace_id_topic_key;
ALTER TABLE cross_meeting_topics ADD CONSTRAINT cross_meeting_topics_user_id_topic_key UNIQUE (user_id, topic);
ALTER TABLE cross_meeting_topics DROP COLUMN workspace_id;

-- AI Chat Messages
ALTER TABLE ai_chat_messages ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
UPDATE ai_chat_messages a SET user_id = (SELECT user_id FROM workspace_members WHERE workspace_id = a.workspace_id LIMIT 1);
ALTER TABLE ai_chat_messages DROP COLUMN workspace_id;

-- Automation Rules
ALTER TABLE automation_rules ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
UPDATE automation_rules a SET user_id = (SELECT user_id FROM workspace_members WHERE workspace_id = a.workspace_id LIMIT 1);
ALTER TABLE automation_rules DROP COLUMN workspace_id;

-- Tags
ALTER TABLE tags ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
UPDATE tags t SET user_id = (SELECT user_id FROM workspace_members WHERE workspace_id = t.workspace_id LIMIT 1);
ALTER TABLE tags DROP COLUMN workspace_id;

-- Folders
ALTER TABLE folders ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
UPDATE folders f SET user_id = (SELECT user_id FROM workspace_members WHERE workspace_id = f.workspace_id LIMIT 1);
ALTER TABLE folders DROP COLUMN workspace_id;

-- Meetings
ALTER TABLE meetings ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
UPDATE meetings m SET user_id = (SELECT user_id FROM workspace_members WHERE workspace_id = m.workspace_id LIMIT 1);
ALTER TABLE meetings DROP COLUMN workspace_id;

-- Drop Workspaces
DROP TABLE IF EXISTS workspace_members;
DROP TABLE IF EXISTS workspaces;
