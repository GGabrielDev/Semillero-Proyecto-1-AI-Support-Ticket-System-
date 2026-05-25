'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { formatDate } from '@/lib/utils';

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  ticket_id: string | null;
  read: boolean;
  created_at: string;
};

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isMarkingRead, setIsMarkingRead] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications?unread=false&page=1');
      const payload = (await response.json().catch(() => null)) as {
        notifications?: Notification[];
        unreadCount?: number;
      } | null;

      if (payload?.notifications) {
        setNotifications(payload.notifications);
        setUnreadCount(payload.unreadCount ?? 0);
      }
    } catch {
      // Silently ignore fetch errors for the notification bell
    }
  }, []);

  useEffect(() => {
    void fetchNotifications();

    const interval = setInterval(() => {
      void fetchNotifications();
    }, 30_000);

    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllRead = async () => {
    setIsMarkingRead(true);

    try {
      await fetch('/api/notifications', { method: 'PATCH' });
      setUnreadCount(0);
      setNotifications((current) => current.map((n) => ({ ...n, read: true })));
    } catch {
      // Silently ignore
    } finally {
      setIsMarkingRead(false);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        aria-label={`Notifications${unreadCount > 0 ? ` — ${unreadCount} unread` : ''}`}
        className="relative flex h-11 w-11 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-200 transition hover:bg-slate-800"
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <svg
          aria-hidden="true"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          viewBox="0 0 24 24"
        >
          <path
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-sky-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-14 z-50 w-80 rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <p className="text-sm font-semibold text-white">Notifications</p>
            {unreadCount > 0 ? (
              <button
                className="text-xs text-sky-300 hover:text-sky-200 disabled:opacity-50"
                disabled={isMarkingRead}
                onClick={() => void markAllRead()}
                type="button"
              >
                {isMarkingRead ? 'Marking…' : 'Mark all read'}
              </button>
            ) : null}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="p-5 text-sm text-slate-400">No notifications yet.</p>
            ) : (
              <ul>
                {notifications.map((notification) => (
                  <li
                    key={notification.id}
                    className={`border-b border-slate-800 px-4 py-3 last:border-b-0 ${
                      notification.read ? '' : 'bg-sky-500/5'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {!notification.read ? (
                        <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-sky-400" />
                      ) : (
                        <span className="mt-1.5 h-2 w-2 flex-shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-100">{notification.title}</p>
                        {notification.body ? (
                          <p className="mt-0.5 text-xs text-slate-400">{notification.body}</p>
                        ) : null}
                        <p className="mt-1 text-xs text-slate-500">{formatDate(notification.created_at)}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
