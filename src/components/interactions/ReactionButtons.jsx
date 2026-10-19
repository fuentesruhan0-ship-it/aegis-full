// @ts-nocheck
import React, { useState, useEffect } from "react";
import { toggleReaction, getReactionSummary, REACTION_TYPES } from "@/lib/interactions";
import { ThumbsUp, AlertOctagon, Loader2, Eye } from "lucide-react";

const REACTION_CONFIG = {
  [REACTION_TYPES.CONFIRM]: {
    label: "Confirm",
    fullLabel: "I see this too",
    icon: Eye,
    activeClass: "bg-emerald-500/15 text-emerald-700 border-emerald-300 ring-1 ring-emerald-300 font-semibold shadow-sm",
    inactiveClass: "bg-white/50 text-slate-600 border-slate-200/80 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200",
  },
  [REACTION_TYPES.HELPFUL]: {
    label: "Helpful",
    fullLabel: "Helpful info",
    icon: ThumbsUp,
    activeClass: "bg-blue-500/15 text-blue-700 border-blue-300 ring-1 ring-blue-300 font-semibold shadow-sm",
    inactiveClass: "bg-white/50 text-slate-600 border-slate-200/80 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200",
  },
  [REACTION_TYPES.URGENT]: {
    label: "Urgent",
    fullLabel: "Needs urgent action",
    icon: AlertOctagon,
    activeClass: "bg-rose-500/15 text-rose-700 border-rose-300 ring-1 ring-rose-300 font-semibold shadow-sm",
    inactiveClass: "bg-white/50 text-slate-600 border-slate-200/80 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200",
  },
};

export default function ReactionButtons({
  targetType,
  targetId,
  currentUserId,
  initialSummary = null,
  compact = false,
  onReactionChange = null,
}) {
  const [summary, setSummary] = useState(
    initialSummary || {
      counts: { confirm: 0, helpful: 0, urgent: 0, like: 0 },
      total: 0,
      userReactions: [],
    }
  );
  const [loadingType, setLoadingType] = useState(null);

  useEffect(() => {
    if (initialSummary) {
      setSummary(initialSummary);
    } else if (targetType && targetId) {
      getReactionSummary({ targetType, targetId, currentUserId }).then((res) => {
        setSummary(res);
      });
    }
  }, [targetType, targetId, currentUserId, initialSummary]);

  const handleToggle = async (type, e) => {
    if (e) e.stopPropagation();
    if (!currentUserId) {
      alert("Please sign in to react or confirm reports.");
      return;
    }
    if (loadingType) return;

    setLoadingType(type);

    // Optimistic update
    const isCurrentlyActive = summary.userReactions.includes(type);
    const updatedUserReactions = isCurrentlyActive
      ? summary.userReactions.filter((r) => r !== type)
      : [...summary.userReactions, type];

    const currentCount = summary.counts[type] || 0;
    const updatedCount = isCurrentlyActive ? Math.max(0, currentCount - 1) : currentCount + 1;

    const optimisticSummary = {
      ...summary,
      counts: {
        ...summary.counts,
        [type]: updatedCount,
      },
      total: isCurrentlyActive ? Math.max(0, summary.total - 1) : summary.total + 1,
      userReactions: updatedUserReactions,
    };
    setSummary(optimisticSummary);

    try {
      await toggleReaction({
        targetType,
        targetId,
        reactionType: type,
        currentUserId,
      });

      // Fetch fresh server state
      const fresh = await getReactionSummary({ targetType, targetId, currentUserId });
      setSummary(fresh);
      if (onReactionChange) onReactionChange(fresh);
    } catch (err) {
      console.error("Reaction failed:", err);
      // Revert on error
      setSummary(summary);
    } finally {
      setLoadingType(null);
    }
  };

  const confirmActive = summary.userReactions.includes(REACTION_TYPES.CONFIRM);
  const confirmCount = summary.counts[REACTION_TYPES.CONFIRM] || 0;

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        {/* Main "Confirm: I see this too" button */}
        <button
          type="button"
          onClick={(e) => handleToggle(REACTION_TYPES.CONFIRM, e)}
          disabled={loadingType === REACTION_TYPES.CONFIRM}
          title={confirmActive ? "You confirmed this hazard (click to remove)" : "Confirm you also see this hazard"}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-all ${
            confirmActive
              ? REACTION_CONFIG[REACTION_TYPES.CONFIRM].activeClass
              : REACTION_CONFIG[REACTION_TYPES.CONFIRM].inactiveClass
          }`}
        >
          {loadingType === REACTION_TYPES.CONFIRM ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Eye className={`h-3.5 w-3.5 ${confirmActive ? "text-emerald-600 fill-emerald-500/20" : "text-slate-500"}`} />
          )}
          <span>Confirm: I see this too</span>
          {confirmCount > 0 && (
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                confirmActive ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700"
              }`}
            >
              {confirmCount}
            </span>
          )}
        </button>

        {/* Helpful chip */}
        <button
          type="button"
          onClick={(e) => handleToggle(REACTION_TYPES.HELPFUL, e)}
          disabled={loadingType === REACTION_TYPES.HELPFUL}
          className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs transition-all ${
            summary.userReactions.includes(REACTION_TYPES.HELPFUL)
              ? REACTION_CONFIG[REACTION_TYPES.HELPFUL].activeClass
              : REACTION_CONFIG[REACTION_TYPES.HELPFUL].inactiveClass
          }`}
        >
          <ThumbsUp className="h-3 w-3" />
          <span>Helpful</span>
          {(summary.counts[REACTION_TYPES.HELPFUL] || 0) > 0 && (
            <span className="text-[10px] font-semibold">({summary.counts[REACTION_TYPES.HELPFUL]})</span>
          )}
        </button>

        {/* Urgent chip */}
        <button
          type="button"
          onClick={(e) => handleToggle(REACTION_TYPES.URGENT, e)}
          disabled={loadingType === REACTION_TYPES.URGENT}
          className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs transition-all ${
            summary.userReactions.includes(REACTION_TYPES.URGENT)
              ? REACTION_CONFIG[REACTION_TYPES.URGENT].activeClass
              : REACTION_CONFIG[REACTION_TYPES.URGENT].inactiveClass
          }`}
        >
          <AlertOctagon className="h-3 w-3" />
          <span>Urgent</span>
          {(summary.counts[REACTION_TYPES.URGENT] || 0) > 0 && (
            <span className="text-[10px] font-semibold">({summary.counts[REACTION_TYPES.URGENT]})</span>
          )}
        </button>
      </div>
    );
  }

  // Full detailed display
  return (
    <div className="space-y-2 rounded-xl border border-white/40 bg-white/40 p-3 backdrop-blur-md">
      <div className="text-xs font-medium text-slate-500">Community Credibility & Reactions:</div>
      <div className="flex flex-wrap items-center gap-2">
        {/* Confirm Button */}
        <button
          type="button"
          onClick={(e) => handleToggle(REACTION_TYPES.CONFIRM, e)}
          disabled={loadingType === REACTION_TYPES.CONFIRM}
          className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
            confirmActive
              ? "bg-emerald-500/20 text-emerald-800 border-emerald-400 ring-2 ring-emerald-400/40 shadow-sm"
              : "bg-white/70 text-slate-700 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300"
          }`}
        >
          {loadingType === REACTION_TYPES.CONFIRM ? (
            <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
          ) : (
            <Eye className={`h-4 w-4 ${confirmActive ? "text-emerald-600 fill-emerald-500/20" : "text-slate-500"}`} />
          )}
          <span>Confirm: I see this too</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-bold ${
              confirmActive ? "bg-emerald-600 text-white" : "bg-slate-200/80 text-slate-700"
            }`}
          >
            {confirmCount}
          </span>
        </button>

        {/* Helpful */}
        <button
          type="button"
          onClick={(e) => handleToggle(REACTION_TYPES.HELPFUL, e)}
          disabled={loadingType === REACTION_TYPES.HELPFUL}
          className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
            summary.userReactions.includes(REACTION_TYPES.HELPFUL)
              ? "bg-blue-500/20 text-blue-800 border-blue-400 ring-1 ring-blue-300 shadow-sm"
              : "bg-white/70 text-slate-700 border-slate-200 hover:bg-blue-50 hover:text-blue-700"
          }`}
        >
          <ThumbsUp className="h-3.5 w-3.5" />
          <span>Helpful</span>
          <span className="text-xs font-semibold">({summary.counts[REACTION_TYPES.HELPFUL] || 0})</span>
        </button>

        {/* Urgent */}
        <button
          type="button"
          onClick={(e) => handleToggle(REACTION_TYPES.URGENT, e)}
          disabled={loadingType === REACTION_TYPES.URGENT}
          className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
            summary.userReactions.includes(REACTION_TYPES.URGENT)
              ? "bg-rose-500/20 text-rose-800 border-rose-400 ring-1 ring-rose-300 shadow-sm"
              : "bg-white/70 text-slate-700 border-slate-200 hover:bg-rose-50 hover:text-rose-700"
          }`}
        >
          <AlertOctagon className="h-3.5 w-3.5" />
          <span>Urgent</span>
          <span className="text-xs font-semibold">({summary.counts[REACTION_TYPES.URGENT] || 0})</span>
        </button>
      </div>
    </div>
  );
}
