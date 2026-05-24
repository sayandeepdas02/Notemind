'use client';

import React, { createContext, useContext, useReducer, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────

export type NotificationType = 'summary_ready' | 'bot_joined' | 'bot_left';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  timestamp: Date;
  read: boolean;
  meetingId?: string;
}

interface NotificationsState {
  notifications: Notification[];
}

type Action =
  | { type: 'ADD'; notification: Notification }
  | { type: 'MARK_ALL_READ' };

// ── Reducer ───────────────────────────────────────────────────

function reducer(state: NotificationsState, action: Action): NotificationsState {
  switch (action.type) {
    case 'ADD':
      return { notifications: [action.notification, ...state.notifications] };
    case 'MARK_ALL_READ':
      return {
        notifications: state.notifications.map(n => ({ ...n, read: true })),
      };
    default:
      return state;
  }
}

// ── Context ───────────────────────────────────────────────────

interface NotificationsContextValue {
  notifications: Notification[];
  addNotification: (n: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAllRead: () => void;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────

// NOTE: TODO — future: replace dispatch with WebSocket push notifications

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { notifications: [] });

  const addNotification = useCallback(
    (n: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
      dispatch({
        type: 'ADD',
        notification: {
          ...n,
          id: crypto.randomUUID(),
          timestamp: new Date(),
          read: false,
        },
      });
    },
    []
  );

  const markAllRead = useCallback(() => {
    dispatch({ type: 'MARK_ALL_READ' });
  }, []);

  return (
    <NotificationsContext.Provider
      value={{ notifications: state.notifications, addNotification, markAllRead }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error('useNotifications must be used inside <NotificationsProvider>');
  }
  return ctx;
}
