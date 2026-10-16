// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  MessageSquare,
  MessageCircle,
  ShieldCheck,
  CheckCircle2,
  Megaphone,
  X,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  formatTimeAgo,
} from '@/lib/notifications';

const TYPE_CONFIG = {
  reply: {
    icon: MessageSquare,
    bg: 'bg-purple-100/90 text-purple-700 ring-purple-300',
    border: 'border-purple-200',
    label: 'Reply',
  },
  report_comment: {
    icon: MessageCircle,
    bg: 'bg-amber-100/90 text-amber-700 ring-amber-300',
    border: 'border-amber-200',
    label: 'Comment',
  },
  report_confirm: {
    icon: ShieldCheck,
    bg: 'bg-orange-100/90 text-orange-700 ring-orange-300',
    border: 'border-orange-200',
    label: 'Confirmed',
  },
  report_verified: {
    icon: CheckCircle2,
    bg: 'bg-emerald-100/90 text-emerald-700 ring-emerald-300',
    border: 'border-emerald-200',
    label: 'Verified',
  },
  official_announcement: {
    icon: Megaphone,
    bg: 'bg-rose-100/90 text-rose-700 ring-rose-300',
    border: 'border-rose-200',
    label: 'Official Advisory',
  },
};

export default function NotificationBell({ className = '' }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'
  const popoverRef = useRef(null);

  // Load notifications
  const loadNotifications = useCallback(async () => {
    if (!user || !user.id) return;
    try {
      const items = await getUserNotifications(user);
      setNotifications(items || []);
    } catch (err) {
      console.error('Failed to poll notifications:', err);
    }
  }, [user]);

  // Initial load and polling every 15 seconds
  useEffect(() => {
    loadNotifications();

    // Polling interval (15 seconds as per requirements)
    const interval = setInterval(() => {
      loadNotifications();
    }, 15000);

    // Event-based immediate sync for local tab and cross-tab storage
    const handleSync = () => loadNotifications();
    window.addEventListener('aegis:interaction', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      clearInterval(interval);
      window.removeEventListener('aegis:interaction', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [loadNotifications]);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.isRead;
    return true;
  });

  const handleItemClick = (notif) => {
    if (!notif.isRead && user?.id) {
      markNotificationAsRead(user.id, notif.id);
      setNotifications((prev) =>
        prev.map((item) => (item.id === notif.id ? { ...item, isRead: true } : item))
      );
    }
    setIsOpen(false);
    if (notif.targetUrl) {
      navigate(notif.targetUrl);
    }
  };

  const handleMarkAllRead = () => {
    if (!user?.id) return;
    markAllNotificationsAsRead(user.id, notifications);
    setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
  };

  return (
    <div className={`relative ${className}`} ref={popoverRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Community Notifications"
        className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-white/70 border border-white/60 text-slate-700 shadow-sm backdrop-blur-xl hover:bg-white hover:text-blue-600 transition-all duration-200 active:scale-95"
      >
        <Bell className="h-[18px] w-[18px] text-slate-700" />

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white shadow-sm shadow-rose-600/40 ring-2 ring-white animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Frosted Glass Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-white/60 bg-white/90 p-0 shadow-2xl backdrop-blur-2xl z-50 overflow-hidden ring-1 ring-slate-900/5 animate-in fade-in-50 zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-white/60 px-4 py-3 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Bell className="h-4 w-4" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">Notifications</h4>
              {unreadCount > 0 && (
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700 ring-1 ring-rose-200">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  title="Mark all as read"
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Mark all read</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 border-b border-slate-100 bg-slate-50/50 px-4 py-1.5 text-xs">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all ${
                filter === 'all'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all ${
                filter === 'unread'
                  ? 'bg-white text-rose-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Unread ({unreadCount})
            </button>

            <span className="ml-auto text-[10px] text-slate-400">Live polling (15s)</span>
          </div>

          {/* Notifications Scroll List */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100/80">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <Bell className="h-5 w-5" />
                </div>
                <p className="text-xs font-semibold text-slate-700">No notifications yet</p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {filter === 'unread'
                    ? "You're all caught up with community alerts!"
                    : "Interactions and official advisories will appear here."}
                </p>
              </div>
            ) : (
              filteredNotifications.map((notif) => {
                const conf = TYPE_CONFIG[notif.type] || TYPE_CONFIG.reply;
                const Icon = conf.icon;

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleItemClick(notif)}
                    className={`group cursor-pointer px-4 py-3 transition-colors hover:bg-slate-50/80 flex items-start gap-3 ${
                      !notif.isRead ? 'bg-blue-50/40' : 'bg-transparent'
                    }`}
                  >
                    {/* Icon Badge */}
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ring-1 ${conf.bg}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {conf.label}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {formatTimeAgo(notif.timestamp)}
                        </span>
                      </div>

                      <h5 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                        {notif.title}
                      </h5>

                      <p className="mt-0.5 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {notif.message}
                      </p>

                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          By <strong className="text-slate-600">{notif.actorName}</strong>
                        </span>
                        <span className="text-[10px] text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 font-medium">
                          View <ExternalLink className="w-2.5 h-2.5" />
                        </span>
                      </div>
                    </div>

                    {/* Unread blue dot */}
                    {!notif.isRead && (
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-600 ring-2 ring-blue-100" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-2 text-center text-[10px] text-slate-500">
            AEGIS Community Mesh • Auto-updates every 15s
          </div>
        </div>
      )}
    </div>
  );
}
