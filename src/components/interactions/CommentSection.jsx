// @ts-nocheck
import React, { useState, useEffect, useCallback } from "react";
import { getComments, addComment, deleteComment, hideComment, TARGET_TYPES } from "@/lib/interactions";
import ReportDialog from "@/components/interactions/ReportDialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  MessageSquare,
  CornerDownRight,
  Trash2,
  EyeOff,
  Eye,
  Send,
  Loader2,
  AlertCircle,
  Flag,
} from "lucide-react";

const ROLE_BADGES = {
  admin: { label: "Admin", class: "bg-rose-100 text-rose-800 ring-rose-300" },
  drrmo: { label: "DRRMO", class: "bg-blue-100 text-blue-800 ring-blue-300" },
  lgu: { label: "LGU Official", class: "bg-indigo-100 text-indigo-800 ring-indigo-300" },
  responder: { label: "First Responder", class: "bg-amber-100 text-amber-800 ring-amber-300" },
  volunteer: { label: "Volunteer", class: "bg-purple-100 text-purple-800 ring-purple-300" },
  resident: { label: "Resident", class: "bg-slate-100 text-slate-700 ring-slate-200" },
};

function formatTimeAgo(dateStr) {
  if (!dateStr) return "just now";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function CommentSection({
  targetType,
  targetId,
  currentUser,
  onCommentCountChange = null,
}) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newBody, setNewBody] = useState("");
  const [replyingTo, setReplyingTo] = useState(null); // comment object
  const [reportingComment, setReportingComment] = useState(null); // comment to report
  const [errorMsg, setErrorMsg] = useState("");

  const isAdmin = currentUser?.role === "admin";

  const loadData = useCallback(async () => {
    if (!targetType || !targetId) return;
    try {
      const list = await getComments({
        targetType,
        targetId,
        includeHidden: isAdmin,
      });
      setComments(list || []);
      if (onCommentCountChange) {
        onCommentCountChange(list.filter((c) => !c.is_hidden).length);
      }
    } catch (e) {
      console.error("Error loading comments:", e);
    } finally {
      setLoading(false);
    }
  }, [targetType, targetId, isAdmin, onCommentCountChange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const clean = newBody.trim();
    if (!clean) return;

    if (!currentUser) {
      setErrorMsg("Please sign in to join the conversation.");
      return;
    }
    if (clean.length > 2000) {
      setErrorMsg("Comment is too long (maximum 2,000 characters).");
      return;
    }

    setErrorMsg("");
    setSubmitting(true);

    try {
      await addComment({
        targetType,
        targetId,
        body: clean,
        parentCommentId: replyingTo?.id || null,
        authorName: currentUser?.name || currentUser?.email?.split("@")[0] || "Community Member",
        authorRole: currentUser?.role || "resident",
      });
      setNewBody("");
      setReplyingTo(null);
      await loadData();
    } catch (err) {
      setErrorMsg(err.message || "Failed to post comment.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) return;
    try {
      await deleteComment(id);
      await loadData();
    } catch (err) {
      alert("Failed to delete comment: " + err.message);
    }
  };

  const handleToggleHide = async (id, currentHidden) => {
    try {
      await hideComment(id, !currentHidden);
      await loadData();
    } catch (err) {
      alert("Failed to update comment visibility: " + err.message);
    }
  };

  // Organize comments into top-level and replies
  const topLevel = comments.filter((c) => !c.parent_comment_id);
  const repliesByParent = comments.reduce((acc, c) => {
    if (c.parent_comment_id) {
      acc[c.parent_comment_id] = acc[c.parent_comment_id] || [];
      acc[c.parent_comment_id].push(c);
    }
    return acc;
  }, {});

  const renderComment = (item, isReply = false) => {
    const roleBadge = ROLE_BADGES[item.author_role] || ROLE_BADGES.resident;
    const isOwner = currentUser && String(currentUser.id) === String(item.created_by_id);
    const replies = repliesByParent[item.id] || [];

    return (
      <div
        key={item.id}
        className={`group relative rounded-xl border transition-all ${
          item.is_hidden
            ? "border-rose-200/60 bg-rose-50/40 opacity-75"
            : isReply
            ? "border-white/50 bg-white/40 shadow-xs"
            : "border-white/60 bg-white/60 shadow-sm"
        } p-3.5 backdrop-blur-md`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200/80 text-[11px] font-semibold text-slate-700">
              {item.author_name ? item.author_name.charAt(0).toUpperCase() : "U"}
            </div>
            <span className="text-xs font-semibold text-slate-900">{item.author_name}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ring-1 ${roleBadge.class}`}
            >
              {roleBadge.label}
            </span>
            <span className="text-[11px] text-slate-400">{formatTimeAgo(item.created_date)}</span>
            {item.is_hidden && (
              <span className="rounded bg-rose-600 px-1.5 py-0.2 text-[9px] font-bold text-white uppercase">
                Hidden by Moderator
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
            {/* Reply button (only on top-level) */}
            {!isReply && (
              <button
                type="button"
                onClick={() => setReplyingTo(item)}
                className="rounded px-1.5 py-0.5 text-[11px] text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              >
                Reply
              </button>
            )}

            {/* Admin Hide/Unhide */}
            {isAdmin && (
              <button
                type="button"
                title={item.is_hidden ? "Unhide comment" : "Hide comment (Admin)"}
                onClick={() => handleToggleHide(item.id, item.is_hidden)}
                className="rounded p-1 text-slate-400 hover:bg-amber-50 hover:text-amber-700"
              >
                {item.is_hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              </button>
            )}

            {/* Author or Admin Delete */}
            {(isOwner || isAdmin) && (
              <button
                type="button"
                title="Delete comment"
                onClick={() => handleDelete(item.id)}
                className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}

            {/* Report this comment */}
            {!isOwner && (
              <button
                type="button"
                title="Report this comment to moderators"
                onClick={() => setReportingComment(item)}
                className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
              >
                <Flag className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <p className="mt-2 text-xs leading-relaxed text-slate-700 whitespace-pre-wrap">{item.body}</p>

        {/* Threaded replies */}
        {replies.length > 0 && (
          <div className="mt-3 space-y-2 border-l-2 border-slate-200/70 pl-3">
            {replies.map((reply) => renderComment(reply, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
        <h4 className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-slate-800 uppercase">
          <MessageSquare className="h-3.5 w-3.5 text-amber-600" />
          Community Discussion ({comments.filter((c) => !c.is_hidden).length})
        </h4>
        <span className="text-[11px] text-slate-400">Live updates from neighbors</span>
      </div>

      {loading ? (
        <div className="flex py-6 justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      ) : topLevel.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white/40 p-4 text-center text-xs text-slate-500">
          No comments yet. Be the first to share an update or safety tip!
        </div>
      ) : (
        <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
          {topLevel.map((comment) => renderComment(comment, false))}
        </div>
      )}

      {/* Comment Form */}
      <form onSubmit={handleSubmit} className="space-y-2 rounded-xl border border-white/50 bg-white/70 p-3 shadow-xs">
        {replyingTo && (
          <div className="flex items-center justify-between rounded-lg bg-amber-50/80 px-2.5 py-1 text-xs text-amber-900 border border-amber-200/60">
            <span className="flex items-center gap-1 font-medium">
              <CornerDownRight className="h-3.5 w-3.5 text-amber-600" />
              Replying to <span className="font-semibold">{replyingTo.author_name}</span>
            </span>
            <button
              type="button"
              onClick={() => setReplyingTo(null)}
              className="text-[11px] text-amber-700 hover:underline"
            >
              Cancel
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="flex items-center gap-1.5 text-xs text-rose-600">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <Textarea
          placeholder={
            replyingTo
              ? `Write your reply to ${replyingTo.author_name}...`
              : "Share an update, hazard clarification, or safety note..."
          }
          rows={2}
          value={newBody}
          onChange={(e) => {
            setNewBody(e.target.value);
            if (errorMsg) setErrorMsg("");
          }}
          className="resize-none text-xs bg-white/90 focus-visible:ring-amber-500"
          maxLength={2000}
        />

        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>{newBody.length}/2000 chars</span>
          <Button
            type="submit"
            size="sm"
            disabled={submitting || !newBody.trim()}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8 px-3"
          >
            {submitting ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="mr-1 h-3.5 w-3.5" />
            )}
            {replyingTo ? "Post reply" : "Post comment"}
          </Button>
        </div>
      </form>

      {/* Report Modal */}
      <ReportDialog
        open={Boolean(reportingComment)}
        onOpenChange={(open) => !open && setReportingComment(null)}
        targetType={TARGET_TYPES.COMMENT}
        targetId={reportingComment?.id}
        targetTitle={reportingComment?.body}
        currentUser={currentUser}
      />
    </div>
  );
}
