// ============================================================
// Notemind API Contract Types
// Strictly mirrors Go backend struct definitions.
// DO NOT use 'any' — extend these types if you need new fields.
// ============================================================

// ── Auth ─────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  created_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  workspaces: Workspace[];
}

// ── Workspace ─────────────────────────────────────────────────

export type WorkspaceRole = 'admin' | 'member' | 'viewer';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  plan?: 'free' | 'pro' | 'team' | 'enterprise';
  created_at: string;
}

export interface WorkspaceMembership {
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  created_at: string;
}

// Shape returned by GET /workspaces/:id/members
export interface WorkspaceMemberView {
  id: string;
  name: string;
  email: string;
  role: string;
}

// ── Meeting ───────────────────────────────────────────────────

export type MeetingStatus =
  | 'pending'
  | 'joining'
  | 'waiting_for_admission'
  | 'admitted'
  | 'recording'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'denied'
  | 'disconnected'
  | 'ended';

export type MeetingProvider = 'google_meet' | 'zoom' | 'upload';

export type MeetingType = 'general' | 'standup' | 'interview' | 'sales' | 'planning';

export interface Meeting {
  id: string;
  workspace_id: string;
  title?: string;
  audio_url?: string;
  status: MeetingStatus;
  provider: MeetingProvider;
  meeting_url?: string;
  meeting_type?: MeetingType;
  summary?: string;
  created_at: string;
  updated_at?: string;
  duration_seconds?: number;
}

export interface MeetingJoinRequest {
  meeting_url: string;
}

export interface MeetingJoinResponse {
  meeting_id: string;
}

export interface ShareMeetingResponse {
  share_token: string;
}

// ── Transcript ────────────────────────────────────────────────

export interface TranscriptSegment {
  id: string;
  meeting_id: string;
  speaker: string;
  text: string;
  absolute_start_time: string;
  absolute_end_time?: string;
  sequence_id?: number;
}

// ── AI Intelligence ───────────────────────────────────────────

export interface ActionItem {
  task: string;
  owner: string;
  deadline?: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface TimelineEvent {
  time: string;
  event: string;
}

export interface MeetingIntelligence {
  summary: string;
  key_points: string[];
  decisions: string[];
  action_items: ActionItem[];
  participants: string[];
  timeline: TimelineEvent[];
  topics?: string[];
}

// ── SSE Events ───────────────────────────────────────────────

export interface SSESegmentsEvent {
  type: 'segments';
  data: TranscriptSegment[];
}

export interface SSEStatusEvent {
  type: 'status';
  data: { status: MeetingStatus };
}

export type SSEEvent = SSESegmentsEvent | SSEStatusEvent;

// ── Memory / Search ───────────────────────────────────────────

export type SearchResultType = 'meeting' | 'action_item' | 'topic' | 'decision';

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  snippet: string;
  meeting_id: string;
  timestamp?: string;
  score: number;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
}

export interface MemoryCitation {
  meeting_id: string;
  snippet: string;
  relevance_score?: number;
}

export interface MemoryAskResponse {
  id: string;
  answer: string;
  sources: MemoryCitation[];
}

export interface MemoryChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  sources?: MemoryCitation[];
  created_at?: string;
}

export interface MemoryHistoryResponse {
  messages: MemoryChatMessage[];
}

// ── API Keys ──────────────────────────────────────────────────

export interface APIKey {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  last_used_at?: string;
  created_at: string;
}

export interface CreateAPIKeyResponse {
  key: APIKey;
  raw_key: string;
}

// ── API Primitives ────────────────────────────────────────────

export interface APIError {
  status: number;
  message: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  per_page: number;
  total: number;
}
