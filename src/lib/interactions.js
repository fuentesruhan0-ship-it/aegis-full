import { base44 } from '../api/base44Client.js';
import { sanitizeText, maskSensitiveInfo, checkRateLimit } from './safety.js';
import { logAuditEvent, AUDIT_ACTIONS } from './auditLog.js';

export const TARGET_TYPES = {
  HAZARD_REPORT: 'hazard_report',
  ANNOUNCEMENT: 'announcement',
  INFRASTRUCTURE_STATUS: 'infrastructure_status',
  VOLUNTEER_POST: 'volunteer_post',
  COMMENT: 'comment',
};

export const REACTION_TYPES = {
  CONFIRM: 'confirm',
  HELPFUL: 'helpful',
  URGENT: 'urgent',
  LIKE: 'like',
};

export const FLAG_REASONS = {
  SPAM: 'spam',
  MISINFORMATION: 'misinformation',
  HARASSMENT: 'harassment',
  INAPPROPRIATE: 'inappropriate',
  OTHER: 'other',
};

export const FLAG_STATUSES = {
  OPEN: 'open',
  DISMISSED: 'dismissed',
  ACTION_TAKEN: 'action_taken',
};

/**
 * -------------------------------------------------------------------------
 * COMMENTS API
 * -------------------------------------------------------------------------
 */

/**
 * Retrieve comments for a specific target, chronologically ordered.
 * By default, filters out hidden comments unless includeHidden is true.
 */
export async function getComments({ targetType, targetId, includeHidden = false }) {
  if (!targetType || !targetId) return [];

  let list = [];
  try {
    if (typeof base44.entities?.Comment?.filter === 'function') {
      list = await base44.entities.Comment.filter({
        target_type: targetType,
        target_id: String(targetId),
      });
    } else if (typeof base44.entities?.Comment?.list === 'function') {
      const all = await base44.entities.Comment.list('created_date', 1000);
      list = (all || []).filter(
        (c) => c.target_type === targetType && String(c.target_id) === String(targetId)
      );
    }
  } catch (err) {
    console.error('Failed to getComments:', err);
    return [];
  }

  // Filter hidden unless requested
  if (!includeHidden) {
    list = list.filter((c) => !c.is_hidden);
  }

  // Sort ascending by created_date so thread flows chronologically
  return list.sort((a, b) => new Date(a.created_date || 0) - new Date(b.created_date || 0));
}

/**
 * Add a new comment or threaded reply.
 */
export async function addComment({
  base44: clientOverride,
  targetType,
  targetId,
  body,
  parentCommentId = null,
  authorName = null,
  authorRole = null,
  user = null,
}) {
  const client = clientOverride || base44;
  if (!targetType || !targetId) {
    throw new Error('Target type and target ID are required');
  }

  // Rate limiting check
  let currentUserId = user?.id || null;
  if (!currentUserId) {
    try {
      const authUser = await Promise.resolve(client?.auth?.getUser?.()).catch(() => null);
      currentUserId = authUser?.id;
    } catch {}
  }

  if (!currentUserId && typeof localStorage !== 'undefined') {
    try {
      const stored = localStorage.getItem('mock_user');
      if (stored) currentUserId = JSON.parse(stored)?.id;
    } catch {}
  }

  if (currentUserId) {
    checkRateLimit(String(currentUserId), 'comment');
  }

  const rawClean = (body || '').trim();
  if (!rawClean) {
    throw new Error('Comment body cannot be empty');
  }
  if (rawClean.length > 2000) {
    throw new Error('Comment cannot exceed 2000 characters');
  }

  // Sanitize HTML/XSS and mask sensitive contact details
  const sanitized = sanitizeText(rawClean);
  const { text: cleanBody } = maskSensitiveInfo(sanitized);

  const comment = await client.entities.Comment.create({
    target_type: targetType,
    target_id: String(targetId),
    parent_comment_id: parentCommentId || null,
    body: cleanBody,
    author_name: authorName || user?.name || user?.full_name || undefined,
    author_role: authorRole || user?.role || undefined,
    is_hidden: false,
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('aegis:interaction', { detail: { targetType, targetId } }));
  }

  return comment;
}

/**
 * Update an existing comment (e.g. edit body).
 */
export async function updateComment(commentId, data) {
  if (!commentId) throw new Error('Comment ID is required');
  return await base44.entities.Comment.update(commentId, data);
}

/**
 * Permanently delete a comment with audit logging.
 */
export async function deleteComment(commentId, actor = {}) {
  if (!commentId) throw new Error('Comment ID is required');
  const res = await base44.entities.Comment.delete(commentId);

  logAuditEvent({
    action: AUDIT_ACTIONS.COMMENT_DELETED,
    targetType: TARGET_TYPES.COMMENT,
    targetId: commentId,
    actorId: actor?.id,
    actorName: actor?.name,
    actorRole: actor?.role,
  });

  return res;
}

/**
 * Toggle hide/unhide flag for moderation with audit logging.
 */
export async function hideComment(commentId, isHidden = true, actor = {}) {
  if (!commentId) throw new Error('Comment ID is required');
  const res = await base44.entities.Comment.update(commentId, { is_hidden: Boolean(isHidden) });

  logAuditEvent({
    action: isHidden ? AUDIT_ACTIONS.COMMENT_HIDDEN : AUDIT_ACTIONS.COMMENT_UNHIDDEN,
    targetType: TARGET_TYPES.COMMENT,
    targetId: commentId,
    actorId: actor?.id,
    actorName: actor?.name || 'Moderator',
    actorRole: actor?.role || 'admin',
    details: { is_hidden: Boolean(isHidden) },
  });

  return res;
}

/**
 * -------------------------------------------------------------------------
 * REACTIONS API
 * -------------------------------------------------------------------------
 */

/**
 * Retrieve all reactions for a target.
 */
export async function getReactions({ base44: clientOverride, targetType, targetId }) {
  const client = clientOverride || base44;
  if (!targetType || !targetId) return [];

  try {
    if (typeof client.entities?.Reaction?.filter === 'function') {
      return await client.entities.Reaction.filter({
        target_type: targetType,
        target_id: String(targetId),
      });
    }
    const all = await client.entities.Reaction.list();
    return (all || []).filter(
      (r) => r.target_type === targetType && String(r.target_id) === String(targetId)
    );
  } catch (err) {
    console.error('Failed to getReactions:', err);
    return [];
  }
}

/**
 * Retrieve reaction counts map for a target.
 */
export async function getReactionCounts({ base44: clientOverride, targetType, targetId }) {
  const client = clientOverride || base44;
  const reactions = await getReactions({ base44: client, targetType, targetId });
  const counts = {
    [REACTION_TYPES.CONFIRM]: 0,
    [REACTION_TYPES.HELPFUL]: 0,
    [REACTION_TYPES.URGENT]: 0,
    [REACTION_TYPES.LIKE]: 0,
  };
  reactions.forEach((r) => {
    if (counts[r.reaction_type] !== undefined) {
      counts[r.reaction_type] += 1;
    } else {
      counts[r.reaction_type] = 1;
    }
  });
  return counts;
}

/**
 * Get aggregated reaction summary for a target, including current user's reaction status.
 */
export async function getReactionSummary({ base44: clientOverride, targetType, targetId, currentUserId }) {
  const client = clientOverride || base44;
  const reactions = await getReactions({ base44: client, targetType, targetId });

  const counts = {
    [REACTION_TYPES.CONFIRM]: 0,
    [REACTION_TYPES.HELPFUL]: 0,
    [REACTION_TYPES.URGENT]: 0,
    [REACTION_TYPES.LIKE]: 0,
  };

  const userReactions = [];
  const userReactionIds = {};

  reactions.forEach((r) => {
    if (counts[r.reaction_type] !== undefined) {
      counts[r.reaction_type] += 1;
    } else {
      counts[r.reaction_type] = 1;
    }

    if (currentUserId && String(r.created_by_id) === String(currentUserId)) {
      if (!userReactions.includes(r.reaction_type)) {
        userReactions.push(r.reaction_type);
      }
      userReactionIds[r.reaction_type] = r.id;
    }
  });

  return {
    counts,
    total: reactions.length,
    userReactions,
    userReactionIds,
    reactions,
  };
}

/**
 * Toggle a reaction on or off for the current user.
 */
export async function toggleReaction({ base44: clientOverride, targetType, targetId, reactionType, currentUserId, user }) {
  const client = clientOverride || base44;
  const uid = currentUserId || user?.id;
  if (!targetType || !targetId || !reactionType) {
    throw new Error('Target type, target ID, and reaction type are required');
  }

  const reactions = await getReactions({ base44: client, targetType, targetId });
  const existing = reactions.find(
    (r) =>
      r.reaction_type === reactionType &&
      uid &&
      String(r.created_by_id) === String(uid)
  );

  let result;
  if (existing) {
    await client.entities.Reaction.delete(existing.id);
    result = {
      action: 'removed',
      active: false,
      reactionType,
      id: existing.id,
    };
  } else {
    const created = await client.entities.Reaction.create({
      target_type: targetType,
      target_id: String(targetId),
      reaction_type: reactionType,
      created_by_id: uid || 'anon',
    });
    result = {
      action: 'added',
      active: true,
      reactionType,
      reaction: created,
    };
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('aegis:interaction', { detail: { targetType, targetId, reactionType } }));
  }

  return result;
}

/**
 * -------------------------------------------------------------------------
 * BATCH HELPERS (FEED PERFORMANCE)
 * -------------------------------------------------------------------------
 */

/**
 * Fetch comment counts in batch for multiple target IDs of the same target type.
 * Returns map: { [targetId]: count }
 */
export async function getBatchCommentCounts({ targetType, targetIds = [] }) {
  if (!targetType || targetIds.length === 0) return {};

  const idSet = new Set(targetIds.map((id) => String(id)));
  const counts = {};
  targetIds.forEach((id) => {
    counts[String(id)] = 0;
  });

  try {
    const all = await base44.entities.Comment.list('-created_date', 1000);
    (all || []).forEach((c) => {
      const tid = String(c.target_id);
      if (c.target_type === targetType && idSet.has(tid) && !c.is_hidden) {
        counts[tid] = (counts[tid] || 0) + 1;
      }
    });
  } catch (err) {
    console.error('Failed to getBatchCommentCounts:', err);
  }

  return counts;
}

/**
 * Fetch reaction summaries in batch for multiple target IDs.
 * Returns map: { [targetId]: { counts, total, userReactions, userReactionIds } }
 */
export async function getBatchReactionSummaries({ targetType, targetIds = [], currentUserId }) {
  const result = {};
  targetIds.forEach((id) => {
    result[String(id)] = {
      counts: {
        [REACTION_TYPES.CONFIRM]: 0,
        [REACTION_TYPES.HELPFUL]: 0,
        [REACTION_TYPES.URGENT]: 0,
        [REACTION_TYPES.LIKE]: 0,
      },
      total: 0,
      userReactions: [],
      userReactionIds: {},
    };
  });

  if (!targetType || targetIds.length === 0) return result;

  const idSet = new Set(targetIds.map((id) => String(id)));

  try {
    const all = await base44.entities.Reaction.list();
    (all || []).forEach((r) => {
      const tid = String(r.target_id);
      if (r.target_type === targetType && idSet.has(tid)) {
        const item = result[tid];
        if (item) {
          item.counts[r.reaction_type] = (item.counts[r.reaction_type] || 0) + 1;
          item.total += 1;
          if (currentUserId && String(r.created_by_id) === String(currentUserId)) {
            if (!item.userReactions.includes(r.reaction_type)) {
              item.userReactions.push(r.reaction_type);
            }
            item.userReactionIds[r.reaction_type] = r.id;
          }
        }
      }
    });
  } catch (err) {
    console.error('Failed to getBatchReactionSummaries:', err);
  }

  return result;
}

/**
 * -------------------------------------------------------------------------
 * CONTENT FLAGS & MODERATION API
 * -------------------------------------------------------------------------
 */

/**
 * Submit a report/flag on any community content item with rate-limiting and audit logging.
 */
export async function flagContent({ targetType, targetId, reason, details = '', reporter = {} }) {
  if (!targetType || !targetId || !reason) {
    throw new Error('Target type, target ID, and reason are required');
  }

  if (reporter?.id) {
    checkRateLimit(String(reporter.id), 'flag');
  }

  const cleanDetails = sanitizeText(details || '');

  const flag = await base44.entities.ContentFlag.create({
    target_type: targetType,
    target_id: String(targetId),
    reason,
    details: cleanDetails,
    status: FLAG_STATUSES.OPEN,
  });

  logAuditEvent({
    action: AUDIT_ACTIONS.FLAG_CREATED,
    targetType,
    targetId,
    actorId: reporter?.id,
    actorName: reporter?.name || 'Community Member',
    actorRole: reporter?.role || 'resident',
    details: { reason, details: cleanDetails },
  });

  return flag;
}

/**
 * List flags for admin moderation dashboard.
 */
export async function getFlags({ status, targetType, targetId } = {}) {
  try {
    let flags = [];
    if (typeof base44.entities?.ContentFlag?.filter === 'function') {
      const query = {};
      if (status) query.status = status;
      if (targetType) query.target_type = targetType;
      if (targetId) query.target_id = String(targetId);
      flags = await base44.entities.ContentFlag.filter(query);
    } else {
      const all = await base44.entities.ContentFlag.list('-created_date', 500);
      flags = (all || []).filter((f) => {
        if (status && f.status !== status) return false;
        if (targetType && f.target_type !== targetType) return false;
        if (targetId && String(f.target_id) !== String(targetId)) return false;
        return true;
      });
    }

    return (flags || []).sort(
      (a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0)
    );
  } catch (err) {
    console.error('Failed to getFlags:', err);
    return [];
  }
}

/**
 * Update the status of a content flag (e.g. open -> dismissed or action_taken) with audit logging.
 */
export async function updateFlagStatus(flagId, status, actor = {}) {
  if (!flagId || !status) {
    throw new Error('Flag ID and status are required');
  }
  const res = await base44.entities.ContentFlag.update(flagId, { status });

  logAuditEvent({
    action: status === FLAG_STATUSES.DISMISSED ? AUDIT_ACTIONS.FLAG_DISMISSED : AUDIT_ACTIONS.FLAG_ACTION_TAKEN,
    targetType: 'content_flag',
    targetId: flagId,
    actorId: actor?.id,
    actorName: actor?.name || 'Moderator',
    actorRole: actor?.role || 'admin',
    details: { status },
  });

  return res;
}
