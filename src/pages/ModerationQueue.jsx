// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import {
  getFlags,
  updateFlagStatus,
  hideComment,
  deleteComment,
  FLAG_STATUSES,
  TARGET_TYPES,
} from '@/lib/interactions';
import { getAuditLogs, AUDIT_ACTIONS } from '@/lib/auditLog';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  EyeOff,
  Eye,
  Trash2,
  Clock,
  User,
  AlertTriangle,
  History,
  Filter,
  Check,
  ExternalLink,
  Loader2,
  FileText,
  Shield,
  MessageSquare,
  AlertOctagon,
} from 'lucide-react';

const REASON_LABELS = {
  misinformation: { label: 'Misinformation / Rumors', color: 'bg-rose-100 text-rose-800 ring-rose-200' },
  spam: { label: 'Spam / Commercial', color: 'bg-amber-100 text-amber-800 ring-amber-200' },
  harassment: { label: 'Harassment / Abusive', color: 'bg-purple-100 text-purple-800 ring-purple-200' },
  inappropriate: { label: 'Inappropriate Content', color: 'bg-orange-100 text-orange-800 ring-orange-200' },
  other: { label: 'Other Safety Concern', color: 'bg-slate-100 text-slate-800 ring-slate-200' },
};

const TARGET_TYPE_LABELS = {
  comment: 'Comment / Reply',
  hazard_report: 'Hazard Report',
  announcement: 'Announcement',
  infrastructure_status: 'Infrastructure Status',
  volunteer_post: 'Volunteer Post',
};

function formatTimeAgo(dateStr) {
  if (!dateStr) return 'just now';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function ModerationQueue() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('flags'); // 'flags' | 'audit'
  const [statusFilter, setStatusFilter] = useState('open'); // 'all' | 'open' | 'action_taken' | 'dismissed'
  const [flags, setFlags] = useState([]);
  const [commentsMap, setCommentsMap] = useState({});
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState(null);

  const isModerator =
    user?.role === 'admin' || user?.role === 'drrmo' || user?.role === 'lgu';

  // Load flags and audit logs
  const loadData = useCallback(async () => {
    if (!isModerator) return;
    setLoading(true);
    try {
      const allFlags = await getFlags();
      setFlags(allFlags || []);

      // If flags target comments, fetch all comments to preview their text & is_hidden status
      try {
        let allComments = [];
        if (typeof base44.entities?.Comment?.list === 'function') {
          allComments = (await base44.entities.Comment.list('created_date', 1000)) || [];
        } else {
          allComments = JSON.parse(localStorage.getItem('mock_comments') || '[]');
        }
        const cMap = {};
        allComments.forEach((c) => {
          cMap[String(c.id)] = c;
        });
        setCommentsMap(cMap);
      } catch (cErr) {
        console.warn('Could not load comments map:', cErr);
      }

      // Load audit logs
      const logs = getAuditLogs({ limit: 100 });
      setAuditLogs(logs);
    } catch (err) {
      console.error('Failed to load moderation data:', err);
    } finally {
      setLoading(false);
    }
  }, [isModerator]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Dismiss Flag
  const handleDismissFlag = async (flag) => {
    setActionInProgress(flag.id);
    try {
      await updateFlagStatus(flag.id, FLAG_STATUSES.DISMISSED, {
        id: user.id,
        name: user.name || 'Moderator',
        role: user.role || 'admin',
      });
      await loadData();
    } catch (err) {
      alert('Failed to dismiss flag: ' + err.message);
    } finally {
      setActionInProgress(null);
    }
  };

  // Handle Mark Action Taken
  const handleResolveFlag = async (flag) => {
    setActionInProgress(flag.id);
    try {
      await updateFlagStatus(flag.id, FLAG_STATUSES.ACTION_TAKEN, {
        id: user.id,
        name: user.name || 'Moderator',
        role: user.role || 'admin',
      });
      await loadData();
    } catch (err) {
      alert('Failed to resolve flag: ' + err.message);
    } finally {
      setActionInProgress(null);
    }
  };

  // Handle Hide / Unhide Comment
  const handleToggleHide = async (commentId, currentlyHidden, flagId) => {
    setActionInProgress(flagId || commentId);
    try {
      await hideComment(commentId, !currentlyHidden, {
        id: user.id,
        name: user.name || 'Moderator',
        role: user.role || 'admin',
      });
      if (flagId) {
        // Automatically mark the flag as action taken if hiding content
        await updateFlagStatus(flagId, FLAG_STATUSES.ACTION_TAKEN, {
          id: user.id,
          name: user.name || 'Moderator',
          role: user.role || 'admin',
        });
      }
      await loadData();
    } catch (err) {
      alert('Failed to update visibility: ' + err.message);
    } finally {
      setActionInProgress(null);
    }
  };

  // Handle Delete Comment
  const handleDeleteComment = async (commentId, flagId) => {
    if (!window.confirm('Permanently delete this content? This action cannot be undone.')) return;
    setActionInProgress(flagId || commentId);
    try {
      await deleteComment(commentId, {
        id: user.id,
        name: user.name || 'Moderator',
        role: user.role || 'admin',
      });
      if (flagId) {
        await updateFlagStatus(flagId, FLAG_STATUSES.ACTION_TAKEN, {
          id: user.id,
          name: user.name || 'Moderator',
          role: user.role || 'admin',
        });
      }
      await loadData();
    } catch (err) {
      alert('Failed to delete comment: ' + err.message);
    } finally {
      setActionInProgress(null);
    }
  };

  // Access check fallback
  if (!isModerator) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <div className="rounded-3xl border border-rose-200 bg-white/80 p-8 text-center shadow-xl backdrop-blur-xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 ring-4 ring-rose-50">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
          <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
            The AEGIS Moderation Dashboard is restricted to authorized Municipal Disaster Risk Reduction and Management Office (MDRRMO) and LGU staff.
          </p>
        </div>
      </div>
    );
  }

  // Filter flags
  const filteredFlags = flags.filter((f) => {
    if (statusFilter === 'all') return true;
    return f.status === statusFilter;
  });

  const openCount = flags.filter((f) => f.status === 'open').length;
  const actionTakenCount = flags.filter((f) => f.status === 'action_taken').length;
  const dismissedCount = flags.filter((f) => f.status === 'dismissed').length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <PageHeader
        title="Moderation & Safety Operations"
        description="Review community flagged content, enforce safety guidelines, hide abusive posts, and monitor audit trails."
        icon={ShieldCheck}
        accent="rose"
        actions={
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-rose-100/80 px-3 py-1 text-xs font-bold text-rose-800 ring-1 ring-rose-200">
              <span className="h-2 w-2 rounded-full bg-rose-600 animate-ping" />
              {openCount} Open {openCount === 1 ? 'Report' : 'Reports'}
            </span>
          </div>
        }
      />

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Open Reports</span>
            <AlertOctagon className="h-4 w-4 text-rose-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-rose-600">{openCount}</p>
        </div>

        <div className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Action Taken</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-600">{actionTakenCount}</p>
        </div>

        <div className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Dismissed</span>
            <XCircle className="h-4 w-4 text-slate-400" />
          </div>
          <p className="mt-2 text-2xl font-black text-slate-600">{dismissedCount}</p>
        </div>

        <div className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Audit Events</span>
            <History className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-blue-600">{auditLogs.length}</p>
        </div>
      </div>

      {/* Main Tabs Header */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('flags')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            activeTab === 'flags'
              ? 'bg-white text-slate-900 shadow-md ring-1 ring-slate-900/5'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <ShieldAlert className="h-4 w-4 text-rose-600" />
          Flagged Community Content ({flags.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            activeTab === 'audit'
              ? 'bg-white text-slate-900 shadow-md ring-1 ring-slate-900/5'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <History className="h-4 w-4 text-blue-600" />
          Audit & Verification Log ({auditLogs.length})
        </button>
      </div>

      {/* TAB 1: FLAGGED CONTENT */}
      {activeTab === 'flags' && (
        <div className="space-y-4">
          {/* Status Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/60 bg-white/60 p-2 shadow-sm backdrop-blur-xl">
            {['all', 'open', 'action_taken', 'dismissed'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold capitalize transition-all ${
                  statusFilter === st
                    ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/5'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {st.replace('_', ' ')} (
                {st === 'all'
                  ? flags.length
                  : flags.filter((f) => f.status === st).length}
                )
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : filteredFlags.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white/50 p-12 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">No reports in this category</h4>
              <p className="mt-1 text-xs text-slate-500">
                Community feeds are clean and complying with safety guidelines.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFlags.map((flag) => {
                const reasonInfo = REASON_LABELS[flag.reason] || REASON_LABELS.other;
                const commentPreview = flag.target_type === 'comment' ? commentsMap[String(flag.target_id)] : null;
                const isItemHidden = commentPreview?.is_hidden;

                return (
                  <div
                    key={flag.id}
                    className="group rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur-xl space-y-3 transition-all hover:shadow-md"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Target Type Pill */}
                        <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                          {TARGET_TYPE_LABELS[flag.target_type] || flag.target_type}
                        </span>

                        {/* Reason Pill */}
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ring-1 ${reasonInfo.color}`}
                        >
                          {reasonInfo.label}
                        </span>

                        {/* Status Badge */}
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            flag.status === 'open'
                              ? 'bg-rose-100 text-rose-700 ring-1 ring-rose-200'
                              : flag.status === 'action_taken'
                              ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          Status: {flag.status.replace('_', ' ')}
                        </span>
                      </div>

                      <span className="text-[11px] text-slate-400">
                        {formatTimeAgo(flag.created_date)}
                      </span>
                    </div>

                    {/* Reported Item Preview Box */}
                    <div className="rounded-xl border border-slate-200/70 bg-slate-50/70 p-3 text-xs space-y-1.5">
                      <div className="flex items-center justify-between text-slate-500 text-[11px]">
                        <span>
                          Target ID: <code className="font-mono text-slate-700">{flag.target_id}</code>
                        </span>
                        {isItemHidden && (
                          <span className="rounded bg-rose-600 px-1.5 py-0.2 text-[9px] font-bold uppercase text-white">
                            Currently Hidden
                          </span>
                        )}
                      </div>

                      {commentPreview ? (
                        <div className="pt-1">
                          <p className="text-slate-800 font-medium whitespace-pre-wrap">
                            "{commentPreview.body}"
                          </p>
                          <p className="mt-1 text-[11px] text-slate-500">
                            Author: <strong>{commentPreview.author_name || 'Community Member'}</strong> ({commentPreview.author_role || 'resident'})
                          </p>
                        </div>
                      ) : (
                        <p className="text-slate-600 italic">
                          Target content item ({flag.target_type} #{flag.target_id})
                        </p>
                      )}
                    </div>

                    {/* Reporter Notes */}
                    {flag.details && (
                      <div className="text-xs text-slate-600">
                        <span className="font-semibold text-slate-700">Reporter's Note:</span> "{flag.details}"
                      </div>
                    )}

                    {/* Moderation Action Toolbar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                      <div className="text-[11px] text-slate-400">
                        Reported by: <span className="text-slate-600 font-medium">{flag.reporter_name || 'Citizen'}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* If it's a comment, allow Hide/Unhide */}
                        {flag.target_type === 'comment' && commentPreview && (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={actionInProgress === flag.id}
                              onClick={() => handleToggleHide(flag.target_id, isItemHidden, flag.id)}
                              className={`h-7 px-2.5 text-xs rounded-lg ${
                                isItemHidden
                                  ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                                  : 'border-amber-200 text-amber-700 hover:bg-amber-50'
                              }`}
                            >
                              {isItemHidden ? (
                                <>
                                  <Eye className="mr-1 h-3.5 w-3.5" /> Unhide Content
                                </>
                              ) : (
                                <>
                                  <EyeOff className="mr-1 h-3.5 w-3.5" /> Hide Content
                                </>
                              )}
                            </Button>

                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={actionInProgress === flag.id}
                              onClick={() => handleDeleteComment(flag.target_id, flag.id)}
                              className="h-7 px-2.5 text-xs rounded-lg border-rose-200 text-rose-700 hover:bg-rose-50"
                            >
                              <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                            </Button>
                          </>
                        )}

                        {/* Status updating actions */}
                        {flag.status === 'open' && (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              disabled={actionInProgress === flag.id}
                              onClick={() => handleResolveFlag(flag)}
                              className="h-7 px-2.5 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                            >
                              <Check className="mr-1 h-3.5 w-3.5" /> Resolve (Action Taken)
                            </Button>

                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              disabled={actionInProgress === flag.id}
                              onClick={() => handleDismissFlag(flag)}
                              className="h-7 px-2.5 text-xs rounded-lg text-slate-500 hover:text-slate-800"
                            >
                              Dismiss (No Action)
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: AUDIT TRAIL LOG */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur-xl">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <History className="h-4 w-4 text-blue-600" />
              Official Verification & Moderation Audit Feed
            </h4>
            <p className="mt-0.5 text-xs text-slate-500">
              Immutable log of all official verifications, report status changes, and content moderation actions.
            </p>
          </div>

          {auditLogs.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white/50 p-12 text-center text-xs text-slate-500">
              No audit records logged yet.
            </div>
          ) : (
            <div className="rounded-2xl border border-white/60 bg-white/80 shadow-sm backdrop-blur-xl overflow-hidden divide-y divide-slate-100">
              {auditLogs.map((log) => {
                const isVerification = log.action.includes('verified') || log.action.includes('resolved');
                const isModeration = log.action.includes('hidden') || log.action.includes('flag') || log.action.includes('deleted');

                return (
                  <div key={log.id} className="p-4 flex items-start justify-between gap-3 text-xs hover:bg-slate-50/60 transition-colors">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                            isVerification
                              ? 'bg-blue-100 text-blue-800 ring-1 ring-blue-200'
                              : isModeration
                              ? 'bg-amber-100 text-amber-800 ring-1 ring-amber-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {log.action.replace(/_/g, ' ')}
                        </span>

                        <span className="text-slate-400">•</span>

                        <span className="font-semibold text-slate-800">
                          {log.actor_name}
                        </span>
                        <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[9px] font-bold uppercase text-slate-600">
                          {log.actor_role}
                        </span>
                      </div>

                      <p className="text-slate-600">
                        Target: <span className="font-medium text-slate-900">{log.target_type}</span>{' '}
                        (<code className="font-mono text-slate-500">{log.target_id}</code>)
                      </p>

                      {log.details && (
                        <p className="text-[11px] text-slate-500 font-mono bg-slate-50 p-1 rounded inline-block">
                          {log.details}
                        </p>
                      )}
                    </div>

                    <span className="text-[11px] text-slate-400 whitespace-nowrap">
                      {formatTimeAgo(log.created_at)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
