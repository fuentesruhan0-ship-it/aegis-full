import { base44 } from '@/api/base44Client';
import { TARGET_TYPES, REACTION_TYPES } from './interactions';

/**
 * AEGIS Live Notification Engine
 * Aggregates interactions into a real-time notification feed for the current user:
 * 1. Replies to my comments
 * 2. Comments on my hazard reports
 * 3. Confirmations ("I see this too") on my hazard reports
 * 4. Hazard reports of mine verified by DRRMO/LGU
 * 5. New official emergency announcements
 */

const NOTIFICATION_TYPES = {
  REPLY: 'reply',
  REPORT_COMMENT: 'report_comment',
  REPORT_CONFIRM: 'report_confirm',
  REPORT_VERIFIED: 'report_verified',
  OFFICIAL_ANNOUNCEMENT: 'official_announcement',
};

/**
 * Format relative time
 */
export function formatTimeAgo(dateStr) {
  if (!dateStr) return 'just now';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/**
 * Get read notification IDs for a given user
 */
export function getReadNotificationIds(userId) {
  if (!userId) return new Set();
  try {
    const raw = localStorage.getItem(`aegis_read_notifs_${userId}`);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

/**
 * Mark a single notification as read
 */
export function markNotificationAsRead(userId, notificationId) {
  if (!userId || !notificationId) return;
  try {
    const readSet = getReadNotificationIds(userId);
    readSet.add(notificationId);
    localStorage.setItem(`aegis_read_notifs_${userId}`, JSON.stringify([...readSet]));
    triggerInteractionSync();
  } catch (err) {
    console.error('Failed to mark notification as read:', err);
  }
}

/**
 * Mark all notifications as read
 */
export function markAllNotificationsAsRead(userId, notifications = []) {
  if (!userId) return;
  try {
    const readSet = getReadNotificationIds(userId);
    notifications.forEach((n) => readSet.add(n.id));
    localStorage.setItem(`aegis_read_notifs_${userId}`, JSON.stringify([...readSet]));
    triggerInteractionSync();
  } catch (err) {
    console.error('Failed to mark all notifications as read:', err);
  }
}

/**
 * Trigger local & cross-tab sync event
 */
export function triggerInteractionSync() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('aegis:interaction', { detail: { timestamp: Date.now() } }));
  }
}

/**
 * Retrieve aggregated notifications for the current authenticated user
 */
export async function getUserNotifications(currentUser) {
  if (!currentUser || !currentUser.id) return [];

  const userId = String(currentUser.id);
  const readIds = getReadNotificationIds(userId);

  let comments = [];
  let reactions = [];
  let hazardReports = [];
  let announcements = [];

  // Fetch comments
  try {
    if (typeof base44.entities?.Comment?.list === 'function') {
      comments = (await base44.entities.Comment.list('created_date', 1000)) || [];
    } else {
      comments = JSON.parse(localStorage.getItem('mock_comments') || '[]');
    }
  } catch {
    comments = JSON.parse(localStorage.getItem('mock_comments') || '[]');
  }

  // Fetch reactions
  try {
    if (typeof base44.entities?.Reaction?.list === 'function') {
      reactions = (await base44.entities.Reaction.list()) || [];
    } else {
      reactions = JSON.parse(localStorage.getItem('mock_reactions') || '[]');
    }
  } catch {
    reactions = JSON.parse(localStorage.getItem('mock_reactions') || '[]');
  }

  // Fetch hazard reports
  try {
    if (typeof base44.entities?.HazardReport?.list === 'function') {
      hazardReports = (await base44.entities.HazardReport.list('-created_date', 500)) || [];
    } else {
      hazardReports = JSON.parse(localStorage.getItem('mock_hazard_reports') || '[]');
    }
  } catch {
    hazardReports = JSON.parse(localStorage.getItem('mock_hazard_reports') || '[]');
  }

  // Fetch announcements
  try {
    if (typeof base44.entities?.Announcement?.list === 'function') {
      announcements = (await base44.entities.Announcement.list('-created_date', 500)) || [];
    } else {
      announcements = JSON.parse(localStorage.getItem('mock_announcements') || '[]');
    }
  } catch {
    announcements = JSON.parse(localStorage.getItem('mock_announcements') || '[]');
  }

  const notifications = [];

  // --- 1. Replies to my comment ---
  const myCommentsMap = new Map();
  comments.forEach((c) => {
    if (String(c.created_by_id) === userId) {
      myCommentsMap.set(c.id, c);
    }
  });

  comments.forEach((c) => {
    if (c.parent_comment_id && myCommentsMap.has(c.parent_comment_id) && String(c.created_by_id) !== userId) {
      const parent = myCommentsMap.get(c.parent_comment_id);
      const targetUrl =
        c.target_type === TARGET_TYPES.HAZARD_REPORT
          ? '/hazards'
          : c.target_type === TARGET_TYPES.ANNOUNCEMENT
          ? '/announcements'
          : c.target_type === TARGET_TYPES.INFRASTRUCTURE_STATUS
          ? '/infrastructure'
          : '/volunteers';

      notifications.push({
        id: `notif_reply_${c.id}`,
        type: NOTIFICATION_TYPES.REPLY,
        title: 'Reply to your comment',
        message: `${c.author_name || 'Someone'} replied: "${c.body.slice(0, 75)}${c.body.length > 75 ? '...' : ''}"`,
        timestamp: c.created_date || new Date().toISOString(),
        targetUrl,
        targetId: c.target_id,
        targetType: c.target_type,
        actorName: c.author_name || 'Community Member',
        actorRole: c.author_role || 'resident',
        isRead: readIds.has(`notif_reply_${c.id}`),
      });
    }
  });

  // --- 2. Comments on my hazard reports ---
  const myReportsMap = new Map();
  hazardReports.forEach((r) => {
    if (String(r.created_by_id) === userId) {
      myReportsMap.set(r.id, r);
    }
  });

  comments.forEach((c) => {
    if (
      c.target_type === TARGET_TYPES.HAZARD_REPORT &&
      myReportsMap.has(c.target_id) &&
      String(c.created_by_id) !== userId &&
      !c.parent_comment_id
    ) {
      const report = myReportsMap.get(c.target_id);
      notifications.push({
        id: `notif_rep_comm_${c.id}`,
        type: NOTIFICATION_TYPES.REPORT_COMMENT,
        title: 'Comment on your Hazard Report',
        message: `${c.author_name || 'Someone'} commented on "${report.location_label || report.type || 'Hazard'}": "${c.body.slice(0, 75)}${c.body.length > 75 ? '...' : ''}"`,
        timestamp: c.created_date || new Date().toISOString(),
        targetUrl: '/hazards',
        targetId: c.target_id,
        targetType: TARGET_TYPES.HAZARD_REPORT,
        actorName: c.author_name || 'Community Member',
        actorRole: c.author_role || 'resident',
        isRead: readIds.has(`notif_rep_comm_${c.id}`),
      });
    }
  });

  // --- 3. Confirmations on my hazard reports ("I see this too") ---
  reactions.forEach((r) => {
    if (
      r.target_type === TARGET_TYPES.HAZARD_REPORT &&
      r.reaction_type === REACTION_TYPES.CONFIRM &&
      myReportsMap.has(r.target_id) &&
      String(r.created_by_id) !== userId
    ) {
      const report = myReportsMap.get(r.target_id);
      const notifId = `notif_confirm_${r.id || `${r.target_id}_${r.created_by_id}`}`;
      notifications.push({
        id: notifId,
        type: NOTIFICATION_TYPES.REPORT_CONFIRM,
        title: 'Hazard Confirmed: "I see this too"',
        message: `A community member confirmed your report at "${report.location_label || report.type || 'Tupi'}".`,
        timestamp: r.created_date || new Date().toISOString(),
        targetUrl: '/hazards',
        targetId: r.target_id,
        targetType: TARGET_TYPES.HAZARD_REPORT,
        actorName: 'Community Observer',
        actorRole: 'resident',
        isRead: readIds.has(notifId),
      });
    }
  });

  // --- 4. Report of mine being verified by DRRMO/LGU ---
  myReportsMap.forEach((r) => {
    if (r.status === 'verified' || r.is_verified === true) {
      const notifId = `notif_verified_${r.id}`;
      notifications.push({
        id: notifId,
        type: NOTIFICATION_TYPES.REPORT_VERIFIED,
        title: 'Hazard Report Officially Verified',
        message: `Your report for "${r.location_label || r.type || 'Incident'}" has been officially verified by DRRMO.`,
        timestamp: r.updated_date || r.created_date || new Date().toISOString(),
        targetUrl: '/hazards',
        targetId: r.id,
        targetType: TARGET_TYPES.HAZARD_REPORT,
        actorName: 'MDRRMO Tupi',
        actorRole: 'drrmo',
        isRead: readIds.has(notifId),
      });
    }
  });

  // --- 5. New official emergency announcements ---
  announcements.forEach((a) => {
    const isOfficial =
      a.is_official === true ||
      a.postType === 'official' ||
      a.type === 'verified_advisory' ||
      a.category === 'Official Advisory';

    if (isOfficial) {
      const notifId = `notif_ann_${a.id}`;
      notifications.push({
        id: notifId,
        type: NOTIFICATION_TYPES.OFFICIAL_ANNOUNCEMENT,
        title: `Official Advisory: ${a.title}`,
        message: (a.content || a.description || 'New public safety advisory issued.').slice(0, 95) + '...',
        timestamp: a.created_date || a.published_at || new Date().toISOString(),
        targetUrl: '/announcements',
        targetId: a.id,
        targetType: TARGET_TYPES.ANNOUNCEMENT,
        actorName: a.agency || a.author_name || 'LGU / DRRMO',
        actorRole: 'drrmo',
        isRead: readIds.has(notifId),
      });
    }
  });

  // Deduplicate and sort by timestamp descending (newest first)
  const uniqueMap = new Map();
  notifications.forEach((n) => {
    if (!uniqueMap.has(n.id)) {
      uniqueMap.set(n.id, n);
    }
  });

  return Array.from(uniqueMap.values()).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

/**
 * Calculate unread notification count
 */
export async function getUnreadNotificationCount(currentUser) {
  const notifs = await getUserNotifications(currentUser);
  return notifs.filter((n) => !n.isRead).length;
}
