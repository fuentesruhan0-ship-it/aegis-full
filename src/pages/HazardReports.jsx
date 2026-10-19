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
  AlertTriangle,
  Plus,
  MapPin,
  Clock,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  Flag,
  MessageSquare,
  Search,
  Camera,
  Trash2,
  Edit2,
  XCircle,
  Shield,
} from "lucide-react";

const HAZARD_TYPES = {
  cracked_road: { label: "Cracked Road", icon: "🛣️" },
  landslide: { label: "Landslide", icon: "⛰️" },
  fire: { label: "Fire", icon: "🔥" },
  gas_leak: { label: "Gas Leak", icon: "💨" },
  structural_damage: { label: "Structural Damage", icon: "🏚️" },
  flood: { label: "Flood", icon: "🌊" },
  other: { label: "Other Hazard", icon: "⚠️" },
};

const SEVERITY_STYLES = {
  low: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  medium: "bg-amber-50 text-amber-700 ring-amber-200",
  high: "bg-orange-50 text-orange-700 ring-orange-200",
  critical: "bg-rose-50 text-rose-700 ring-rose-200 font-semibold",
};

const STATUS_CONFIG = {
  reported: {
    label: "Community Reported",
    badge: "bg-amber-50 text-amber-800 ring-amber-200",
    icon: AlertTriangle,
    desc: "Awaiting official DRRMO/LGU verification",
  },
  verified: {
    label: "Official Verified",
    badge: "bg-blue-50 text-blue-700 ring-blue-300 font-semibold",
    icon: ShieldCheck,
    desc: "Verified by local emergency authorities",
  },
  resolved: {
    label: "Hazard Resolved",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-300 font-semibold",
    icon: CheckCircle2,
    desc: "Cleared or repaired by authorities",
  },
  false: {
    label: "False Alarm",
    badge: "bg-rose-50 text-rose-700 ring-rose-200",
    icon: XCircle,
    desc: "Marked as false alarm or duplicate",
  },
};

const ROLE_BADGES = {
  admin: { label: "Admin", class: "bg-rose-100 text-rose-800 ring-rose-300" },
  drrmo: { label: "DRRMO", class: "bg-blue-100 text-blue-800 ring-blue-300" },
  lgu: { label: "LGU Official", class: "bg-indigo-100 text-indigo-800 ring-indigo-300" },
  responder: { label: "First Responder", class: "bg-amber-100 text-amber-800 ring-amber-300" },
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

function getLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

export default function HazardReports() {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportingReport, setReportingReport] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Filter state
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Feed interactions cache
  const [commentCounts, setCommentCounts] = useState({});
  const [reactionSummaries, setReactionSummaries] = useState({});

  // Create form state
  const [form, setForm] = useState({
    type: "structural_damage",
    description: "",
    severity: "medium",
    location_label: "",
    image_url: "",
  });
  const [imageUploading, setImageUploading] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    type: "structural_damage",
    description: "",
    severity: "medium",
    location_label: "",
    image_url: "",
  });

  const canVerify = ["lgu", "drrmo", "admin"].includes(user?.role);

  const loadData = useCallback(async () => {
    try {
      const list = await base44.entities.HazardReport.list("-created_date", 500);
      const safeList = list || [];
      setReports(safeList);

      // Load batch counts for comments and reactions
      if (safeList.length > 0) {
        const ids = safeList.map((r) => r.id);
        const [cCounts, rSummaries] = await Promise.all([
          getBatchCommentCounts({
            targetType: TARGET_TYPES.HAZARD_REPORT,
            targetIds: ids,
          }),
          getBatchReactionSummaries({
            targetType: TARGET_TYPES.HAZARD_REPORT,
            targetIds: ids,
            currentUserId: user?.id,
          }),
        ]);
        setCommentCounts(cCounts || {});
        setReactionSummaries(rSummaries || {});
      }
    } catch (e) {
      console.error("Failed to load hazard reports:", e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
    const unsub = base44.entities.HazardReport.subscribe(() => {
      loadData();
    });
    return unsub;
  }, [loadData]);

  // Handle Photo upload
  const handlePhotoUpload = async (e, isEdit = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageUploading(true);
    try {
      if (base44.integrations?.Core?.UploadPublicFile) {
        const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
        if (isEdit) {
          setEditForm((prev) => ({ ...prev, image_url: file_url }));
        } else {
          setForm((prev) => ({ ...prev, image_url: file_url }));
        }
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (isEdit) {
            setEditForm((prev) => ({ ...prev, image_url: reader.result }));
          } else {
            setForm((prev) => ({ ...prev, image_url: reader.result }));
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      alert("Photo upload failed: " + err.message);
    } finally {
      setImageUploading(false);
    }
  };

  // Submit new hazard report
  const submit = async () => {
    if (!form.description.trim()) return;
    setSubmitting(true);
    try {
      const loc = await getLocation();
      const report = await base44.entities.HazardReport.create({
        type: form.type,
        description: form.description,
        severity: form.severity,
        location_label:
          form.location_label ||
          (loc ? `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}` : "Tupi Community Area"),
        location_lat: loc?.lat,
        location_lng: loc?.lng,
        image_url: form.image_url || undefined,
        status: "reported",
        created_by_name: user?.name || user?.email?.split("@")[0] || "Community Member",
        created_by_role: user?.role || "resident",
      });
      setReports([report, ...reports]);
      setForm({
        type: "structural_damage",
        description: "",
        severity: "medium",
        location_label: "",
        image_url: "",
      });
      setDialogOpen(false);
      loadData();
    } catch (e) {
      alert("Failed to submit report: " + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Edit existing report
  const openEditDialog = (report, e) => {
    if (e) e.stopPropagation();
    setEditingReport(report);
    setEditForm({
      type: report.type,
      description: report.description,
      severity: report.severity,
      location_label: report.location_label || "",
      image_url: report.image_url || "",
    });
    setEditDialogOpen(true);
  };

  const submitEdit = async () => {
    if (!editForm.description.trim() || !editingReport) return;
    setSubmitting(true);
    try {
      const updated = await base44.entities.HazardReport.update(editingReport.id, {
        type: editForm.type,
        description: editForm.description,
        severity: editForm.severity,
        location_label: editForm.location_label,
        image_url: editForm.image_url || null,
      });
      setReports(reports.map((r) => (r.id === editingReport.id ? { ...r, ...updated } : r)));
      if (selectedReport?.id === editingReport.id) {
        setSelectedReport({ ...selectedReport, ...updated });
      }
      setEditDialogOpen(false);
      setEditingReport(null);
    } catch (e) {
      alert("Failed to update report: " + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete report (only author or admin)
  const handleDeleteReport = async (reportId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this hazard report?")) return;
    try {
      await base44.entities.HazardReport.delete(reportId);
      logAuditEvent({
        action: AUDIT_ACTIONS.HAZARD_DELETED,
        targetType: TARGET_TYPES.HAZARD_REPORT,
        targetId: reportId,
        actorId: user?.id,
        actorName: user?.name,
        actorRole: user?.role,
      });
      setReports(reports.filter((r) => r.id !== reportId));
      if (selectedReport?.id === reportId) {
        setSelectedReport(null);
      }
    } catch (e) {
      alert("Failed to delete report: " + e.message);
    }
  };

  // Admin/LGU status update
  const updateStatus = async (id, status, e) => {
    if (e) e.stopPropagation();
    try {
      const updated = await base44.entities.HazardReport.update(id, { status });
      setReports(reports.map((r) => (r.id === id ? { ...r, ...updated } : r)));
      if (selectedReport?.id === id) {
        setSelectedReport({ ...selectedReport, ...updated });
      }

      // Write audit log entry for moderation/verification action
      logAuditEvent({
        action:
          status === "verified"
            ? AUDIT_ACTIONS.HAZARD_VERIFIED
            : status === "resolved"
            ? AUDIT_ACTIONS.HAZARD_RESOLVED
            : AUDIT_ACTIONS.HAZARD_REJECTED,
        targetType: TARGET_TYPES.HAZARD_REPORT,
        targetId: id,
        actorId: user?.id,
        actorName: user?.name || "MDRRMO Officer",
        actorRole: user?.role || "drrmo",
        details: { status },
      });
    } catch (e) {
      alert("Failed to update: " + e.message);
    }
  };

  // Filtered reports
  const filteredReports = reports.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (typeFilter !== "all" && r.type !== typeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDesc = (r.description || "").toLowerCase().includes(q);
      const matchLoc = (r.location_label || "").toLowerCase().includes(q);
      const matchAuthor = (r.created_by_name || "").toLowerCase().includes(q);
      if (!matchDesc && !matchLoc && !matchAuthor) return false;
    }
    return true;
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        title="Community Hazard Reports"
        description="Real-time shared community reports with live citizen confirmations and official DRRMO verifications."
        icon={AlertTriangle}
        accent="amber"
        actions={
          <Button
            onClick={() => setDialogOpen(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20"
          >
            <Plus className="mr-2 h-4 w-4" /> Report Hazard
          </Button>
        }
      />

      {/* Filters & Search Toolbar */}
      <div className="mb-6 space-y-3 rounded-2xl border border-white/60 bg-white/60 p-4 shadow-sm backdrop-blur-xl">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-12 items-center">
          {/* Search box */}
          <div className="relative sm:col-span-5">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search reports by location, keyword, or reporter..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs bg-white/80 border-slate-200"
            />
          </div>

          {/* Status Filter */}
          <div className="sm:col-span-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="text-xs bg-white/80 border-slate-200">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Verification Statuses</SelectItem>
                <SelectItem value="reported">⚠️ Reported (Community)</SelectItem>
                <SelectItem value="verified">🛡️ Official Verified</SelectItem>
                <SelectItem value="resolved">✅ Resolved</SelectItem>
                <SelectItem value="false">❌ False Alarm</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Hazard Type Filter */}
          <div className="sm:col-span-3">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="text-xs bg-white/80 border-slate-200">
                <SelectValue placeholder="All Hazard Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Hazard Types</SelectItem>
                {Object.entries(HAZARD_TYPES).map(([key, val]) => (
                  <SelectItem key={key} value={key}>
                    {val.icon} {val.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Quick status summary pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/50 text-xs text-slate-600">
          <span className="font-semibold text-slate-500">Feed stats:</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
            {reports.length} total
          </span>
          <span className="rounded-full bg-blue-100/80 px-2 py-0.5 text-[11px] font-medium text-blue-800">
            {reports.filter((r) => r.status === "verified").length} verified
          </span>
          <span className="rounded-full bg-amber-100/80 px-2 py-0.5 text-[11px] font-medium text-amber-800">
            {reports.filter((r) => r.status === "reported").length} pending verification
          </span>
          <span className="rounded-full bg-emerald-100/80 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
            {reports.filter((r) => r.status === "resolved").length} resolved
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : filteredReports.length === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          title={reports.length === 0 ? "No hazards reported" : "No matching reports"}
          description={
            reports.length === 0
              ? "Be the first to report a hazard in your community — cracked roads, landslides, gas leaks, and more."
              : "Try adjusting your search query or status filter to see other community reports."
          }
          action={
            reports.length === 0 ? (
              <Button
                onClick={() => setDialogOpen(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                <Plus className="mr-2 h-4 w-4" /> Report a Hazard
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => {
                  setStatusFilter("all");
                  setTypeFilter("all");
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
          {filteredReports.map((r) => {
            const ht = HAZARD_TYPES[r.type] || HAZARD_TYPES.other;
            const statusInfo = STATUS_CONFIG[r.status] || STATUS_CONFIG.reported;
            const StatusIcon = statusInfo.icon;
            const reporterRole = r.created_by_role || "resident";
            const roleBadge = ROLE_BADGES[reporterRole] || ROLE_BADGES.resident;
            const isOwner = user && String(user.id) === String(r.created_by_id);
            const countOfComments = commentCounts[r.id] || 0;

            return (
              <li
                key={r.id}
                onClick={() => setSelectedReport(r)}
                className="group cursor-pointer rounded-2xl border border-white/50 bg-white/60 p-5 shadow-[4px_4px_16px_rgba(0,0,0,0.04),-4px_-4px_12px_rgba(255,255,255,0.9)] backdrop-blur-xl backdrop-saturate-150 transition-all hover:bg-white/75 hover:shadow-[6px_6px_20px_rgba(0,0,0,0.07),-4px_-4px_12px_rgba(255,255,255,0.95)]"
              >
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  {/* Icon or Photo thumbnail */}
                  <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-2xl shadow-inner overflow-hidden border border-slate-200/60">
                    {r.image_url ? (
                      <img
                        src={r.image_url}
                        alt="Hazard thumbnail"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      ht.icon
                    )}
                  </div>

                  {/* Main Report Details */}
                  <div className="min-w-0 flex-1 space-y-2">
                    {/* Header bar: Title, Severity, Verified status */}
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-base">{ht.label}</h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ring-1 ${
                          SEVERITY_STYLES[r.severity] || SEVERITY_STYLES.medium
                        }`}
                      >
                        {r.severity} severity
                      </span>

                      {/* Official Verified / Unverified badge */}
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ring-1 ${statusInfo.badge}`}
                        title={statusInfo.desc}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {statusInfo.label}
                      </span>
                    </div>

                    {/* Description text */}
                    <p className="text-sm text-slate-700 leading-relaxed">{r.description}</p>

                    {/* Metadata: Location, Reporter Identity, Timestamp */}
                    <div className="flex flex-wrap items-center gap-y-1.5 gap-x-3 text-xs text-slate-500">
                      {/* Reporter Public Identity */}
                      <div className="flex items-center gap-1.5 font-medium text-slate-700">
                        <div className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-600">
                          {r.created_by_name ? r.created_by_name.charAt(0).toUpperCase() : "U"}
                        </div>
                        <span>{r.created_by_name || "Community Member"}</span>
                        <span
                          className={`rounded-full px-1.5 py-0.2 text-[9px] font-semibold uppercase ring-1 ${roleBadge.class}`}
                        >
                          {roleBadge.label}
                        </span>
                      </div>

                      <span className="text-slate-300">•</span>

                      {/* Location */}
                      {r.location_label && (
                        <span className="flex items-center gap-1 text-slate-600">
                          <MapPin className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                          <span className="truncate max-w-xs">{r.location_label}</span>
                        </span>
                      )}

                      <span className="text-slate-300">•</span>

                      {/* Time ago */}
                      <span className="flex items-center gap-1 text-slate-400">
                        <Clock className="h-3.5 w-3.5" /> {timeAgo(r.created_date)}
                      </span>
                    </div>

                    {/* Bottom Action Bar: Confirm button, Reactions, Comments trigger */}
                    <div
                      className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Interactive Confirm & Reactions Button Strip */}
                        <ReactionButtons
                          targetType={TARGET_TYPES.HAZARD_REPORT}
                          targetId={r.id}
                          currentUserId={user?.id}
                          initialSummary={reactionSummaries[r.id]}
                          compact={true}
                        />

                        {/* Comments button / counter */}
                        <button
                          type="button"
                          onClick={() => setSelectedReport(r)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200/80 bg-white/50 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                        >
                          <MessageSquare className="h-3.5 w-3.5 text-amber-600" />
                          <span>{countOfComments} {countOfComments === 1 ? "comment" : "comments"}</span>
                        </button>
                      </div>

                      {/* Reporter actions & Admin verification quick menu */}
                      <div className="flex items-center gap-1.5 ml-auto">
                        {/* Reporter Edit / Delete (Only the original reporter can edit/delete) */}
                        {isOwner && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-slate-500 hover:text-slate-900"
                              onClick={(e) => openEditDialog(r, e)}
                              title="Edit your report"
                            >
                              <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                              onClick={(e) => handleDeleteReport(r.id, e)}
                              title="Delete your report"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}

                        {/* Admin / LGU verification actions */}
                        {canVerify && (
                          <div className="flex items-center gap-1">
                            {r.status !== "verified" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => updateStatus(r.id, "verified", e)}
                                className="h-7 border-blue-200 text-blue-700 hover:bg-blue-50 text-xs px-2"
                              >
                                <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Verify
                              </Button>
                            )}
                            {r.status !== "resolved" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => updateStatus(r.id, "resolved", e)}
                                className="h-7 border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-xs px-2"
                              >
                                <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Resolve
                              </Button>
                            )}
                            {r.status !== "false" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => updateStatus(r.id, "false", e)}
                                className="h-7 border-rose-200 text-rose-700 hover:bg-rose-50 text-xs px-2"
                              >
                                <XCircle className="mr-1 h-3.5 w-3.5" /> False
                              </Button>
                            )}
                          </div>
                        )}

                        {/* Report content to moderators (if not author) */}
                        {!isOwner && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              setReportingReport(r);
                            }}
                            title="Report this hazard report to moderators"
                          >
                            <Flag className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* ================================================================= */}
      {/* REPORT DETAIL & DISCUSSION MODAL                                  */}
      {/* ================================================================= */}
      <Dialog open={Boolean(selectedReport)} onOpenChange={(open) => !open && setSelectedReport(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedReport && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between gap-2 border-b pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">
                      {HAZARD_TYPES[selectedReport.type]?.icon || "⚠️"}
                    </span>
                    <div>
                      <DialogTitle className="text-lg font-bold text-slate-900">
                        {HAZARD_TYPES[selectedReport.type]?.label || "Hazard Report"}
                      </DialogTitle>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                        <span>Reported by {selectedReport.created_by_name || "Community Member"}</span>
                        <span>•</span>
                        <span>{timeAgo(selectedReport.created_date)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
                      STATUS_CONFIG[selectedReport.status]?.badge || STATUS_CONFIG.reported.badge
                    }`}
                  >
                    {STATUS_CONFIG[selectedReport.status]?.label || "Reported"}
                  </span>
                </div>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* Photo if available */}
                {selectedReport.image_url && (
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-900 max-h-72 flex items-center justify-center">
                    <img
                      src={selectedReport.image_url}
                      alt="Hazard full photo"
                      className="max-h-72 w-full object-contain"
                    />
                  </div>
                )}

                {/* Description */}
                <div className="rounded-xl border border-white/60 bg-white/50 p-3.5 backdrop-blur-md">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Hazard Description
                  </h4>
                  <p className="mt-1 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                    {selectedReport.description}
                  </p>
                </div>

                {/* Location and Severity Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3">
                    <span className="font-semibold text-slate-500 flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-amber-600" /> Location Details:
                    </span>
                    <p className="mt-1 font-medium text-slate-800">
                      {selectedReport.location_label || "Location unavailable"}
                    </p>
                    {selectedReport.location_lat && selectedReport.location_lng && (
                      <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                        GPS: {selectedReport.location_lat.toFixed(5)}, {selectedReport.location_lng.toFixed(5)}
                      </p>
                    )}
                  </div>

                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3">
                    <span className="font-semibold text-slate-500 flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600" /> Severity Assessment:
                    </span>
                    <p className="mt-1">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ring-1 ${
                          SEVERITY_STYLES[selectedReport.severity] || SEVERITY_STYLES.medium
                        }`}
                      >
                        {selectedReport.severity}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Admin Status Moderation Toolbar inside detail view */}
                {canVerify && (
                  <div className="rounded-xl border border-blue-200/60 bg-blue-50/40 p-3">
                    <span className="text-xs font-bold text-blue-900 flex items-center gap-1">
                      <Shield className="h-3.5 w-3.5 text-blue-700" /> Official Verification Action:
                    </span>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant={selectedReport.status === "verified" ? "default" : "outline"}
                        onClick={() => updateStatus(selectedReport.id, "verified")}
                        className="text-xs h-7 bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Mark Verified
                      </Button>
                      <Button
                        size="sm"
                        variant={selectedReport.status === "resolved" ? "default" : "outline"}
                        onClick={() => updateStatus(selectedReport.id, "resolved")}
                        className="text-xs h-7 bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Mark Resolved
                      </Button>
                      <Button
                        size="sm"
                        variant={selectedReport.status === "false" ? "default" : "outline"}
                        onClick={() => updateStatus(selectedReport.id, "false")}
                        className="text-xs h-7 bg-rose-600 hover:bg-rose-700 text-white"
                      >
                        <XCircle className="mr-1 h-3.5 w-3.5" /> Mark False Alarm
                      </Button>
                    </div>
                  </div>
                )}

                {/* Full Reaction & Credibility Bar */}
                <ReactionButtons
                  targetType={TARGET_TYPES.HAZARD_REPORT}
                  targetId={selectedReport.id}
                  currentUserId={user?.id}
                  compact={false}
                />

                {/* Embedded Live Discussion & Comments */}
                <CommentSection
                  targetType={TARGET_TYPES.HAZARD_REPORT}
                  targetId={selectedReport.id}
                  currentUser={user}
                  onCommentCountChange={(count) => {
                    setCommentCounts((prev) => ({ ...prev, [selectedReport.id]: count }));
                  }}
                />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedReport(null)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ================================================================= */}
      {/* REPORT A HAZARD DIALOG                                            */}
      {/* ================================================================= */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100">
              <Flag className="h-6 w-6 text-amber-600" />
            </div>
            <DialogTitle>Report a Hazard</DialogTitle>
            <DialogDescription>
              Help your community by reporting real hazards in real time. Your report will be visible to neighbors and emergency responders.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1.5">
              <Label>Hazard type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(HAZARD_TYPES).map(([key, val]) => (
                    <SelectItem key={key} value={key}>
                      {val.icon} {val.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Severity Level</Label>
              <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low — Minor inconvenience</SelectItem>
                  <SelectItem value="medium">Medium — Potential risk</SelectItem>
                  <SelectItem value="high">High — Dangerous hazard</SelectItem>
                  <SelectItem value="critical">Critical — Immediate life danger</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="h-desc">Description</Label>
              <Textarea
                id="h-desc"
                placeholder="Describe what you see, road conditions, extent of fissure or damage..."
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                maxLength={2000}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="h-loc">Location Landmark / Street</Label>
              <Input
                id="h-loc"
                placeholder="e.g. Near Tupi Central Elementary / Purok 3 Bridge"
                value={form.location_label}
                onChange={(e) => setForm({ ...form, location_label: e.target.value })}
              />
              <p className="text-[10px] text-slate-400">GPS coordinates will also be auto-detected.</p>
            </div>

            {/* Photo Attachment */}
            <div className="space-y-1.5">
              <Label>Photo (optional)</Label>
              <div className="flex items-center gap-2">
                <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100">
                  <Camera className="h-4 w-4 text-amber-600" />
                  <span>{imageUploading ? "Uploading..." : "Attach photo"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handlePhotoUpload(e, false)}
                    disabled={imageUploading}
                  />
                </label>
                {form.image_url && (
                  <span className="text-[11px] text-emerald-600 font-medium">✓ Photo attached</span>
                )}
              </div>
              {form.image_url && (
                <div className="mt-1 relative h-16 w-24 rounded-lg overflow-hidden border">
                  <img src={form.image_url} alt="Preview" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, image_url: "" })}
                    className="absolute top-0 right-0 bg-rose-600 text-white rounded-bl p-0.5 text-[10px]"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={submit}
              className="bg-amber-600 hover:bg-amber-700 text-white"
              disabled={submitting || !form.description.trim()}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...
                </>
              ) : (
                "Submit Report"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================================================================= */}
      {/* EDIT HAZARD DIALOG (Author Only)                                  */}
      {/* ================================================================= */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Hazard Report</DialogTitle>
            <DialogDescription>
              Update the details of your community report.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1.5">
              <Label>Hazard type</Label>
              <Select value={editForm.type} onValueChange={(v) => setEditForm({ ...editForm, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(HAZARD_TYPES).map(([key, val]) => (
                    <SelectItem key={key} value={key}>
                      {val.icon} {val.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Severity</Label>
              <Select value={editForm.severity} onValueChange={(v) => setEditForm({ ...editForm, severity: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-desc">Description</Label>
              <Textarea
                id="edit-desc"
                rows={3}
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                maxLength={2000}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-loc">Location</Label>
              <Input
                id="edit-loc"
                value={editForm.location_label}
                onChange={(e) => setEditForm({ ...editForm, location_label: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Photo</Label>
              <div className="flex items-center gap-2">
                <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100">
                  <Camera className="h-4 w-4 text-amber-600" />
                  <span>Change photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handlePhotoUpload(e, true)}
                  />
                </label>
                {editForm.image_url && (
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, image_url: "" })}
                    className="text-[11px] text-rose-600 hover:underline"
                  >
                    Remove photo
                  </button>
                )}
              </div>
              {editForm.image_url && (
                <div className="mt-1 h-16 w-24 rounded-lg overflow-hidden border">
                  <img src={editForm.image_url} alt="Preview" className="h-full w-full object-cover" />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={submitEdit}
              className="bg-amber-600 hover:bg-amber-700 text-white"
              disabled={submitting || !editForm.description.trim()}
            >
              {submitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Modal */}
      <ReportDialog
        open={Boolean(reportingReport)}
        onOpenChange={(open) => !open && setReportingReport(null)}
        targetType={TARGET_TYPES.HAZARD_REPORT}
        targetId={reportingReport?.id}
        targetTitle={reportingReport?.description || reportingReport?.location_label}
        currentUser={user}
      />
    </div>
  );
}