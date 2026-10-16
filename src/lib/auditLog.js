/**
 * AEGIS Audit Log Engine
 * Records immutable audit entries for all community moderation and official verification events:
 * - Hazard report status changes (verified, resolved, false_report)
 * - Comment moderation (hidden, unhidden, deleted)
 * - Content flag resolutions (dismissed, action_taken)
 * - Official announcements & emergency advisories
 */

const AUDIT_STORAGE_KEY = 'aegis_audit_logs';

export const AUDIT_ACTIONS = {
  // Hazard Report Verifications
  HAZARD_VERIFIED: 'hazard_verified',
  HAZARD_RESOLVED: 'hazard_resolved',
  HAZARD_REJECTED: 'hazard_rejected',
  HAZARD_DELETED: 'hazard_deleted',

  // Comment Moderation
  COMMENT_HIDDEN: 'comment_hidden',
  COMMENT_UNHIDDEN: 'comment_unhidden',
  COMMENT_DELETED: 'comment_deleted',

  // Flag Actions
  FLAG_CREATED: 'flag_created',
  FLAG_DISMISSED: 'flag_dismissed',
  FLAG_ACTION_TAKEN: 'flag_action_taken',

  // Announcements
  ANNOUNCEMENT_VERIFIED: 'announcement_verified',
  ANNOUNCEMENT_DELETED: 'announcement_deleted',
};

/**
 * Record an audit log entry
 */
export function logAuditEvent({
  action,
  targetType,
  targetId,
  actorId,
  actorName,
  actorRole,
  details = '',
}) {
  if (!action || !targetId) return null;

  try {
    let logs = [];
    const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
    if (raw) {
      logs = JSON.parse(raw);
    }

    const entry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      action,
      target_type: targetType || 'unknown',
      target_id: String(targetId),
      actor_id: actorId ? String(actorId) : 'system',
      actor_name: actorName || 'System Moderator',
      actor_role: actorRole || 'admin',
      details: typeof details === 'object' ? JSON.stringify(details) : String(details),
      created_at: new Date().toISOString(),
    };

    logs.unshift(entry);

    // Keep the most recent 1000 logs
    if (logs.length > 1000) {
      logs = logs.slice(0, 1000);
    }

    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(logs));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('aegis:audit_log', { detail: entry }));
    }

    return entry;
  } catch (err) {
    console.error('Failed to write audit log:', err);
    return null;
  }
}

/**
 * Retrieve audit log entries with optional filtering
 */
export function getAuditLogs({ limit = 100, targetType, targetId, action } = {}) {
  try {
    const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
    let logs = raw ? JSON.parse(raw) : [];

    if (targetType) {
      logs = logs.filter((l) => l.target_type === targetType);
    }
    if (targetId) {
      logs = logs.filter((l) => String(l.target_id) === String(targetId));
    }
    if (action) {
      logs = logs.filter((l) => l.action === action);
    }

    return logs.slice(0, limit);
  } catch (err) {
    console.error('Failed to retrieve audit logs:', err);
    return [];
  }
}

/**
 * Clear audit logs (test utility only)
 */
export function clearAuditLogs() {
  localStorage.removeItem(AUDIT_STORAGE_KEY);
}
