import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import ReactionButtons from "@/components/interactions/ReactionButtons";
import CommentSection from "@/components/interactions/CommentSection";
import ReportDialog from "@/components/interactions/ReportDialog";
import { logAuditEvent, AUDIT_ACTIONS } from "@/lib/auditLog";
import {
  getBatchCommentCounts,
  getBatchReactionSummaries,
  TARGET_TYPES,
} from "@/lib/interactions";
import {
  Megaphone,
  Plus,
  Loader2,
  ShieldCheck,
  Clock,
  AlertTriangle,
  Info,
  GraduationCap,
  Wrench,
  Search,
  Filter,
  MessageSquare,
  Pin,
  Trash2,
  Edit2,
  User,
  Shield,
  Users,
  Flag,
} from "lucide-react";

const TYPE_CONFIG = {
  verified_advisory: {
    label: "Official Advisory",
    badgeLabel: "Official",
    icon: ShieldCheck,
    color: "text-blue-700",
    bg: "bg-blue-50",
    ring: "ring-blue-300 font-bold",
    cardBg: "border-blue-300/80 bg-gradient-to-br from-blue-50/50 via-white/70 to-indigo-50/40 shadow-md ring-1 ring-blue-400/30",
  },
  community: {
    label: "Community Post",
    badgeLabel: "Community",
    icon: Megaphone,
    color: "text-slate-700",
    bg: "bg-slate-100",
    ring: "ring-slate-200 font-semibold",
    cardBg: "border-white/50 bg-white/60 shadow-sm",
  },
  drill: {
    label: "Drill Notice",
    badgeLabel: "Drill",
    icon: GraduationCap,
    color: "text-purple-700",
    bg: "bg-purple-50",
    ring: "ring-purple-200 font-semibold",
    cardBg: "border-purple-200/60 bg-white/60 shadow-sm",
  },
  recovery_update: {
    label: "Recovery Update",
    badgeLabel: "Recovery",
    icon: Wrench,
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    ring: "ring-emerald-200 font-semibold",
    cardBg: "border-emerald-200/60 bg-white/60 shadow-sm",
  },
};

const PRIORITY_CONFIG = {
  info: { label: "Info", icon: Info, ring: "ring-blue-200", bar: "bg-blue-500", text: "text-blue-700" },
  warning: { label: "Warning", icon: AlertTriangle, ring: "ring-amber-200", bar: "bg-amber-500", text: "text-amber-700" },
  critical: { label: "Critical Priority", icon: AlertTriangle, ring: "ring-rose-300", bar: "bg-rose-500", text: "text-rose-700 font-bold" },
};

const ROLE_BADGES = {
  admin: { label: "Admin", class: "bg-rose-100 text-rose-800 ring-rose-300" },
  drrmo: { label: "DRRMO Officer", class: "bg-blue-100 text-blue-800 ring-blue-300 font-semibold" },
  lgu: { label: "LGU Official", class: "bg-indigo-100 text-indigo-800 ring-indigo-300 font-semibold" },
  responder: { label: "Responder", class: "bg-amber-100 text-amber-800 ring-amber-300" },
  volunteer: { label: "Volunteer", class: "bg-purple-100 text-purple-800 ring-purple-300" },
  resident: { label: "Resident", class: "bg-slate-100 text-slate-700 ring-slate-200" },
};

function timeAgo(dateStr) {
  if (!dateStr) return "just now";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Announcements() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingAnn, setEditingAnn] = useState(null);
  const [selectedAnn, setSelectedAnn] = useState(null);
  const [reportingAnn, setReportingAnn] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [typeFilter, setTypeFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Batch interaction counts
  const [commentCounts, setCommentCounts] = useState({});
  const [reactionSummaries, setReactionSummaries] = useState({});

  // Form state
  const [form, setForm] = useState({
    title: "",
    content: "",
    type: "community",
    priority: "info",
    target_audience: "all",
  });

  const [editForm, setEditForm] = useState({
    title: "",
    content: "",
    type: "community",
    priority: "info",
    target_audience: "all",
  });

  const canPostOfficial = ["drrmo", "lgu", "admin"].includes(user?.role);

  const loadData = useCallback(async () => {
    try {
      const list = await base44.entities.Announcement.list("-created_date", 500);
      const safeList = list || [];
      setAnnouncements(safeList);

      if (safeList.length > 0) {
        const ids = safeList.map((a) => a.id);
        const [cCounts, rSummaries] = await Promise.all([
          getBatchCommentCounts({
            targetType: TARGET_TYPES.ANNOUNCEMENT,
            targetIds: ids,
          }),
          getBatchReactionSummaries({
            targetType: TARGET_TYPES.ANNOUNCEMENT,
            targetIds: ids,
            currentUserId: user?.id,
          }),
        ]);
        setCommentCounts(cCounts || {});
        setReactionSummaries(rSummaries || {});
      }
    } catch (e) {
      console.error("Failed to load announcements:", e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
    const unsub = base44.entities.Announcement.subscribe(() => {
      loadData();
    });
    return unsub;
  }, [loadData]);

  const submit = async () => {
    if (!form.title.trim() || !form.content.trim()) return;

    // Client-side guard (matches server rule)
    if (form.type === "verified_advisory" && !canPostOfficial) {
      alert("Unauthorized: Only Admin or LGU-DRRMO can publish official verified advisories.");
      return;
    }

    setSubmitting(true);
    try {
      const created = await base44.entities.Announcement.create({
        ...form,
        created_by_name: user?.name || user?.email?.split("@")[0] || "Community Member",
        created_by_role: user?.role || "resident",
      });
      setAnnouncements([created, ...announcements]);
      setForm({
        title: "",
        content: "",
        type: "community",
        priority: "info",
        target_audience: "all",
      });
      setDialogOpen(false);
      loadData();
    } catch (e) {
      alert("Failed to post announcement: " + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openEditDialog = (ann, e) => {
    if (e) e.stopPropagation();
    setEditingAnn(ann);
    setEditForm({
      title: ann.title,
      content: ann.content,
      type: ann.type,
      priority: ann.priority,
      target_audience: ann.target_audience,
    });
    setEditDialogOpen(true);
  };

  const submitEdit = async () => {
    if (!editForm.title.trim() || !editForm.content.trim() || !editingAnn) return;

    if (editForm.type === "verified_advisory" && !canPostOfficial) {
      alert("Unauthorized: Only Admin or LGU-DRRMO can publish official verified advisories.");
      return;
    }

    setSubmitting(true);
    try {
      const updated = await base44.entities.Announcement.update(editingAnn.id, editForm);
      setAnnouncements(announcements.map((a) => (a.id === editingAnn.id ? { ...a, ...updated } : a)));
      if (selectedAnn?.id === editingAnn.id) {
        setSelectedAnn({ ...selectedAnn, ...updated });
      }
      setEditDialogOpen(false);
      setEditingAnn(null);
    } catch (e) {
      alert("Failed to update announcement: " + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this announcement?")) return;
    try {
      await base44.entities.Announcement.delete(id);
      logAuditEvent({
        action: AUDIT_ACTIONS.ANNOUNCEMENT_DELETED,
        targetType: TARGET_TYPES.ANNOUNCEMENT,
        targetId: id,
        actorId: user?.id,
        actorName: user?.name,
        actorRole: user?.role,
      });
      setAnnouncements(announcements.filter((a) => a.id !== id));
      if (selectedAnn?.id === id) setSelectedAnn(null);
    } catch (e) {
      alert("Failed to delete announcement: " + e.message);
    }
  };

  const filteredAnnouncements = announcements.filter((ann) => {
    if (typeFilter !== "all" && ann.type !== typeFilter) return false;
    if (priorityFilter !== "all" && ann.priority !== priorityFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (ann.title || "").toLowerCase().includes(q);
      const matchContent = (ann.content || "").toLowerCase().includes(q);
      const matchAuthor = (ann.created_by_name || "").toLowerCase().includes(q);
      if (!matchTitle && !matchContent && !matchAuthor) return false;
    }
    return true;
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        title="Community Announcements"
        description="Shared community bulletin board: Official LGU-DRRMO advisories and resident community updates."
        icon={Megaphone}
        actions={
          <Button onClick={() => setDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20">
            <Plus className="mr-2 h-4 w-4" /> Post Announcement
          </Button>
        }
      />

      {/* Filters & Search Toolbar */}
      <div className="mb-6 space-y-3 rounded-2xl border border-white/60 bg-white/60 p-4 shadow-sm backdrop-blur-xl">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-12 items-center">
          <div className="relative sm:col-span-6">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search announcements by title, content, or author..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs bg-white/80 border-slate-200"
            />
          </div>

          <div className="sm:col-span-3">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="text-xs bg-white/80 border-slate-200">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Post Types</SelectItem>
                <SelectItem value="verified_advisory">🛡️ Official Advisories</SelectItem>
                <SelectItem value="community">📢 Community Posts</SelectItem>
                <SelectItem value="drill">🎓 Drill Notices</SelectItem>
                <SelectItem value="recovery_update">🔧 Recovery Updates</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="sm:col-span-3">
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="text-xs bg-white/80 border-slate-200">
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="critical">🚨 Critical</SelectItem>
                <SelectItem value="warning">⚠️ Warning</SelectItem>
                <SelectItem value="info">ℹ️ Info</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/50 text-xs text-slate-600">
          <span className="font-semibold text-slate-500">Board stats:</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
            {announcements.length} total
          </span>
          <span className="rounded-full bg-blue-100/90 px-2 py-0.5 text-[11px] font-semibold text-blue-800">
            {announcements.filter((a) => a.type === "verified_advisory").length} Official
          </span>
          <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[11px] font-medium text-slate-700">
            {announcements.filter((a) => a.type === "community").length} Community
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : filteredAnnouncements.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title={announcements.length === 0 ? "No announcements yet" : "No matching announcements"}
          description={
            announcements.length === 0
              ? "Be the first to share an official advisory or community safety update."
              : "Try adjusting your filters or search query."
          }
          action={
            announcements.length === 0 ? (
              <Button onClick={() => setDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="mr-2 h-4 w-4" /> Post the first announcement
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => {
                  setTypeFilter("all");
                  setPriorityFilter("all");
                  setSearchQuery("");
                }}
              >
                Reset Filters
              </Button>
            )
          }
        />
      ) : (
        <ul className="space-y-4">
          {filteredAnnouncements.map((ann) => {
            const tc = TYPE_CONFIG[ann.type] || TYPE_CONFIG.community;
            const pc = PRIORITY_CONFIG[ann.priority] || PRIORITY_CONFIG.info;
            const TypeIcon = tc.icon;
            const isOfficial = ann.type === "verified_advisory";
            const isOwner = user && String(user.id) === String(ann.created_by_id);
            const roleBadge = ROLE_BADGES[ann.created_by_role] || ROLE_BADGES.resident;
            const cCount = commentCounts[ann.id] || 0;

            return (
              <li
                key={ann.id}
                onClick={() => setSelectedAnn(ann)}
                className={`group cursor-pointer overflow-hidden rounded-2xl border backdrop-blur-xl backdrop-saturate-150 transition-all hover:shadow-lg ${tc.cardBg}`}
              >
                {/* Priority Indicator stripe */}
                <div className={`h-1.5 w-full ${pc.bar}`} />

                <div className="p-5 space-y-3">
                  {/* Top Badges & Pinned Tag */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Official vs Community Badge */}
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs uppercase tracking-wide ring-1 ${tc.bg} ${tc.color} ${tc.ring}`}
                      >
                        <TypeIcon className="h-3.5 w-3.5" />
                        {tc.badgeLabel}
                      </span>

                      {/* Priority Tag */}
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ring-1 ${pc.ring} ${pc.text} bg-white/70`}
                      >
                        {pc.label}
                      </span>

                      {/* Official Pin indicator */}
                      {isOfficial && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-full">
                          <Pin className="h-3 w-3 fill-blue-600 text-blue-600" /> Pinned Official Notice
                        </span>
                      )}
                    </div>

                    {/* Target Audience Badge */}
                    {ann.target_audience && ann.target_audience !== "all" && (
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                        Audience: {ann.target_audience}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                    {ann.title}
                  </h3>

                  {/* Body Content */}
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 line-clamp-3">
                    {ann.content}
                  </p>

                  {/* Metadata: Author name + Role badge + Timestamp */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-500 pt-1">
                    <div className="flex items-center gap-1.5 font-medium text-slate-700">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-600">
                        {ann.created_by_name ? ann.created_by_name.charAt(0).toUpperCase() : "U"}
                      </div>
                      <span>{ann.created_by_name || "Community Member"}</span>
                      <span
                        className={`rounded-full px-1.5 py-0.2 text-[9px] font-semibold uppercase ring-1 ${roleBadge.class}`}
                      >
                        {roleBadge.label}
                      </span>
                    </div>

                    <span className="text-slate-300">•</span>

                    <span className="flex items-center gap-1 text-slate-400">
                      <Clock className="h-3.5 w-3.5" /> {timeAgo(ann.created_date)}
                    </span>
                  </div>

                  {/* Interactions Strip on Card */}
                  <div
                    className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100/80"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <ReactionButtons
                        targetType={TARGET_TYPES.ANNOUNCEMENT}
                        targetId={ann.id}
                        currentUserId={user?.id}
                        initialSummary={reactionSummaries[ann.id]}
                        compact={true}
                      />

                      <button
                        type="button"
                        onClick={() => setSelectedAnn(ann)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200/80 bg-white/50 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100 transition-colors"
                      >
                        <MessageSquare className="h-3.5 w-3.5 text-blue-600" />
                        <span>{cCount} {cCount === 1 ? "comment" : "comments"}</span>
                      </button>
                    </div>

                    {/* Author / Admin Edit & Delete Actions */}
                    {(isOwner || user?.role === "admin") && (
                      <div className="flex items-center gap-1 ml-auto">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-slate-500 hover:text-slate-900"
                          onClick={(e) => openEditDialog(ann, e)}
                        >
                          <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                          onClick={(e) => handleDelete(ann.id, e)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}

                    {/* Report button for non-authors */}
                    {!isOwner && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          setReportingAnn(ann);
                        }}
                        title="Report this announcement to moderators"
                      >
                        <Flag className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* ================================================================= */}
      {/* ANNOUNCEMENT DETAIL & DISCUSSION MODAL                            */}
      {/* ================================================================= */}
      <Dialog open={Boolean(selectedAnn)} onOpenChange={(open) => !open && setSelectedAnn(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedAnn && (
            <>
              <DialogHeader>
                <div className="border-b pb-3 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs uppercase tracking-wide ring-1 ${
                        TYPE_CONFIG[selectedAnn.type]?.bg
                      } ${TYPE_CONFIG[selectedAnn.type]?.color} ${TYPE_CONFIG[selectedAnn.type]?.ring}`}
                    >
                      {TYPE_CONFIG[selectedAnn.type]?.badgeLabel || "Announcement"}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold uppercase ring-1 ${
                        PRIORITY_CONFIG[selectedAnn.priority]?.ring
                      } ${PRIORITY_CONFIG[selectedAnn.priority]?.text}`}
                    >
                      {PRIORITY_CONFIG[selectedAnn.priority]?.label}
                    </span>
                  </div>

                  <DialogTitle className="text-xl font-bold text-slate-900">
                    {selectedAnn.title}
                  </DialogTitle>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>Posted by {selectedAnn.created_by_name || "Community Member"}</span>
                    <span>•</span>
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[9px] font-semibold uppercase ring-1 ${
                        ROLE_BADGES[selectedAnn.created_by_role]?.class || ROLE_BADGES.resident.class
                      }`}
                    >
                      {ROLE_BADGES[selectedAnn.created_by_role]?.label || "Resident"}
                    </span>
                    <span>•</span>
                    <span>{timeAgo(selectedAnn.created_date)}</span>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* Full Announcement Text */}
                <div className="rounded-xl border border-white/60 bg-white/60 p-4 backdrop-blur-md">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                    {selectedAnn.content}
                  </p>
                </div>

                {/* Reactions Bar */}
                <ReactionButtons
                  targetType={TARGET_TYPES.ANNOUNCEMENT}
                  targetId={selectedAnn.id}
                  currentUserId={user?.id}
                  compact={false}
                />

                {/* Embedded Threaded Comments */}
                <CommentSection
                  targetType={TARGET_TYPES.ANNOUNCEMENT}
                  targetId={selectedAnn.id}
                  currentUser={user}
                  onCommentCountChange={(count) => {
                    setCommentCounts((prev) => ({ ...prev, [selectedAnn.id]: count }));
                  }}
                />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedAnn(null)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ================================================================= */}
      {/* POST ANNOUNCEMENT DIALOG                                          */}
      {/* ================================================================= */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Post an Announcement</DialogTitle>
            <DialogDescription>
              {canPostOfficial
                ? "As an authorized official, you can publish official verified advisories or community notices."
                : "Share community updates, neighborhood notices, or volunteer drills with your neighbors."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1.5">
              <Label htmlFor="a-title">Title</Label>
              <Input
                id="a-title"
                placeholder="Clear and descriptive title..."
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="a-content">Content</Label>
              <Textarea
                id="a-content"
                placeholder="Write your announcement body, safety tips, instructions..."
                rows={4}
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="community">📢 Community Post</SelectItem>
                    {canPostOfficial && (
                      <SelectItem value="verified_advisory">🛡️ Verified Advisory (Official)</SelectItem>
                    )}
                    <SelectItem value="drill">🎓 Drill Notice</SelectItem>
                    <SelectItem value="recovery_update">🔧 Recovery Update</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Target Audience</Label>
              <Select
                value={form.target_audience}
                onValueChange={(v) => setForm({ ...form, target_audience: v })}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Everyone</SelectItem>
                  <SelectItem value="residents">Residents</SelectItem>
                  <SelectItem value="responders">First Responders</SelectItem>
                  <SelectItem value="volunteers">Volunteers</SelectItem>
                  <SelectItem value="lgus">LGU Officials</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={submit}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={submitting || !form.title.trim() || !form.content.trim()}
            >
              {submitting ? "Posting..." : "Publish Announcement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================================================================= */}
      {/* EDIT ANNOUNCEMENT DIALOG                                          */}
      {/* ================================================================= */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Announcement</DialogTitle>
            <DialogDescription>Update your announcement post.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Content</Label>
              <Textarea
                rows={4}
                value={editForm.content}
                onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select
                  value={editForm.priority}
                  onValueChange={(v) => setEditForm({ ...editForm, priority: v })}
                >
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Audience</Label>
                <Select
                  value={editForm.target_audience}
                  onValueChange={(v) => setEditForm({ ...editForm, target_audience: v })}
                >
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Everyone</SelectItem>
                    <SelectItem value="residents">Residents</SelectItem>
                    <SelectItem value="responders">First Responders</SelectItem>
                    <SelectItem value="volunteers">Volunteers</SelectItem>
                    <SelectItem value="lgus">LGU Officials</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={submitEdit}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={submitting || !editForm.title.trim() || !editForm.content.trim()}
            >
              {submitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Modal */}
      <ReportDialog
        open={Boolean(reportingAnn)}
        onOpenChange={(open) => !open && setReportingAnn(null)}
        targetType={TARGET_TYPES.ANNOUNCEMENT}
        targetId={reportingAnn?.id}
        targetTitle={reportingAnn?.title}
        currentUser={user}
      />
    </div>
  );
}